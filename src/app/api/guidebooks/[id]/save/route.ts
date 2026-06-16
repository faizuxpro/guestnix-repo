import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebooks,
  guidebookCollaborators,
  guidebookSections,
  guidebookBlocks,
} from "@/lib/db/schema";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  bottomNavSchema,
  brandingSchema,
  guidebookSettingsSchema,
} from "@/lib/validations";
import { heroDataPatchSchema, normalizeHeroData } from "@/lib/hero-data";
import { requireGuidebookDraftEdit } from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";
import {
  BLOCK_UNAVAILABLE_MESSAGE,
  SECTION_UNAVAILABLE_MESSAGE,
} from "@/lib/guidebook-error-copy";
import { shouldRejectStaleDraftRevision } from "@/lib/guidebook-save-conflict";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { sanitizeBlockContentHtml } from "@/lib/html-sanitize";
import { normalizeGuidebookAccessSettingsPatch } from "@/lib/guidebook-access";

const saveSchema = z.object({
  draftRevision: z.number().int().min(1).optional(),
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(80).optional(),
  settings: guidebookSettingsSchema.optional(),
  branding: brandingSchema.optional(),
  bottomNav: bottomNavSchema.optional(),
  heroData: heroDataPatchSchema.optional(),
  sections: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      icon: z.string(),
      orderIndex: z.number().int().min(0),
      isVisible: z.boolean(),
      blocks: z.array(
        z.object({
          id: z.string().uuid(),
          type: z.string(),
          content: z.record(z.string(), z.unknown()),
          orderIndex: z.number().int().min(0),
          isVisible: z.boolean(),
        })
      ),
    })
  ),
});

function findDuplicates(ids: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.add(id);
      continue;
    }
    seen.add(id);
  }

  return [...duplicates];
}

async function hasActiveGuidebookCollaborators(guidebookId: string) {
  const rows = await db
    .select({ id: guidebookCollaborators.id })
    .from(guidebookCollaborators)
    .where(eq(guidebookCollaborators.guidebookId, guidebookId))
    .limit(1);

  return rows.length > 0;
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

  const { id } = await params;

  const access = await requireGuidebookDraftEdit(user.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }
  const guidebook = access.guidebook;

  const body = await request.json();
  const parsed = saveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const hasStaleDraftRevision =
    parsed.data.draftRevision !== undefined &&
    parsed.data.draftRevision !== guidebook.draftRevision;
  const hasActiveCollaborators =
    hasStaleDraftRevision &&
    (access.role === "editor" || (await hasActiveGuidebookCollaborators(id)));

  if (
    shouldRejectStaleDraftRevision({
      incomingDraftRevision: parsed.data.draftRevision,
      currentDraftRevision: guidebook.draftRevision,
      hasActiveCollaborators,
    })
  ) {
    return NextResponse.json(
      {
        error: "Someone else saved newer changes. Refresh before saving again.",
        draftRevision: guidebook.draftRevision,
      },
      { status: 409 }
    );
  }

  if (
    access.role === "editor" &&
    parsed.data.slug !== undefined &&
    parsed.data.slug !== guidebook.slug
  ) {
    return NextResponse.json(
      { error: "Editors cannot change guidebook slugs" },
      { status: 403 }
    );
  }

  if (access.role === "editor" && parsed.data.settings) {
    const currentSettings = (guidebook.settings ?? {}) as Record<string, unknown>;
    const nextSettings = parsed.data.settings as Record<string, unknown>;
    const changesDomain =
      (nextSettings.custom_domain !== undefined &&
        nextSettings.custom_domain !== currentSettings.custom_domain) ||
      (nextSettings.custom_subdomain !== undefined &&
        nextSettings.custom_subdomain !== currentSettings.custom_subdomain);

    if (changesDomain) {
      return NextResponse.json(
        { error: "Editors cannot change custom domain settings" },
        { status: 403 }
      );
    }
  }

  const sectionIds = parsed.data.sections.map((section) => section.id);
  const duplicateSectionIds = findDuplicates(sectionIds);
  if (duplicateSectionIds.length > 0) {
    return NextResponse.json(
      { error: `Duplicate section ids: ${duplicateSectionIds.join(", ")}` },
      { status: 400 }
    );
  }

  const blockIds = parsed.data.sections.flatMap((section) =>
    section.blocks.map((block) => block.id)
  );
  const duplicateBlockIds = findDuplicates(blockIds);
  if (duplicateBlockIds.length > 0) {
    return NextResponse.json(
      { error: `Duplicate block ids: ${duplicateBlockIds.join(", ")}` },
      { status: 400 }
    );
  }

  if (sectionIds.length > 0) {
    const sectionRows = await db
      .select({
        id: guidebookSections.id,
        guidebookId: guidebookSections.guidebookId,
      })
      .from(guidebookSections)
      .where(inArray(guidebookSections.id, sectionIds));

    const hasForeignSection = sectionRows.some((row) => row.guidebookId !== id);
    if (hasForeignSection) {
      return NextResponse.json(
        { error: SECTION_UNAVAILABLE_MESSAGE },
        { status: 404 }
      );
    }
  }

  if (blockIds.length > 0) {
    const blockRows = await db
      .select({
        id: guidebookBlocks.id,
        guidebookId: guidebookBlocks.guidebookId,
      })
      .from(guidebookBlocks)
      .where(inArray(guidebookBlocks.id, blockIds));

    const hasForeignBlock = blockRows.some((row) => row.guidebookId !== id);
    if (hasForeignBlock) {
      return NextResponse.json(
        { error: BLOCK_UNAVAILABLE_MESSAGE },
        { status: 404 }
      );
    }
  }

  // If the slug is changing, verify it's not already taken by another guidebook.
  if (parsed.data.slug && parsed.data.slug !== guidebook.slug) {
    const slugConflict = await db.query.guidebooks.findFirst({
      where: and(
        eq(guidebooks.slug, parsed.data.slug),
        ne(guidebooks.id, id)
      ),
    });
    if (slugConflict) {
      return NextResponse.json(
        { error: { slug: ["Slug already taken"] } },
        { status: 409 }
      );
    }
  }

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Saved draft",
  });

  let savedDraftRevision = guidebook.draftRevision;
  let savedUpdatedAt = guidebook.updatedAt.toISOString();

  await db.transaction(async (tx) => {
    const now = new Date();
    savedUpdatedAt = now.toISOString();

    const existingSections = await tx
      .select({ id: guidebookSections.id })
      .from(guidebookSections)
      .where(eq(guidebookSections.guidebookId, id));

    const payloadSectionIds = new Set(sectionIds);
    const sectionDeleteIds = existingSections
      .map((section) => section.id)
      .filter((sectionId) => !payloadSectionIds.has(sectionId));

    if (sectionDeleteIds.length > 0) {
      await tx
        .delete(guidebookSections)
        .where(
          and(
            eq(guidebookSections.guidebookId, id),
            inArray(guidebookSections.id, sectionDeleteIds)
          )
        );
    }

    for (const section of parsed.data.sections) {
      const [updatedSection] = await tx
        .update(guidebookSections)
        .set({
          title: section.title,
          icon: section.icon,
          orderIndex: section.orderIndex,
          isVisible: section.isVisible,
          updatedAt: now,
        })
        .where(
          and(
            eq(guidebookSections.id, section.id),
            eq(guidebookSections.guidebookId, id)
          )
        )
        .returning({ id: guidebookSections.id });

      if (!updatedSection) {
        await tx.insert(guidebookSections).values({
          id: section.id,
          guidebookId: id,
          title: section.title,
          icon: section.icon,
          orderIndex: section.orderIndex,
          isVisible: section.isVisible,
          updatedAt: now,
        });
      }
    }

    const existingBlocks = await tx
      .select({ id: guidebookBlocks.id })
      .from(guidebookBlocks)
      .where(eq(guidebookBlocks.guidebookId, id));

    const payloadBlockIds = new Set<string>();

    for (const section of parsed.data.sections) {
      for (const block of section.blocks) {
        payloadBlockIds.add(block.id);
        const content = sanitizeBlockContentHtml(block.type, block.content);

        const [updatedBlock] = await tx
          .update(guidebookBlocks)
          .set({
            type: block.type,
            sectionId: section.id,
            content,
            orderIndex: block.orderIndex,
            isVisible: block.isVisible,
            updatedAt: now,
          })
          .where(
            and(
              eq(guidebookBlocks.id, block.id),
              eq(guidebookBlocks.guidebookId, id)
            )
          )
          .returning({ id: guidebookBlocks.id });

        if (!updatedBlock) {
          await tx.insert(guidebookBlocks).values({
            id: block.id,
            guidebookId: id,
            sectionId: section.id,
            type: block.type,
            content,
            orderIndex: block.orderIndex,
            isVisible: block.isVisible,
            updatedAt: now,
          });
        }
      }
    }

    const blockDeleteIds = existingBlocks
      .map((block) => block.id)
      .filter((blockId) => !payloadBlockIds.has(blockId));

    if (blockDeleteIds.length > 0) {
      await tx
        .delete(guidebookBlocks)
        .where(
          and(
            eq(guidebookBlocks.guidebookId, id),
            inArray(guidebookBlocks.id, blockDeleteIds)
          )
        );
    }

    const [updatedGuidebook] = await tx
      .update(guidebooks)
      .set({
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        ...(parsed.data.settings !== undefined
          ? {
              settings: {
                ...(guidebook.settings as Record<string, unknown>),
                ...normalizeGuidebookAccessSettingsPatch(
                  guidebook.settings as Record<string, unknown>,
                  parsed.data.settings as Record<string, unknown>
                ),
              },
            }
          : {}),
        ...(parsed.data.branding !== undefined
          ? {
              branding: {
                ...(guidebook.branding as Record<string, unknown>),
                ...parsed.data.branding,
              },
            }
          : {}),
        ...(parsed.data.bottomNav !== undefined
          ? { bottomNav: parsed.data.bottomNav }
          : {}),
        ...(parsed.data.heroData !== undefined
          ? {
              heroData: (() => {
                const current = normalizeHeroData(guidebook.heroData);
                const patch = parsed.data.heroData!;
                return {
                  property: { ...current.property, ...(patch.property ?? {}) },
                  host: { ...current.host, ...(patch.host ?? {}) },
                  home: {
                    ...current.home,
                    ...(patch.home ?? {}),
                    show: {
                      ...current.home.show,
                      ...(patch.home?.show ?? {}),
                    },
                    times: {
                      ...current.home.times,
                      ...(patch.home?.times ?? {}),
                    },
                    logo: {
                      ...current.home.logo,
                      ...(patch.home?.logo ?? {}),
                    },
                    solid_background_color: {
                      ...current.home.solid_background_color,
                      ...(patch.home?.solid_background_color ?? {}),
                    },
                    glass_shadow: {
                      ...current.home.glass_shadow,
                      ...(patch.home?.glass_shadow ?? {}),
                    },
                    overlay_container: {
                      ...current.home.overlay_container,
                      ...(patch.home?.overlay_container ?? {}),
                    },
                    background: {
                      ...current.home.background,
                      ...(patch.home?.background ?? {}),
                    },
                  },
                  host_page: {
                    ...current.host_page,
                    ...(patch.host_page ?? {}),
                    show: {
                      ...current.host_page.show,
                      ...(patch.host_page?.show ?? {}),
                    },
                  },
                };
              })(),
            }
          : {}),
        draftRevision: sql`${guidebooks.draftRevision} + 1`,
        lastEditedBy: user.id,
        updatedAt: now,
      })
      .where(eq(guidebooks.id, id))
      .returning({
        draftRevision: guidebooks.draftRevision,
        updatedAt: guidebooks.updatedAt,
      });

    if (updatedGuidebook) {
      savedDraftRevision = updatedGuidebook.draftRevision;
      savedUpdatedAt = updatedGuidebook.updatedAt.toISOString();
    }
  });

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.guidebookSaved,
    properties: {
      guidebook_id: id,
      source: "editor_save",
    },
  });

  return NextResponse.json({
    success: true,
    draftRevision: savedDraftRevision,
    updatedAt: savedUpdatedAt,
  });
}
