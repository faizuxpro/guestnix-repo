import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebookCollaborators,
  guidebookInvitations,
  guidebookOwnershipTransfers,
  profiles,
} from "@/lib/db/schema";
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
  const access = await requireGuidebookAccess(user.id, id, "owner");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const collaboratorRows = await db
    .select({
      id: guidebookCollaborators.id,
      role: guidebookCollaborators.role,
      acceptedAt: guidebookCollaborators.acceptedAt,
      createdAt: guidebookCollaborators.createdAt,
      user: {
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(guidebookCollaborators)
    .innerJoin(profiles, eq(profiles.id, guidebookCollaborators.userId))
    .where(eq(guidebookCollaborators.guidebookId, id))
    .orderBy(desc(guidebookCollaborators.createdAt));

  const invitationRows = await db
    .select({
      id: guidebookInvitations.id,
      email: guidebookInvitations.email,
      role: guidebookInvitations.role,
      status: guidebookInvitations.status,
      expiresAt: guidebookInvitations.expiresAt,
      createdAt: guidebookInvitations.createdAt,
      updatedAt: guidebookInvitations.updatedAt,
    })
    .from(guidebookInvitations)
    .where(
      and(
        eq(guidebookInvitations.guidebookId, id),
        eq(guidebookInvitations.status, "pending")
      )
    )
    .orderBy(desc(guidebookInvitations.createdAt));

  const transferRows = await db
    .select({
      id: guidebookOwnershipTransfers.id,
      toEmail: guidebookOwnershipTransfers.toEmail,
      status: guidebookOwnershipTransfers.status,
      expiresAt: guidebookOwnershipTransfers.expiresAt,
      createdAt: guidebookOwnershipTransfers.createdAt,
      updatedAt: guidebookOwnershipTransfers.updatedAt,
    })
    .from(guidebookOwnershipTransfers)
    .where(
      and(
        eq(guidebookOwnershipTransfers.guidebookId, id),
        eq(guidebookOwnershipTransfers.status, "pending")
      )
    )
    .orderBy(desc(guidebookOwnershipTransfers.createdAt));

  return NextResponse.json({
    collaborators: collaboratorRows.map((row) => ({
      ...row,
      acceptedAt: row.acceptedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
    invitations: invitationRows.map((row) => ({
      ...row,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    ownershipTransfers: transferRows.map((row) => ({
      ...row,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}
