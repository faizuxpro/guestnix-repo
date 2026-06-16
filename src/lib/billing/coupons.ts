/**
 * Coupons — our catalogue + validation + redemption tracking. The actual
 * checkout discount is applied by the billing provider (a matching Gumroad
 * offer code now). Codes are created in Drizzle Studio. Matching is
 * case-insensitive; the canonical stored code is what we append to the
 * provider checkout URL so it lines up with the provider's offer code.
 */

import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export type CouponResult =
  | { ok: true; code: string; discountType: string; discountValue: number }
  | { ok: false; reason: string };

export async function validateCoupon(rawCode: string): Promise<CouponResult> {
  const code = rawCode.trim();
  if (!code) return { ok: false, reason: "Enter a coupon code." };

  const [c] = await db
    .select()
    .from(coupons)
    .where(sql`lower(${coupons.code}) = ${code.toLowerCase()}`)
    .limit(1);

  if (!c || !c.active || c.archivedAt)
    return { ok: false, reason: "That code isn't valid." };
  if (c.expiresAt && c.expiresAt.getTime() < Date.now())
    return { ok: false, reason: "That code has expired." };
  if (c.maxRedemptions != null && c.redemptionCount >= c.maxRedemptions)
    return { ok: false, reason: "That code has been fully redeemed." };

  return {
    ok: true,
    code: c.code, // canonical case as stored / created in Gumroad
    discountType: c.discountType,
    discountValue: c.discountValue,
  };
}

/** Called from the webhook on a confirmed sale that used a coupon. */
export async function bumpRedemption(rawCode: string): Promise<void> {
  const code = rawCode.trim();
  if (!code) return;
  await db
    .update(coupons)
    .set({ redemptionCount: sql`${coupons.redemptionCount} + 1` })
    .where(sql`lower(${coupons.code}) = ${code.toLowerCase()}`);
}
