import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebookCollaborators,
  guidebookInvitations,
  profiles,
} from "@/lib/db/schema";
import { inviteGuidebookEditorSchema } from "@/lib/validations";
import {
  collaborationTokenExpiry,
  hashCollaborationToken,
  makeCollaborationToken,
  normalizeInviteEmail,
  requireGuidebookAccess,
} from "@/lib/guidebook-permissions";
import { sendGuidebookInvitationEmail } from "@/lib/guidebook-collaboration-emails";
import { collaborationInvitationNotification } from "@/lib/notifications";

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
  const access = await requireGuidebookAccess(user.id, id, "owner");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = inviteGuidebookEditorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const email = normalizeInviteEmail(parsed.data.email);
  if (normalizeInviteEmail(user.email ?? "") === email) {
    return NextResponse.json(
      { error: "You already own this guidebook" },
      { status: 400 }
    );
  }

  const [recipientProfile] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${email}`)
    .limit(1);

  if (recipientProfile?.id === access.guidebook.userId) {
    return NextResponse.json(
      { error: "That user already owns this guidebook" },
      { status: 400 }
    );
  }

  if (recipientProfile) {
    const existingCollaborator = await db.query.guidebookCollaborators.findFirst({
      where: and(
        eq(guidebookCollaborators.guidebookId, id),
        eq(guidebookCollaborators.userId, recipientProfile.id)
      ),
    });

    if (existingCollaborator) {
      return NextResponse.json(
        { error: "That user is already an editor" },
        { status: 409 }
      );
    }
  }

  const [inviterProfile] = await db
    .select({ fullName: profiles.fullName, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const token = makeCollaborationToken();
  const tokenHash = hashCollaborationToken(token);
  const expiresAt = collaborationTokenExpiry();
  const now = new Date();

  const existingPending = await db.query.guidebookInvitations.findFirst({
    where: and(
      eq(guidebookInvitations.guidebookId, id),
      eq(guidebookInvitations.email, email),
      eq(guidebookInvitations.status, "pending")
    ),
  });

  const [invitation] = existingPending
    ? await db
        .update(guidebookInvitations)
        .set({
          tokenHash,
          role: "editor",
          invitedBy: user.id,
          expiresAt,
          updatedAt: now,
        })
        .where(eq(guidebookInvitations.id, existingPending.id))
        .returning()
    : await db
        .insert(guidebookInvitations)
        .values({
          guidebookId: id,
          email,
          role: "editor",
          tokenHash,
          status: "pending",
          invitedBy: user.id,
          expiresAt,
        })
        .returning();

  await sendGuidebookInvitationEmail({
    to: email,
    guidebookTitle: access.guidebook.title,
    inviterName: inviterProfile?.fullName ?? inviterProfile?.email ?? null,
    token,
  });

  if (recipientProfile) {
    await collaborationInvitationNotification({
      recipientUserId: recipientProfile.id,
      invitationId: invitation.id,
      guidebookId: id,
      guidebookTitle: access.guidebook.title,
      inviterName: inviterProfile?.fullName ?? inviterProfile?.email ?? null,
      token,
      expiresAt,
    });
  }

  return NextResponse.json(
    {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
        updatedAt: invitation.updatedAt.toISOString(),
      },
    },
    { status: existingPending ? 200 : 201 }
  );
}
