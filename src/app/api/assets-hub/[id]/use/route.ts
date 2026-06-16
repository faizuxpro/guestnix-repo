import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { hostAssets } from "@/lib/db/schema";

export async function POST(
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

  const [updated] = await db
    .update(hostAssets)
    .set({
      usageCount: sql`${hostAssets.usageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(hostAssets.id, id), eq(hostAssets.userId, user.id)))
    .returning({ usageCount: hostAssets.usageCount });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
