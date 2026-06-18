const PRODUCTION_APP_ORIGIN = "https://guestnix.com";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function normalizeOrigin(value: string | null | undefined): string | null {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string | null): boolean {
  if (!origin) return false;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

export function getPublicAppOrigin(): string {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL);
  const canonicalOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_CANONICAL_HOST);

  if (configuredOrigin && !isLocalOrigin(configuredOrigin)) {
    return configuredOrigin;
  }

  if (canonicalOrigin && !isLocalOrigin(canonicalOrigin)) {
    return canonicalOrigin;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_APP_ORIGIN;
  }

  return configuredOrigin ?? "http://localhost:3000";
}

export function absoluteAppUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppOrigin()}${normalizedPath}`;
}

export function getBrowserAppOrigin(): string {
  if (typeof window === "undefined") {
    return getPublicAppOrigin();
  }

  const browserOrigin = normalizeOrigin(window.location.origin);

  if (
    process.env.NODE_ENV === "production" &&
    isLocalOrigin(browserOrigin)
  ) {
    return getPublicAppOrigin();
  }

  return browserOrigin ?? getPublicAppOrigin();
}

export function safeRelativePath(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  const trimmed = value?.trim();

  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, "https://guestnix.local");
    if (parsed.origin !== "https://guestnix.local") return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function authStatusPath(
  flow: "signup" | "magic" | "signin",
  next = "/dashboard"
): string {
  const params = new URLSearchParams({
    flow,
    next: safeRelativePath(next),
  });

  return `/auth/verified?${params.toString()}`;
}

export function authCallbackUrl(
  redirect = "/dashboard",
  origin?: string | null
): string {
  const url = new URL(
    "/api/auth/callback",
    normalizeOrigin(origin) ?? getPublicAppOrigin()
  );
  url.searchParams.set("redirect", safeRelativePath(redirect));
  return url.toString();
}
