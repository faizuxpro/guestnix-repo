/**
 * Gumroad provider. Maps our plan/interval to a Gumroad product permalink for
 * checkout, and normalizes the Gumroad Ping (form-encoded) into a
 * NormalizedEvent. Product permalinks come from env (server-only).
 *
 * Env: GUMROAD_PRODUCT_<PLAN>_M / _Y hold each product's permalink (the code
 * in gumroad.com/l/<permalink>). GUMROAD_CREATOR_SUBDOMAIN builds the checkout
 * host. The Gumroad Ping echoes custom URL params under `url_params[...]`, so
 * we round-trip our user id as `uid`.
 */

import type { BillingProvider, NormalizedEvent } from "../provider";
import { PLAN_KEYS, type BillingInterval, type PlanKey } from "../plans";

function permalink(plan: PlanKey, interval: BillingInterval): string | undefined {
  const suffix = interval === "year" ? "Y" : "M";
  return process.env[`GUMROAD_PRODUCT_${plan.toUpperCase()}_${suffix}`];
}

/** Match a webhook's product identifiers back to our plan + interval. */
function planFromCandidates(
  candidates: (string | null)[]
): { plan: PlanKey; interval: BillingInterval } | null {
  const present = candidates.filter((c): c is string => !!c);
  for (const plan of PLAN_KEYS) {
    const m = process.env[`GUMROAD_PRODUCT_${plan.toUpperCase()}_M`];
    const y = process.env[`GUMROAD_PRODUCT_${plan.toUpperCase()}_Y`];
    if (m && present.includes(m)) return { plan, interval: "month" };
    if (y && present.includes(y)) return { plan, interval: "year" };
  }
  return null;
}

export const gumroad: BillingProvider = {
  name: "gumroad",

  async getCheckoutUrl({ plan, interval, userId, email, couponCode }) {
    const id = permalink(plan, interval);
    if (!id) {
      throw new Error(
        `Missing Gumroad product permalink for ${plan}/${interval} (set GUMROAD_PRODUCT_${plan.toUpperCase()}_${interval === "year" ? "Y" : "M"}).`
      );
    }
    const subdomain = process.env.GUMROAD_CREATOR_SUBDOMAIN;
    const base = subdomain
      ? `https://${subdomain}.gumroad.com/l/${id}`
      : `https://gumroad.com/l/${id}`;
    const url = new URL(base);
    url.searchParams.set("wanted", "true");
    if (email) url.searchParams.set("email", email);
    url.searchParams.set("uid", userId); // → url_params[uid] in the Ping
    if (couponCode) url.searchParams.set("offer_code", couponCode);
    return url.toString();
  },

  async parseWebhook(req): Promise<NormalizedEvent | null> {
    const form = await req.formData();
    const get = (k: string): string | null => {
      const v = form.get(k);
      return typeof v === "string" ? v : null;
    };

    const mapped = planFromCandidates([
      get("permalink"),
      get("product_permalink"),
      get("short_product_id"),
      get("product_id"),
    ]);

    const refunded = get("refunded") === "true";
    const cancelled =
      get("cancelled") === "true" || get("subscription_ended_at") !== null;

    return {
      providerSaleId: get("sale_id") ?? get("subscription_id") ?? "",
      type: refunded ? "refund" : cancelled ? "cancel" : "purchase",
      plan: mapped?.plan ?? null,
      interval: mapped?.interval ?? null,
      email: get("email"),
      userId: get("url_params[uid]") ?? get("uid"),
      amount: get("price") ? Number(get("price")) : null,
      couponCode: get("offer_code"),
      isTest: get("test") === "true",
      raw: Object.fromEntries(form.entries()) as Record<string, unknown>,
    };
  },
};
