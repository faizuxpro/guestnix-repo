/**
 * Maps an incoming `Host` header to the guidebook slug it should serve.
 * Called from middleware on every non-canonical-host request, so the
 * lookup must be fast — we keep a small in-memory LRU.
 *
 * Custom domains change rarely, so a 5-minute TTL is fine even on
 * serverless edge runtimes (each instance keeps its own cache; cold
 * starts just re-fetch). The host→null entries for unknown hostnames are
 * also cached so we don't DB-thrash on random scanning bots.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customDomains, guidebooks } from "@/lib/db/schema";

const CACHE_MAX = 500;
const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { slug: string | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheGet(host: string): CacheEntry | undefined {
  const entry = cache.get(host);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(host);
    return undefined;
  }
  // LRU touch: re-insert to move to the end.
  cache.delete(host);
  cache.set(host, entry);
  return entry;
}

function cacheSet(host: string, slug: string | null) {
  if (cache.size >= CACHE_MAX) {
    // Evict oldest entry (Map iteration order is insertion order).
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(host, { slug, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Returns the published slug for a custom-domain host, or null when the
 * host is unknown / the matching domain isn't active yet.
 */
export async function resolveCustomDomainToSlug(
  host: string
): Promise<string | null> {
  const cached = cacheGet(host);
  if (cached) return cached.slug;

  const row = await db
    .select({ slug: guidebooks.slug, status: customDomains.status })
    .from(customDomains)
    .innerJoin(guidebooks, eq(customDomains.guidebookId, guidebooks.id))
    .where(eq(customDomains.domain, host))
    .limit(1);

  // Only "active" domains route traffic — verified-but-no-cert domains
  // would 502 since TLS isn't ready yet, so we leave the host unrouted
  // until the provider finishes.
  const slug =
    row[0]?.status === "active" ? row[0].slug : null;
  cacheSet(host, slug);
  return slug;
}

/**
 * Drop a single host from the cache. Called after add/remove/verify so
 * the new state takes effect within milliseconds rather than the 5-min
 * TTL.
 */
export function invalidateCustomDomainCache(host: string) {
  cache.delete(host);
}
