import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookSections } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { createSectionSchema } from "@/lib/validations";
import {
  requireGuidebookDraftEdit,
  serializeDraftTouch,
  touchGuidebookDraft,
} from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";

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

  const body = await request.json().catch(() => ({}));
  const parsed = createSectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const last = await db
    .select()
    .from(guidebookSections)
    .where(eq(guidebookSections.guidebookId, id))
    .orderBy(desc(guidebookSections.orderIndex))
    .limit(1);

  const nextIndex = last[0] ? last[0].orderIndex + 1 : 0;

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Added section",
  });

  const [created] = await db
    .insert(guidebookSections)
    .values({
      ...(parsed.data.id ? { id: parsed.data.id } : {}),
      guidebookId: id,
      title: parsed.data.title,
      icon: parsed.data.icon,
      orderIndex: parsed.data.orderIndex ?? nextIndex,
    })
    .returning();

  const draft = await touchGuidebookDraft(id, user.id);

  return NextResponse.json(
    { ...created, _draft: serializeDraftTouch(draft) },
    { status: 201 }
  );
}
