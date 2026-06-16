import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookBlocks } from "@/lib/db/schema";
import { updateBlockSchema } from "@/lib/validations";
import {
  requireGuidebookDraftEdit,
  serializeDraftTouch,
  touchGuidebookDraft,
} from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";

async function getEditableBlock(userId: string, blockId: string) {
  const row = await db
    .select({
      blockId: guidebookBlocks.id,
      guidebookId: guidebookBlocks.guidebookId,
    })
    .from(guidebookBlocks)
    .where(eq(guidebookBlocks.id, blockId))
    .limit(1);

  const item = row[0];
  if (!item) return null;
  const access = await requireGuidebookDraftEdit(userId, item.guidebookId);
  return access.ok ? { ...item, role: access.role } : null;
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
  const block = await getEditableBlock(user.id, id);
  if (!block) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updateBlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await recordGuidebookChangeSnapshot({
    guidebookId: block.guidebookId,
    actorId: user.id,
    actorRole: block.role,
    action: "Updated block",
  });

  const [updated] = await db
    .update(guidebookBlocks)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(guidebookBlocks.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const draft = await touchGuidebookDraft(block.guidebookId, user.id);

  return NextResponse.json({ ...updated, _draft: serializeDraftTouch(draft) });
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
  const block = await getEditableBlock(user.id, id);
  if (!block) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await recordGuidebookChangeSnapshot({
    guidebookId: block.guidebookId,
    actorId: user.id,
    actorRole: block.role,
    action: "Deleted block",
  });

  const [deleted] = await db
    .delete(guidebookBlocks)
    .where(eq(guidebookBlocks.id, id))
    .returning({ id: guidebookBlocks.id });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const draft = await touchGuidebookDraft(block.guidebookId, user.id);

  return NextResponse.json({ success: true, _draft: serializeDraftTouch(draft) });
}
