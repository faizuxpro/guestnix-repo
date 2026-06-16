import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";

export const NOTIFICATION_TYPES = [
  "system",
  "guidebook_invitation",
  "guidebook_invitation_accepted",
  "ownership_transfer",
  "ownership_transfer_accepted",
  "ownership_transfer_canceled",
  "store_request",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationMetadata = Record<string, unknown>;

export type NotificationItem = {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string;
  href: string | null;
  sourceType: string | null;
  sourceId: string | null;
  metadata: NotificationMetadata;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type NotificationInput = {
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  href?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  metadata?: NotificationMetadata;
};

type SourceInput = {
  userId: string;
  sourceType: string;
  sourceId: string;
};

function serializeMetadata(value: unknown): NotificationMetadata {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as NotificationMetadata;
  }
  return {};
}

export function serializeNotification(
  row: typeof notifications.$inferSelect
): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    metadata: serializeMetadata(row.metadata),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createUserNotification(input: NotificationInput) {
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      metadata: input.metadata ?? {},
    })
    .returning();

  return row ? serializeNotification(row) : null;
}

export async function upsertSourceNotification(input: NotificationInput) {
  if (!input.sourceType || !input.sourceId) {
    return createUserNotification(input);
  }

  const now = new Date();
  const [row] = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      metadata: input.metadata ?? {},
      readAt: null,
      archivedAt: null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        notifications.userId,
        notifications.sourceType,
        notifications.sourceId,
      ],
      set: {
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        metadata: input.metadata ?? {},
        readAt: null,
        archivedAt: null,
        updatedAt: now,
      },
    })
    .returning();

  return row ? serializeNotification(row) : null;
}

export async function archiveSourceNotification(input: SourceInput) {
  const now = new Date();
  await db
    .update(notifications)
    .set({
      readAt: now,
      archivedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(notifications.userId, input.userId),
        eq(notifications.sourceType, input.sourceType),
        eq(notifications.sourceId, input.sourceId)
      )
    );
}

export async function markUserNotificationsRead(userId: string, ids?: string[]) {
  const now = new Date();
  const filters = [
    eq(notifications.userId, userId),
    isNull(notifications.readAt),
    isNull(notifications.archivedAt),
  ];

  if (ids && ids.length > 0) {
    filters.push(inArray(notifications.id, ids));
  }

  await db
    .update(notifications)
    .set({ readAt: now, updatedAt: now })
    .where(and(...filters));
}

export async function listUserNotifications(userId: string, limit = 10) {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.archivedAt)))
    .orderBy(sql`${notifications.readAt} IS NULL DESC`, desc(notifications.createdAt))
    .limit(limit);

  return rows.map(serializeNotification);
}

export async function getUnreadNotificationCount(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
        isNull(notifications.archivedAt)
      )
    );

  return Number(row?.count ?? 0);
}

export async function getNotificationSummary(userId: string, limit = 10) {
  const [items, unreadCount] = await Promise.all([
    listUserNotifications(userId, limit),
    getUnreadNotificationCount(userId),
  ]);

  return { items, unreadCount };
}

export function collaborationInvitationNotification(input: {
  recipientUserId: string;
  invitationId: string;
  guidebookId: string;
  guidebookTitle: string;
  inviterName: string | null;
  token: string;
  expiresAt: Date;
}) {
  const inviter = input.inviterName?.trim() || "A Guestnix host";
  return upsertSourceNotification({
    userId: input.recipientUserId,
    type: "guidebook_invitation",
    title: "Guidebook invitation",
    body: `${inviter} invited you to edit "${input.guidebookTitle}".`,
    href: `/guidebook-invitations/${encodeURIComponent(input.token)}`,
    sourceType: "guidebook_invitation",
    sourceId: input.invitationId,
    metadata: {
      guidebookId: input.guidebookId,
      guidebookTitle: input.guidebookTitle,
      inviterName: input.inviterName,
      expiresAt: input.expiresAt.toISOString(),
    },
  });
}

export function storeRequestNotification(input: {
  hostUserId: string;
  requestId: string;
  requestCode: string;
  guidebookId: string;
  guidebookTitle: string;
  guestName: string;
  subtotalLabel: string;
}) {
  const guestName = input.guestName.trim() || "A guest";
  return upsertSourceNotification({
    userId: input.hostUserId,
    type: "store_request",
    title: "New Store request",
    body: `${guestName} requested items from "${input.guidebookTitle}" (${input.subtotalLabel}).`,
    href: `/dashboard/store?request=${encodeURIComponent(input.requestId)}`,
    sourceType: "store_request",
    sourceId: input.requestId,
    metadata: {
      requestId: input.requestId,
      requestCode: input.requestCode,
      guidebookId: input.guidebookId,
      guidebookTitle: input.guidebookTitle,
      guestName,
      subtotalLabel: input.subtotalLabel,
    },
  });
}

export function ownershipTransferNotification(input: {
  recipientUserId: string;
  transferId: string;
  guidebookId: string;
  guidebookTitle: string;
  inviterName: string | null;
  token: string;
  expiresAt: Date;
}) {
  const inviter = input.inviterName?.trim() || "A Guestnix host";
  return upsertSourceNotification({
    userId: input.recipientUserId,
    type: "ownership_transfer",
    title: "Ownership transfer request",
    body: `${inviter} wants to transfer "${input.guidebookTitle}" to you.`,
    href: `/ownership-transfers/${encodeURIComponent(input.token)}`,
    sourceType: "ownership_transfer",
    sourceId: input.transferId,
    metadata: {
      guidebookId: input.guidebookId,
      guidebookTitle: input.guidebookTitle,
      inviterName: input.inviterName,
      expiresAt: input.expiresAt.toISOString(),
    },
  });
}
