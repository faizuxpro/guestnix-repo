import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookBlocks } from "@/lib/db/schema";
import { reorderBlocksSchema } from "@/lib/validations";
import {
  requireGuidebookDraftEdit,
  serializeDraftTouch,
  touchGuidebookDraft,
  type GuidebookRole,
} from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";

export async function PATCH(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = reorderBlocksSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const ids = parsed.data.blocks.map((b) => b.id);
  if (ids.length === 0) {
    return NextResponse.json({ success: true });
  }

  const ownedRows = await db
    .select({
      id: guidebookBlocks.id,
      guidebookId: guidebookBlocks.guidebookId,
    })
    .from(guidebookBlocks)
    .where(inArray(guidebookBlocks.id, ids));

  if (ownedRows.length !== ids.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guidebookIds = [...new Set(ownedRows.map((row) => row.guidebookId))];
  const rolesByGuidebook = new Map<string, GuidebookRole>();
  for (const guidebookId of guidebookIds) {
    const access = await requireGuidebookDraftEdit(user.id, guidebookId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }
    rolesByGuidebook.set(guidebookId, access.role);
  }

  for (const guidebookId of guidebookIds) {
    await recordGuidebookChangeSnapshot({
      guidebookId,
      actorId: user.id,
      actorRole: rolesByGuidebook.get(guidebookId) ?? "editor",
      action: "Reordered blocks",
    });
  }

  for (const item of parsed.data.blocks) {
    await db
      .update(guidebookBlocks)
      .set({ orderIndex: item.orderIndex, updatedAt: new Date() })
      .where(eq(guidebookBlocks.id, item.id));
  }

  let latestDraft: Awaited<ReturnType<typeof touchGuidebookDraft>> | null = null;
  for (const guidebookId of guidebookIds) {
    latestDraft = await touchGuidebookDraft(guidebookId, user.id);
  }

  return NextResponse.json({
    success: true,
    _draft: serializeDraftTouch(latestDraft),
  });
}
