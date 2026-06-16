import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebookBlocks,
  guidebookPlaces,
  guidebooks,
  guidebookSections,
} from "@/lib/db/schema";
import { requireGuidebookDraftEdit } from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import {
  QUICK_VARIABLE_PRESETS,
  mergeQuickVariableUsage,
  readQuickVariablesFromSettings,
  saveQuickVariables,
  stripQuickVariablesFromSettings,
  validateQuickVariablesInput,
  writeQuickVariablesToSettings,
} from "@/lib/quick-variables";
import { isDemoGuidebookSettings } from "@/lib/guidebook-public-url";

async function getQuickVariableUsage(guidebookId: string) {
  const [guidebook, sections, blocks, places] = await Promise.all([
    db.query.guidebooks.findFirst({
      where: eq(guidebooks.id, guidebookId),
      columns: {
        title: true,
        branding: true,
        heroData: true,
        bottomNav: true,
        settings: true,
      },
    }),
    db
      .select({
        title: guidebookSections.title,
      })
      .from(guidebookSections)
      .where(eq(guidebookSections.guidebookId, guidebookId)),
    db
      .select({
        content: guidebookBlocks.content,
      })
      .from(guidebookBlocks)
      .where(eq(guidebookBlocks.guidebookId, guidebookId)),
    db
      .select({
        name: guidebookPlaces.name,
        description: guidebookPlaces.description,
        address: guidebookPlaces.address,
        phone: guidebookPlaces.phone,
        website: guidebookPlaces.website,
        email: guidebookPlaces.email,
        openingHours: guidebookPlaces.openingHours,
        tags: guidebookPlaces.tags,
      })
      .from(guidebookPlaces)
      .where(eq(guidebookPlaces.guidebookId, guidebookId)),
  ]);

  if (!guidebook) return {};

  return mergeQuickVariableUsage(
    guidebook.title,
    guidebook.branding,
    guidebook.heroData,
    guidebook.bottomNav,
    stripQuickVariablesFromSettings(guidebook.settings),
    sections,
    blocks,
    places
  );
}

async function quickVariablesResponse(
  settings: Record<string, unknown>,
  guidebookId: string,
  status: string
) {
  const quickVariables = readQuickVariablesFromSettings(settings);
  const usage = await getQuickVariableUsage(guidebookId);
  return {
    presets: QUICK_VARIABLE_PRESETS,
    values: quickVariables.values,
    custom: quickVariables.custom,
    updatedAt: quickVariables.updated_at,
    updatedBy: quickVariables.updated_by,
    isPublished: status === "published",
    status,
    usage: Object.entries(usage)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
  };
}

export async function GET(
  _request: Request,
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

  return NextResponse.json(
    await quickVariablesResponse(
      (access.guidebook.settings ?? {}) as Record<string, unknown>,
      id,
      access.guidebook.status
    )
  );
}

export async function PATCH(
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

  const body = await request.json();
  const parsed = validateQuickVariablesInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.errors }, { status: 400 });
  }

  const previousSettings = (access.guidebook.settings ?? {}) as Record<
    string,
    unknown
  >;
  const current = readQuickVariablesFromSettings(previousSettings);
  const previousCustomKeys = new Set(current.custom.map((field) => field.key));
  const nextQuickVariables = saveQuickVariables(current, parsed.data, user.id);
  const nextSettings = writeQuickVariablesToSettings(
    previousSettings,
    nextQuickVariables
  );

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Updated Quick Variables",
  });

  const [updated] = await db
    .update(guidebooks)
    .set({
      settings: nextSettings,
      lastEditedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(guidebooks.id, id))
    .returning({
      settings: guidebooks.settings,
      slug: guidebooks.slug,
      status: guidebooks.status,
    });

  if (!updated) {
    return NextResponse.json({ error: "Guidebook not found" }, { status: 404 });
  }

  if (updated.status === "published") {
    revalidatePath(`/g/${updated.slug}`);
    if (isDemoGuidebookSettings(updated.settings as Record<string, unknown>)) {
      revalidatePath(`/demo/${updated.slug}`);
    }
  }

  const createdCustomCount = parsed.data.custom.filter(
    (field) => !previousCustomKeys.has(field.key)
  ).length;
  await Promise.all([
    trackServerProductEvent({
      distinctId: user.id,
      event: productEvents.quickVariablesSaved,
      properties: {
        guidebook_id: id,
        custom_count: parsed.data.custom.length,
        value_count: Object.keys(parsed.data.values).length,
        status: updated.status === "published" ? "published" : "draft",
      },
    }),
    createdCustomCount > 0
      ? trackServerProductEvent({
          distinctId: user.id,
          event: productEvents.quickVariableCustomCreated,
          properties: {
            guidebook_id: id,
            count: createdCustomCount,
          },
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json(
    await quickVariablesResponse(
      (updated.settings ?? {}) as Record<string, unknown>,
      id,
      updated.status
    )
  );
}
