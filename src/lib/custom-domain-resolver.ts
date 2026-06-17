/**
 * Maps an incoming Host header to the guidebook slug it should serve.
 *
 * Active host matches are cached for a few minutes. Misses are cached only
 * briefly, because a newly activated custom domain can otherwise look
 * unrouted on any dyno that cached the pre-activation miss.
 */

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customDomains, guidebooks } from "@/lib/db/schema";

const CACHE_MAX = 500;
const HIT_CACHE_TTL_MS = 5 * 60 * 1000;
const MISS_CACHE_TTL_MS = 10 * 1000;

type CacheEntry = { slug: string | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function cacheGet(host: string): CacheEntry | undefined {
  const entry = cache.get(host);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(host);
    return undefined;
  }
  cache.delete(host);
  cache.set(host, entry);
  return entry;
}

function cacheSet(host: string, slug: string | null) {
  if (cache.size >= CACHE_MAX) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }

  const ttl = slug ? HIT_CACHE_TTL_MS : MISS_CACHE_TTL_MS;
  cache.set(host, { slug, expiresAt: Date.now() + ttl });
}

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

  const status = row[0]?.status;
  const slug = status === "verified" || status === "active" ? row[0].slug : null;
  cacheSet(host, slug);
  return slug;
}

export function invalidateCustomDomainCache(host: string) {
  cache.delete(host);
}
