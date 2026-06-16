import "server-only";

import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { z } from "zod";
import {
  isAnnouncementSuppressedForUser,
  sanitizeAnnouncementHref as sanitizeAnnouncementHrefRule,
} from "@/lib/announcement-rules";
import { db } from "@/lib/db";
import {
  announcementCampaigns,
  announcementEvents,
  announcementRecipients,
  profiles,
  subscriptions,
} from "@/lib/db/schema";

export const ANNOUNCEMENT_STATUSES = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "archived",
] as const;

export const ANNOUNCEMENT_TONES = [
  "info",
  "success",
  "warning",
  "critical",
  "launch",
  "promo",
  "maintenance",
  "billing",
  "security",
] as const;

export const ANNOUNCEMENT_DISPLAY_MODES = [
  "slim",
  "standard",
  "expanded",
  "critical",
  "popin",
] as const;

export const ANNOUNCEMENT_EVENT_TYPES = [
  "view",
  "dismiss",
  "snooze",
  "acknowledge",
  "expand",
  "cta_click",
] as const;

export const ANNOUNCEMENT_FREQUENCIES = [
  "until_dismissed",
  "once",
  "once_per_session",
  "daily",
  "always",
] as const;

const ACTIVITY_SEGMENTS = [
  "active_7d",
  "inactive_30d",
  "no_published_guidebook",
  "trial_ending_soon",
] as const;

export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];
export type AnnouncementTone = (typeof ANNOUNCEMENT_TONES)[number];
export type AnnouncementDisplayMode =
  (typeof ANNOUNCEMENT_DISPLAY_MODES)[number];
export type AnnouncementEventType = (typeof ANNOUNCEMENT_EVENT_TYPES)[number];
export type AnnouncementFrequency = (typeof ANNOUNCEMENT_FREQUENCIES)[number];

export type AnnouncementAudienceFilter = {
  type:
    | "all"
    | "selected"
    | "plan"
    | "subscription_status"
    | "activity_segment";
  userIds?: string[];
  plans?: string[];
  subscriptionStatuses?: string[];
  activitySegment?: (typeof ACTIVITY_SEGMENTS)[number];
};

export type AnnouncementBehaviorConfig = {
  dismissible: boolean;
  pinned: boolean;
  requireAcknowledgement: boolean;
  snoozeEnabled: boolean;
  frequency: AnnouncementFrequency;
  snoozeHours: number;
  autoHideSeconds: number | null;
};

export type AnnouncementCampaignDto = {
  id: string;
  title: string;
  body: string;
  status: AnnouncementStatus | string;
  priority: number;
  tone: AnnouncementTone;
  displayMode: AnnouncementDisplayMode;
  icon: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  audienceFilter: AnnouncementAudienceFilter;
  behaviorConfig: AnnouncementBehaviorConfig;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementStats = {
  recipientCount: number;
  viewCount: number;
  clickCount: number;
  dismissedCount: number;
  acknowledgedCount: number;
  snoozedCount: number;
  expandedCount: number;
};

export type AnnouncementAdminListItem = AnnouncementCampaignDto & {
  stats: AnnouncementStats;
};

export type AnnouncementActiveDto = AnnouncementCampaignDto & {
  recipient: {
    id: string;
    state: string;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
    dismissedAt: string | null;
    acknowledgedAt: string | null;
    snoozedUntil: string | null;
    clickedAt: string | null;
    expandedAt: string | null;
    viewCount: number;
    clickCount: number;
  };
};

export type AnnouncementAudienceUser = {
  id: string;
  email: string;
  fullName: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AnnouncementRecipientAnalytics = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  state: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  dismissedAt: string | null;
  acknowledgedAt: string | null;
  snoozedUntil: string | null;
  clickedAt: string | null;
  expandedAt: string | null;
  viewCount: number;
  clickCount: number;
};

export class AnnouncementError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "AnnouncementError";
    this.status = status;
    this.details = details;
  }
}

const uuidSchema = z.string().uuid();

const audienceFilterSchema = z.object({
  type: z
    .enum(["all", "selected", "plan", "subscription_status", "activity_segment"])
    .default("all"),
  userIds: z.array(uuidSchema).max(500).optional(),
  plans: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  subscriptionStatuses: z
    .array(z.string().trim().min(1).max(40))
    .max(20)
    .optional(),
  activitySegment: z.enum(ACTIVITY_SEGMENTS).optional(),
});

const behaviorConfigSchema = z.object({
  dismissible: z.boolean().default(true),
  pinned: z.boolean().default(false),
  requireAcknowledgement: z.boolean().default(false),
  snoozeEnabled: z.boolean().default(false),
  frequency: z.enum(ANNOUNCEMENT_FREQUENCIES).default("until_dismissed"),
  snoozeHours: z.coerce.number().int().min(1).max(720).default(24),
  autoHideSeconds: z.coerce.number().int().min(3).max(120).nullable().default(null),
});

export const announcementCampaignInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(600),
  priority: z.coerce.number().int().min(0).max(100).default(20),
  tone: z.enum(ANNOUNCEMENT_TONES).default("info"),
  displayMode: z.enum(ANNOUNCEMENT_DISPLAY_MODES).default("standard"),
  icon: z.string().trim().min(1).max(40).default("megaphone"),
  ctaLabel: z.string().trim().max(40).nullable().optional(),
  ctaHref: z.string().trim().max(500).nullable().optional(),
  audienceFilter: audienceFilterSchema.default({ type: "all" }),
  behaviorConfig: behaviorConfigSchema.default({
    dismissible: true,
    pinned: false,
    requireAcknowledgement: false,
    snoozeEnabled: false,
    frequency: "until_dismissed",
    snoozeHours: 24,
    autoHideSeconds: null,
  }),
  startsAt: z.string().trim().nullable().optional(),
  endsAt: z.string().trim().nullable().optional(),
});

export const announcementEventInputSchema = z.object({
  eventType: z.enum(ANNOUNCEMENT_EVENT_TYPES),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const announcementActionInputSchema = z.object({
  action: z.enum(["publish", "pause", "archive", "resume", "unarchive"]),
});

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseOptionalDate(value: string | null | undefined, field: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new AnnouncementError(`${field} must be a valid date`, 400);
  }
  return date;
}

function sanitizeNullableText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function sanitizeAnnouncementHref(value: string | null | undefined) {
  try {
    return sanitizeAnnouncementHrefRule(value);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "CTA URL must be a relative app path or an HTTPS URL";
    throw new AnnouncementError(message, 400);
  }
}

function normalizeAudienceFilter(value: unknown): AnnouncementAudienceFilter {
  const parsed = audienceFilterSchema.safeParse(value ?? { type: "all" });
  if (!parsed.success) return { type: "all" };

  const filter = parsed.data;
  if (filter.type === "selected") {
    return { type: "selected", userIds: filter.userIds ?? [] };
  }
  if (filter.type === "plan") {
    return { type: "plan", plans: filter.plans ?? [] };
  }
  if (filter.type === "subscription_status") {
    return {
      type: "subscription_status",
      subscriptionStatuses: filter.subscriptionStatuses ?? [],
    };
  }
  if (filter.type === "activity_segment") {
    return {
      type: "activity_segment",
      activitySegment: filter.activitySegment ?? "active_7d",
    };
  }
  return { type: "all" };
}

function normalizeBehaviorConfig(value: unknown): AnnouncementBehaviorConfig {
  const parsed = behaviorConfigSchema.safeParse(value ?? {});
  const config = parsed.success ? parsed.data : behaviorConfigSchema.parse({});

  return {
    ...config,
    dismissible: config.pinned ? false : config.dismissible,
  };
}

function normalizeTone(value: string): AnnouncementTone {
  return ANNOUNCEMENT_TONES.includes(value as AnnouncementTone)
    ? (value as AnnouncementTone)
    : "info";
}

function normalizeDisplayMode(value: string): AnnouncementDisplayMode {
  return ANNOUNCEMENT_DISPLAY_MODES.includes(value as AnnouncementDisplayMode)
    ? (value as AnnouncementDisplayMode)
    : "standard";
}

function serializeCampaign(
  row: typeof announcementCampaigns.$inferSelect
): AnnouncementCampaignDto {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    status: row.status,
    priority: row.priority,
    tone: normalizeTone(row.tone),
    displayMode: normalizeDisplayMode(row.displayMode),
    icon: row.icon,
    ctaLabel: row.ctaLabel,
    ctaHref: row.ctaHref,
    audienceFilter: normalizeAudienceFilter(row.audienceFilter),
    behaviorConfig: normalizeBehaviorConfig(row.behaviorConfig),
    startsAt: toIso(row.startsAt),
    endsAt: toIso(row.endsAt),
    publishedAt: toIso(row.publishedAt),
    archivedAt: toIso(row.archivedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeAudienceUser(row: {
  id: string;
  email: string;
  fullName: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}): AnnouncementAudienceUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    plan: row.plan,
    subscriptionStatus: row.subscriptionStatus,
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date().toISOString(),
  };
}

async function resolveAudienceUsers(
  rawFilter: unknown,
  options: { limit?: number } = {}
) {
  const filter = normalizeAudienceFilter(rawFilter);
  const limit = options.limit ?? 5000;
  const where: SQL[] = [];
  const now = new Date();

  if (filter.type === "selected") {
    const ids = filter.userIds ?? [];
    if (ids.length === 0) return [];
    where.push(inArray(profiles.id, ids));
  }

  if (filter.type === "plan") {
    const plans = filter.plans ?? [];
    if (plans.length === 0) return [];
    where.push(
      or(inArray(subscriptions.plan, plans), inArray(profiles.plan, plans))!
    );
  }

  if (filter.type === "subscription_status") {
    const statuses = filter.subscriptionStatuses ?? [];
    if (statuses.length === 0) return [];
    where.push(inArray(subscriptions.status, statuses));
  }

  if (filter.type === "activity_segment") {
    const segment = filter.activitySegment ?? "active_7d";
    if (segment === "active_7d") {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      where.push(sql`(
        ${profiles.updatedAt} >= ${cutoff}
        OR EXISTS (
          SELECT 1 FROM guidebooks
          WHERE guidebooks.user_id = ${profiles.id}
            AND guidebooks.updated_at >= ${cutoff}
        )
        OR EXISTS (
          SELECT 1 FROM properties
          WHERE properties.user_id = ${profiles.id}
            AND properties.updated_at >= ${cutoff}
        )
      )`);
    }
    if (segment === "inactive_30d") {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.push(sql`(
        ${profiles.updatedAt} < ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM guidebooks
          WHERE guidebooks.user_id = ${profiles.id}
            AND guidebooks.updated_at >= ${cutoff}
        )
        AND NOT EXISTS (
          SELECT 1 FROM properties
          WHERE properties.user_id = ${profiles.id}
            AND properties.updated_at >= ${cutoff}
        )
      )`);
    }
    if (segment === "no_published_guidebook") {
      where.push(sql`NOT EXISTS (
        SELECT 1 FROM guidebooks
        WHERE guidebooks.user_id = ${profiles.id}
          AND guidebooks.status = 'published'
      )`);
    }
    if (segment === "trial_ending_soon") {
      const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      where.push(sql`(
        ${subscriptions.status} = 'trialing'
        AND ${subscriptions.trialEndsAt} IS NOT NULL
        AND ${subscriptions.trialEndsAt} >= ${now}
        AND ${subscriptions.trialEndsAt} <= ${soon}
      )`);
    }
  }

  let query = db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      plan: sql<string | null>`coalesce(${subscriptions.plan}, ${profiles.plan})`,
      subscriptionStatus: subscriptions.status,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .leftJoin(subscriptions, eq(subscriptions.userId, profiles.id))
    .$dynamic();

  if (where.length > 0) {
    query = query.where(and(...where));
  }

  return query.orderBy(desc(profiles.createdAt)).limit(limit);
}

export async function listAnnouncementAudienceUsers(limit = 500) {
  const rows = await resolveAudienceUsers({ type: "all" }, { limit });
  return rows.map(serializeAudienceUser);
}

export async function previewAnnouncementAudience(rawFilter: unknown) {
  const rows = await resolveAudienceUsers(rawFilter, { limit: 5000 });
  return {
    count: rows.length,
    sample: rows.slice(0, 20).map(serializeAudienceUser),
  };
}

async function materializeCampaignRecipients(campaignId: string) {
  const campaign = await db.query.announcementCampaigns.findFirst({
    where: eq(announcementCampaigns.id, campaignId),
  });

  if (!campaign) {
    throw new AnnouncementError("Announcement campaign not found", 404);
  }

  const users = await resolveAudienceUsers(campaign.audienceFilter);
  const values = users.map((user) => ({
    campaignId,
    userId: user.id,
  }));

  for (let i = 0; i < values.length; i += 500) {
    const chunk = values.slice(i, i + 500);
    if (chunk.length === 0) continue;
    await db
      .insert(announcementRecipients)
      .values(chunk)
      .onConflictDoNothing({
        target: [
          announcementRecipients.campaignId,
          announcementRecipients.userId,
        ],
      });
  }

  return values.length;
}

export async function createAnnouncementCampaign(input: unknown, adminUserId: string) {
  const parsed = announcementCampaignInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AnnouncementError("Invalid announcement campaign", 400, parsed.error);
  }

  const startsAt = parseOptionalDate(parsed.data.startsAt, "Start date");
  const endsAt = parseOptionalDate(parsed.data.endsAt, "End date");
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new AnnouncementError("End date must be after start date", 400);
  }

  const ctaHref = sanitizeAnnouncementHref(parsed.data.ctaHref);
  const [row] = await db
    .insert(announcementCampaigns)
    .values({
      title: parsed.data.title,
      body: parsed.data.body,
      priority: parsed.data.priority,
      tone: parsed.data.tone,
      displayMode: parsed.data.displayMode,
      icon: parsed.data.icon,
      ctaLabel: sanitizeNullableText(parsed.data.ctaLabel),
      ctaHref,
      audienceFilter: parsed.data.audienceFilter,
      behaviorConfig: parsed.data.behaviorConfig,
      startsAt,
      endsAt,
      createdBy: adminUserId,
    })
    .returning();

  return serializeCampaign(row);
}

export async function updateAnnouncementCampaign(
  campaignId: string,
  input: unknown
) {
  const parsed = announcementCampaignInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AnnouncementError("Invalid announcement campaign", 400, parsed.error);
  }

  const existing = await db.query.announcementCampaigns.findFirst({
    where: eq(announcementCampaigns.id, campaignId),
  });
  if (!existing || existing.status === "archived") {
    throw new AnnouncementError("Announcement campaign not found", 404);
  }

  const startsAt = parseOptionalDate(parsed.data.startsAt, "Start date");
  const endsAt = parseOptionalDate(parsed.data.endsAt, "End date");
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new AnnouncementError("End date must be after start date", 400);
  }

  const [row] = await db
    .update(announcementCampaigns)
    .set({
      title: parsed.data.title,
      body: parsed.data.body,
      priority: parsed.data.priority,
      tone: parsed.data.tone,
      displayMode: parsed.data.displayMode,
      icon: parsed.data.icon,
      ctaLabel: sanitizeNullableText(parsed.data.ctaLabel),
      ctaHref: sanitizeAnnouncementHref(parsed.data.ctaHref),
      audienceFilter: parsed.data.audienceFilter,
      behaviorConfig: parsed.data.behaviorConfig,
      startsAt,
      endsAt,
      updatedAt: new Date(),
    })
    .where(eq(announcementCampaigns.id, campaignId))
    .returning();

  return serializeCampaign(row);
}

export async function runAnnouncementCampaignAction(
  campaignId: string,
  adminUserId: string,
  action: "publish" | "pause" | "archive" | "resume" | "unarchive"
) {
  const campaign = await db.query.announcementCampaigns.findFirst({
    where: eq(announcementCampaigns.id, campaignId),
  });
  if (!campaign) {
    throw new AnnouncementError("Announcement campaign not found", 404);
  }

  const now = new Date();
  if (action === "archive") {
    const [row] = await db
      .update(announcementCampaigns)
      .set({
        status: "archived",
        archivedAt: now,
        updatedAt: now,
      })
      .where(eq(announcementCampaigns.id, campaignId))
      .returning();
    return serializeCampaign(row);
  }

  if (action === "unarchive") {
    const nextStatus = campaign.publishedAt ? "paused" : "draft";
    const [row] = await db
      .update(announcementCampaigns)
      .set({
        status: nextStatus,
        archivedAt: null,
        updatedAt: now,
      })
      .where(eq(announcementCampaigns.id, campaignId))
      .returning();
    return serializeCampaign(row);
  }

  if (action === "pause") {
    const [row] = await db
      .update(announcementCampaigns)
      .set({ status: "paused", updatedAt: now })
      .where(eq(announcementCampaigns.id, campaignId))
      .returning();
    return serializeCampaign(row);
  }

  if (action === "publish" || action === "resume") {
    await materializeCampaignRecipients(campaignId);
    const startsAt = campaign.startsAt;
    const nextStatus = startsAt && startsAt > now ? "scheduled" : "active";
    const [row] = await db
      .update(announcementCampaigns)
      .set({
        status: nextStatus,
        publishedBy: campaign.publishedBy ?? adminUserId,
        publishedAt: campaign.publishedAt ?? now,
        archivedAt: null,
        updatedAt: now,
      })
      .where(eq(announcementCampaigns.id, campaignId))
      .returning();
    return serializeCampaign(row);
  }

  throw new AnnouncementError("Unsupported announcement action", 400);
}

export async function deleteAnnouncementCampaign(campaignId: string) {
  const [deleted] = await db
    .delete(announcementCampaigns)
    .where(eq(announcementCampaigns.id, campaignId))
    .returning({ id: announcementCampaigns.id });

  if (!deleted) {
    throw new AnnouncementError("Announcement campaign not found", 404);
  }

  return { success: true };
}

async function activateDueCampaigns() {
  const now = new Date();
  const rows = await db
    .select({ id: announcementCampaigns.id })
    .from(announcementCampaigns)
    .where(
      and(
        eq(announcementCampaigns.status, "scheduled"),
        isNull(announcementCampaigns.archivedAt),
        or(isNull(announcementCampaigns.startsAt), lte(announcementCampaigns.startsAt, now))
      )
    );

  for (const row of rows) {
    await materializeCampaignRecipients(row.id);
    await db
      .update(announcementCampaigns)
      .set({ status: "active", updatedAt: now })
      .where(eq(announcementCampaigns.id, row.id));
  }
}

function isRecipientSuppressed(
  campaign: typeof announcementCampaigns.$inferSelect,
  recipient: typeof announcementRecipients.$inferSelect,
  now: Date
) {
  const behavior = normalizeBehaviorConfig(campaign.behaviorConfig);
  return isAnnouncementSuppressedForUser(
    behavior,
    {
      dismissedAt: recipient.dismissedAt,
      acknowledgedAt: recipient.acknowledgedAt,
      snoozedUntil: recipient.snoozedUntil,
      firstSeenAt: recipient.firstSeenAt,
      lastSeenAt: recipient.lastSeenAt,
    },
    now
  );
}

function serializeActiveAnnouncement(input: {
  campaign: typeof announcementCampaigns.$inferSelect;
  recipient: typeof announcementRecipients.$inferSelect;
}): AnnouncementActiveDto {
  return {
    ...serializeCampaign(input.campaign),
    recipient: {
      id: input.recipient.id,
      state: input.recipient.state,
      firstSeenAt: toIso(input.recipient.firstSeenAt),
      lastSeenAt: toIso(input.recipient.lastSeenAt),
      dismissedAt: toIso(input.recipient.dismissedAt),
      acknowledgedAt: toIso(input.recipient.acknowledgedAt),
      snoozedUntil: toIso(input.recipient.snoozedUntil),
      clickedAt: toIso(input.recipient.clickedAt),
      expandedAt: toIso(input.recipient.expandedAt),
      viewCount: input.recipient.viewCount,
      clickCount: input.recipient.clickCount,
    },
  };
}

export async function listActiveAnnouncementsForUser(userId: string) {
  await activateDueCampaigns();
  const now = new Date();
  const rows = await db
    .select({
      campaign: announcementCampaigns,
      recipient: announcementRecipients,
    })
    .from(announcementRecipients)
    .innerJoin(
      announcementCampaigns,
      eq(announcementRecipients.campaignId, announcementCampaigns.id)
    )
    .where(
      and(
        eq(announcementRecipients.userId, userId),
        inArray(announcementCampaigns.status, ["active", "scheduled"]),
        isNull(announcementCampaigns.archivedAt),
        or(isNull(announcementCampaigns.startsAt), lte(announcementCampaigns.startsAt, now)),
        or(isNull(announcementCampaigns.endsAt), gt(announcementCampaigns.endsAt, now))
      )
    )
    .orderBy(
      desc(announcementCampaigns.priority),
      desc(announcementCampaigns.createdAt)
    )
    .limit(20);

  return rows
    .filter((row) => !isRecipientSuppressed(row.campaign, row.recipient, now))
    .map(serializeActiveAnnouncement);
}

export async function getActiveAnnouncementForUser(userId: string) {
  const announcements = await listActiveAnnouncementsForUser(userId);
  return announcements[0] ?? null;
}

export async function recordAnnouncementEvent(
  campaignId: string,
  userId: string,
  input: unknown
) {
  const parsed = announcementEventInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new AnnouncementError("Invalid announcement event", 400, parsed.error);
  }

  const [row] = await db
    .select({
      campaign: announcementCampaigns,
      recipient: announcementRecipients,
    })
    .from(announcementRecipients)
    .innerJoin(
      announcementCampaigns,
      eq(announcementRecipients.campaignId, announcementCampaigns.id)
    )
    .where(
      and(
        eq(announcementRecipients.campaignId, campaignId),
        eq(announcementRecipients.userId, userId),
        isNull(announcementCampaigns.archivedAt)
      )
    )
    .limit(1);

  if (!row) {
    throw new AnnouncementError("Announcement campaign not found", 404);
  }

  const now = new Date();
  const behavior = normalizeBehaviorConfig(row.campaign.behaviorConfig);
  const eventType = parsed.data.eventType;
  if (eventType === "dismiss" && (!behavior.dismissible || behavior.pinned)) {
    throw new AnnouncementError("This announcement cannot be dismissed", 400);
  }
  if (eventType === "snooze" && !behavior.snoozeEnabled) {
    throw new AnnouncementError("This announcement cannot be snoozed", 400);
  }

  let recorded = true;
  if (eventType === "view") {
    const [recent] = await db
      .select({ id: announcementEvents.id })
      .from(announcementEvents)
      .where(
        and(
          eq(announcementEvents.campaignId, campaignId),
          eq(announcementEvents.userId, userId),
          eq(announcementEvents.eventType, "view"),
          sql`${announcementEvents.createdAt} > now() - interval '5 minutes'`
        )
      )
      .limit(1);
    recorded = !recent;
  }

  if (recorded) {
    await db.insert(announcementEvents).values({
      campaignId,
      userId,
      eventType,
      metadata: parsed.data.metadata ?? {},
    });
  }

  if (eventType === "view" && recorded) {
    await db
      .update(announcementRecipients)
      .set({
        firstSeenAt: row.recipient.firstSeenAt ?? now,
        lastSeenAt: now,
        state: row.recipient.state === "pending" ? "seen" : row.recipient.state,
        viewCount: sql`${announcementRecipients.viewCount} + 1`,
        updatedAt: now,
      })
      .where(eq(announcementRecipients.id, row.recipient.id));
  }

  if (eventType === "dismiss") {
    await db
      .update(announcementRecipients)
      .set({ dismissedAt: now, state: "dismissed", updatedAt: now })
      .where(eq(announcementRecipients.id, row.recipient.id));
  }

  if (eventType === "snooze") {
    const metadata = parsed.data.metadata ?? {};
    const metadataHours =
      typeof metadata.snoozeHours === "number" ? metadata.snoozeHours : null;
    const hours =
      metadataHours && metadataHours >= 1 && metadataHours <= 720
        ? Math.floor(metadataHours)
        : behavior.snoozeHours;
    await db
      .update(announcementRecipients)
      .set({
        snoozedUntil: new Date(now.getTime() + hours * 60 * 60 * 1000),
        state: "snoozed",
        updatedAt: now,
      })
      .where(eq(announcementRecipients.id, row.recipient.id));
  }

  if (eventType === "acknowledge") {
    await db
      .update(announcementRecipients)
      .set({ acknowledgedAt: now, state: "acknowledged", updatedAt: now })
      .where(eq(announcementRecipients.id, row.recipient.id));
  }

  if (eventType === "expand") {
    await db
      .update(announcementRecipients)
      .set({ expandedAt: now, updatedAt: now })
      .where(eq(announcementRecipients.id, row.recipient.id));
  }

  if (eventType === "cta_click") {
    await db
      .update(announcementRecipients)
      .set({
        clickedAt: now,
        clickCount: sql`${announcementRecipients.clickCount} + 1`,
        updatedAt: now,
      })
      .where(eq(announcementRecipients.id, row.recipient.id));
  }

  return { recorded };
}

async function getStatsMap(campaignIds: string[]) {
  if (campaignIds.length === 0) return new Map<string, AnnouncementStats>();
  const rows = await db
    .select({
      campaignId: announcementRecipients.campaignId,
      recipientCount: sql<number>`count(*)::int`,
      viewCount: sql<number>`coalesce(sum(${announcementRecipients.viewCount}), 0)::int`,
      clickCount: sql<number>`coalesce(sum(${announcementRecipients.clickCount}), 0)::int`,
      dismissedCount: sql<number>`count(*) filter (where ${announcementRecipients.dismissedAt} is not null)::int`,
      acknowledgedCount: sql<number>`count(*) filter (where ${announcementRecipients.acknowledgedAt} is not null)::int`,
      snoozedCount: sql<number>`count(*) filter (where ${announcementRecipients.snoozedUntil} is not null)::int`,
      expandedCount: sql<number>`count(*) filter (where ${announcementRecipients.expandedAt} is not null)::int`,
    })
    .from(announcementRecipients)
    .where(inArray(announcementRecipients.campaignId, campaignIds))
    .groupBy(announcementRecipients.campaignId);

  return new Map(
    rows.map((row) => [
      row.campaignId,
      {
        recipientCount: Number(row.recipientCount ?? 0),
        viewCount: Number(row.viewCount ?? 0),
        clickCount: Number(row.clickCount ?? 0),
        dismissedCount: Number(row.dismissedCount ?? 0),
        acknowledgedCount: Number(row.acknowledgedCount ?? 0),
        snoozedCount: Number(row.snoozedCount ?? 0),
        expandedCount: Number(row.expandedCount ?? 0),
      },
    ])
  );
}

const EMPTY_STATS: AnnouncementStats = {
  recipientCount: 0,
  viewCount: 0,
  clickCount: 0,
  dismissedCount: 0,
  acknowledgedCount: 0,
  snoozedCount: 0,
  expandedCount: 0,
};

export async function listAdminAnnouncementCampaigns() {
  await activateDueCampaigns();
  const rows = await db
    .select()
    .from(announcementCampaigns)
    .orderBy(desc(announcementCampaigns.createdAt))
    .limit(100);
  const stats = await getStatsMap(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...serializeCampaign(row),
    stats: stats.get(row.id) ?? EMPTY_STATS,
  }));
}

export async function getAdminAnnouncementCampaign(campaignId: string) {
  const campaign = await db.query.announcementCampaigns.findFirst({
    where: eq(announcementCampaigns.id, campaignId),
  });
  if (!campaign) {
    throw new AnnouncementError("Announcement campaign not found", 404);
  }

  const stats = await getStatsMap([campaignId]);
  const [recentEvents, recipients] = await Promise.all([
    db
    .select({
      id: announcementEvents.id,
      eventType: announcementEvents.eventType,
      metadata: announcementEvents.metadata,
      createdAt: announcementEvents.createdAt,
      userId: announcementEvents.userId,
      userEmail: profiles.email,
      userName: profiles.fullName,
    })
    .from(announcementEvents)
    .leftJoin(profiles, eq(profiles.id, announcementEvents.userId))
    .where(eq(announcementEvents.campaignId, campaignId))
    .orderBy(desc(announcementEvents.createdAt))
      .limit(50),
    db
      .select({
        id: announcementRecipients.id,
        userId: announcementRecipients.userId,
        userEmail: profiles.email,
        userName: profiles.fullName,
        plan: sql<string | null>`coalesce(${subscriptions.plan}, ${profiles.plan})`,
        subscriptionStatus: subscriptions.status,
        state: announcementRecipients.state,
        firstSeenAt: announcementRecipients.firstSeenAt,
        lastSeenAt: announcementRecipients.lastSeenAt,
        dismissedAt: announcementRecipients.dismissedAt,
        acknowledgedAt: announcementRecipients.acknowledgedAt,
        snoozedUntil: announcementRecipients.snoozedUntil,
        clickedAt: announcementRecipients.clickedAt,
        expandedAt: announcementRecipients.expandedAt,
        viewCount: announcementRecipients.viewCount,
        clickCount: announcementRecipients.clickCount,
      })
      .from(announcementRecipients)
      .leftJoin(profiles, eq(profiles.id, announcementRecipients.userId))
      .leftJoin(subscriptions, eq(subscriptions.userId, announcementRecipients.userId))
      .where(eq(announcementRecipients.campaignId, campaignId))
      .orderBy(desc(announcementRecipients.updatedAt))
      .limit(1000),
  ]);

  return {
    campaign: {
      ...serializeCampaign(campaign),
      stats: stats.get(campaignId) ?? EMPTY_STATS,
    },
    recentEvents: recentEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      metadata: event.metadata ?? {},
      createdAt: event.createdAt.toISOString(),
      userId: event.userId,
      userEmail: event.userEmail,
      userName: event.userName,
    })),
    recipients: recipients.map((recipient): AnnouncementRecipientAnalytics => ({
      id: recipient.id,
      userId: recipient.userId,
      userEmail: recipient.userEmail,
      userName: recipient.userName,
      plan: recipient.plan,
      subscriptionStatus: recipient.subscriptionStatus,
      state: recipient.state,
      firstSeenAt: toIso(recipient.firstSeenAt),
      lastSeenAt: toIso(recipient.lastSeenAt),
      dismissedAt: toIso(recipient.dismissedAt),
      acknowledgedAt: toIso(recipient.acknowledgedAt),
      snoozedUntil: toIso(recipient.snoozedUntil),
      clickedAt: toIso(recipient.clickedAt),
      expandedAt: toIso(recipient.expandedAt),
      viewCount: recipient.viewCount,
      clickCount: recipient.clickCount,
    })),
  };
}
