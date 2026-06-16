import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import {
  guidebookStorefrontItems,
  guidebookStorefronts,
  storeItems,
} from "@/lib/db/schema";
import { touchGuidebookDraft } from "@/lib/guidebook-permissions";
import { createServerClient } from "@/lib/supabase/server";
import { serializeDashboardStoreItem } from "@/lib/store/dashboard-data";
import { storeItemUpdateSchema } from "@/lib/store/validation";

export const runtime = "nodejs";

async function touchAssignedGuidebooks(userId: string, itemId: string) {
  const rows = await db
    .select({ guidebookId: guidebookStorefronts.guidebookId })
    .from(guidebookStorefrontItems)
    .innerJoin(
      guidebookStorefronts,
      eq(guidebookStorefrontItems.storefrontId, guidebookStorefronts.id)
    )
    .where(
      and(
        eq(guidebookStorefrontItems.storeItemId, itemId),
        eq(guidebookStorefronts.userId, userId)
      )
    );

  const guidebookIds = [...new Set(rows.map((row) => row.guidebookId))];
  await Promise.all(
    guidebookIds.map((guidebookId) => touchGuidebookDraft(guidebookId, userId))
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = storeItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await db.query.storeItems.findFirst({
    where: and(eq(storeItems.id, itemId), eq(storeItems.userId, user.id)),
  });
  if (!existing) {
    return NextResponse.json({ error: "Store item not found" }, { status: 404 });
  }

  const patch: Partial<typeof storeItems.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.itemType !== undefined) patch.itemType = parsed.data.itemType;
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) {
    patch.description = parsed.data.description ?? null;
  }
  if (parsed.data.imageUrl !== undefined) {
    patch.imageUrl = parsed.data.imageUrl ?? null;
  }
  if (parsed.data.priceCents !== undefined) {
    patch.priceCents = parsed.data.priceCents;
  }
  if (parsed.data.currency !== undefined) patch.currency = parsed.data.currency;
  if (parsed.data.unitLabel !== undefined) {
    patch.unitLabel = parsed.data.unitLabel ?? null;
  }
  if (parsed.data.category !== undefined) {
    patch.category = parsed.data.category ?? null;
  }
  if (parsed.data.active !== undefined) patch.active = parsed.data.active;

  const [updated] = await db
    .update(storeItems)
    .set(patch)
    .where(and(eq(storeItems.id, itemId), eq(storeItems.userId, user.id)))
    .returning();

  await touchAssignedGuidebooks(user.id, itemId);

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.storeItemUpdated,
    properties: {
      currency: updated.currency,
      item_type: updated.itemType,
      source: "dashboard_store",
      status: updated.active ? "active" : "inactive",
      subtotal_cents: updated.priceCents,
    },
  });

  return NextResponse.json({ item: serializeDashboardStoreItem(updated) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const existing = await db.query.storeItems.findFirst({
    where: and(eq(storeItems.id, itemId), eq(storeItems.userId, user.id)),
  });
  if (!existing) {
    return NextResponse.json({ error: "Store item not found" }, { status: 404 });
  }

  await touchAssignedGuidebooks(user.id, itemId);
  await db
    .delete(storeItems)
    .where(and(eq(storeItems.id, itemId), eq(storeItems.userId, user.id)));

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.storeItemDeleted,
    properties: {
      source: "dashboard_store",
      status: existing.active ? "active" : "inactive",
    },
  });

  return NextResponse.json({ success: true });
}
