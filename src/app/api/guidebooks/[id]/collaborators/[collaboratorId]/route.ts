import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebookCollaborators,
  guidebookInvitations,
} from "@/lib/db/schema";
import { requireGuidebookAccess } from "@/lib/guidebook-permissions";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; collaboratorId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, collaboratorId } = await params;
  const access = await requireGuidebookAccess(user.id, id, "owner");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const [deletedCollaborator] = await db
    .delete(guidebookCollaborators)
    .where(
      and(
        eq(guidebookCollaborators.id, collaboratorId),
        eq(guidebookCollaborators.guidebookId, id)
      )
    )
    .returning({ id: guidebookCollaborators.id });

  if (deletedCollaborator) {
    return NextResponse.json({ success: true, type: "collaborator" });
  }

  const [revokedInvitation] = await db
    .update(guidebookInvitations)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(guidebookInvitations.id, collaboratorId),
        eq(guidebookInvitations.guidebookId, id),
        eq(guidebookInvitations.status, "pending")
      )
    )
    .returning({ id: guidebookInvitations.id });

  if (revokedInvitation) {
    return NextResponse.json({ success: true, type: "invitation" });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
