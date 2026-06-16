/**
 * Single source of truth for host plans + limits.
 *
 * Pricing and limits live here (safe to import from client or server). The
 * Gumroad product IDs are intentionally NOT here — they're server-only env and
 * are resolved inside `src/lib/billing/providers/gumroad.ts`, so importing this
 * module into a client component never leaks billing config.
 */

export type PlanKey = "solo" | "plus" | "pro" | "scale";
export type BillingInterval = "month" | "year";

export const PLAN_KEYS: readonly PlanKey[] = ["solo", "plus", "pro", "scale"];

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && (PLAN_KEYS as string[]).includes(value);
}

export interface PlanInfo {
  key: PlanKey;
  label: string;
  /** USD per month on the monthly plan. */
  monthly: number;
  /** USD per year on the annual plan (~2 months free = monthly × 10). */
  annual: number;
  blurb: string;
  /** Metered overage price beyond the included property count (Stripe era). */
  extraPropertyPrice?: number;
}

export const PLAN_MAP: Record<PlanKey, PlanInfo> = {
  solo: {
    key: "solo",
    label: "Solo",
    monthly: 7,
    annual: 70,
    blurb: "For a single property.",
  },
  plus: {
    key: "plus",
    label: "Plus",
    monthly: 15,
    annual: 150,
    blurb: "For a small portfolio.",
  },
  pro: {
    key: "pro",
    label: "Pro",
    monthly: 35,
    annual: 350,
    blurb: "For growing hosts.",
  },
  scale: {
    key: "scale",
    label: "Scale",
    monthly: 69,
    annual: 690,
    blurb: "For large portfolios.",
    extraPropertyPrice: 1.7,
  },
};

export interface PlanLimits {
  /** Max properties the host may create. */
  properties: number;
  /** Max guidebooks in status='published'. */
  publishedGuidebooks: number;
  /** Max guidebooks in status='draft'. `Infinity` = unlimited. */
  drafts: number;
  customDomain: boolean;
  removeBranding: boolean;
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  solo: { properties: 1, publishedGuidebooks: 1, drafts: 2, customDomain: true, removeBranding: false },
  plus: { properties: 5, publishedGuidebooks: 5, drafts: 10, customDomain: true, removeBranding: true },
  pro: { properties: 15, publishedGuidebooks: 15, drafts: Infinity, customDomain: true, removeBranding: true },
  scale: { properties: 30, publishedGuidebooks: 30, drafts: Infinity, customDomain: true, removeBranding: true },
};

/** Number of days a new host's free trial lasts. */
export const TRIAL_DAYS = 7;

export function planPrice(plan: PlanKey, interval: BillingInterval): number {
  return interval === "year" ? PLAN_MAP[plan].annual : PLAN_MAP[plan].monthly;
}

/** Human label like "Unlimited" for Infinity, otherwise the number. */
export function formatLimit(n: number): string {
  return Number.isFinite(n) ? String(n) : "Unlimited";
}
