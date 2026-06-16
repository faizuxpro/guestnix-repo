import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebooks } from "@/lib/db/schema";
import { deleteLatestSnapshot } from "@/lib/snapshot";
import { requireGuidebookAccess } from "@/lib/guidebook-permissions";
import { isDemoGuidebookSettings } from "@/lib/guidebook-public-url";

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

  const access = await requireGuidebookAccess(user.id, id, "owner");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }
  const guidebook = access.guidebook;

  // Remove latest.json so the public page 404s. Versioned snapshots stay
  // for audit / rollback — they're cheap and no one can reach them without
  // the explicit version URL.
  try {
    await deleteLatestSnapshot(guidebook.slug);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Snapshot delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await db
    .update(guidebooks)
    .set({
      status: "draft",
      publishedAt: null,
      latestPublicationId: null,
      updatedAt: new Date(),
    })
    .where(eq(guidebooks.id, id));

  revalidatePath(`/g/${guidebook.slug}`);
  if (isDemoGuidebookSettings(guidebook.settings as Record<string, unknown>)) {
    revalidatePath(`/demo/${guidebook.slug}`);
  }

  return NextResponse.json({ success: true });
}
