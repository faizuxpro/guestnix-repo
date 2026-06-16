import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { hostAssets } from "@/lib/db/schema";
import { updateHostAssetSchema } from "@/lib/validations";

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
  const body = await request.json().catch(() => ({}));
  const parsed = updateHostAssetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updates: Partial<typeof hostAssets.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (parsed.data.assetType !== undefined) updates.assetType = parsed.data.assetType;
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description ?? null;
  }
  if (parsed.data.content !== undefined) updates.content = parsed.data.content;
  if (parsed.data.fileUrl !== undefined) updates.fileUrl = parsed.data.fileUrl ?? null;
  if (parsed.data.fileName !== undefined) updates.fileName = parsed.data.fileName ?? null;
  if (parsed.data.mimeType !== undefined) updates.mimeType = parsed.data.mimeType ?? null;
  if (parsed.data.fileSize !== undefined) updates.fileSize = parsed.data.fileSize ?? null;
  if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;

  const [updated] = await db
    .update(hostAssets)
    .set(updates)
    .where(and(eq(hostAssets.id, id), eq(hostAssets.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
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

  const [deleted] = await db
    .delete(hostAssets)
    .where(and(eq(hostAssets.id, id), eq(hostAssets.userId, user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
