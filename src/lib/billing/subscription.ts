/**
 * Provider-agnostic subscription state transitions. This is what the app reads
 * for entitlement. It imports NO provider — the webhook route hands it an
 * already-normalized event. Idempotency is enforced by the unique
 * (provider, providerSaleId) index on `payments`.
 */

import { db } from "@/lib/db";
import { payments, profiles, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { NormalizedEvent } from "./provider";
import { bumpRedemption } from "./coupons";
import { invalidateAllGuideServable } from "./guide-access";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveUserId(e: NormalizedEvent): Promise<string | null> {
  if (e.userId && UUID_RE.test(e.userId)) {
    const [p] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, e.userId))
      .limit(1);
    if (p) return p.id;
  }
  if (e.email) {
    const [p] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.email, e.email))
      .limit(1);
    if (p) return p.id;
  }
  return null;
}

export async function activateFromEvent(
  e: NormalizedEvent,
  providerName: string
): Promise<void> {
  if (e.isTest) return;

  if (e.type === "cancel" || e.type === "refund") {
    await cancelFromEvent(e);
    return;
  }
  if (e.type !== "purchase" || !e.plan || !e.providerSaleId) return;

  const userId = await resolveUserId(e);

  // Idempotency: a re-delivered Ping conflicts on (provider, providerSaleId)
  // and inserts zero rows → we stop.
  const inserted = await db
    .insert(payments)
    .values({
      provider: providerName,
      providerSaleId: e.providerSaleId,
      userId,
      email: e.email,
      plan: e.plan,
      amount: e.amount,
      couponCode: e.couponCode,
      raw: e.raw,
    })
    .onConflictDoNothing({
      target: [payments.provider, payments.providerSaleId],
    })
    .returning({ id: payments.id });

  if (inserted.length === 0) return; // already processed

  if (!userId) {
    // Recorded the payment but couldn't match a user — surface for manual
    // reconciliation rather than silently dropping it.
    console.error("[billing] sale recorded but no matching user", {
      saleId: e.providerSaleId,
      email: e.email,
    });
    return;
  }

  await db
    .insert(subscriptions)
    .values({
      userId,
      plan: e.plan,
      status: "active",
      provider: providerName,
      billingInterval: e.interval ?? "month",
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        plan: e.plan,
        status: "active",
        provider: providerName,
        billingInterval: e.interval ?? "month",
        updatedAt: new Date(),
      },
    });

  if (e.couponCode) await bumpRedemption(e.couponCode);
  invalidateAllGuideServable();
}

export async function cancelFromEvent(e: NormalizedEvent): Promise<void> {
  const userId = await resolveUserId(e);
  if (!userId) return;
  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));
  invalidateAllGuideServable();
}
