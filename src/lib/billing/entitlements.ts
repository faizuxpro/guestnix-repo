/**
 * Entitlements — the single place that answers "is this host allowed to do X
 * right now?". Reads the internal subscription state (never the billing
 * provider). Helpers return a guard result instead of throwing, because a
 * thrown Response is not auto-converted in Next.js route handlers.
 */

import { db } from "@/lib/db";
import { subscriptions, properties, guidebooks } from "@/lib/db/schema";
import { and, count, eq } from "drizzle-orm";
import { PLAN_LIMITS, isPlanKey, type BillingInterval, type PlanKey, type PlanLimits } from "./plans";

export type SubStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "none";

export interface Entitlement {
  plan: PlanKey | null;
  status: SubStatus;
  isEntitled: boolean;
  billingInterval: BillingInterval;
  trialEndsAt: Date | null;
  /** Whole days left in the trial, or null when not trialing. */
  trialDaysLeft: number | null;
  limits: PlanLimits | null;
}

/** Core rule: entitled while active, or trialing and not yet past the trial end. */
export function isEntitled(
  status: string,
  trialEndsAt: Date | null,
  now: Date = new Date()
): boolean {
  if (status === "active") return true;
  if (status === "trialing")
    return !!trialEndsAt && trialEndsAt.getTime() > now.getTime();
  return false;
}

export async function getUserEntitlement(userId: string): Promise<Entitlement> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!sub) {
    return {
      plan: null,
      status: "none",
      isEntitled: false,
      billingInterval: "month",
      trialEndsAt: null,
      trialDaysLeft: null,
      limits: null,
    };
  }

  const plan = isPlanKey(sub.plan) ? sub.plan : null;
  const now = new Date();
  const trialEndsAt = sub.trialEndsAt ?? null;
  const entitled = isEntitled(sub.status, trialEndsAt, now);
  const trialDaysLeft =
    sub.status === "trialing" && trialEndsAt
      ? Math.max(
          0,
          Math.ceil((trialEndsAt.getTime() - now.getTime()) / 86_400_000)
        )
      : null;

  return {
    plan,
    status: sub.status as SubStatus,
    isEntitled: entitled,
    billingInterval: (sub.billingInterval as BillingInterval) ?? "month",
    trialEndsAt,
    trialDaysLeft,
    limits: plan ? PLAN_LIMITS[plan] : null,
  };
}

export type Guard = { allowed: true } | { allowed: false; reason: string };

const NOT_ENTITLED_REASON =
  "Your trial has ended. Subscribe to keep building and publishing your guides.";

async function countRows(query: Promise<{ value: number }[]>): Promise<number> {
  const rows = await query;
  return Number(rows[0]?.value ?? 0);
}

async function guardWithLimit(
  userId: string,
  limitKey: "properties" | "publishedGuidebooks" | "drafts",
  getUsed: (userId: string) => Promise<number>,
  noun: string
): Promise<Guard> {
  const ent = await getUserEntitlement(userId);
  if (!ent.isEntitled || !ent.limits) {
    return { allowed: false, reason: NOT_ENTITLED_REASON };
  }
  const limit = ent.limits[limitKey];
  if (!Number.isFinite(limit)) return { allowed: true }; // unlimited
  const used = await getUsed(userId);
  if (used >= limit) {
    return {
      allowed: false,
      reason: `You've reached your ${noun} limit (${limit}) on the ${ent.plan?.toUpperCase()} plan. Upgrade to add more.`,
    };
  }
  return { allowed: true };
}

function countProperties(userId: string) {
  return countRows(
    db
      .select({ value: count() })
      .from(properties)
      .where(eq(properties.userId, userId))
  );
}

function countGuidebooksByStatus(userId: string, status: string) {
  return countRows(
    db
      .select({ value: count() })
      .from(guidebooks)
      .where(and(eq(guidebooks.userId, userId), eq(guidebooks.status, status)))
  );
}

export function canCreateProperty(userId: string): Promise<Guard> {
  return guardWithLimit(userId, "properties", countProperties, "property");
}

export function canCreateDraft(userId: string): Promise<Guard> {
  return guardWithLimit(
    userId,
    "drafts",
    (u) => countGuidebooksByStatus(u, "draft"),
    "draft"
  );
}

export function canPublish(userId: string): Promise<Guard> {
  return guardWithLimit(
    userId,
    "publishedGuidebooks",
    (u) => countGuidebooksByStatus(u, "published"),
    "published guidebook"
  );
}

/** Plain entitlement check (e.g. to block edits when a trial has lapsed). */
export async function checkEntitled(userId: string): Promise<Guard> {
  const ent = await getUserEntitlement(userId);
  return ent.isEntitled
    ? { allowed: true }
    : { allowed: false, reason: NOT_ENTITLED_REASON };
}
