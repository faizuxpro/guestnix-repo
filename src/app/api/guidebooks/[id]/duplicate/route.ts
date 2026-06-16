import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebooks,
  guidebookBlocks,
  guidebookPlaces,
  guidebookSections,
  guidebookStorefrontItems,
  guidebookStorefronts,
} from "@/lib/db/schema";
import { canCreateDraft } from "@/lib/billing/entitlements";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { requireGuidebookAccess } from "@/lib/guidebook-permissions";
import { GUIDEBOOK_UNAVAILABLE_MESSAGE } from "@/lib/guidebook-error-copy";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { syncProductUserProfile } from "@/lib/analytics/product-user";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const SLUG_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

const duplicateGuidebookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

function makeDuplicateTitle(title: string) {
  const suffix = " (Copy)";
  if (title.length + suffix.length <= 200) return `${title}${suffix}`;

  const trimmed = title.slice(0, 200 - suffix.length).trimEnd();
  return `${trimmed || "Guidebook"}${suffix}`;
}

function randomSlugSuffix(length = 6) {
  const bytes = randomBytes(length);
  return Array.from(
    bytes,
    (byte) => SLUG_SUFFIX_ALPHABET[byte % SLUG_SUFFIX_ALPHABET.length]
  ).join("");
}

async function makeDefaultGuidebookSlug(title: string) {
  const base =
    slugify(title).slice(0, 73).replace(/-+$/g, "") || "guidebook";

  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = `${base}-${randomSlugSuffix()}`;
    const existing = await db.query.guidebooks.findFirst({
      where: eq(guidebooks.slug, slug),
    });
    if (!existing) return slug;
  }

  return `${base}-${Date.now().toString(36)}`;
}

function cloneJson<T>(value: T): T {
  return structuredClone(value);
}

function remapJsonIds(value: unknown, idMap: Map<string, string>): unknown {
  if (typeof value === "string") {
    return idMap.get(value) ?? value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => remapJsonIds(item, idMap));
  }

  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      next[idMap.get(key) ?? key] = remapJsonIds(nestedValue, idMap);
    }
    return next;
  }

  return value;
}

function cleanDuplicatedSettings(settings: unknown, idMap: Map<string, string>) {
  const cloned = remapJsonIds(cloneJson(settings), idMap);
  if (!cloned || typeof cloned !== "object" || Array.isArray(cloned)) {
    return cloned;
  }

  return {
    ...(cloned as Record<string, unknown>),
    custom_domain: null,
    custom_subdomain: null,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await canCreateDraft(user.id);
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 402 });
  }

  const { id } = await params;
  const access = await requireGuidebookAccess(user.id, id, "owner");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = duplicateGuidebookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await ensureProfile(user);

    const source = access.guidebook;
    const title = parsed.data.title ?? makeDuplicateTitle(source.title);
    const slug = await makeDefaultGuidebookSlug(title);

    const createdGuidebook = await db.transaction(async (tx) => {
      const now = new Date();

      const sourceSections = await tx
        .select()
        .from(guidebookSections)
        .where(eq(guidebookSections.guidebookId, source.id))
        .orderBy(asc(guidebookSections.orderIndex));

      const sourceBlocks = await tx
        .select()
        .from(guidebookBlocks)
        .where(eq(guidebookBlocks.guidebookId, source.id))
        .orderBy(asc(guidebookBlocks.orderIndex));

      const sourcePlaces = await tx
        .select()
        .from(guidebookPlaces)
        .where(eq(guidebookPlaces.guidebookId, source.id))
        .orderBy(asc(guidebookPlaces.orderIndex));

      const [sourceStorefront] = await tx
        .select()
        .from(guidebookStorefronts)
        .where(eq(guidebookStorefronts.guidebookId, source.id))
        .limit(1);

      const sourceStorefrontItems = sourceStorefront
        ? await tx
            .select()
            .from(guidebookStorefrontItems)
            .where(
              eq(guidebookStorefrontItems.storefrontId, sourceStorefront.id)
            )
            .orderBy(asc(guidebookStorefrontItems.orderIndex))
        : [];

      const sectionIdMap = new Map(
        sourceSections.map((section) => [section.id, randomUUID()])
      );
      const blockIdMap = new Map(
        sourceBlocks.map((block) => [block.id, randomUUID()])
      );
      const idMap = new Map([...sectionIdMap, ...blockIdMap]);

      const [guidebook] = await tx
        .insert(guidebooks)
        .values({
          userId: user.id,
          propertyId: source.propertyId,
          title,
          slug,
          templateId: source.templateId,
          status: "draft",
          branding: remapJsonIds(cloneJson(source.branding), idMap),
          settings: cleanDuplicatedSettings(source.settings, idMap),
          heroData: remapJsonIds(cloneJson(source.heroData), idMap),
          bottomNav: remapJsonIds(cloneJson(source.bottomNav), idMap),
          draftRevision: 1,
          lastEditedBy: user.id,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!guidebook) {
        throw new Error("Guidebook duplicate insert failed");
      }

      if (sourceSections.length > 0) {
        await tx.insert(guidebookSections).values(
          sourceSections.map((section) => ({
            id: sectionIdMap.get(section.id)!,
            guidebookId: guidebook.id,
            title: section.title,
            icon: section.icon,
            orderIndex: section.orderIndex,
            isVisible: section.isVisible,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }

      if (sourceBlocks.length > 0) {
        await tx.insert(guidebookBlocks).values(
          sourceBlocks.map((block) => ({
            id: blockIdMap.get(block.id)!,
            guidebookId: guidebook.id,
            sectionId: sectionIdMap.get(block.sectionId)!,
            type: block.type,
            content: remapJsonIds(cloneJson(block.content), idMap),
            orderIndex: block.orderIndex,
            isVisible: block.isVisible,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }

      if (sourcePlaces.length > 0) {
        await tx.insert(guidebookPlaces).values(
          sourcePlaces.map((place) => ({
            guidebookId: guidebook.id,
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
            tags: cloneJson(place.tags),
            openingHours: place.openingHours,
            orderIndex: place.orderIndex,
            createdAt: now,
            updatedAt: now,
          }))
        );
      }

      if (sourceStorefront) {
        const [storefront] = await tx
          .insert(guidebookStorefronts)
          .values({
            guidebookId: guidebook.id,
            userId: user.id,
            enabled: sourceStorefront.enabled,
            paymentMethodIds: cloneJson(sourceStorefront.paymentMethodIds),
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: guidebookStorefronts.id });

        if (storefront && sourceStorefrontItems.length > 0) {
          await tx.insert(guidebookStorefrontItems).values(
            sourceStorefrontItems.map((item) => ({
              storefrontId: storefront.id,
              storeItemId: item.storeItemId,
              orderIndex: item.orderIndex,
              visible: item.visible,
              maxQuantity: item.maxQuantity,
              createdAt: now,
              updatedAt: now,
            }))
          );
        }
      }

      return guidebook;
    });

    const [guidebookCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guidebooks)
      .where(eq(guidebooks.userId, user.id));
    const guidebookCount = guidebookCountRow?.count ?? 1;

    await Promise.all([
      trackServerProductEvent({
        distinctId: user.id,
        event: productEvents.guidebookCreated,
        properties: {
          guidebook_count: guidebookCount,
          guidebook_id: createdGuidebook.id,
          source_guidebook_id: source.id,
          is_first: guidebookCount === 1,
          template_id: source.templateId,
          source: "duplicate",
        },
      }),
      syncProductUserProfile(user.id),
    ]);

    return NextResponse.json(createdGuidebook, { status: 201 });
  } catch (err) {
    console.error("POST /api/guidebooks/[id]/duplicate failed", err);
    return NextResponse.json(
      { error: GUIDEBOOK_UNAVAILABLE_MESSAGE },
      { status: 500 }
    );
  }
}
