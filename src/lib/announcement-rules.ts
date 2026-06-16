export type AnnouncementVisibilityBehavior = {
  dismissible: boolean;
  pinned: boolean;
  requireAcknowledgement: boolean;
  snoozeEnabled: boolean;
  frequency: "until_dismissed" | "once" | "once_per_session" | "daily" | "always";
  snoozeHours: number;
  autoHideSeconds: number | null;
};

export type AnnouncementVisibilityState = {
  dismissedAt: Date | null;
  acknowledgedAt: Date | null;
  snoozedUntil: Date | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
};

function sameUtcDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function nullableTrimmed(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function sanitizeAnnouncementHref(value: string | null | undefined) {
  const trimmed = nullableTrimmed(value);
  if (!trimmed) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") return url.toString();
  } catch {
    // Return the validation error below.
  }

  throw new Error("CTA URL must be a relative app path or an HTTPS URL");
}

export function isAnnouncementSuppressedForUser(
  behavior: AnnouncementVisibilityBehavior,
  state: AnnouncementVisibilityState,
  now: Date
) {
  if (state.dismissedAt) return true;
  if (behavior.requireAcknowledgement && state.acknowledgedAt) return true;
  if (state.snoozedUntil && state.snoozedUntil > now) return true;
  if (behavior.frequency === "once" && state.firstSeenAt) return true;
  if (
    behavior.frequency === "daily" &&
    state.lastSeenAt &&
    sameUtcDay(state.lastSeenAt, now)
  ) {
    return true;
  }
  return false;
}
