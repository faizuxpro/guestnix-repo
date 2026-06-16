import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { hostAssets } from "@/lib/db/schema";
import {
  createHostAssetSchema,
  hostAssetTypeEnum,
} from "@/lib/validations";
import { ensureProfile } from "@/lib/auth/ensure-profile";

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const parsedType = type ? hostAssetTypeEnum.safeParse(type) : null;

  if (type && !parsedType?.success) {
    return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(hostAssets)
    .where(
      parsedType?.success
        ? and(eq(hostAssets.userId, user.id), eq(hostAssets.assetType, parsedType.data))
        : eq(hostAssets.userId, user.id)
    )
    .orderBy(desc(hostAssets.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createHostAssetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await ensureProfile(user);

    const [created] = await db
      .insert(hostAssets)
      .values({
        userId: user.id,
        assetType: parsed.data.assetType,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        content: parsed.data.content,
        fileUrl: parsed.data.fileUrl ?? null,
        fileName: parsed.data.fileName ?? null,
        mimeType: parsed.data.mimeType ?? null,
        fileSize: parsed.data.fileSize ?? null,
        tags: parsed.data.tags,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/assets-hub failed", err);
    return NextResponse.json(
      { error: { name: ["Could not save asset. Please try again."] } },
      { status: 500 }
    );
  }
}
