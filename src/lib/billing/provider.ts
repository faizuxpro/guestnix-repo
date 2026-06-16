/**
 * Billing provider abstraction. Business logic depends ONLY on this interface,
 * never on a concrete provider. Migrating to Stripe = add `providers/stripe.ts`
 * implementing this, add a Stripe webhook route, and flip BILLING_PROVIDER —
 * subscription state, entitlements, and feature gating stay unchanged.
 */

import type { PlanKey, BillingInterval } from "./plans";
import { gumroad } from "./providers/gumroad";

export interface CheckoutInput {
  plan: PlanKey;
  interval: BillingInterval;
  userId: string;
  email: string;
  couponCode?: string;
}

/** Every provider maps its webhook payload into this shape. */
export interface NormalizedEvent {
  /** Idempotency key — unique per sale/event. */
  providerSaleId: string;
  type: "purchase" | "cancel" | "refund" | "unknown";
  plan: PlanKey | null;
  interval: BillingInterval | null;
  email: string | null;
  /** Our user id, round-tripped through the checkout URL when available. */
  userId: string | null;
  amount: number | null;
  couponCode: string | null;
  isTest: boolean;
  raw: Record<string, unknown>;
}

export interface BillingProvider {
  name: "gumroad" | "stripe";
  getCheckoutUrl(input: CheckoutInput): Promise<string>;
  parseWebhook(req: Request): Promise<NormalizedEvent | null>;
}

export function getProvider(): BillingProvider {
  const name = process.env.BILLING_PROVIDER ?? "gumroad";
  switch (name) {
    case "gumroad":
      return gumroad;
    // case "stripe": return stripe; // future
    default:
      return gumroad;
  }
}
