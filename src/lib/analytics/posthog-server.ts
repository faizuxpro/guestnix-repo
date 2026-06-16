import { sanitizeAnalyticsProperties } from "./privacy";
import type { ProductAnalyticsInput } from "./product";

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const CAPTURE_TIMEOUT_MS = 1500;
const ALLOWED_PERSON_PROPERTY_KEYS = new Set([
  "app_user_id",
  "billing_interval",
  "guidebook_count",
  "onboarding_completed",
  "plan_name",
  "property_count",
  "published_guidebook_count",
  "subscription_status",
]);

type ProductPersonProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

function posthogHost() {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim().replace(/\/+$/, "") ||
    DEFAULT_POSTHOG_HOST
  );
}

function posthogCaptureUrl() {
  return `${posthogHost()}/i/v0/e/`;
}

function canTrackServerProductEvent() {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED !== "true" &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)
  );
}

export async function trackServerProductEvent({
  distinctId,
  event,
  properties,
}: ProductAnalyticsInput) {
  if (!canTrackServerProductEvent() || !distinctId) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);

  try {
    await fetch(posthogCaptureUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: sanitizeAnalyticsProperties(properties),
      }),
      signal: controller.signal,
    });
  } catch {
    // Product analytics must never block or break app workflows.
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizePersonProperties(properties: ProductPersonProperties = {}) {
  const sanitized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PERSON_PROPERTY_KEYS.has(key)) continue;
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

export async function identifyServerProductUser({
  distinctId,
  properties,
}: {
  distinctId: string;
  properties?: ProductPersonProperties;
}) {
  if (!canTrackServerProductEvent() || !distinctId) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);

  try {
    await fetch(posthogCaptureUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        event: "$identify",
        distinct_id: distinctId,
        properties: {
          $set: sanitizePersonProperties({
            app_user_id: distinctId,
            ...properties,
          }),
        },
      }),
      signal: controller.signal,
    });
  } catch {
    // Product analytics must never block or break app workflows.
  } finally {
    clearTimeout(timeout);
  }
}
