import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebooks,
  guidebookSections,
  guidebookBlocks,
  guidebookCollaborators,
  profiles,
  properties,
  analyticsEvents,
} from "@/lib/db/schema";
import { eq, desc, and, inArray, sql, ne } from "drizzle-orm";
import { createGuidebookSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { canCreateDraft } from "@/lib/billing/entitlements";
import {
  SEEDS_BY_TEMPLATE,
  buildSeedGuidebookSettings,
} from "@/templates/sunset-lakehouse/seed";
import { buildSeedHeroData } from "@/lib/hero-data";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { syncProductUserProfile } from "@/lib/analytics/product-user";

const SLUG_SUFFIX_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomSlugSuffix(length = 6) {
  const bytes = randomBytes(length);
  return Array.from(
    bytes,
    (byte) => SLUG_SUFFIX_ALPHABET[byte % SLUG_SUFFIX_ALPHABET.length]
  ).join("");
}

async function makeDefaultGuidebookSlug(title: string) {
  const base =
    (slugify(title).slice(0, 73).replace(/-+$/g, "") || "guidebook");

  for (let attempt = 0; attempt < 8; attempt++) {
    const slug = `${base}-${randomSlugSuffix()}`;
    const existing = await db.query.guidebooks.findFirst({
      where: eq(guidebooks.slug, slug),
    });
    if (!existing) return slug;
  }

  return `${base}-${Date.now().toString(36)}`;
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await db.query.guidebooks.findMany({
    where: eq(guidebooks.userId, user.id),
    with: { property: true },
    orderBy: [desc(guidebooks.updatedAt)],
  });

  const sharedRows = await db
    .select({
      guidebook: guidebooks,
      property: properties,
    })
    .from(guidebookCollaborators)
    .innerJoin(guidebooks, eq(guidebookCollaborators.guidebookId, guidebooks.id))
    .leftJoin(properties, eq(guidebooks.propertyId, properties.id))
    .where(
      and(
        eq(guidebookCollaborators.userId, user.id),
        eq(guidebookCollaborators.role, "editor"),
        ne(guidebooks.userId, user.id)
      )
    )
    .orderBy(desc(guidebooks.updatedAt));

  const result = [
    ...owned.map((g) => ({ ...g, accessRole: "owner" as const })),
    ...sharedRows.map((row) => ({
      ...row.guidebook,
      property: row.property,
      accessRole: "editor" as const,
    })),
  ].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // All-time page-view counts per guidebook, so the listing cards can show a
  // live engagement number. One grouped query for the whole set, indexed by
  // (guidebook_id, event_type) via idx_analytics_type.
  const ids = result.map((g) => g.id);
  const viewCounts = new Map<string, number>();
  if (ids.length > 0) {
    const rows = await db
      .select({
        guidebookId: analyticsEvents.guidebookId,
        views: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(
        and(
          inArray(analyticsEvents.guidebookId, ids),
          eq(analyticsEvents.eventType, "page_view")
        )
      )
      .groupBy(analyticsEvents.guidebookId);
    for (const row of rows) viewCounts.set(row.guidebookId, row.views);
  }

  const withViews = result.map((g) => ({
    ...g,
    viewCount: viewCounts.get(g.id) ?? 0,
  }));

  return NextResponse.json(withViews);
}

export async function POST(request: Request) {
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

  const body = await request.json();
  const parsed = createGuidebookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await ensureProfile(user);

    const templateId = parsed.data.templateId;
    const seed =
      SEEDS_BY_TEMPLATE[templateId] ?? SEEDS_BY_TEMPLATE["sunset-lakehouse"];

    const slug = await makeDefaultGuidebookSlug(parsed.data.title);

    const [profile] = await db
      .select({ fullName: profiles.fullName, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    let propertyAddress: string | null = null;
    let propertyCity: string | null = null;
    let propertyState: string | null = null;
    let propertyCountry: string | null = null;
    if (parsed.data.propertyId) {
      const [property] = await db
        .select({
          address: properties.address,
          city: properties.city,
          state: properties.state,
          country: properties.country,
        })
        .from(properties)
        .where(
          and(
            eq(properties.id, parsed.data.propertyId),
            eq(properties.userId, user.id)
          )
        )
        .limit(1);

      if (!property) {
        return NextResponse.json(
          { error: { propertyId: ["Property not found"] } },
          { status: 404 }
        );
      }

      propertyAddress = property?.address ?? null;
      propertyCity = property?.city ?? null;
      propertyState = property?.state ?? null;
      propertyCountry = property?.country ?? null;
    }

    const heroData = buildSeedHeroData({
      guidebookTitle: parsed.data.title,
      hostName: profile?.fullName ?? null,
      hostEmail: profile?.email ?? null,
      propertyAddress,
      propertyCity,
      propertyState,
      propertyCountry,
    });

    const [guidebook] = await db
      .insert(guidebooks)
      .values({
        userId: user.id,
        title: parsed.data.title,
        slug,
        propertyId: parsed.data.propertyId,
        templateId,
        branding: seed.branding,
        bottomNav: seed.bottomNav,
        heroData,
      })
      .returning();

    const [guidebookCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(guidebooks)
      .where(eq(guidebooks.userId, user.id));
    const guidebookCount = guidebookCountRow?.count ?? 1;

    const createdSectionIds: string[] = [];

    for (let i = 0; i < seed.sections.length; i++) {
      const s = seed.sections[i];
      const [createdSection] = await db
        .insert(guidebookSections)
        .values({
          guidebookId: guidebook.id,
          title: s.title,
          icon: s.icon,
          orderIndex: i,
        })
        .returning();
      createdSectionIds.push(createdSection.id);

      for (let j = 0; j < s.blocks.length; j++) {
        const b = s.blocks[j];
        await db.insert(guidebookBlocks).values({
          sectionId: createdSection.id,
          guidebookId: guidebook.id,
          type: b.type,
          content: b.content,
          orderIndex: j,
        });
      }
    }

    const seedSettings = buildSeedGuidebookSettings(
      seed,
      createdSectionIds,
      (guidebook.settings ?? {}) as Record<string, unknown>
    );

    await db
      .update(guidebooks)
      .set({ settings: seedSettings })
      .where(eq(guidebooks.id, guidebook.id));

    await Promise.all([
      trackServerProductEvent({
        distinctId: user.id,
        event: productEvents.guidebookCreated,
        properties: {
          guidebook_count: guidebookCount,
          guidebook_id: guidebook.id,
          is_first: guidebookCount === 1,
          template_id: templateId,
          source: "dashboard",
        },
      }),
      syncProductUserProfile(user.id),
    ]);

    return NextResponse.json(
      { ...guidebook, settings: seedSettings },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/guidebooks failed", err);
    return NextResponse.json(
      { error: { title: ["Could not create guidebook. Please try again."] } },
      { status: 500 }
    );
  }
}
