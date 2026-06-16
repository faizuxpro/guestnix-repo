import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebookOwnershipTransfers,
  profiles,
} from "@/lib/db/schema";
import { createOwnershipTransferSchema } from "@/lib/validations";
import {
  collaborationTokenExpiry,
  hashCollaborationToken,
  makeCollaborationToken,
  normalizeInviteEmail,
  requireGuidebookAccess,
} from "@/lib/guidebook-permissions";
import {
  canCreateDraft,
  canCreateProperty,
  canPublish,
} from "@/lib/billing/entitlements";
import { sendOwnershipTransferEmail } from "@/lib/guidebook-collaboration-emails";
import {
  archiveSourceNotification,
  ownershipTransferNotification,
} from "@/lib/notifications";

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
  const parsed = createOwnershipTransferSchema.safeParse(body);
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

  const [recipient] = await db
    .select({ id: profiles.id, email: profiles.email, fullName: profiles.fullName })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = ${email}`)
    .limit(1);

  if (!recipient) {
    return NextResponse.json(
      { error: "The recipient must create a Guestnix account before ownership can be transferred" },
      { status: 404 }
    );
  }

  const capacityGuard =
    access.guidebook.status === "published"
      ? await canPublish(recipient.id)
      : await canCreateDraft(recipient.id);
  if (!capacityGuard.allowed) {
    return NextResponse.json({ error: capacityGuard.reason }, { status: 402 });
  }

  if (access.guidebook.propertyId) {
    const propertyGuard = await canCreateProperty(recipient.id);
    if (!propertyGuard.allowed) {
      return NextResponse.json({ error: propertyGuard.reason }, { status: 402 });
    }
  }

  const [senderProfile] = await db
    .select({ fullName: profiles.fullName, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const token = makeCollaborationToken();
  const tokenHash = hashCollaborationToken(token);
  const now = new Date();
  const previousTransfers = await db
    .select({
      id: guidebookOwnershipTransfers.id,
      toUserId: guidebookOwnershipTransfers.toUserId,
    })
    .from(guidebookOwnershipTransfers)
    .where(
      and(
        eq(guidebookOwnershipTransfers.guidebookId, id),
        eq(guidebookOwnershipTransfers.status, "pending")
      )
    );

  const createdTransfer = await db.transaction(async (tx) => {
    await tx
      .update(guidebookOwnershipTransfers)
      .set({ status: "canceled", canceledAt: now, updatedAt: now })
      .where(
        and(
          eq(guidebookOwnershipTransfers.guidebookId, id),
          eq(guidebookOwnershipTransfers.status, "pending")
        )
      );

    const expiresAt = collaborationTokenExpiry(now);
    const [transfer] = await tx.insert(guidebookOwnershipTransfers).values({
      guidebookId: id,
      fromUserId: user.id,
      toUserId: recipient.id,
      toEmail: normalizeInviteEmail(recipient.email),
      tokenHash,
      status: "pending",
      keepPreviousOwnerAsEditor: parsed.data.keepPreviousOwnerAsEditor,
      expiresAt,
    }).returning({
      id: guidebookOwnershipTransfers.id,
      expiresAt: guidebookOwnershipTransfers.expiresAt,
    });

    return transfer ?? null;
  });

  for (const transfer of previousTransfers) {
    await archiveSourceNotification({
      userId: transfer.toUserId,
      sourceType: "ownership_transfer",
      sourceId: transfer.id,
    });
  }

  await sendOwnershipTransferEmail({
    to: recipient.email,
    guidebookTitle: access.guidebook.title,
    inviterName: senderProfile?.fullName ?? senderProfile?.email ?? null,
    token,
  });

  if (createdTransfer) {
    await ownershipTransferNotification({
      recipientUserId: recipient.id,
      transferId: createdTransfer.id,
      guidebookId: id,
      guidebookTitle: access.guidebook.title,
      inviterName: senderProfile?.fullName ?? senderProfile?.email ?? null,
      token,
      expiresAt: createdTransfer.expiresAt,
    });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
