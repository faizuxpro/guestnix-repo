import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebookBlocks,
  guidebookSections,
} from "@/lib/db/schema";
import { createBlockSchema } from "@/lib/validations";
import {
  requireGuidebookDraftEdit,
  serializeDraftTouch,
  touchGuidebookDraft,
} from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const access = await requireGuidebookDraftEdit(user.id, parsed.data.guidebookId);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const section = await db.query.guidebookSections.findFirst({
    where: and(
      eq(guidebookSections.id, parsed.data.sectionId),
      eq(guidebookSections.guidebookId, parsed.data.guidebookId)
    ),
  });

  if (!section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const last = await db
    .select()
    .from(guidebookBlocks)
    .where(eq(guidebookBlocks.sectionId, section.id))
    .orderBy(desc(guidebookBlocks.orderIndex))
    .limit(1);

  const nextIndex = last[0] ? last[0].orderIndex + 1 : 0;

  await recordGuidebookChangeSnapshot({
    guidebookId: access.guidebook.id,
    actorId: user.id,
    actorRole: access.role,
    action: "Added block",
  });

  const [created] = await db
    .insert(guidebookBlocks)
    .values({
      ...(parsed.data.id ? { id: parsed.data.id } : {}),
      sectionId: section.id,
      guidebookId: access.guidebook.id,
      type: parsed.data.type,
      content: parsed.data.content,
      orderIndex: parsed.data.orderIndex ?? nextIndex,
      isVisible: true,
    })
    .returning();

  const draft = await touchGuidebookDraft(access.guidebook.id, user.id);

  return NextResponse.json(
    { ...created, _draft: serializeDraftTouch(draft) },
    { status: 201 }
  );
}
