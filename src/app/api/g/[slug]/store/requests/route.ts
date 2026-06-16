import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import {
  chatSessions,
  guidebooks,
  storeRequestItems,
  storeRequestMessages,
  storeRequests,
} from "@/lib/db/schema";
import {
  isGuidebookProtected,
  isGuidebookUnlocked,
} from "@/lib/guidebook-access";
import { storeRequestNotification } from "@/lib/notifications";
import { fetchPublishedSnapshot } from "@/lib/snapshot";
import {
  sendStoreGuestRequestConfirmationEmail,
  sendStoreRequestEmail,
} from "@/lib/store/emails";
import {
  calculateStoreRequestLines,
  formatStoreMoney,
  getPublicStorefrontItems,
  isStorefrontPubliclyAvailable,
} from "@/lib/store/public";
import {
  hashStoreGuestToken,
  makeStoreGuestTokenForRequest,
  makeStoreRequestCode,
  makeStoreRequestId,
} from "@/lib/store/tokens";
import { publicStoreRequestCreateSchema } from "@/lib/store/validation";
import {
  checkRateLimit,
  clientIpIdentifier,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/utils";
import { guidebookPublicPath } from "@/lib/guidebook-public-url";

export const runtime = "nodejs";

function storeUnavailableResponse() {
  return NextResponse.json(
    { error: "Store is not available for this guidebook" },
    { status: 404 }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = publicStoreRequestCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const createLimit = await checkRateLimit(request, {
    scope: "store_request_create",
    identifier: `${clientIpIdentifier(request)}:${slug}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!createLimit.allowed) {
    return rateLimitedResponse(createLimit);
  }

  const snapshot = await fetchPublishedSnapshot(slug);
  if (!snapshot) {
    return storeUnavailableResponse();
  }

  const settings = snapshot.guidebook.settings ?? {};
  if (isGuidebookProtected(settings)) {
    const unlocked = await isGuidebookUnlocked(snapshot.guidebook.id, settings);
    if (!unlocked) {
      return NextResponse.json({ error: "Locked" }, { status: 403 });
    }
  }

  if (!isStorefrontPubliclyAvailable(snapshot.storefront)) {
    return storeUnavailableResponse();
  }

  const guidebook = await db.query.guidebooks.findFirst({
    where: and(
      eq(guidebooks.id, snapshot.guidebook.id),
      eq(guidebooks.slug, slug),
      eq(guidebooks.status, "published")
    ),
    with: { user: true },
  });

  if (!guidebook || !snapshot.storefront?.enabled) {
    return storeUnavailableResponse();
  }

  const chatSession = parsed.data.chatSessionToken
    ? await db.query.chatSessions.findFirst({
        where: and(
          eq(chatSessions.sessionToken, parsed.data.chatSessionToken),
          eq(chatSessions.guidebookId, guidebook.id)
        ),
      })
    : null;

  const guestName =
    parsed.data.guestName?.trim() || chatSession?.guestName?.trim() || "";
  const guestEmail =
    parsed.data.guestEmail?.trim().toLowerCase() ||
    chatSession?.guestEmail?.trim().toLowerCase() ||
    "";

  if (!guestName || !guestEmail) {
    return NextResponse.json(
      { error: "Guest name and email are required" },
      { status: 400 }
    );
  }

  const publicItems = getPublicStorefrontItems(snapshot.storefront);
  let calculated: ReturnType<typeof calculateStoreRequestLines>;
  try {
    calculated = calculateStoreRequestLines(publicItems, parsed.data.items);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "One or more items are unavailable";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const requestId = makeStoreRequestId();
  const token = makeStoreGuestTokenForRequest(requestId);
  const tokenHash = hashStoreGuestToken(token);
  const requestCode = makeStoreRequestCode();
  const requestedFor = parsed.data.requestedFor
    ? new Date(parsed.data.requestedFor)
    : null;
  const guestNote = parsed.data.guestNote?.trim() || null;
  const paymentStatus =
    calculated.subtotalCents === 0 ? "not_required" : "external_pending";

  const created = await db.transaction(async (tx) => {
    const [storeRequest] = await tx
      .insert(storeRequests)
      .values({
        id: requestId,
        guidebookId: guidebook.id,
        storefrontId: snapshot.storefront?.id ?? null,
        userId: guidebook.userId,
        chatSessionId: chatSession?.id ?? null,
        requestCode,
        guestName,
        guestEmail,
        guestPhone: parsed.data.guestPhone?.trim() || null,
        guestAccessTokenHash: tokenHash,
        status: "new",
        paymentStatus,
        currency: calculated.currency,
        subtotalCents: calculated.subtotalCents,
        guestNote,
        requestedFor,
      })
      .returning();

    await tx.insert(storeRequestItems).values(
      calculated.lines.map((line) => ({
        requestId: storeRequest.id,
        storeItemId: line.storeItemId,
        itemName: line.itemName,
        itemDescription: line.itemDescription,
        unitPriceCents: line.unitPriceCents,
        currency: line.currency,
        quantity: line.quantity,
        lineTotalCents: line.lineTotalCents,
      }))
    );

    if (guestNote) {
      await tx.insert(storeRequestMessages).values({
        requestId: storeRequest.id,
        authorType: "guest",
        guestName,
        guestEmail,
        content: guestNote,
      });
    }

    const shouldSyncChatIdentity =
      chatSession &&
      (parsed.data.guestName || parsed.data.guestEmail) &&
      (chatSession.guestName !== guestName ||
        chatSession.guestEmail !== guestEmail);

    if (shouldSyncChatIdentity) {
      await tx
        .update(chatSessions)
        .set({
          guestName,
          guestEmail,
          identityProvidedAt: chatSession.identityProvidedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(chatSessions.id, chatSession.id));
    }

    return storeRequest;
  });

  const dashboardUrl = absoluteUrl(
    `/dashboard/store?request=${encodeURIComponent(created.id)}`
  );
  const resumeUrl = absoluteUrl(
    `${guidebookPublicPath(
      slug,
      guidebook.settings as Record<string, unknown>
    )}/store/requests/${encodeURIComponent(token)}`
  );
  const subtotalLabel = formatStoreMoney(
    calculated.subtotalCents,
    calculated.currency
  );

  await storeRequestNotification({
    hostUserId: guidebook.userId,
    requestId: created.id,
    requestCode: created.requestCode,
    guidebookId: guidebook.id,
    guidebookTitle: guidebook.title,
    guestName,
    subtotalLabel,
  }).catch((err) => {
    console.warn("Store request notification failed", err);
  });

  if (guidebook.user?.email) {
    await sendStoreRequestEmail({
      to: guidebook.user.email,
      guidebookTitle: guidebook.title,
      guestName,
      requestCode: created.requestCode,
      subtotalCents: calculated.subtotalCents,
      currency: calculated.currency,
      lines: calculated.lines,
      dashboardUrl,
    }).catch((err) => {
      console.warn("Store request email failed", err);
    });
  }

  const guestEmailResult = await sendStoreGuestRequestConfirmationEmail({
    to: guestEmail,
    guidebookTitle: guidebook.title,
    guestName,
    requestCode: created.requestCode,
    subtotalCents: calculated.subtotalCents,
    currency: calculated.currency,
    lines: calculated.lines,
    resumeUrl,
  }).catch((err) => {
    console.warn("Store guest confirmation email failed", err);
    return null;
  });

  await trackServerProductEvent({
    distinctId: guidebook.userId,
    event: productEvents.storeRequestCreated,
    properties: {
      guidebook_id: guidebook.id,
      currency: calculated.currency,
      payment_status: paymentStatus,
      request_status: created.status,
      source: "public_guidebook",
      store_item_count: calculated.lines.length,
      subtotal_cents: calculated.subtotalCents,
    },
  });

  return NextResponse.json(
    {
      request: {
        id: created.id,
        requestCode: created.requestCode,
        status: created.status,
        paymentStatus: created.paymentStatus,
        subtotalCents: created.subtotalCents,
        currency: created.currency,
        subtotalLabel,
        resumeUrl,
        accessToken: token,
        confirmationEmailSent:
          guestEmailResult !== null &&
          !("skipped" in guestEmailResult && guestEmailResult.skipped),
      },
    },
    { status: 201 }
  );
}
