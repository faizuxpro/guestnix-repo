"use client";

import posthog from "posthog-js";
import {
  canLoadClientAnalytics,
  sanitizeAnalyticsProperties,
  type AnalyticsProperties,
} from "./privacy";
import type { ProductEventName } from "./product";

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event",
      target: string,
      params?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

let posthogInitialized = false;

export function initPostHog(pathname: string) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || posthogInitialized || !canLoadClientAnalytics(pathname)) return;

  posthog.init(key, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    person_profiles: "identified_only",
  });
  posthogInitialized = true;
}

export function identifyProductUser(userId: string | null | undefined) {
  if (!posthogInitialized || !userId) return;
  posthog.identify(userId);
}

export function resetProductAnalytics() {
  if (!posthogInitialized) return;
  posthog.reset();
  posthogInitialized = false;
}

export function trackProductEvent(
  event: ProductEventName,
  properties?: AnalyticsProperties
) {
  if (!posthogInitialized) return;
  posthog.capture(event, sanitizeAnalyticsProperties(properties));
}

export function trackGaPageView(pathname: string) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId || !window.gtag) return;

  window.gtag("config", measurementId, {
    page_path: pathname,
  });
}

export function trackGaEvent(
  event: string,
  properties?: AnalyticsProperties
) {
  if (!window.gtag) return;
  window.gtag("event", event, sanitizeAnalyticsProperties(properties));
}
