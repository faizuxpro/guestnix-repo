import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookSections } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { updateSectionSchema } from "@/lib/validations";
import {
  requireGuidebookDraftEdit,
  serializeDraftTouch,
  touchGuidebookDraft,
} from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";
import { SECTION_UNAVAILABLE_MESSAGE } from "@/lib/guidebook-error-copy";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sectionId } = await params;
  const access = await requireGuidebookDraftEdit(user.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updateSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Updated section",
  });

  const [updated] = await db
    .update(guidebookSections)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(guidebookSections.id, sectionId),
        eq(guidebookSections.guidebookId, id)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: SECTION_UNAVAILABLE_MESSAGE },
      { status: 404 }
    );
  }

  const draft = await touchGuidebookDraft(id, user.id);

  return NextResponse.json({ ...updated, _draft: serializeDraftTouch(draft) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; sectionId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, sectionId } = await params;
  const access = await requireGuidebookDraftEdit(user.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Deleted section",
  });

  const [deleted] = await db
    .delete(guidebookSections)
    .where(
      and(
        eq(guidebookSections.id, sectionId),
        eq(guidebookSections.guidebookId, id)
      )
    )
    .returning({ id: guidebookSections.id });

  if (!deleted) {
    return NextResponse.json(
      { error: SECTION_UNAVAILABLE_MESSAGE },
      { status: 404 }
    );
  }

  const draft = await touchGuidebookDraft(id, user.id);

  return NextResponse.json({ success: true, _draft: serializeDraftTouch(draft) });
}
