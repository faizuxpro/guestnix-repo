import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  doublePrecision,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Profiles ──────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  /**
   * Monthly AI concierge message cap. NULL = unlimited (default).
   * Hosts set this themselves from /dashboard/settings?tab=ai.
   */
  aiMessageCap: integer("ai_message_cap"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    sourceType: text("source_type"),
    sourceId: text("source_id"),
    metadata: jsonb("metadata").notNull().default({}),
    readAt: timestamp("read_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_created").on(table.userId, table.createdAt),
    index("idx_notifications_user_unread").on(table.userId, table.readAt),
    uniqueIndex("idx_notifications_unique_source").on(
      table.userId,
      table.sourceType,
      table.sourceId
    ),
  ]
);

export const announcementCampaigns = pgTable(
  "announcement_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: text("status").notNull().default("draft"),
    priority: integer("priority").notNull().default(20),
    tone: text("tone").notNull().default("info"),
    displayMode: text("display_mode").notNull().default("standard"),
    icon: text("icon").notNull().default("megaphone"),
    ctaLabel: text("cta_label"),
    ctaHref: text("cta_href"),
    audienceFilter: jsonb("audience_filter").notNull().default({}),
    behaviorConfig: jsonb("behavior_config").notNull().default({}),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    publishedBy: uuid("published_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_announcement_campaigns_status_window").on(
      table.status,
      table.startsAt,
      table.endsAt
    ),
    index("idx_announcement_campaigns_created").on(table.createdAt),
  ]
);

export const announcementRecipients = pgTable(
  "announcement_recipients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => announcementCampaigns.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    state: text("state").notNull().default("pending"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    expandedAt: timestamp("expanded_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_announcement_recipients_campaign_user").on(
      table.campaignId,
      table.userId
    ),
    index("idx_announcement_recipients_user_state").on(table.userId, table.state),
    index("idx_announcement_recipients_campaign").on(table.campaignId),
  ]
);

export const announcementEvents = pgTable(
  "announcement_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => announcementCampaigns.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_announcement_events_campaign_created").on(
      table.campaignId,
      table.createdAt
    ),
    index("idx_announcement_events_user_created").on(table.userId, table.createdAt),
    index("idx_announcement_events_type").on(table.eventType),
  ]
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  properties: many(properties),
  guidebooks: many(guidebooks),
  subscriptions: many(subscriptions),
  assets: many(hostAssets),
  notifications: many(notifications),
  announcementRecipients: many(announcementRecipients),
  announcementEvents: many(announcementEvents),
  createdAnnouncementCampaigns: many(announcementCampaigns, {
    relationName: "announcementCampaignCreator",
  }),
  storeItems: many(storeItems),
  storeRequests: many(storeRequests),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
}));

// ─── Properties ────────────────────────────────────────
export const announcementCampaignsRelations = relations(
  announcementCampaigns,
  ({ many, one }) => ({
    recipients: many(announcementRecipients),
    events: many(announcementEvents),
    creator: one(profiles, {
      fields: [announcementCampaigns.createdBy],
      references: [profiles.id],
      relationName: "announcementCampaignCreator",
    }),
  })
);

export const announcementRecipientsRelations = relations(
  announcementRecipients,
  ({ one }) => ({
    campaign: one(announcementCampaigns, {
      fields: [announcementRecipients.campaignId],
      references: [announcementCampaigns.id],
    }),
    user: one(profiles, {
      fields: [announcementRecipients.userId],
      references: [profiles.id],
    }),
  })
);

export const announcementEventsRelations = relations(
  announcementEvents,
  ({ one }) => ({
    campaign: one(announcementCampaigns, {
      fields: [announcementEvents.campaignId],
      references: [announcementCampaigns.id],
    }),
    user: one(profiles, {
      fields: [announcementEvents.userId],
      references: [profiles.id],
    }),
  })
);

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    postalCode: text("postal_code"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    timezone: text("timezone").default("UTC"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_properties_user_id").on(table.userId)]
);

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  user: one(profiles, {
    fields: [properties.userId],
    references: [profiles.id],
  }),
  guidebooks: many(guidebooks),
}));

// ─── Guidebooks ────────────────────────────────────────
export const guidebooks = pgTable(
  "guidebooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id").references(() => properties.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    templateId: text("template_id").notNull().default("sunset-lakehouse"),
    status: text("status").notNull().default("draft"),
    branding: jsonb("branding").notNull().default({
      logo_url: null,
      primary_color: "#002927",
      secondary_color: "#d4a23a",
      accent_color: "#e8c36a",
      brand_gradient: null,
      background_color: "#faf6ef",
      background_gradient: null,
      background_pattern: "none",
      background_pattern_strength: 0.12,
      heading_font: "Fraunces",
      body_font: "Montserrat",
      heading_scale: 1,
      body_scale: 1,
      heading_weight: 500,
      body_weight: 400,
      heading_letter_spacing: -0.015,
      body_letter_spacing: 0,
      heading_line_height: 1.15,
      body_line_height: 1.62,
      icon_scale_feature: 1,
      icon_scale_nav: 1,
      font_family: "Montserrat",
      show_guestnix_branding: true,
    }),
    settings: jsonb("settings").notNull().default({
      custom_domain: null,
      custom_subdomain: null,
      pwa_enabled: true,
      ai_chat_enabled: true,
      password_protected: false,
      password: null,
    }),
    heroData: jsonb("hero_data").default({
      property: {
        name: "",
        tagline: "",
        address: "",
        city: "",
        country: "",
        cover_image_url: null,
        logo_url: null,
      },
      host: {
        name: "",
        phone: "",
        email: "",
        bio: "",
        languages: "",
        superhost: false,
        avatar_url: null,
        social: [],
      },
      home: {
        preset: "classic",
        button_style: "tower",
        button_label: "Enter Guide",
        button_animation: "pulse",
        button_speed: "normal",
        button_arrow_style: "triangle",
        host_label: "Hosted by",
        show: {
          logo: true,
          subtitle: true,
          host_name: true,
          phone: true,
          email: true,
          address: true,
        },
        logo: { size: "md" },
        background: {
          type: "image",
          position: { x: 50, y: 50 },
          overlay_opacity: 0.55,
          blur: 0,
          pattern: "none",
          color: "#002927",
          gradient_from: "#002927",
          gradient_to: "#0a4a47",
          gradient_angle: 135,
        },
      },
      host_page: {
        photo_source: "host_avatar",
        show: {
          avatar: true,
          bio: true,
          languages: true,
          superhost: true,
          phone: true,
          email: true,
          address: false,
          social: true,
        },
      },
    }),
    bottomNav: jsonb("bottom_nav").notNull().default([
      { type: "home",   label: "Home",   icon: "" },
      { type: "guide",  label: "Guide",  icon: "" },
      { type: "nearby", label: "Nearby", icon: "" },
      { type: "host",   label: "Host",   icon: "" },
    ]),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    /**
     * Points at the most recent row in `guidebook_publications` for this
     * guidebook. NULL until the host hits Publish at least once.
     */
    latestPublicationId: uuid("latest_publication_id"),
    draftRevision: integer("draft_revision").notNull().default(1),
    lastEditedBy: uuid("last_edited_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_guidebooks_user_id").on(table.userId),
    uniqueIndex("idx_guidebooks_slug").on(table.slug),
    index("idx_guidebooks_status").on(table.status),
  ]
);

export const guidebooksRelations = relations(guidebooks, ({ one, many }) => ({
  user: one(profiles, {
    fields: [guidebooks.userId],
    references: [profiles.id],
  }),
  property: one(properties, {
    fields: [guidebooks.propertyId],
    references: [properties.id],
  }),
  sections: many(guidebookSections),
  blocks: many(guidebookBlocks),
  places: many(guidebookPlaces),
  storefronts: many(guidebookStorefronts),
  storeRequests: many(storeRequests),
  publications: many(guidebookPublications),
  changeHistory: many(guidebookChangeHistory),
  collaborators: many(guidebookCollaborators),
  invitations: many(guidebookInvitations),
  ownershipTransfers: many(guidebookOwnershipTransfers),
}));

// ─── Guidebook Collaborators & Invitations ─────────────
export const guidebookCollaborators = pgTable(
  "guidebook_collaborators",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("editor"),
    invitedBy: uuid("invited_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_collaborators_guidebook_user").on(
      table.guidebookId,
      table.userId
    ),
    index("idx_collaborators_user").on(table.userId),
    index("idx_collaborators_guidebook").on(table.guidebookId),
  ]
);

export const guidebookCollaboratorsRelations = relations(
  guidebookCollaborators,
  ({ one }) => ({
    guidebook: one(guidebooks, {
      fields: [guidebookCollaborators.guidebookId],
      references: [guidebooks.id],
    }),
    user: one(profiles, {
      fields: [guidebookCollaborators.userId],
      references: [profiles.id],
    }),
    inviter: one(profiles, {
      fields: [guidebookCollaborators.invitedBy],
      references: [profiles.id],
    }),
  })
);

export const guidebookInvitations = pgTable(
  "guidebook_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor"),
    tokenHash: text("token_hash").notNull().unique(),
    status: text("status").notNull().default("pending"),
    invitedBy: uuid("invited_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    acceptedBy: uuid("accepted_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_invitations_token_hash").on(table.tokenHash),
    index("idx_invitations_guidebook").on(table.guidebookId),
    index("idx_invitations_email").on(table.email),
    index("idx_invitations_status").on(table.status),
  ]
);

export const guidebookInvitationsRelations = relations(
  guidebookInvitations,
  ({ one }) => ({
    guidebook: one(guidebooks, {
      fields: [guidebookInvitations.guidebookId],
      references: [guidebooks.id],
    }),
    inviter: one(profiles, {
      fields: [guidebookInvitations.invitedBy],
      references: [profiles.id],
    }),
    accepter: one(profiles, {
      fields: [guidebookInvitations.acceptedBy],
      references: [profiles.id],
    }),
  })
);

export const guidebookOwnershipTransfers = pgTable(
  "guidebook_ownership_transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    toEmail: text("to_email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    status: text("status").notNull().default("pending"),
    keepPreviousOwnerAsEditor: boolean("keep_previous_owner_as_editor")
      .notNull()
      .default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ownership_transfers_token_hash").on(table.tokenHash),
    index("idx_ownership_transfers_guidebook").on(table.guidebookId),
    index("idx_ownership_transfers_to_user").on(table.toUserId),
    index("idx_ownership_transfers_status").on(table.status),
  ]
);

export const guidebookOwnershipTransfersRelations = relations(
  guidebookOwnershipTransfers,
  ({ one }) => ({
    guidebook: one(guidebooks, {
      fields: [guidebookOwnershipTransfers.guidebookId],
      references: [guidebooks.id],
    }),
    fromUser: one(profiles, {
      fields: [guidebookOwnershipTransfers.fromUserId],
      references: [profiles.id],
    }),
    toUser: one(profiles, {
      fields: [guidebookOwnershipTransfers.toUserId],
      references: [profiles.id],
    }),
  })
);

// ─── Guidebook Publications (immutable snapshots) ─────
/**
 * Every successful Publish creates a row here and uploads a JSON blob to
 * Supabase Storage at `guidebook-publications/{slug}/v{N}.json`. The
 * public `/g/[slug]` page reads exclusively from the Storage blob — never
 * from `guidebooks/sections/blocks/places`. This decouples published
 * guidebooks from the editor's draft state AND from DB availability.
 */
export const guidebookChangeHistory = pgTable(
  "guidebook_change_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    actorRole: text("actor_role").notNull().default("editor"),
    action: text("action").notNull(),
    draftRevision: integer("draft_revision").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_change_history_guidebook_created").on(
      table.guidebookId,
      table.createdAt
    ),
    index("idx_change_history_actor").on(table.actorId),
  ]
);

export const guidebookChangeHistoryRelations = relations(
  guidebookChangeHistory,
  ({ one }) => ({
    guidebook: one(guidebooks, {
      fields: [guidebookChangeHistory.guidebookId],
      references: [guidebooks.id],
    }),
    actor: one(profiles, {
      fields: [guidebookChangeHistory.actorId],
      references: [profiles.id],
    }),
  })
);

export const guidebookPublications = pgTable(
  "guidebook_publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    slug: text("slug").notNull(),
    snapshotPath: text("snapshot_path").notNull(),
    snapshotBytes: integer("snapshot_bytes"),
    snapshotChecksum: text("snapshot_checksum"),
    publishedBy: uuid("published_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_publications_guidebook").on(table.guidebookId),
    uniqueIndex("idx_publications_guidebook_version").on(
      table.guidebookId,
      table.version
    ),
    index("idx_publications_slug").on(table.slug),
  ]
);

export const guidebookPublicationsRelations = relations(
  guidebookPublications,
  ({ one }) => ({
    guidebook: one(guidebooks, {
      fields: [guidebookPublications.guidebookId],
      references: [guidebooks.id],
    }),
    publisher: one(profiles, {
      fields: [guidebookPublications.publishedBy],
      references: [profiles.id],
    }),
  })
);

// ─── Sections ──────────────────────────────────────────
export const guidebookSections = pgTable(
  "guidebook_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    icon: text("icon").notNull().default(""),
    orderIndex: integer("order_index").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_sections_guidebook_id").on(table.guidebookId),
    index("idx_sections_order").on(table.guidebookId, table.orderIndex),
  ]
);

export const guidebookSectionsRelations = relations(
  guidebookSections,
  ({ one, many }) => ({
    guidebook: one(guidebooks, {
      fields: [guidebookSections.guidebookId],
      references: [guidebooks.id],
    }),
    blocks: many(guidebookBlocks),
  })
);

// ─── Blocks ────────────────────────────────────────────
export const guidebookBlocks = pgTable(
  "guidebook_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => guidebookSections.id, { onDelete: "cascade" }),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    content: jsonb("content").notNull().default({}),
    orderIndex: integer("order_index").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_blocks_section_id").on(table.sectionId),
    index("idx_blocks_guidebook_id").on(table.guidebookId),
    index("idx_blocks_order").on(table.sectionId, table.orderIndex),
  ]
);

export const guidebookBlocksRelations = relations(guidebookBlocks, ({ one }) => ({
  section: one(guidebookSections, {
    fields: [guidebookBlocks.sectionId],
    references: [guidebookSections.id],
  }),
  guidebook: one(guidebooks, {
    fields: [guidebookBlocks.guidebookId],
    references: [guidebooks.id],
  }),
}));

// ─── Templates ─────────────────────────────────────────
export const hostAssets = pgTable(
  "host_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    assetType: text("asset_type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    content: jsonb("content").notNull().default({}),
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    tags: jsonb("tags").notNull().default([]),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_host_assets_user_id").on(table.userId),
    index("idx_host_assets_user_type").on(table.userId, table.assetType),
    index("idx_host_assets_updated").on(table.updatedAt),
  ]
);

export const hostAssetsRelations = relations(hostAssets, ({ one }) => ({
  user: one(profiles, {
    fields: [hostAssets.userId],
    references: [profiles.id],
  }),
}));

export const templates = pgTable("templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  tier: text("tier").notNull().default("free"),
  config: jsonb("config").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Places ────────────────────────────────────────────
export const guidebookPlaces = pgTable(
  "guidebook_places",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull().default("other"),
    description: text("description"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    address: text("address"),
    phone: text("phone"),
    website: text("website"),
    email: text("email"),
    imageUrl: text("image_url"),
    tags: jsonb("tags").default({}),
    openingHours: text("opening_hours"),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idx_places_guidebook_id").on(table.guidebookId)]
);

export const guidebookPlacesRelations = relations(guidebookPlaces, ({ one }) => ({
  guidebook: one(guidebooks, {
    fields: [guidebookPlaces.guidebookId],
    references: [guidebooks.id],
  }),
}));

// ─── Chat Sessions ─────────────────────────────────────
// Store catalog, guidebook storefronts, and request threads
export const storeItems = pgTable(
  "store_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    itemType: text("item_type").notNull().default("product"),
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    unitLabel: text("unit_label"),
    category: text("category"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_store_items_user").on(table.userId),
    index("idx_store_items_user_active").on(table.userId, table.active),
    index("idx_store_items_user_type").on(table.userId, table.itemType),
    check(
      "store_items_item_type_check",
      sql`${table.itemType} IN ('product', 'service')`
    ),
  ]
);

export const storeItemsRelations = relations(storeItems, ({ one, many }) => ({
  user: one(profiles, {
    fields: [storeItems.userId],
    references: [profiles.id],
  }),
  storefrontItems: many(guidebookStorefrontItems),
  requestItems: many(storeRequestItems),
}));

export const storeSettings = pgTable(
  "store_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    paymentInstructions: text("payment_instructions"),
    paymentMethods: jsonb("payment_methods").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_store_settings_user").on(table.userId),
  ]
);

export const storeSettingsRelations = relations(storeSettings, ({ one }) => ({
  user: one(profiles, {
    fields: [storeSettings.userId],
    references: [profiles.id],
  }),
}));

export const guidebookStorefronts = pgTable(
  "guidebook_storefronts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(false),
    paymentMethodIds: jsonb("payment_method_ids").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_storefronts_guidebook").on(table.guidebookId),
    index("idx_storefronts_user").on(table.userId),
  ]
);

export const guidebookStorefrontsRelations = relations(
  guidebookStorefronts,
  ({ one, many }) => ({
    guidebook: one(guidebooks, {
      fields: [guidebookStorefronts.guidebookId],
      references: [guidebooks.id],
    }),
    user: one(profiles, {
      fields: [guidebookStorefronts.userId],
      references: [profiles.id],
    }),
    items: many(guidebookStorefrontItems),
    requests: many(storeRequests),
  })
);

export const guidebookStorefrontItems = pgTable(
  "guidebook_storefront_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storefrontId: uuid("storefront_id")
      .notNull()
      .references(() => guidebookStorefronts.id, { onDelete: "cascade" }),
    storeItemId: uuid("store_item_id")
      .notNull()
      .references(() => storeItems.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    visible: boolean("visible").notNull().default(true),
    maxQuantity: integer("max_quantity"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_storefront_items_unique").on(
      table.storefrontId,
      table.storeItemId
    ),
    index("idx_storefront_items_storefront").on(
      table.storefrontId,
      table.orderIndex
    ),
  ]
);

export const guidebookStorefrontItemsRelations = relations(
  guidebookStorefrontItems,
  ({ one }) => ({
    storefront: one(guidebookStorefronts, {
      fields: [guidebookStorefrontItems.storefrontId],
      references: [guidebookStorefronts.id],
    }),
    storeItem: one(storeItems, {
      fields: [guidebookStorefrontItems.storeItemId],
      references: [storeItems.id],
    }),
  })
);

export const storeRequests = pgTable(
  "store_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    storefrontId: uuid("storefront_id").references(() => guidebookStorefronts.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    chatSessionId: uuid("chat_session_id").references(() => chatSessions.id, {
      onDelete: "set null",
    }),
    requestCode: text("request_code").notNull().unique(),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone"),
    guestAccessTokenHash: text("guest_access_token_hash").notNull(),
    status: text("status").notNull().default("new"),
    paymentStatus: text("payment_status").notNull().default("external_pending"),
    currency: text("currency").notNull().default("USD"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    guestNote: text("guest_note"),
    hostNote: text("host_note"),
    requestedFor: timestamp("requested_for", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    paymentProofUrl: text("payment_proof_url"),
    paymentProofNote: text("payment_proof_note"),
    paymentProofSubmittedAt: timestamp("payment_proof_submitted_at", {
      withTimezone: true,
    }),
    paymentConfirmedAt: timestamp("payment_confirmed_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_store_requests_user_created").on(table.userId, table.createdAt),
    index("idx_store_requests_guidebook").on(table.guidebookId),
    index("idx_store_requests_status").on(table.userId, table.status),
    uniqueIndex("idx_store_requests_token_hash").on(table.guestAccessTokenHash),
    check(
      "store_requests_status_check",
      sql`${table.status} IN ('new', 'accepted', 'fulfilled', 'cancelled')`
    ),
    check(
      "store_requests_payment_status_check",
      sql`${table.paymentStatus} IN ('external_pending', 'proof_submitted', 'external_paid', 'not_required')`
    ),
  ]
);

export const storeRequestsRelations = relations(storeRequests, ({ one, many }) => ({
  guidebook: one(guidebooks, {
    fields: [storeRequests.guidebookId],
    references: [guidebooks.id],
  }),
  storefront: one(guidebookStorefronts, {
    fields: [storeRequests.storefrontId],
    references: [guidebookStorefronts.id],
  }),
  user: one(profiles, {
    fields: [storeRequests.userId],
    references: [profiles.id],
  }),
  chatSession: one(chatSessions, {
    fields: [storeRequests.chatSessionId],
    references: [chatSessions.id],
  }),
  items: many(storeRequestItems),
  messages: many(storeRequestMessages),
}));

export const storeRequestItems = pgTable(
  "store_request_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => storeRequests.id, { onDelete: "cascade" }),
    storeItemId: uuid("store_item_id").references(() => storeItems.id, {
      onDelete: "set null",
    }),
    itemName: text("item_name").notNull(),
    itemDescription: text("item_description"),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull().default(0),
  },
  (table) => [
    index("idx_store_request_items_request").on(table.requestId),
    index("idx_store_request_items_store_item").on(table.storeItemId),
  ]
);

export const storeRequestItemsRelations = relations(
  storeRequestItems,
  ({ one }) => ({
    request: one(storeRequests, {
      fields: [storeRequestItems.requestId],
      references: [storeRequests.id],
    }),
    storeItem: one(storeItems, {
      fields: [storeRequestItems.storeItemId],
      references: [storeItems.id],
    }),
  })
);

export const storeRequestMessages = pgTable(
  "store_request_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => storeRequests.id, { onDelete: "cascade" }),
    authorType: text("author_type").notNull(),
    authorUserId: uuid("author_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    guestName: text("guest_name"),
    guestEmail: text("guest_email"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_store_request_messages_request_created").on(
      table.requestId,
      table.createdAt
    ),
  ]
);

export const storeRequestMessagesRelations = relations(
  storeRequestMessages,
  ({ one }) => ({
    request: one(storeRequests, {
      fields: [storeRequestMessages.requestId],
      references: [storeRequests.id],
    }),
    author: one(profiles, {
      fields: [storeRequestMessages.authorUserId],
      references: [profiles.id],
    }),
  })
);

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull().unique(),
    guestName: text("guest_name"),
    guestEmail: text("guest_email"),
    aiEnabled: boolean("ai_enabled").notNull().default(true),
    hostEscalatedAt: timestamp("host_escalated_at", { withTimezone: true }),
    identityProvidedAt: timestamp("identity_provided_at", { withTimezone: true }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    hostLastReadAt: timestamp("host_last_read_at", { withTimezone: true }),
    hostArchivedAt: timestamp("host_archived_at", { withTimezone: true }),
    aiArchivedAt: timestamp("ai_archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_chat_sessions_guidebook").on(table.guidebookId),
    uniqueIndex("idx_chat_sessions_token").on(table.sessionToken),
    index("idx_chat_sessions_last_message").on(table.lastMessageAt),
  ]
);

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  guidebook: one(guidebooks, {
    fields: [chatSessions.guidebookId],
    references: [guidebooks.id],
  }),
  messages: many(chatMessages),
  storeRequests: many(storeRequests),
}));

// ─── Chat Messages ─────────────────────────────────────
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'guest' | 'ai' | 'host'
    content: text("content").notNull().default(""),
    toolCalls: jsonb("tool_calls"),
    senderUserId: uuid("sender_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    aiTokensIn: integer("ai_tokens_in"),
    aiTokensOut: integer("ai_tokens_out"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_chat_messages_session_created").on(table.sessionId, table.createdAt),
  ]
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
  sender: one(profiles, {
    fields: [chatMessages.senderUserId],
    references: [profiles.id],
  }),
}));

// ─── Chat Usage (per host per month) ───────────────────
export const chatUsage = pgTable(
  "chat_usage",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    periodStart: text("period_start").notNull(), // YYYY-MM-01 as text for trivial upsert
    aiResponses: integer("ai_responses").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_chat_usage_user_period").on(table.userId, table.periodStart),
  ]
);

// ─── Analytics Events ──────────────────────────────────
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").default({}),
    visitorId: text("visitor_id"),
    deviceType: text("device_type"),
    referrer: text("referrer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_analytics_guidebook").on(table.guidebookId),
    index("idx_analytics_created").on(table.createdAt),
    index("idx_analytics_type").on(table.guidebookId, table.eventType),
  ]
);

// ─── Subscriptions ─────────────────────────────────────
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /**
     * Provider-agnostic plan + billing state. `plan` is null until the host
     * finishes onboarding (picks a plan to start their trial). The app reads
     * THESE fields for entitlement — never the billing provider directly.
     */
    plan: text("plan"), // 'solo' | 'plus' | 'pro' | 'scale'
    provider: text("provider"), // 'gumroad' | 'stripe' | null (during trial)
    providerSubscriptionId: text("provider_subscription_id"),
    billingInterval: text("billing_interval").default("month"), // 'month' | 'year'
    /**
     * Trial expiry. Set to now+7d when a trial starts. Admins extend to
     * +14/+30d by editing this column directly in Drizzle Studio. A host is
     * entitled while status='active' OR (status='trialing' AND trialEndsAt > now).
     */
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    // 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
    status: text("status").notNull().default("active"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One subscription per user — enables upsert on userId.
    uniqueIndex("idx_subscriptions_user").on(table.userId),
    uniqueIndex("idx_subscriptions_stripe").on(table.stripeSubscriptionId),
  ]
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(profiles, {
    fields: [subscriptions.userId],
    references: [profiles.id],
  }),
}));

// ─── Custom Domains ────────────────────────────────────
export const customDomains = pgTable(
  "custom_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guidebookId: uuid("guidebook_id")
      .notNull()
      .references(() => guidebooks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    domain: text("domain").notNull().unique(),
    /**
     * Lifecycle status:
     *   pending  — host added the domain but DNS hasn't been verified yet
     *   verified — DNS records confirmed (CNAME/A + TXT) but TLS not active
     *   active   — TLS issued; provider is serving the domain
     *   error    — provider reported a non-recoverable error (see sslError)
     */
    status: text("status").notNull().default("pending"),
    /**
     * `subdomain` (e.g. guide.example.com) vs `apex` (e.g. example.com).
     * Determines whether DNS instructions show a CNAME or an A record.
     * Set on add via the `psl` public-suffix-list detector.
     */
    domainKind: text("domain_kind").notNull().default("subdomain"),
    verificationToken: text("verification_token"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    /**
     * Identifier returned by the active custom-domain provider (e.g.
     * Vercel's domain object id) so we can later call DELETE / status on
     * the exact resource we created.
     */
    providerDomainId: text("provider_domain_id"),
    providerData: jsonb("provider_data").notNull().default({}),
    sslStatus: text("ssl_status").notNull().default("pending"),
    sslError: text("ssl_error"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_domains_guidebook").on(table.guidebookId),
    uniqueIndex("idx_domains_domain").on(table.domain),
  ]
);

// ─── Payments (provider-agnostic idempotency ledger) ──
/**
 * One row per provider sale. The unique (provider, providerSaleId) index is
 * the idempotency key: webhooks insert-on-conflict-do-nothing so a re-delivered
 * Gumroad Ping is processed exactly once.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull(), // 'gumroad' | 'stripe'
    providerSaleId: text("provider_sale_id").notNull(),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    email: text("email"),
    plan: text("plan"),
    amount: integer("amount"), // cents, as reported by the provider
    couponCode: text("coupon_code"),
    raw: jsonb("raw"), // full webhook payload, for debugging / reconciliation
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_payments_provider_sale").on(
      table.provider,
      table.providerSaleId
    ),
    index("idx_payments_user").on(table.userId),
  ]
);

// ─── Coupons (platform-wide; % or $ off, with expiry) ──
/**
 * Our catalogue + validation + redemption tracking. The actual checkout
 * discount is enforced by the billing provider (a matching Gumroad offer
 * code now; Stripe promotion codes later). Created via Drizzle Studio.
 */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    discountType: text("discount_type").notNull(), // 'percent' | 'fixed'
    discountValue: integer("discount_value").notNull(), // percent 1..100, or cents
    appliesTo: text("applies_to").notNull().default("all"),
    maxRedemptions: integer("max_redemptions"), // null = unlimited
    redemptionCount: integer("redemption_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => profiles.id, {
      onDelete: "set null",
    }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_coupons_code").on(table.code),
    index("idx_coupons_archived_active").on(table.archivedAt, table.active),
  ]
);

// Admin Billing Audit Logs
export const adminBillingAuditLogs = pgTable(
  "admin_billing_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    before: jsonb("before").notNull().default({}),
    after: jsonb("after").notNull().default({}),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_admin_billing_audit_actor").on(table.actorUserId, table.createdAt),
    index("idx_admin_billing_audit_target").on(table.targetType, table.targetId),
    index("idx_admin_billing_audit_created").on(table.createdAt),
  ]
);
