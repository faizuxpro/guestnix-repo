/**
 * Seeds or updates the /demo/sunset-template demo guidebook.
 * Idempotent: safe to re-run. Uses the sunset-lakehouse seed content.
 *
 * Usage: npx tsx scripts/seed-demo-sunset.ts
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import {
  guidebooks,
  guidebookSections,
  guidebookBlocks,
  profiles,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  buildSeedGuidebookSettings,
  sunsetLakehouseSeed,
} from "@/templates/sunset-lakehouse/seed";

const DEMO_EMAIL = "demo@guestnix.internal";
const DEMO_SLUG = "sunset-template";
const DEMO_TITLE = "Oceanview Villa";

async function ensureDemoUser(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"
    );
  }
  const supa = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: list, error: listErr } = await supa.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) return existing.id;

  const { data: created, error: createErr } = await supa.auth.admin.createUser({
    email: DEMO_EMAIL,
    email_confirm: true,
    user_metadata: { full_name: "Guestnix Demo" },
  });
  if (createErr) throw createErr;
  if (!created.user) throw new Error("Failed to create demo user");

  await db
    .insert(profiles)
    .values({
      id: created.user.id,
      email: DEMO_EMAIL,
      fullName: "Guestnix Demo",
    })
    .onConflictDoNothing();

  return created.user.id;
}

async function seedSectionsForGuidebook(
  guidebookId: string,
  baseSettings: Record<string, unknown>
) {
  const createdSectionIds: string[] = [];

  for (let i = 0; i < sunsetLakehouseSeed.sections.length; i++) {
    const s = sunsetLakehouseSeed.sections[i];
    const [createdSection] = await db
      .insert(guidebookSections)
      .values({
        guidebookId,
        title: s.title,
        icon: s.icon,
        orderIndex: i,
        isVisible: s.isVisible ?? true,
      })
      .returning();
    createdSectionIds.push(createdSection.id);

    for (let j = 0; j < s.blocks.length; j++) {
      const b = s.blocks[j];
      await db.insert(guidebookBlocks).values({
        sectionId: createdSection.id,
        guidebookId,
        type: b.type,
        content: b.content,
        orderIndex: j,
        isVisible: b.isVisible ?? true,
      });
    }
  }

  const seedSettings = buildSeedGuidebookSettings(
    sunsetLakehouseSeed,
    createdSectionIds,
    { ...baseSettings, demo_enabled: true }
  );

  await db
    .update(guidebooks)
    .set({ settings: seedSettings })
    .where(eq(guidebooks.id, guidebookId));
}

async function seed() {
  const userId = await ensureDemoUser();
  console.log(`Demo user: ${userId}`);

  const existing = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.slug, DEMO_SLUG),
  });

  if (existing) {
    console.log(
      `Guidebook ${DEMO_SLUG} already exists (id=${existing.id}). Refreshing seed content.`
    );
    await db
      .update(guidebooks)
      .set({
        title: DEMO_TITLE,
        templateId: "sunset-lakehouse",
        status: "published",
        publishedAt: existing.publishedAt ?? new Date(),
        branding: sunsetLakehouseSeed.branding,
        bottomNav: sunsetLakehouseSeed.bottomNav,
        heroData: sunsetLakehouseSeed.heroData,
      })
      .where(eq(guidebooks.id, existing.id));

    await db
      .delete(guidebookSections)
      .where(eq(guidebookSections.guidebookId, existing.id));
    await seedSectionsForGuidebook(
      existing.id,
      (existing.settings ?? {}) as Record<string, unknown>
    );
    console.log(`Updated ${DEMO_SLUG} (guidebook id=${existing.id})`);
    return;
  }

  const [gb] = await db
    .insert(guidebooks)
    .values({
      userId,
      title: DEMO_TITLE,
      slug: DEMO_SLUG,
      templateId: "sunset-lakehouse",
      status: "published",
      publishedAt: new Date(),
      branding: sunsetLakehouseSeed.branding,
      bottomNav: sunsetLakehouseSeed.bottomNav,
      heroData: sunsetLakehouseSeed.heroData,
    })
    .returning();

  await seedSectionsForGuidebook(
    gb.id,
    (gb.settings ?? {}) as Record<string, unknown>
  );

  console.log(`Seeded ${DEMO_SLUG} (guidebook id=${gb.id})`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
