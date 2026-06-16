"use client";

import type { AnalyticsEventType } from "@/lib/validations";
import { isHostPreviewMode } from "./host-preview";

const VISITOR_ID_KEY = "gn_vid";
const ENDPOINT = "/api/analytics";

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(VISITOR_ID_KEY, next);
    return next;
  } catch {
    // Privacy mode / disabled storage — emit anonymous events.
    return "";
  }
}

function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

type TrackInput = {
  guidebookId: string;
  eventType: AnalyticsEventType;
  metadata?: Record<string, unknown>;
};

/**
 * Fire an analytics event. Best-effort: failures are swallowed so guest UX
 * is never affected by analytics errors. Uses sendBeacon when available
 * so events fire reliably even on page unload.
 */
export function trackEvent({ guidebookId, eventType, metadata }: TrackInput) {
  if (typeof window === "undefined") return;
  if (isHostPreviewMode(guidebookId)) return;

  const payload = {
    guidebookId,
    eventType,
    visitorId: getOrCreateVisitorId() || undefined,
    deviceType: detectDeviceType(),
    referrer: document.referrer ? document.referrer.slice(0, 500) : undefined,
    metadata,
  };

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Swallow — analytics must never break the guest experience.
  }
}
