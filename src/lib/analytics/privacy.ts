export const ANALYTICS_CONSENT_KEY = "guestnix_analytics_consent";

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /email/i,
  /phone/i,
  /message/i,
  /content/i,
];

const ALLOWED_PROPERTY_KEYS = new Set([
  "area",
  "billing_interval",
  "currency",
  "domain_kind",
  "event_source",
  "flow",
  "guidebook_id",
  "guidebook_count",
  "is_first",
  "method",
  "mime_type",
  "page_path",
  "payment_status",
  "plan_name",
  "property_count",
  "publication_version",
  "request_status",
  "section",
  "source",
  "status",
  "store_item_count",
  "store_request_count",
  "storefront_enabled",
  "subtotal_cents",
  "template_id",
]);

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export function isProductionTelemetryEnabled() {
  return process.env.NODE_ENV === "production";
}

export function isPublicGuidebookPath(pathname: string) {
  return (
    pathname === "/g" ||
    pathname.startsWith("/g/") ||
    pathname === "/demo" ||
    pathname.startsWith("/demo/")
  );
}

export function isMarketingAnalyticsPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/auth/verified")
  );
}

export function isOwnedAppTelemetryPath(pathname: string) {
  return !isPublicGuidebookPath(pathname);
}

export function isAnalyticsConsentRequired() {
  return process.env.NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED === "true";
}

export function hasAnalyticsConsent() {
  if (!isAnalyticsConsentRequired()) return true;
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(ANALYTICS_CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function canLoadClientAnalytics(pathname: string) {
  return (
    isProductionTelemetryEnabled() &&
    isOwnedAppTelemetryPath(pathname) &&
    hasAnalyticsConsent()
  );
}

export function sanitizeAnalyticsProperties(
  properties: AnalyticsProperties = {}
) {
  const sanitized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTY_KEYS.has(key)) continue;
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
