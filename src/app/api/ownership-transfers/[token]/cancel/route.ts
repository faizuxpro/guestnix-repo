import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookOwnershipTransfers, guidebooks } from "@/lib/db/schema";
import { hashCollaborationToken } from "@/lib/guidebook-permissions";
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

  const { token } = await params;
  const tokenHash = hashCollaborationToken(token);

  const transfer = await db.query.guidebookOwnershipTransfers.findFirst({
    where: eq(guidebookOwnershipTransfers.tokenHash, tokenHash),
  });

  if (!transfer || transfer.status !== "pending") {
    return NextResponse.json(
      { error: "This ownership transfer is no longer valid" },
      { status: 404 }
    );
  }

  if (transfer.fromUserId !== user.id && transfer.toUserId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(guidebookOwnershipTransfers)
    .set({ status: "canceled", canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(guidebookOwnershipTransfers.id, transfer.id));

  await archiveSourceNotification({
    userId: transfer.toUserId,
    sourceType: "ownership_transfer",
    sourceId: transfer.id,
  });

  if (user.id === transfer.toUserId) {
    const guidebook = await db.query.guidebooks.findFirst({
      where: eq(guidebooks.id, transfer.guidebookId),
    });

    await upsertSourceNotification({
      userId: transfer.fromUserId,
      type: "ownership_transfer_canceled",
      title: "Ownership transfer declined",
      body: `${user.email ?? "The recipient"} declined the ownership transfer${guidebook ? ` for "${guidebook.title}"` : ""}.`,
      href: "/dashboard/guidebooks",
      sourceType: "ownership_transfer_canceled",
      sourceId: transfer.id,
      metadata: {
        guidebookId: transfer.guidebookId,
        guidebookTitle: guidebook?.title ?? null,
        canceledBy: user.id,
      },
    });
  }

  return NextResponse.json({ success: true });
}
