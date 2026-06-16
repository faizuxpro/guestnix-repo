import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import {
  guidebookStorefronts,
  guidebooks,
  storeItems,
  storeRequestItems,
  storeRequestMessages,
  storeRequests,
  storeSettings,
} from "@/lib/db/schema";
import { createServerClient } from "@/lib/supabase/server";
import { sendStoreGuestProgressEmail } from "@/lib/store/emails";
import {
  filterSelectedStorePaymentMethods,
  normalizeStorePaymentMethodIds,
  normalizeStorePaymentMethods,
} from "@/lib/store/payment-methods";
import { formatStoreMoney } from "@/lib/store/public";
import { storeProofUrlForHost } from "@/lib/store/proof-files";
import { broadcastStoreRequestUpdate } from "@/lib/store/realtime";
import {
  hashStoreGuestToken,
  makeStoreGuestTokenForRequest,
} from "@/lib/store/tokens";
import { hostStoreRequestUpdateSchema } from "@/lib/store/validation";
import { absoluteUrl } from "@/lib/utils";
import { guidebookPublicPath } from "@/lib/guidebook-public-url";

export const runtime = "nodejs";

async function loadOwnedRequest(userId: string, requestId: string) {
  const rows = await db
    .select({
      request: storeRequests,
      guidebookTitle: guidebooks.title,
      guidebookSlug: guidebooks.slug,
      guidebookSettings: guidebooks.settings,
      paymentInstructions: storeSettings.paymentInstructions,
      paymentMethods: storeSettings.paymentMethods,
      paymentMethodIds: guidebookStorefronts.paymentMethodIds,
    })
    .from(storeRequests)
    .innerJoin(guidebooks, eq(storeRequests.guidebookId, guidebooks.id))
    .leftJoin(
      guidebookStorefronts,
      eq(storeRequests.storefrontId, guidebookStorefronts.id)
    )
    .leftJoin(storeSettings, eq(storeRequests.userId, storeSettings.userId))
    .where(and(eq(storeRequests.id, requestId), eq(storeRequests.userId, userId)))
    .limit(1);

  return rows[0] ?? null;
}

async function serializeOwnedRequest(userId: string, requestId: string) {
  const row = await loadOwnedRequest(userId, requestId);
  if (!row) return null;

  const [items, messages] = await Promise.all([
    db
      .select({
        item: storeRequestItems,
        imageUrl: storeItems.imageUrl,
        itemType: storeItems.itemType,
        category: storeItems.category,
      })
      .from(storeRequestItems)
      .leftJoin(storeItems, eq(storeRequestItems.storeItemId, storeItems.id))
      .where(eq(storeRequestItems.requestId, requestId))
      .orderBy(asc(storeRequestItems.itemName)),
    db
      .select()
      .from(storeRequestMessages)
      .where(eq(storeRequestMessages.requestId, requestId))
      .orderBy(asc(storeRequestMessages.createdAt)),
  ]);

  return {
    id: row.request.id,
    requestCode: row.request.requestCode,
    guidebookId: row.request.guidebookId,
    guidebookTitle: row.guidebookTitle,
    guidebookSlug: row.guidebookSlug,
    guidebookSettings: row.guidebookSettings,
    guestName: row.request.guestName,
    guestEmail: row.request.guestEmail,
    guestPhone: row.request.guestPhone,
    status: row.request.status,
    paymentStatus: row.request.paymentStatus,
    paymentInstructions: row.paymentInstructions,
    paymentMethods: filterSelectedStorePaymentMethods({
      paymentMethods: normalizeStorePaymentMethods(row.paymentMethods),
      selectedIds: normalizeStorePaymentMethodIds(row.paymentMethodIds),
    }),
    currency: row.request.currency,
    subtotalCents: row.request.subtotalCents,
    subtotalLabel: formatStoreMoney(
      row.request.subtotalCents,
      row.request.currency
    ),
    itemSummary: items
      .map(({ item }) => `${item.quantity}x ${item.itemName}`)
      .join(", "),
    itemCount: items.reduce((sum, { item }) => sum + item.quantity, 0),
    guestNote: row.request.guestNote,
    hostNote: row.request.hostNote,
    acceptedAt: row.request.acceptedAt?.toISOString() ?? null,
    paymentProofUrl: storeProofUrlForHost({
      proofValue: row.request.paymentProofUrl,
      requestId: row.request.id,
    }),
    paymentProofNote: row.request.paymentProofNote,
    paymentProofSubmittedAt:
      row.request.paymentProofSubmittedAt?.toISOString() ?? null,
    paymentConfirmedAt:
      row.request.paymentConfirmedAt?.toISOString() ?? null,
    fulfilledAt: row.request.fulfilledAt?.toISOString() ?? null,
    cancelledAt: row.request.cancelledAt?.toISOString() ?? null,
    requestedFor: row.request.requestedFor?.toISOString() ?? null,
    createdAt: row.request.createdAt.toISOString(),
    updatedAt: row.request.updatedAt.toISOString(),
    items: items.map(({ item, imageUrl, itemType, category }) => ({
      id: item.id,
      storeItemId: item.storeItemId,
      itemName: item.itemName,
      itemDescription: item.itemDescription,
      unitPriceCents: item.unitPriceCents,
      currency: item.currency,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
      lineTotalLabel: formatStoreMoney(item.lineTotalCents, item.currency),
      imageUrl,
      itemType,
      category,
    })),
    messages: messages.map((message) => ({
      id: message.id,
      authorType: message.authorType,
      authorUserId: message.authorUserId,
      guestName: message.guestName,
      guestEmail: message.guestEmail,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function GET(
  _request: Request,
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
  const requestDetail = await serializeOwnedRequest(user.id, requestId);
  if (!requestDetail) {
    return NextResponse.json({ error: "Store request not found" }, { status: 404 });
  }

  return NextResponse.json({ request: requestDetail });
}

export async function PATCH(
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
  const existing = await loadOwnedRequest(user.id, requestId);
  if (!existing) {
    return NextResponse.json({ error: "Store request not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = hostStoreRequestUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const now = new Date();
  const guestToken = makeStoreGuestTokenForRequest(existing.request.id);
  const patch: Partial<typeof storeRequests.$inferInsert> = {
    guestAccessTokenHash: hashStoreGuestToken(guestToken),
    updatedAt: now,
  };
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
    if (
      (parsed.data.status === "accepted" ||
        parsed.data.status === "fulfilled") &&
      !existing.request.acceptedAt
    ) {
      patch.acceptedAt = now;
    }
    if (parsed.data.status === "fulfilled" && !existing.request.fulfilledAt) {
      patch.fulfilledAt = now;
    }
    if (parsed.data.status === "cancelled" && !existing.request.cancelledAt) {
      patch.cancelledAt = now;
    }
  }
  if (parsed.data.paymentStatus !== undefined) {
    patch.paymentStatus = parsed.data.paymentStatus;
    if (
      parsed.data.paymentStatus === "external_paid" &&
      !existing.request.paymentConfirmedAt
    ) {
      patch.paymentConfirmedAt = now;
    }
  }
  if (parsed.data.hostNote !== undefined) {
    patch.hostNote = parsed.data.hostNote ?? null;
  }

  await db
    .update(storeRequests)
    .set(patch)
    .where(and(eq(storeRequests.id, requestId), eq(storeRequests.userId, user.id)));

  const requestDetail = await serializeOwnedRequest(user.id, requestId);
  const realtimeKinds: Array<
    "status_update" | "payment_update" | "fulfilled" | "cancelled"
  > = [];
  if (
    parsed.data.status !== undefined &&
    parsed.data.status !== existing.request.status
  ) {
    if (parsed.data.status === "fulfilled") {
      realtimeKinds.push("fulfilled");
    } else if (parsed.data.status === "cancelled") {
      realtimeKinds.push("cancelled");
    } else {
      realtimeKinds.push("status_update");
    }
  }
  if (
    parsed.data.paymentStatus !== undefined &&
    parsed.data.paymentStatus !== existing.request.paymentStatus
  ) {
    realtimeKinds.push("payment_update");
  }

  await Promise.all(
    realtimeKinds.map((kind) =>
      broadcastStoreRequestUpdate({
        requestId,
        kind,
        updatedAt: now,
      }).catch((err) => {
        console.warn("Store request realtime broadcast failed", err);
      })
    )
  );

  if (existing.request.guestEmail && requestDetail) {
    const resumeUrl = absoluteUrl(
      `${guidebookPublicPath(
        requestDetail.guidebookSlug,
        requestDetail.guidebookSettings as Record<string, unknown>
      )}/store/requests/${encodeURIComponent(guestToken)}`
    );
    const progressEvents: Array<
      "approved" | "payment_confirmed" | "fulfilled" | "cancelled"
    > = [];

    if (
      parsed.data.status === "accepted" &&
      existing.request.status !== "accepted" &&
      existing.request.status !== "fulfilled"
    ) {
      progressEvents.push("approved");
    }
    if (
      parsed.data.paymentStatus === "external_paid" &&
      existing.request.paymentStatus !== "external_paid"
    ) {
      progressEvents.push("payment_confirmed");
    }
    if (
      parsed.data.status === "fulfilled" &&
      existing.request.status !== "fulfilled"
    ) {
      progressEvents.push("fulfilled");
    }
    if (
      parsed.data.status === "cancelled" &&
      existing.request.status !== "cancelled"
    ) {
      progressEvents.push("cancelled");
    }

    await Promise.all(
      progressEvents.map((event) =>
        sendStoreGuestProgressEmail({
          to: existing.request.guestEmail,
          guidebookTitle: existing.guidebookTitle,
          guestName: existing.request.guestName,
          requestCode: existing.request.requestCode,
          resumeUrl,
          event,
          paymentRequired: requestDetail.paymentStatus !== "not_required",
        }).catch((err) => {
          console.warn("Store guest progress email failed", err);
        })
      )
    );
  }

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.storeRequestUpdated,
    properties: {
      guidebook_id: existing.request.guidebookId,
      currency: existing.request.currency,
      payment_status: requestDetail?.paymentStatus ?? patch.paymentStatus ?? existing.request.paymentStatus,
      request_status: requestDetail?.status ?? patch.status ?? existing.request.status,
      source: "dashboard_store",
      subtotal_cents: existing.request.subtotalCents,
    },
  });

  return NextResponse.json({ request: requestDetail });
}
