import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  guidebookBlocks,
  guidebookChangeHistory,
  guidebookPlaces,
  guidebooks,
  guidebookSections,
  properties,
} from "@/lib/db/schema";
import type { GuidebookRole } from "@/lib/guidebook-permissions";

export const HISTORY_LIMIT = 10;

type SnapshotGuidebook = {
  title: string;
  slug: string;
  templateId: string;
  propertyId: string | null;
  branding: unknown;
  settings: unknown;
  heroData: unknown;
  bottomNav: unknown;
};

type SnapshotSection = {
  id: string;
  title: string;
  icon: string;
  orderIndex: number;
  isVisible: boolean;
};

type SnapshotBlock = {
  id: string;
  sectionId: string;
  type: string;
  content: unknown;
  orderIndex: number;
  isVisible: boolean;
};

type SnapshotPlace = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  tags: unknown;
  openingHours: string | null;
  orderIndex: number;
};

export type GuidebookDraftSnapshot = {
  guidebook: SnapshotGuidebook;
  sections: SnapshotSection[];
  blocks: SnapshotBlock[];
  places: SnapshotPlace[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isGuidebookDraftSnapshot(
  value: unknown
): value is GuidebookDraftSnapshot {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.guidebook) &&
    Array.isArray(value.sections) &&
    Array.isArray(value.blocks) &&
    Array.isArray(value.places)
  );
}

export async function getGuidebookDraftSnapshot(
  guidebookId: string
): Promise<GuidebookDraftSnapshot | null> {
  const guidebook = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.id, guidebookId),
  });

  if (!guidebook) return null;

  const [sections, blocks, places] = await Promise.all([
    db
      .select()
      .from(guidebookSections)
      .where(eq(guidebookSections.guidebookId, guidebookId))
      .orderBy(asc(guidebookSections.orderIndex)),
    db
      .select()
      .from(guidebookBlocks)
      .where(eq(guidebookBlocks.guidebookId, guidebookId))
      .orderBy(asc(guidebookBlocks.orderIndex)),
    db
      .select()
      .from(guidebookPlaces)
      .where(eq(guidebookPlaces.guidebookId, guidebookId))
      .orderBy(asc(guidebookPlaces.orderIndex)),
  ]);

  return {
    guidebook: {
      title: guidebook.title,
      slug: guidebook.slug,
      templateId: guidebook.templateId,
      propertyId: guidebook.propertyId,
      branding: guidebook.branding,
      settings: guidebook.settings,
      heroData: guidebook.heroData,
      bottomNav: guidebook.bottomNav,
    },
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      icon: section.icon,
      orderIndex: section.orderIndex,
      isVisible: section.isVisible,
    })),
    blocks: blocks.map((block) => ({
      id: block.id,
      sectionId: block.sectionId,
      type: block.type,
      content: block.content,
      orderIndex: block.orderIndex,
      isVisible: block.isVisible,
    })),
    places: places.map((place) => ({
      id: place.id,
      name: place.name,
      category: place.category,
      description: place.description,
      lat: place.lat,
      lng: place.lng,
      address: place.address,
      phone: place.phone,
      website: place.website,
      email: place.email,
      imageUrl: place.imageUrl,
      tags: place.tags,
      openingHours: place.openingHours,
      orderIndex: place.orderIndex,
    })),
  };
}

async function pruneGuidebookHistory(guidebookId: string) {
  const rows = await db
    .select({ id: guidebookChangeHistory.id })
    .from(guidebookChangeHistory)
    .where(eq(guidebookChangeHistory.guidebookId, guidebookId))
    .orderBy(desc(guidebookChangeHistory.createdAt));

  const staleIds = rows.slice(HISTORY_LIMIT).map((row) => row.id);
  if (staleIds.length === 0) return;

  await db
    .delete(guidebookChangeHistory)
    .where(inArray(guidebookChangeHistory.id, staleIds));
}

export async function recordGuidebookChangeSnapshot(input: {
  guidebookId: string;
  actorId: string;
  actorRole: GuidebookRole;
  action: string;
}) {
  const guidebook = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.id, input.guidebookId),
  });
  if (!guidebook) return null;

  const snapshot = await getGuidebookDraftSnapshot(input.guidebookId);
  if (!snapshot) return null;

  const [entry] = await db
    .insert(guidebookChangeHistory)
    .values({
      guidebookId: input.guidebookId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      draftRevision: guidebook.draftRevision,
      snapshot,
    })
    .returning({ id: guidebookChangeHistory.id });

  await pruneGuidebookHistory(input.guidebookId);
  return entry ?? null;
}

function editorSafeSettings(snapshotSettings: unknown, currentSettings: unknown) {
  const snapshotRecord = isRecord(snapshotSettings) ? snapshotSettings : {};
  const currentRecord = isRecord(currentSettings) ? currentSettings : {};
  const allowed = { ...snapshotRecord };
  delete allowed.custom_domain;
  delete allowed.custom_subdomain;

  return {
    ...currentRecord,
    ...allowed,
    ...(currentRecord.custom_domain !== undefined
      ? { custom_domain: currentRecord.custom_domain }
      : {}),
    ...(currentRecord.custom_subdomain !== undefined
      ? { custom_subdomain: currentRecord.custom_subdomain }
      : {}),
  };
}

export async function restoreGuidebookSnapshot(input: {
  guidebookId: string;
  actorId: string;
  actorRole: GuidebookRole;
  snapshot: GuidebookDraftSnapshot;
}) {
  const now = new Date();

  const [updated] = await db.transaction(async (tx) => {
    const current = await tx.query.guidebooks.findFirst({
      where: eq(guidebooks.id, input.guidebookId),
    });

    if (!current) return [];

    let restoredPropertyId = current.propertyId;
    if (input.actorRole === "owner") {
      const snapshotPropertyId = input.snapshot.guidebook.propertyId;
      if (snapshotPropertyId === null) {
        restoredPropertyId = null;
      } else {
        const snapshotProperty = await tx.query.properties.findFirst({
          where: and(
            eq(properties.id, snapshotPropertyId),
            eq(properties.userId, current.userId)
          ),
        });
        restoredPropertyId = snapshotProperty?.id ?? current.propertyId;
      }
    }

    const guidebookPatch =
      input.actorRole === "owner"
        ? {
            title: input.snapshot.guidebook.title,
            slug: input.snapshot.guidebook.slug,
            templateId: input.snapshot.guidebook.templateId,
            propertyId: restoredPropertyId,
            branding: input.snapshot.guidebook.branding,
            settings: input.snapshot.guidebook.settings,
            heroData: input.snapshot.guidebook.heroData,
            bottomNav: input.snapshot.guidebook.bottomNav,
          }
        : {
            title: input.snapshot.guidebook.title,
            branding: input.snapshot.guidebook.branding,
            settings: editorSafeSettings(
              input.snapshot.guidebook.settings,
              current.settings
            ),
            heroData: input.snapshot.guidebook.heroData,
            bottomNav: input.snapshot.guidebook.bottomNav,
          };

    await tx
      .delete(guidebookSections)
      .where(eq(guidebookSections.guidebookId, input.guidebookId));

    if (input.snapshot.sections.length > 0) {
      await tx.insert(guidebookSections).values(
        input.snapshot.sections.map((section) => ({
          id: section.id,
          guidebookId: input.guidebookId,
          title: section.title,
          icon: section.icon,
          orderIndex: section.orderIndex,
          isVisible: section.isVisible,
          updatedAt: now,
        }))
      );
    }

    if (input.snapshot.blocks.length > 0) {
      await tx.insert(guidebookBlocks).values(
        input.snapshot.blocks.map((block) => ({
          id: block.id,
          sectionId: block.sectionId,
          guidebookId: input.guidebookId,
          type: block.type,
          content: block.content,
          orderIndex: block.orderIndex,
          isVisible: block.isVisible,
          updatedAt: now,
        }))
      );
    }

    await tx
      .delete(guidebookPlaces)
      .where(eq(guidebookPlaces.guidebookId, input.guidebookId));

    if (input.snapshot.places.length > 0) {
      await tx.insert(guidebookPlaces).values(
        input.snapshot.places.map((place) => ({
          id: place.id,
          guidebookId: input.guidebookId,
          name: place.name,
          category: place.category,
          description: place.description,
          lat: place.lat,
          lng: place.lng,
          address: place.address,
          phone: place.phone,
          website: place.website,
          email: place.email,
          imageUrl: place.imageUrl,
          tags: place.tags,
          openingHours: place.openingHours,
          orderIndex: place.orderIndex,
          updatedAt: now,
        }))
      );
    }

    return tx
      .update(guidebooks)
      .set({
        ...guidebookPatch,
        draftRevision: sql`${guidebooks.draftRevision} + 1`,
        lastEditedBy: input.actorId,
        updatedAt: now,
      })
      .where(eq(guidebooks.id, input.guidebookId))
      .returning({
        draftRevision: guidebooks.draftRevision,
        updatedAt: guidebooks.updatedAt,
      });
  });

  if (!updated) return null;

  return updated;
}
