import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebookCollaborators,
  guidebookInvitations,
  guidebooks,
} from "@/lib/db/schema";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import {
  hashCollaborationToken,
  isExpired,
  normalizeInviteEmail,
} from "@/lib/guidebook-permissions";
import {
  archiveSourceNotification,
  upsertSourceNotification,
} from "@/lib/notifications";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(user);

  const { token } = await params;
  const tokenHash = hashCollaborationToken(token);

  const [row] = await db
    .select({
      invitation: guidebookInvitations,
      guidebook: guidebooks,
    })
    .from(guidebookInvitations)
    .innerJoin(guidebooks, eq(guidebooks.id, guidebookInvitations.guidebookId))
    .where(eq(guidebookInvitations.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.invitation.status !== "pending") {
    return NextResponse.json(
      { error: "This invitation is no longer valid" },
      { status: 404 }
    );
  }

  if (isExpired(row.invitation.expiresAt)) {
    await db
      .update(guidebookInvitations)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(guidebookInvitations.id, row.invitation.id));
    return NextResponse.json(
      { error: "This invitation has expired" },
      { status: 410 }
    );
  }

  const invitedEmail = normalizeInviteEmail(row.invitation.email);
  const userEmail = normalizeInviteEmail(user.email ?? "");
  if (invitedEmail !== userEmail) {
    return NextResponse.json(
      { error: `Sign in as ${row.invitation.email} to accept this invitation` },
      { status: 403 }
    );
  }

  if (row.guidebook.userId === user.id) {
    await db
      .update(guidebookInvitations)
      .set({
        status: "accepted",
        acceptedBy: user.id,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(guidebookInvitations.id, row.invitation.id));

    await archiveSourceNotification({
      userId: user.id,
      sourceType: "guidebook_invitation",
      sourceId: row.invitation.id,
    });

    return NextResponse.json({
      success: true,
      guidebookId: row.guidebook.id,
      editorUrl: `/dashboard/guidebooks/${row.guidebook.id}/editor`,
    });
  }

  await db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .insert(guidebookCollaborators)
      .values({
        guidebookId: row.guidebook.id,
        userId: user.id,
        role: "editor",
        invitedBy: row.invitation.invitedBy,
        acceptedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [guidebookCollaborators.guidebookId, guidebookCollaborators.userId],
        set: {
          role: "editor",
          invitedBy: row.invitation.invitedBy,
          acceptedAt: now,
          updatedAt: now,
        },
      });

    await tx
      .update(guidebookInvitations)
      .set({
        status: "accepted",
        acceptedBy: user.id,
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(guidebookInvitations.id, row.invitation.id));
  });

  await archiveSourceNotification({
    userId: user.id,
    sourceType: "guidebook_invitation",
    sourceId: row.invitation.id,
  });

  if (row.invitation.invitedBy && row.invitation.invitedBy !== user.id) {
    await upsertSourceNotification({
      userId: row.invitation.invitedBy,
      type: "guidebook_invitation_accepted",
      title: "Guidebook invitation accepted",
      body: `${user.email ?? "A collaborator"} accepted the invitation to edit "${row.guidebook.title}".`,
      href: `/dashboard/guidebooks/${row.guidebook.id}/editor`,
      sourceType: "guidebook_invitation_accepted",
      sourceId: row.invitation.id,
      metadata: {
        guidebookId: row.guidebook.id,
        guidebookTitle: row.guidebook.title,
        acceptedBy: user.id,
      },
    });
  }

  return NextResponse.json({
    success: true,
    guidebookId: row.guidebook.id,
    editorUrl: `/dashboard/guidebooks/${row.guidebook.id}/editor`,
  });
}
