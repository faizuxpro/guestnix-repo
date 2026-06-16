import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookChangeHistory, profiles } from "@/lib/db/schema";
import { HISTORY_LIMIT } from "@/lib/guidebook-history";
import { requireGuidebookAccess } from "@/lib/guidebook-permissions";

export async function GET(
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
  const access = await requireGuidebookAccess(user.id, id, "editor");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const rows = await db
    .select({
      id: guidebookChangeHistory.id,
      actorId: guidebookChangeHistory.actorId,
      actorRole: guidebookChangeHistory.actorRole,
      action: guidebookChangeHistory.action,
      draftRevision: guidebookChangeHistory.draftRevision,
      createdAt: guidebookChangeHistory.createdAt,
      actorEmail: profiles.email,
      actorFullName: profiles.fullName,
      actorAvatarUrl: profiles.avatarUrl,
    })
    .from(guidebookChangeHistory)
    .leftJoin(profiles, eq(guidebookChangeHistory.actorId, profiles.id))
    .where(eq(guidebookChangeHistory.guidebookId, id))
    .orderBy(desc(guidebookChangeHistory.createdAt))
    .limit(HISTORY_LIMIT);

  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      draftRevision: row.draftRevision,
      actorRole: row.actorRole,
      createdAt: row.createdAt.toISOString(),
      canRevert: access.role === "owner" || row.actorId === user.id,
      actor: row.actorId
        ? {
            id: row.actorId,
            email: row.actorEmail,
            fullName: row.actorFullName,
            avatarUrl: row.actorAvatarUrl,
          }
        : null,
    })),
  });
}
