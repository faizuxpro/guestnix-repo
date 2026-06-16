import crypto from "node:crypto";
import { NextResponse } from "next/server";

type RateLimitOptions = {
  scope: string;
  identifier: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
};

type MemoryEntry = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  __guestnixRateLimit?: Map<string, MemoryEntry>;
};

const memoryStore =
  globalForRateLimit.__guestnixRateLimit ?? new Map<string, MemoryEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.__guestnixRateLimit = memoryStore;
}

function configuredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("your_")) return null;
  return value;
}

function upstashConfig() {
  const url = configuredEnv("UPSTASH_REDIS_REST_URL");
  const token = configuredEnv("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function keyFor(options: RateLimitOptions, windowIndex: number) {
  const digest = crypto
    .createHash("sha256")
    .update(`${options.scope}:${options.identifier}:${windowIndex}`)
    .digest("hex")
    .slice(0, 40);
  return `gnx:rl:${options.scope}:${digest}`;
}

function resultFor(count: number, options: RateLimitOptions, resetAt: number) {
  const remaining = Math.max(0, options.limit - count);
  return {
    allowed: count <= options.limit,
    limit: options.limit,
    remaining,
    resetAt,
    retryAfter: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}

async function checkUpstash(
  key: string,
  options: RateLimitOptions,
  resetAt: number
) {
  const config = upstashConfig();
  if (!config) return null;

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, Math.ceil(options.windowMs / 1000)],
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit failed (${response.status})`);
  }

  const payload = (await response.json()) as Array<{ result?: unknown }>;
  const count = Number(payload?.[0]?.result);
  if (!Number.isFinite(count)) {
    throw new Error("Upstash rate limit returned an invalid count");
  }

  return resultFor(count, options, resetAt);
}

function checkMemory(key: string, options: RateLimitOptions, resetAt: number) {
  const now = Date.now();
  for (const [entryKey, entry] of memoryStore.entries()) {
    if (entry.resetAt <= now) {
      memoryStore.delete(entryKey);
    }
  }

  const current = memoryStore.get(key);
  const next =
    current && current.resetAt > now
      ? { count: current.count + 1, resetAt: current.resetAt }
      : { count: 1, resetAt };
  memoryStore.set(key, next);

  return resultFor(next.count, options, next.resetAt);
}

export function clientIpIdentifier(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    forwarded ||
    "unknown"
  );
}

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  void request;
  const now = Date.now();
  const windowIndex = Math.floor(now / options.windowMs);
  const resetAt = (windowIndex + 1) * options.windowMs;
  const key = keyFor(options, windowIndex);

  try {
    const upstash = await checkUpstash(key, options, resetAt);
    if (upstash) return upstash;
  } catch (err) {
    console.warn("Rate limit Redis check failed; using memory fallback", err);
  }

  return checkMemory(key, options, resetAt);
}

export function rateLimitedResponse(
  result: RateLimitResult,
  message = "Too many requests. Please wait a moment and try again."
) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}
