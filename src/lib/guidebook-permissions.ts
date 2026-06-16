import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  guidebookCollaborators,
  guidebooks,
} from "@/lib/db/schema";
import { checkEntitled } from "@/lib/billing/entitlements";
import {
  GUIDEBOOK_OWNER_REQUIRED_MESSAGE,
  GUIDEBOOK_UNAVAILABLE_MESSAGE,
} from "@/lib/guidebook-error-copy";

export type GuidebookRole = "owner" | "editor";
export type GuidebookRecord = typeof guidebooks.$inferSelect;

const ROLE_RANK: Record<GuidebookRole, number> = {
  editor: 1,
  owner: 2,
};

export const INVITE_TTL_DAYS = 7;

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function roleAtLeast(have: GuidebookRole, need: GuidebookRole): boolean {
  return ROLE_RANK[have] >= ROLE_RANK[need];
}

export function makeCollaborationToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashCollaborationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function collaborationTokenExpiry(now = new Date()): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function getGuidebookAccess(userId: string, guidebookId: string) {
  const guidebook = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.id, guidebookId),
  });

  if (!guidebook) {
    return { guidebook: null, role: null as GuidebookRole | null };
  }

  if (guidebook.userId === userId) {
    return { guidebook, role: "owner" as const };
  }

  const collaborator = await db.query.guidebookCollaborators.findFirst({
    where: and(
      eq(guidebookCollaborators.guidebookId, guidebookId),
      eq(guidebookCollaborators.userId, userId),
      eq(guidebookCollaborators.role, "editor")
    ),
  });

  return {
    guidebook,
    role: collaborator ? ("editor" as const) : null,
  };
}

export async function requireGuidebookAccess(
  userId: string,
  guidebookId: string,
  need: GuidebookRole
): Promise<
  | { ok: true; guidebook: GuidebookRecord; role: GuidebookRole }
  | { ok: false; status: 403 | 404; error: string }
> {
  const access = await getGuidebookAccess(userId, guidebookId);

  if (!access.guidebook) {
    return { ok: false, status: 404, error: GUIDEBOOK_UNAVAILABLE_MESSAGE };
  }

  if (!access.role) {
    return { ok: false, status: 404, error: GUIDEBOOK_UNAVAILABLE_MESSAGE };
  }

  if (!roleAtLeast(access.role, need)) {
    return { ok: false, status: 403, error: GUIDEBOOK_OWNER_REQUIRED_MESSAGE };
  }

  return { ok: true, guidebook: access.guidebook, role: access.role };
}

export async function requireGuidebookDraftEdit(userId: string, guidebookId: string) {
  const access = await requireGuidebookAccess(userId, guidebookId, "editor");
  if (!access.ok) return access;

  const guard = await checkEntitled(access.guidebook.userId);
  if (!guard.allowed) {
    return { ok: false as const, status: 402 as const, error: guard.reason };
  }

  return access;
}

export function isExpired(date: Date, now = new Date()): boolean {
  return date.getTime() <= now.getTime();
}

export async function touchGuidebookDraft(
  guidebookId: string,
  userId: string,
  now = new Date()
) {
  const [updated] = await db
    .update(guidebooks)
    .set({
      draftRevision: sql`${guidebooks.draftRevision} + 1`,
      lastEditedBy: userId,
      updatedAt: now,
    })
    .where(eq(guidebooks.id, guidebookId))
    .returning({
      draftRevision: guidebooks.draftRevision,
      updatedAt: guidebooks.updatedAt,
    });

  return updated ?? null;
}

export function serializeDraftTouch(
  touch: Awaited<ReturnType<typeof touchGuidebookDraft>> | null
) {
  if (!touch) return null;

  return {
    draftRevision: touch.draftRevision,
    updatedAt: touch.updatedAt.toISOString(),
  };
}
