/**
 * Snapshot publishing.
 *
 * A published guidebook is a self-contained JSON file in Supabase Storage,
 * built from the editor's draft tables at the moment "Publish" is clicked.
 * The public `/g/[slug]` page reads ONLY from these snapshots — never from
 * `guidebooks/sections/blocks/places`. This gives us:
 *   - Draft / live separation (editor edits don't go live until publish).
 *   - DB-independent guest reads (Supabase DB outage doesn't break /g/[slug]).
 *   - Free version history and rollback.
 */

import { and, asc, eq } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import {
  guidebookBlocks,
  guidebookPlaces,
  guidebookSections,
  guidebookStorefrontItems,
  guidebookStorefronts,
  guidebooks,
  storeItems,
} from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { absoluteAppUrl } from "@/lib/app-url";
import { parseStoredSlots } from "@/lib/bottom-nav";
import { normalizeHeroData, type HeroData } from "@/lib/hero-data";
import {
  GUIDEBOOK_LOADER_SETTINGS_KEY,
  createPublishedGuidebookLoaderConfig,
  normalizeGuidebookLoaderSettings,
  type PublishedGuidebookLoaderConfig,
} from "@/lib/guidebook-loader-settings";
import { readStoreSettingsFromGuidebookSettings } from "@/lib/store/settings";
import { stripPrivateGuidebookSettings } from "@/lib/quick-variables";
import { guidebookPublicPath } from "@/lib/guidebook-public-url";
import type { BottomNavSlot } from "@/types/bottom-nav";
import type { SnapshotStorefront } from "@/lib/store/types";

const DEFAULT_BUCKET = "guidebook-publications";
const STORAGE_BUCKET =
  process.env.SUPABASE_PUBLICATIONS_BUCKET?.trim() || DEFAULT_BUCKET;

type SectionKind = "guide" | "featured";
type SectionDisplayMode = "popup" | "full_page" | "inline" | "drawer";

export type SnapshotSection = {
  id: string;
  title: string;
  icon: string;
  orderIndex: number;
  isVisible: boolean;
  kind: SectionKind;
  displayMode: SectionDisplayMode;
  itemSettings: Record<string, unknown>;
};

export type SnapshotBlock = {
  id: string;
  sectionId: string;
  type: string;
  content: Record<string, unknown>;
  orderIndex: number;
  isVisible: boolean;
};

export type SnapshotPlace = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  tags: Record<string, unknown> | null;
};

export type SnapshotGuidebook = {
  id: string;
  title: string;
  slug: string;
  templateId: string;
  branding: Record<string, unknown>;
  heroData: HeroData;
  bottomNav: BottomNavSlot[];
  settings: Record<string, unknown>;
  propertyName: string;
  hostFirstName: string;
};

export type GuidebookSnapshot = {
  schemaVersion: 1;
  publishedAt: string;
  version: number;
  guidebook: SnapshotGuidebook;
  sections: SnapshotSection[];
  blocks: SnapshotBlock[];
  places: SnapshotPlace[];
  storefront?: SnapshotStorefront | null;
};

/**
 * Returns `kind` + `displayMode` for each section, derived from the
 * `settings.content_units` JSON. Same logic as the editor store and the
 * old public page reader — now lives here so the snapshot is the canonical
 * place that resolves these.
 */
function parseContentUnitMeta(settings: Record<string, unknown>) {
  const raw =
    typeof settings.content_units === "object" && settings.content_units !== null
      ? (settings.content_units as Record<string, Record<string, unknown>>)
      : {};

  return new Map<
    string,
    {
      kind: SectionKind;
      displayMode: SectionDisplayMode;
      itemSettings: Record<string, unknown>;
    }
  >(
    Object.entries(raw).map(([sectionId, meta]) => {
      const safeMeta =
        typeof meta === "object" && meta !== null
          ? (meta as Record<string, unknown>)
          : {};
      const kind: SectionKind =
        safeMeta.kind === "featured" ? "featured" : "guide";
      const displayMode: SectionDisplayMode =
        safeMeta.displayMode === "full_page" ||
        safeMeta.displayMode === "inline" ||
        safeMeta.displayMode === "drawer"
          ? (safeMeta.displayMode as SectionDisplayMode)
          : "popup";
      const itemSettings =
        typeof safeMeta.itemSettings === "object" &&
        safeMeta.itemSettings !== null
          ? (safeMeta.itemSettings as Record<string, unknown>)
          : {};
      return [sectionId, { kind, displayMode, itemSettings }];
    })
  );
}

/**
 * Read draft state from the editor's tables and shape it into a canonical
 * snapshot. Hero data is normalized here so the snapshot always carries the
 * current HeroData schema.
 */
export async function buildSnapshot(
  guidebookId: string,
  version: number
): Promise<GuidebookSnapshot> {
  const guidebook = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.id, guidebookId),
    with: { property: true, user: true },
  });
  if (!guidebook) {
    throw new Error(`Guidebook ${guidebookId} not found while building snapshot`);
  }

  const [sectionRows, blockRows, placeRows] = await Promise.all([
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

  const storefrontRow = await db.query.guidebookStorefronts.findFirst({
    where: eq(guidebookStorefronts.guidebookId, guidebookId),
  });

  const storefrontItemRows =
    storefrontRow?.enabled === true
      ? await db
          .select({
            assignment: guidebookStorefrontItems,
            item: storeItems,
          })
          .from(guidebookStorefrontItems)
          .innerJoin(
            storeItems,
            eq(guidebookStorefrontItems.storeItemId, storeItems.id)
          )
          .where(
            and(
              eq(guidebookStorefrontItems.storefrontId, storefrontRow.id),
              eq(guidebookStorefrontItems.visible, true),
              eq(storeItems.active, true)
            )
          )
          .orderBy(asc(guidebookStorefrontItems.orderIndex), asc(storeItems.name))
      : [];

  const settings = (guidebook.settings ?? {}) as Record<string, unknown>;
  const publicSettings = stripPrivateGuidebookSettings(settings);
  const storeSettings = readStoreSettingsFromGuidebookSettings(settings);
  const branding = (guidebook.branding ?? {}) as Record<string, unknown>;
  const meta = parseContentUnitMeta(settings);

  const heroData = normalizeHeroData(guidebook.heroData);

  const propertyName = guidebook.property?.name ?? guidebook.title;
  const hostFirstName =
    (guidebook.user?.fullName ?? "").split(" ")[0] || "your host";

  const snapshot: GuidebookSnapshot = {
    schemaVersion: 1,
    publishedAt: new Date().toISOString(),
    version,
    guidebook: {
      id: guidebook.id,
      title: guidebook.title,
      slug: guidebook.slug,
      templateId: guidebook.templateId,
      branding,
      heroData,
      bottomNav: parseStoredSlots(guidebook.bottomNav),
      settings: publicSettings,
      propertyName,
      hostFirstName,
    },
    sections: sectionRows.map((s) => {
      const m = meta.get(s.id);
      return {
        id: s.id,
        title: s.title,
        icon: s.icon,
        orderIndex: s.orderIndex,
        isVisible: s.isVisible,
        kind: m?.kind ?? "guide",
        displayMode: m?.displayMode ?? "popup",
        itemSettings: m?.itemSettings ?? {},
      };
    }),
    blocks: blockRows.map((b) => ({
      id: b.id,
      sectionId: b.sectionId,
      type: b.type,
      content: (b.content ?? {}) as Record<string, unknown>,
      orderIndex: b.orderIndex,
      isVisible: b.isVisible,
    })),
    places: placeRows.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      phone: p.phone,
      website: p.website,
      email: p.email,
      imageUrl: p.imageUrl,
      openingHours: p.openingHours,
      tags: (p.tags as Record<string, unknown> | null) ?? null,
    })),
    storefront:
      storefrontRow?.enabled === true
        ? {
            id: storefrontRow.id,
            enabled: true,
            intro: storeSettings.intro,
            listingStyle: storeSettings.listingStyle,
            items: storefrontItemRows.map(({ assignment, item }) => ({
              id: item.id,
              assignmentId: assignment.id,
              itemType: item.itemType === "service" ? "service" : "product",
              name: item.name,
              description: item.description,
              imageUrl: item.imageUrl,
              priceCents: item.priceCents,
              currency: item.currency,
              unitLabel: item.unitLabel,
              category: item.category,
              maxQuantity: assignment.maxQuantity,
              orderIndex: assignment.orderIndex,
            })),
          }
        : null,
  };

  return snapshot;
}

async function ensurePublicationsBucket() {
  const admin = createAdminClient();
  const { data: existing, error: getErr } = await admin.storage.getBucket(
    STORAGE_BUCKET
  );
  if (existing) {
    if (existing.public) {
      const { error: updateErr } = await admin.storage.updateBucket(
        STORAGE_BUCKET,
        { public: false }
      );
      if (updateErr) {
        throw new Error(
          `Storage updateBucket(${STORAGE_BUCKET}): ${updateErr.message}`
        );
      }
    }
    return admin;
  }

  const msg = getErr?.message?.toLowerCase() ?? "";
  const missing =
    msg.includes("not found") ||
    msg.includes("does not exist") ||
    msg.includes("no rows");
  if (getErr && !missing) {
    throw new Error(`Storage getBucket(${STORAGE_BUCKET}): ${getErr.message}`);
  }

  const { error: createErr } = await admin.storage.createBucket(STORAGE_BUCKET, {
    public: false,
  });
  if (createErr) {
    const createMsg = createErr.message?.toLowerCase() ?? "";
    if (!createMsg.includes("already exists")) {
      throw new Error(`Storage createBucket(${STORAGE_BUCKET}): ${createErr.message}`);
    }
  }
  return admin;
}

function snapshotPath(slug: string, version: number | "latest") {
  return version === "latest" ? `${slug}/latest.json` : `${slug}/v${version}.json`;
}

function loaderConfigPath(slug: string) {
  return `${slug}/loader.json`;
}

export async function uploadSnapshot(
  slug: string,
  version: number,
  snapshot: GuidebookSnapshot
): Promise<{
  path: string;
  checksum: string;
  bytes: number;
  publicUrl: string;
}> {
  const admin = await ensurePublicationsBucket();
  const json = JSON.stringify(snapshot);
  const loaderJson = JSON.stringify(
    createPublishedGuidebookLoaderConfig(
      snapshot.guidebook.settings,
      snapshot.guidebook.branding,
      {
        title: snapshot.guidebook.propertyName || snapshot.guidebook.title,
        subtitle: "Preparing your guidebook",
        logoUrl: snapshot.guidebook.heroData.property.logo_url,
      }
    )
  );
  const bytes = Buffer.byteLength(json, "utf8");
  const checksum = crypto.createHash("sha256").update(json).digest("hex");

  const versionedPath = snapshotPath(slug, version);
  const latestPath = snapshotPath(slug, "latest");
  const latestLoaderPath = loaderConfigPath(slug);

  // Versioned file is immutable; latest.json is overwritten on each publish.
  const { error: versionedErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(versionedPath, json, {
      contentType: "application/json",
      upsert: false,
    });
  if (versionedErr) {
    const msg = versionedErr.message?.toLowerCase() ?? "";
    // If for any reason the same version was already uploaded (e.g. retry),
    // surface a clear error rather than silently moving on.
    if (!msg.includes("already exists") && !msg.includes("duplicate")) {
      throw new Error(`Snapshot upload (${versionedPath}): ${versionedErr.message}`);
    }
  }

  const { error: latestErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(latestPath, json, {
      contentType: "application/json",
      upsert: true,
    });
  if (latestErr) {
    throw new Error(`Snapshot upload (${latestPath}): ${latestErr.message}`);
  }

  const { error: loaderErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(latestLoaderPath, loaderJson, {
      contentType: "application/json",
      upsert: true,
    });
  if (loaderErr) {
    throw new Error(`Loader config upload (${latestLoaderPath}): ${loaderErr.message}`);
  }

  return {
    path: versionedPath,
    checksum,
    bytes,
    publicUrl: absoluteAppUrl(guidebookPublicPath(slug, snapshot.guidebook.settings)),
  };
}

/**
 * Public-page reader. Fetches `latest.json` from private Storage using the
 * service-role client so protected guidebook snapshots are never directly
 * fetchable by slug from Supabase Storage.
 */
export async function fetchPublishedSnapshot(
  slug: string
): Promise<GuidebookSnapshot | null> {
  return fetchPublishedSnapshotByPath(snapshotPath(slug, "latest"));
}

async function downloadJsonFromStorage(path: string): Promise<unknown> {
  const admin = await ensurePublicationsBucket();
  const { data, error } = await admin.storage.from(STORAGE_BUCKET).download(path);
  if (error) {
    throw new Error(`Snapshot download (${path}): ${error.message}`);
  }
  if (!data) {
    throw new Error(`Snapshot download (${path}): empty response`);
  }
  return JSON.parse(await data.text());
}

function normalizePublishedLoaderConfig(
  value: unknown
): PublishedGuidebookLoaderConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  return {
    schemaVersion: 1,
    ...normalizeGuidebookLoaderSettings({
      [GUIDEBOOK_LOADER_SETTINGS_KEY]: {
        ...raw,
        background_color_override: true,
        foreground_color_override: true,
        accent_color_override: true,
      },
    }),
  };
}

export async function fetchPublishedLoaderConfig(
  slug: string
): Promise<PublishedGuidebookLoaderConfig | null> {
  const path = loaderConfigPath(slug);
  let data: unknown;
  try {
    data = await downloadJsonFromStorage(path);
  } catch (err) {
    console.error(`fetchPublishedLoaderConfig ${path}:`, err);
    return null;
  }

  try {
    return normalizePublishedLoaderConfig(data);
  } catch (err) {
    console.error(`fetchPublishedLoaderConfig ${path}: invalid JSON`, err);
    return null;
  }
}

export async function fetchPublishedSnapshotByPath(
  path: string
): Promise<GuidebookSnapshot | null> {
  let data: unknown;
  try {
    data = await downloadJsonFromStorage(path);
  } catch {
    return null;
  }

  try {
    return data as GuidebookSnapshot;
  } catch (err) {
    console.error(`fetchPublishedSnapshot ${path}: invalid JSON`, err);
    return null;
  }
}

/**
 * Called by Unpublish. Removes `latest.json` so the public page 404s.
 * Versioned files are kept for audit / rollback.
 */
export async function deleteLatestSnapshot(slug: string): Promise<void> {
  const admin = await ensurePublicationsBucket();
  const { error } = await admin.storage
    .from(STORAGE_BUCKET)
    .remove([snapshotPath(slug, "latest"), loaderConfigPath(slug)]);
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    // "not found" on remove is fine — we want it gone anyway.
    if (!msg.includes("not found")) {
      throw new Error(`Snapshot delete (${slug}/latest.json): ${error.message}`);
    }
  }
}

export const _internal = { STORAGE_BUCKET, snapshotPath, loaderConfigPath };
