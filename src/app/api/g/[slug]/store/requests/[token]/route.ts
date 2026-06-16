import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import {
  guidebookStorefronts,
  guidebooks,
  profiles,
  storeRequestItems,
  storeRequestMessages,
  storeRequests,
  storeSettings,
} from "@/lib/db/schema";
import { upsertSourceNotification } from "@/lib/notifications";
import { sendStorePaymentProofSubmittedEmail } from "@/lib/store/emails";
import { formatStoreMoney } from "@/lib/store/public";
import {
  filterSelectedStorePaymentMethods,
  normalizeStorePaymentMethodIds,
  normalizeStorePaymentMethods,
} from "@/lib/store/payment-methods";
import {
  parseStoreProofStoragePath,
  storeProofUrlForGuest,
} from "@/lib/store/proof-files";
import { hashStoreGuestToken } from "@/lib/store/tokens";
import { publicStoreRequestPaymentProofSchema } from "@/lib/store/validation";
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
      guidebookSlug: guidebooks.slug,
      hostUserId: guidebooks.userId,
      hostEmail: profiles.email,
      paymentInstructions: storeSettings.paymentInstructions,
      paymentMethods: storeSettings.paymentMethods,
      paymentMethodIds: guidebookStorefronts.paymentMethodIds,
    })
    .from(storeRequests)
    .innerJoin(guidebooks, eq(storeRequests.guidebookId, guidebooks.id))
    .innerJoin(profiles, eq(guidebooks.userId, profiles.id))
    .leftJoin(
      guidebookStorefronts,
      eq(storeRequests.storefrontId, guidebookStorefronts.id)
    )
    .leftJoin(storeSettings, eq(guidebooks.userId, storeSettings.userId))
    .where(
      and(
        eq(guidebooks.slug, slug),
        eq(storeRequests.guestAccessTokenHash, tokenHash)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const row = await loadGuestStoreRequest(slug, token);

  if (!row) {
    return NextResponse.json({ error: "Store request not found" }, { status: 404 });
  }

  const [items, messages] = await Promise.all([
    db
      .select()
      .from(storeRequestItems)
      .where(eq(storeRequestItems.requestId, row.request.id))
      .orderBy(asc(storeRequestItems.itemName)),
    db
      .select()
      .from(storeRequestMessages)
      .where(eq(storeRequestMessages.requestId, row.request.id))
      .orderBy(asc(storeRequestMessages.createdAt)),
  ]);

  return NextResponse.json({
    request: {
      id: row.request.id,
      guidebookId: row.request.guidebookId,
      requestCode: row.request.requestCode,
      guidebookTitle: row.guidebookTitle,
      guidebookSlug: row.guidebookSlug,
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
      guestNote: row.request.guestNote,
      hostNote: row.request.hostNote,
      acceptedAt: row.request.acceptedAt?.toISOString() ?? null,
      paymentProofUrl: storeProofUrlForGuest({
        proofValue: row.request.paymentProofUrl,
        slug: row.guidebookSlug,
        token,
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
      items: items.map((item) => ({
        id: item.id,
        storeItemId: item.storeItemId,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        unitPriceCents: item.unitPriceCents,
        currency: item.currency,
        quantity: item.quantity,
        lineTotalCents: item.lineTotalCents,
        lineTotalLabel: formatStoreMoney(item.lineTotalCents, item.currency),
      })),
      messages: messages.map((message) => ({
        id: message.id,
        authorType: message.authorType,
        guestName: message.guestName,
        guestEmail: message.guestEmail,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const proofLimit = await checkRateLimit(request, {
    scope: "store_request_proof_submit",
    identifier: `${clientIpIdentifier(request)}:${token}`,
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });
  if (!proofLimit.allowed) {
    return rateLimitedResponse(proofLimit);
  }
  const row = await loadGuestStoreRequest(slug, token);

  if (!row) {
    return NextResponse.json({ error: "Store request not found" }, { status: 404 });
  }

  if (row.request.status === "cancelled") {
    return NextResponse.json(
      { error: "This request has been cancelled" },
      { status: 400 }
    );
  }

  if (row.request.status === "new") {
    return NextResponse.json(
      { error: "Wait for host approval before sending payment proof" },
      { status: 400 }
    );
  }

  if (row.request.paymentStatus === "not_required") {
    return NextResponse.json(
      { error: "Payment is not required for this request" },
      { status: 400 }
    );
  }

  if (row.request.paymentStatus === "external_paid") {
    return NextResponse.json(
      { error: "Payment has already been confirmed" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = publicStoreRequestPaymentProofSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const proofStoragePath = parseStoreProofStoragePath(
    parsed.data.paymentProofUrl
  );
  if (proofStoragePath && !proofStoragePath.startsWith(`${row.request.id}/`)) {
    return NextResponse.json(
      { error: "Payment proof file does not belong to this request" },
      { status: 400 }
    );
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(storeRequests)
      .set({
        paymentProofUrl: parsed.data.paymentProofUrl ?? null,
        paymentProofNote: parsed.data.paymentProofNote ?? null,
        paymentProofSubmittedAt: now,
        paymentStatus: "proof_submitted",
        updatedAt: now,
      })
      .where(eq(storeRequests.id, row.request.id));

    const proofParts = [
      parsed.data.paymentProofUrl
        ? proofStoragePath
          ? "Proof file attached."
          : `Proof link: ${parsed.data.paymentProofUrl}`
        : null,
      parsed.data.paymentProofNote
        ? `Reference: ${parsed.data.paymentProofNote}`
        : null,
    ].filter(Boolean);

    await tx.insert(storeRequestMessages).values({
      requestId: row.request.id,
      authorType: "guest",
      guestName: row.request.guestName,
      guestEmail: row.request.guestEmail,
      content: `Payment proof submitted.\n${proofParts.join("\n")}`,
    });
  });

  await upsertSourceNotification({
    userId: row.hostUserId,
    type: "store_request",
    title: "Payment proof submitted",
    body: `${row.request.guestName} submitted payment proof for ${row.request.requestCode}.`,
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
    console.warn("Store payment proof notification failed", err);
  });

  if (row.hostEmail) {
    await sendStorePaymentProofSubmittedEmail({
      to: row.hostEmail,
      guidebookTitle: row.guidebookTitle,
      guestName: row.request.guestName,
      requestCode: row.request.requestCode,
      dashboardUrl: absoluteUrl(
        `/dashboard/store?request=${encodeURIComponent(row.request.id)}`
      ),
    }).catch((err) => {
      console.warn("Store payment proof email failed", err);
    });
  }

  await trackServerProductEvent({
    distinctId: row.hostUserId,
    event: productEvents.storePaymentProofSubmitted,
    properties: {
      guidebook_id: row.request.guidebookId,
      currency: row.request.currency,
      payment_status: "proof_submitted",
      request_status: row.request.status,
      source: "public_store_request",
      subtotal_cents: row.request.subtotalCents,
    },
  });

  return NextResponse.json({ success: true });
}
