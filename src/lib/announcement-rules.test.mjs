import assert from "node:assert/strict";
import test from "node:test";

const rulesModule = await import("./announcement-rules.ts");
const {
  sanitizeAnnouncementHref,
  isAnnouncementSuppressedForUser,
} = rulesModule.default ?? rulesModule;

const baseBehavior = {
  dismissible: true,
  pinned: false,
  requireAcknowledgement: false,
  snoozeEnabled: false,
  frequency: "until_dismissed",
  snoozeHours: 24,
  autoHideSeconds: null,
};

const baseState = {
  dismissedAt: null,
  acknowledgedAt: null,
  snoozedUntil: null,
  firstSeenAt: null,
  lastSeenAt: null,
};

test("sanitizes relative and HTTPS announcement CTA URLs", () => {
  assert.equal(sanitizeAnnouncementHref("/dashboard/settings"), "/dashboard/settings");
  assert.equal(
    sanitizeAnnouncementHref("https://guestnix.com/changelog"),
    "https://guestnix.com/changelog"
  );
  assert.equal(sanitizeAnnouncementHref("  "), null);
});

test("rejects unsafe announcement CTA URLs", () => {
  assert.throws(() => sanitizeAnnouncementHref("http://guestnix.com"));
  assert.throws(() => sanitizeAnnouncementHref("javascript:alert(1)"));
  assert.throws(() => sanitizeAnnouncementHref("//evil.example"));
});

test("suppresses dismissed and acknowledged announcements", () => {
  const now = new Date("2026-06-14T10:00:00.000Z");

  assert.equal(
    isAnnouncementSuppressedForUser(
      baseBehavior,
      { ...baseState, dismissedAt: new Date("2026-06-14T09:00:00.000Z") },
      now
    ),
    true
  );

  assert.equal(
    isAnnouncementSuppressedForUser(
      { ...baseBehavior, requireAcknowledgement: true },
      { ...baseState, acknowledgedAt: new Date("2026-06-14T09:00:00.000Z") },
      now
    ),
    true
  );
});

test("suppresses active snoozes but shows expired snoozes", () => {
  const now = new Date("2026-06-14T10:00:00.000Z");

  assert.equal(
    isAnnouncementSuppressedForUser(
      baseBehavior,
      { ...baseState, snoozedUntil: new Date("2026-06-14T11:00:00.000Z") },
      now
    ),
    true
  );

  assert.equal(
    isAnnouncementSuppressedForUser(
      baseBehavior,
      { ...baseState, snoozedUntil: new Date("2026-06-14T09:00:00.000Z") },
      now
    ),
    false
  );
});

test("honors once and daily announcement frequencies", () => {
  const now = new Date("2026-06-14T10:00:00.000Z");

  assert.equal(
    isAnnouncementSuppressedForUser(
      { ...baseBehavior, frequency: "once" },
      { ...baseState, firstSeenAt: new Date("2026-06-13T10:00:00.000Z") },
      now
    ),
    true
  );

  assert.equal(
    isAnnouncementSuppressedForUser(
      { ...baseBehavior, frequency: "daily" },
      { ...baseState, lastSeenAt: new Date("2026-06-14T01:00:00.000Z") },
      now
    ),
    true
  );

  assert.equal(
    isAnnouncementSuppressedForUser(
      { ...baseBehavior, frequency: "daily" },
      { ...baseState, lastSeenAt: new Date("2026-06-13T23:00:00.000Z") },
      now
    ),
    false
  );
});
