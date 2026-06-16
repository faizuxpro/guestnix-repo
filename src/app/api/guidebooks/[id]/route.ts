import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebooks, guidebookSections, guidebookBlocks } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { updateGuidebookSchema } from "@/lib/validations";
import {
  requireGuidebookAccess,
  requireGuidebookDraftEdit,
} from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";
import { GUIDEBOOK_UNAVAILABLE_MESSAGE } from "@/lib/guidebook-error-copy";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import {
  normalizeGuidebookAccessSettingsPatch,
  redactGuidebookAccessSettingsForClient,
} from "@/lib/guidebook-access";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { DEMO_GUIDEBOOK_SETTINGS_KEY } from "@/lib/guidebook-public-url";

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

  const guidebook = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.id, id),
    with: {
      property: true,
      sections: {
        orderBy: [asc(guidebookSections.orderIndex)],
      },
    },
  });

  if (!guidebook) {
    return NextResponse.json(
      { error: GUIDEBOOK_UNAVAILABLE_MESSAGE },
      { status: 404 }
    );
  }

  // Fetch blocks grouped by section
  const blocks = await db
    .select()
    .from(guidebookBlocks)
    .where(eq(guidebookBlocks.guidebookId, id))
    .orderBy(asc(guidebookBlocks.orderIndex));

  return NextResponse.json({
    ...guidebook,
    settings: redactGuidebookAccessSettingsForClient(
      (guidebook.settings ?? {}) as Record<string, unknown>
    ),
    accessRole: access.role,
    blocks,
  });
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
  const body = await request.json();
  const parsed = updateGuidebookSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const access = await requireGuidebookDraftEdit(user.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  if (
    access.role === "editor" &&
    (parsed.data.slug !== undefined ||
      parsed.data.templateId !== undefined ||
      parsed.data.propertyId !== undefined ||
      parsed.data.branding !== undefined ||
      parsed.data.settings !== undefined)
  ) {
    return NextResponse.json(
      { error: "Editors can only rename draft guidebooks from this endpoint" },
      { status: 403 }
    );
  }

  const requestedSettings =
    parsed.data.settings as Record<string, unknown> | undefined;
  if (
    requestedSettings &&
    DEMO_GUIDEBOOK_SETTINGS_KEY in requestedSettings &&
    !isPlatformAdmin(user)
  ) {
    return NextResponse.json(
      { error: "Only platform admins can change demo guidebook settings" },
      { status: 403 }
    );
  }

  // Check slug uniqueness if changing
  if (parsed.data.slug) {
    const existing = await db.query.guidebooks.findFirst({
      where: eq(guidebooks.slug, parsed.data.slug),
    });
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: { slug: ["This slug is already taken"] } },
        { status: 400 }
      );
    }
  }

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Updated guidebook details",
  });

  const previousSettings = (access.guidebook.settings ?? {}) as Record<
    string,
    unknown
  >;
  const nextSettings =
    parsed.data.settings !== undefined
      ? {
          ...previousSettings,
          ...normalizeGuidebookAccessSettingsPatch(
            previousSettings,
            requestedSettings ?? {}
          ),
        }
      : undefined;
  const updateValues = {
    ...parsed.data,
    ...(nextSettings !== undefined ? { settings: nextSettings } : {}),
  };

  const [updated] = await db
    .update(guidebooks)
    .set({
      ...updateValues,
      draftRevision: sql`${guidebooks.draftRevision} + 1`,
      lastEditedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(guidebooks.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: GUIDEBOOK_UNAVAILABLE_MESSAGE },
      { status: 404 }
    );
  }

  if (typeof requestedSettings?.ai_chat_enabled === "boolean") {
    const enabled = requestedSettings.ai_chat_enabled;
    const events = [
      trackServerProductEvent({
        distinctId: user.id,
        event: productEvents.aiSettingsChanged,
        properties: {
          guidebook_id: id,
          status: enabled ? "enabled" : "disabled",
          source: "guidebook_settings",
        },
      }),
    ];

    if (enabled && previousSettings.ai_chat_enabled !== true) {
      events.push(
        trackServerProductEvent({
          distinctId: user.id,
          event: productEvents.chatEnabled,
          properties: {
            guidebook_id: id,
            source: "guidebook_settings",
          },
        })
      );
    }

    await Promise.all(events);
  }

  return NextResponse.json({
    ...updated,
    settings: redactGuidebookAccessSettingsForClient(
      (updated.settings ?? {}) as Record<string, unknown>
    ),
  });
}

export async function DELETE(
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

  const access = await requireGuidebookAccess(user.id, id, "owner");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const [deleted] = await db
    .delete(guidebooks)
    .where(eq(guidebooks.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: GUIDEBOOK_UNAVAILABLE_MESSAGE },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
