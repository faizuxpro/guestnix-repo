import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookChangeHistory, guidebooks } from "@/lib/db/schema";
import {
  isGuidebookDraftSnapshot,
  recordGuidebookChangeSnapshot,
  restoreGuidebookSnapshot,
} from "@/lib/guidebook-history";
import { requireGuidebookDraftEdit } from "@/lib/guidebook-permissions";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; historyId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, historyId } = await params;
  const access = await requireGuidebookDraftEdit(user.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const historyEntry = await db.query.guidebookChangeHistory.findFirst({
    where: and(
      eq(guidebookChangeHistory.id, historyId),
      eq(guidebookChangeHistory.guidebookId, id)
    ),
  });

  if (!historyEntry) {
    return NextResponse.json({ error: "History entry not found" }, { status: 404 });
  }

  if (access.role !== "owner" && historyEntry.actorId !== user.id) {
    return NextResponse.json(
      { error: "Editors can only restore their own changes" },
      { status: 403 }
    );
  }

  if (!isGuidebookDraftSnapshot(historyEntry.snapshot)) {
    return NextResponse.json(
      { error: "This history entry cannot be restored" },
      { status: 422 }
    );
  }
  const snapshot = historyEntry.snapshot;

  if (
    access.role === "owner" &&
    snapshot.guidebook.slug !== access.guidebook.slug
  ) {
    const slugConflict = await db.query.guidebooks.findFirst({
      where: and(
        eq(guidebooks.slug, snapshot.guidebook.slug),
        ne(guidebooks.id, id)
      ),
    });

    if (slugConflict) {
      return NextResponse.json(
        { error: "That saved slug is now used by another guidebook" },
        { status: 409 }
      );
    }
  }

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Restored history version",
  });

  const restored = await restoreGuidebookSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    snapshot,
  });

  if (!restored) {
    return NextResponse.json({ error: "Guidebook not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    draftRevision: restored.draftRevision,
    updatedAt: restored.updatedAt.toISOString(),
  });
}
