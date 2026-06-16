import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  customDomains,
  guidebookCollaborators,
  guidebookInvitations,
  guidebookOwnershipTransfers,
  guidebooks,
  properties,
} from "@/lib/db/schema";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import {
  hashCollaborationToken,
  isExpired,
} from "@/lib/guidebook-permissions";
import {
  canCreateDraft,
  canCreateProperty,
  canPublish,
} from "@/lib/billing/entitlements";
import {
  archiveSourceNotification,
  upsertSourceNotification,
} from "@/lib/notifications";

class TransferNotPendingError extends Error {}

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
      transfer: guidebookOwnershipTransfers,
      guidebook: guidebooks,
    })
    .from(guidebookOwnershipTransfers)
    .innerJoin(guidebooks, eq(guidebooks.id, guidebookOwnershipTransfers.guidebookId))
    .where(eq(guidebookOwnershipTransfers.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.transfer.status !== "pending") {
    return NextResponse.json(
      { error: "This ownership transfer is no longer valid" },
      { status: 404 }
    );
  }

  if (row.transfer.toUserId !== user.id) {
    return NextResponse.json(
      { error: "Sign in with the account this transfer was sent to" },
      { status: 403 }
    );
  }

  if (isExpired(row.transfer.expiresAt)) {
    await db
      .update(guidebookOwnershipTransfers)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(guidebookOwnershipTransfers.id, row.transfer.id));
    return NextResponse.json(
      { error: "This ownership transfer has expired" },
      { status: 410 }
    );
  }

  const capacityGuard =
    row.guidebook.status === "published"
      ? await canPublish(user.id)
      : await canCreateDraft(user.id);
  if (!capacityGuard.allowed) {
    return NextResponse.json({ error: capacityGuard.reason }, { status: 402 });
  }

  if (row.guidebook.propertyId) {
    const propertyGuard = await canCreateProperty(user.id);
    if (!propertyGuard.allowed) {
      return NextResponse.json({ error: propertyGuard.reason }, { status: 402 });
    }
  }

  try {
    await db.transaction(async (tx) => {
      const now = new Date();
      let clonedPropertyId: string | null = null;

      if (row.guidebook.propertyId) {
        const [property] = await tx
          .select()
          .from(properties)
          .where(eq(properties.id, row.guidebook.propertyId))
          .limit(1);

        if (property) {
          const [clone] = await tx
            .insert(properties)
            .values({
              userId: user.id,
              name: property.name,
              address: property.address,
              city: property.city,
              state: property.state,
              country: property.country,
              postalCode: property.postalCode,
              lat: property.lat,
              lng: property.lng,
              timezone: property.timezone,
            })
            .returning({ id: properties.id });
          clonedPropertyId = clone?.id ?? null;
        }
      }

      await tx
        .update(guidebooks)
        .set({
          userId: user.id,
          propertyId: clonedPropertyId,
          lastEditedBy: user.id,
          updatedAt: now,
        })
        .where(eq(guidebooks.id, row.guidebook.id));

      await tx
        .update(customDomains)
        .set({ userId: user.id, updatedAt: now })
        .where(eq(customDomains.guidebookId, row.guidebook.id));

      await tx
        .update(guidebookInvitations)
        .set({ status: "revoked", revokedAt: now, updatedAt: now })
        .where(
          and(
            eq(guidebookInvitations.guidebookId, row.guidebook.id),
            eq(guidebookInvitations.status, "pending")
          )
        );

      await tx
        .delete(guidebookCollaborators)
        .where(
          and(
            eq(guidebookCollaborators.guidebookId, row.guidebook.id),
            eq(guidebookCollaborators.userId, user.id)
          )
        );

      if (row.transfer.keepPreviousOwnerAsEditor) {
        await tx
          .insert(guidebookCollaborators)
          .values({
            guidebookId: row.guidebook.id,
            userId: row.transfer.fromUserId,
            role: "editor",
            invitedBy: user.id,
            acceptedAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              guidebookCollaborators.guidebookId,
              guidebookCollaborators.userId,
            ],
            set: {
              role: "editor",
              invitedBy: user.id,
              acceptedAt: now,
              updatedAt: now,
            },
          });
      } else {
        await tx
          .delete(guidebookCollaborators)
          .where(
            and(
              eq(guidebookCollaborators.guidebookId, row.guidebook.id),
              eq(guidebookCollaborators.userId, row.transfer.fromUserId)
            )
          );
      }

      const [acceptedTransfer] = await tx
        .update(guidebookOwnershipTransfers)
        .set({
          status: "accepted",
          acceptedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(guidebookOwnershipTransfers.id, row.transfer.id),
            eq(guidebookOwnershipTransfers.status, "pending")
          )
        )
        .returning({ id: guidebookOwnershipTransfers.id });

      if (!acceptedTransfer) {
        throw new TransferNotPendingError();
      }
    });
  } catch (error) {
    if (error instanceof TransferNotPendingError) {
      return NextResponse.json(
        { error: "This ownership transfer is no longer valid" },
        { status: 409 }
      );
    }
    throw error;
  }

  await archiveSourceNotification({
    userId: user.id,
    sourceType: "ownership_transfer",
    sourceId: row.transfer.id,
  });

  await upsertSourceNotification({
    userId: row.transfer.fromUserId,
    type: "ownership_transfer_accepted",
    title: "Ownership transfer accepted",
    body: `${user.email ?? "The recipient"} accepted ownership of "${row.guidebook.title}".`,
    href: "/dashboard/guidebooks",
    sourceType: "ownership_transfer_accepted",
    sourceId: row.transfer.id,
    metadata: {
      guidebookId: row.guidebook.id,
      guidebookTitle: row.guidebook.title,
      acceptedBy: user.id,
    },
  });

  return NextResponse.json({
    success: true,
    guidebookId: row.guidebook.id,
    editorUrl: `/dashboard/guidebooks/${row.guidebook.id}/editor`,
  });
}
