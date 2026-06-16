import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookSections, guidebooks } from "@/lib/db/schema";
import { reorderSectionsSchema } from "@/lib/validations";
import {
  requireGuidebookDraftEdit,
  serializeDraftTouch,
} from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";
import { SECTION_UNAVAILABLE_MESSAGE } from "@/lib/guidebook-error-copy";

function hasDuplicateIds(ids: string[]) {
  return new Set(ids).size !== ids.length;
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

  const body = await request.json().catch(() => ({}));
  const parsed = reorderSectionsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const ids = parsed.data.sections.map((section) => section.id);
  if (ids.length === 0) {
    return NextResponse.json({ success: true });
  }

  if (hasDuplicateIds(ids)) {
    return NextResponse.json(
      { error: "Duplicate section ids are not allowed" },
      { status: 400 }
    );
  }

  const ownedRows = await db
    .select({ id: guidebookSections.id })
    .from(guidebookSections)
    .where(
      and(
        eq(guidebookSections.guidebookId, id),
        inArray(guidebookSections.id, ids)
      )
    );

  if (ownedRows.length !== ids.length) {
    return NextResponse.json(
      { error: SECTION_UNAVAILABLE_MESSAGE },
      { status: 404 }
    );
  }

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Reordered sections",
  });

  const draft = await db.transaction(async (tx) => {
    const now = new Date();

    for (const section of parsed.data.sections) {
      await tx
        .update(guidebookSections)
        .set({ orderIndex: section.orderIndex, updatedAt: now })
        .where(
          and(
            eq(guidebookSections.id, section.id),
            eq(guidebookSections.guidebookId, id)
          )
        );
    }

    const [updated] = await tx
      .update(guidebooks)
      .set({
        draftRevision: sql`${guidebooks.draftRevision} + 1`,
        lastEditedBy: user.id,
        updatedAt: now,
      })
      .where(eq(guidebooks.id, id))
      .returning({
        draftRevision: guidebooks.draftRevision,
        updatedAt: guidebooks.updatedAt,
      });

    return updated ?? null;
  });

  return NextResponse.json({ success: true, _draft: serializeDraftTouch(draft) });
}
