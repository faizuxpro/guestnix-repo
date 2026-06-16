/**
 * Decides whether a published guide should be served to guests, or shown the
 * "paused" page. A guide is servable only while its owner is entitled
 * (active subscription, or a trial that hasn't ended). Cached briefly so the
 * public page stays cheap; the webhook clears the cache on status changes and
 * the short TTL bounds staleness otherwise.
 *
 * Cache pattern mirrors src/lib/custom-domain-resolver.ts.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guidebooks, subscriptions } from "@/lib/db/schema";
import { isEntitled } from "./entitlements";

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { servable: boolean; expiresAt: number }>();

export async function isGuideServable(slug: string): Promise<boolean> {
  const hit = cache.get(slug);
  if (hit && hit.expiresAt > Date.now()) return hit.servable;

  const [row] = await db
    .select({
      status: subscriptions.status,
      trialEndsAt: subscriptions.trialEndsAt,
    })
    .from(guidebooks)
    .leftJoin(subscriptions, eq(subscriptions.userId, guidebooks.userId))
    .where(eq(guidebooks.slug, slug))
    .limit(1);

  // No owner subscription (or expired/canceled) → paused. A missing guidebook
  // returns false here, but the page 404s on the missing snapshot first anyway.
  const servable = !!row && isEntitled(row.status ?? "none", row.trialEndsAt ?? null);

  cache.set(slug, { servable, expiresAt: Date.now() + CACHE_TTL_MS });
  return servable;
}

export function invalidateGuideServable(slug: string) {
  cache.delete(slug);
}

/**
 * Called when any subscription status changes. We don't track which slugs
 * belong to which user here, so just clear the (small) cache — it repopulates
 * lazily on the next guest request.
 */
export function invalidateAllGuideServable() {
  cache.clear();
}
