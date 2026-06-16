import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import {
  guidebooks,
  profiles,
  storeRequestMessages,
  storeRequests,
} from "@/lib/db/schema";
import { upsertSourceNotification } from "@/lib/notifications";
import { sendStoreGuestReplyEmail } from "@/lib/store/emails";
import { hashStoreGuestToken } from "@/lib/store/tokens";
import { publicStoreRequestMessageSchema } from "@/lib/store/validation";
import {
  checkRateLimit,
  clientIpIdentifier,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function loadGuestStoreRequest(slug: string, token: string) {
  const tokenHash = hashStoreGuestToken(token);
  const rows = await db
    .select({
      request: storeRequests,
      guidebookTitle: guidebooks.title,
      hostUserId: guidebooks.userId,
      hostEmail: profiles.email,
    })
    .from(storeRequests)
    .innerJoin(guidebooks, eq(storeRequests.guidebookId, guidebooks.id))
    .innerJoin(profiles, eq(guidebooks.userId, profiles.id))
    .where(
      and(
        eq(guidebooks.slug, slug),
        eq(storeRequests.guestAccessTokenHash, tokenHash)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const messageLimit = await checkRateLimit(request, {
    scope: "store_request_guest_message",
    identifier: `${clientIpIdentifier(request)}:${token}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!messageLimit.allowed) {
    return rateLimitedResponse(messageLimit);
  }
  const row = await loadGuestStoreRequest(slug, token);

  if (!row) {
    return NextResponse.json({ error: "Store request not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = publicStoreRequestMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const now = new Date();
  const [message] = await db
    .insert(storeRequestMessages)
    .values({
      requestId: row.request.id,
      authorType: "guest",
      guestName: row.request.guestName,
      guestEmail: row.request.guestEmail,
      content: parsed.data.content,
    })
    .returning();

  await db
    .update(storeRequests)
    .set({ updatedAt: now })
    .where(eq(storeRequests.id, row.request.id));

  await upsertSourceNotification({
    userId: row.hostUserId,
    type: "store_request",
    title: "New Store message",
    body: `${row.request.guestName} replied to ${row.request.requestCode}.`,
    href: `/dashboard/store?request=${encodeURIComponent(row.request.id)}`,
    sourceType: "store_request",
    sourceId: row.request.id,
    metadata: {
      requestId: row.request.id,
      requestCode: row.request.requestCode,
      guidebookTitle: row.guidebookTitle,
      guestName: row.request.guestName,
    },
  }).catch((err) => {
    console.warn("Store guest reply notification failed", err);
  });

  if (row.hostEmail) {
    await sendStoreGuestReplyEmail({
      to: row.hostEmail,
      guidebookTitle: row.guidebookTitle,
      guestName: row.request.guestName,
      message: parsed.data.content,
      dashboardUrl: absoluteUrl(
        `/dashboard/store?request=${encodeURIComponent(row.request.id)}`
      ),
    }).catch((err) => {
      console.warn("Store guest reply email failed", err);
    });
  }

  await trackServerProductEvent({
    distinctId: row.hostUserId,
    event: productEvents.storeMessageSent,
    properties: {
      guidebook_id: row.request.guidebookId,
      payment_status: row.request.paymentStatus,
      request_status: row.request.status,
      source: "guest",
    },
  });

  return NextResponse.json(
    {
      message: {
        id: message.id,
        authorType: message.authorType,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
}
