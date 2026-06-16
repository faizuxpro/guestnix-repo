import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import {
  guidebooks,
  storeRequestMessages,
  storeRequests,
} from "@/lib/db/schema";
import { createServerClient } from "@/lib/supabase/server";
import { sendStoreHostReplyEmail } from "@/lib/store/emails";
import { broadcastStoreRequestUpdate } from "@/lib/store/realtime";
import {
  hashStoreGuestToken,
  makeStoreGuestTokenForRequest,
} from "@/lib/store/tokens";
import { hostStoreRequestMessageSchema } from "@/lib/store/validation";
import { absoluteUrl } from "@/lib/utils";
import { guidebookPublicPath } from "@/lib/guidebook-public-url";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const rows = await db
    .select({
      request: storeRequests,
      guidebookTitle: guidebooks.title,
      guidebookSlug: guidebooks.slug,
      guidebookSettings: guidebooks.settings,
    })
    .from(storeRequests)
    .innerJoin(guidebooks, eq(storeRequests.guidebookId, guidebooks.id))
    .where(and(eq(storeRequests.id, requestId), eq(storeRequests.userId, user.id)))
    .limit(1);

  const owned = rows[0];
  if (!owned) {
    return NextResponse.json({ error: "Store request not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = hostStoreRequestMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const guestToken = makeStoreGuestTokenForRequest(owned.request.id);
  const guestTokenHash = hashStoreGuestToken(guestToken);
  const now = new Date();

  const [message] = await db
    .insert(storeRequestMessages)
    .values({
      requestId: owned.request.id,
      authorType: "host",
      authorUserId: user.id,
      content: parsed.data.content,
    })
    .returning();

  await db
    .update(storeRequests)
    .set({
      guestAccessTokenHash: guestTokenHash,
      updatedAt: now,
    })
    .where(eq(storeRequests.id, owned.request.id));

  await broadcastStoreRequestUpdate({
    requestId: owned.request.id,
    kind: "host_message",
    updatedAt: now,
  }).catch((err) => {
    console.warn("Store request realtime broadcast failed", err);
  });

  const resumeUrl = absoluteUrl(
    `${guidebookPublicPath(
      owned.guidebookSlug,
      owned.guidebookSettings as Record<string, unknown>
    )}/store/requests/${encodeURIComponent(guestToken)}`
  );

  if (owned.request.guestEmail) {
    await sendStoreHostReplyEmail({
      to: owned.request.guestEmail,
      guidebookTitle: owned.guidebookTitle,
      guestName: owned.request.guestName,
      message: parsed.data.content,
      resumeUrl,
    }).catch((err) => {
      console.warn("Store host reply email failed", err);
    });
  }

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.storeMessageSent,
    properties: {
      guidebook_id: owned.request.guidebookId,
      payment_status: owned.request.paymentStatus,
      request_status: owned.request.status,
      source: "host",
    },
  });

  return NextResponse.json(
    {
      message: {
        id: message.id,
        authorType: message.authorType,
        authorUserId: message.authorUserId,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
      resumeUrl,
    },
    { status: 201 }
  );
}
