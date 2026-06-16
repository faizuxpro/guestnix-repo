import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import {
  guidebookStorefrontItems,
  guidebookStorefronts,
  storeItems,
  storeSettings,
} from "@/lib/db/schema";
import {
  requireGuidebookAccess,
  requireGuidebookDraftEdit,
  serializeDraftTouch,
  touchGuidebookDraft,
} from "@/lib/guidebook-permissions";
import { createServerClient } from "@/lib/supabase/server";
import {
  normalizeStorePaymentMethodIds,
  normalizeStorePaymentMethods,
} from "@/lib/store/payment-methods";
import { getEditorStorefrontData } from "@/lib/store/editor-storefront-data";
import { storefrontPatchSchema } from "@/lib/store/validation";

export const runtime = "nodejs";

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

  return NextResponse.json(
    await getEditorStorefrontData({
      guidebookId: id,
      ownerUserId: access.guidebook.userId,
    })
  );
}

export async function PATCH(
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
  const access = await requireGuidebookDraftEdit(user.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = storefrontPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  if (parsed.data.items) {
    const itemIds = parsed.data.items.map((item) => item.storeItemId);
    if (new Set(itemIds).size !== itemIds.length) {
      return NextResponse.json(
        { error: "Duplicate Store items are not allowed" },
        { status: 400 }
      );
    }

    if (itemIds.length > 0) {
      const ownedItems = await db
        .select({ id: storeItems.id })
        .from(storeItems)
        .where(
          and(
            eq(storeItems.userId, access.guidebook.userId),
            inArray(storeItems.id, itemIds)
          )
        );
      if (ownedItems.length !== itemIds.length) {
        return NextResponse.json(
          { error: "One or more Store items are unavailable" },
          { status: 404 }
        );
      }
    }
  }

  if (parsed.data.paymentMethodIds) {
    if (
      new Set(parsed.data.paymentMethodIds).size !==
      parsed.data.paymentMethodIds.length
    ) {
      return NextResponse.json(
        { error: "Duplicate payment methods are not allowed" },
        { status: 400 }
      );
    }

    const settingsRow = await db.query.storeSettings.findFirst({
      where: eq(storeSettings.userId, access.guidebook.userId),
    });
    const availableIds = new Set(
      normalizeStorePaymentMethods(settingsRow?.paymentMethods).map(
        (method) => method.id
      )
    );
    const invalid = parsed.data.paymentMethodIds.find(
      (methodId) => !availableIds.has(methodId)
    );
    if (invalid) {
      return NextResponse.json(
        { error: "One or more payment methods are unavailable" },
        { status: 404 }
      );
    }
  }

  const now = new Date();
  let previousEnabled = false;
  const storefront = await db.transaction(async (tx) => {
    const existing = await tx.query.guidebookStorefronts.findFirst({
      where: eq(guidebookStorefronts.guidebookId, id),
    });
    previousEnabled = existing?.enabled ?? false;

    const patch: Partial<typeof guidebookStorefronts.$inferInsert> = {
      updatedAt: now,
    };
    if (parsed.data.enabled !== undefined) patch.enabled = parsed.data.enabled;
    if (parsed.data.paymentMethodIds !== undefined) {
      patch.paymentMethodIds = parsed.data.paymentMethodIds;
    }

    const [row] = existing
      ? await tx
          .update(guidebookStorefronts)
          .set(patch)
          .where(eq(guidebookStorefronts.id, existing.id))
          .returning()
      : await tx
          .insert(guidebookStorefronts)
          .values({
            guidebookId: id,
            userId: access.guidebook.userId,
            enabled: parsed.data.enabled ?? false,
            paymentMethodIds: parsed.data.paymentMethodIds ?? [],
          })
          .returning();

    if (parsed.data.items) {
      await tx
        .delete(guidebookStorefrontItems)
        .where(eq(guidebookStorefrontItems.storefrontId, row.id));

      if (parsed.data.items.length > 0) {
        await tx.insert(guidebookStorefrontItems).values(
          parsed.data.items.map((item, index) => ({
            storefrontId: row.id,
            storeItemId: item.storeItemId,
            visible: item.visible,
            orderIndex: item.orderIndex ?? index,
            maxQuantity: item.maxQuantity ?? null,
          }))
        );
      }
    }

    return row;
  });

  const draft = await touchGuidebookDraft(id, user.id);
  const storefrontEnabled = storefront.enabled;
  const paymentMethodIds = normalizeStorePaymentMethodIds(
    storefront.paymentMethodIds
  );
  const itemCount = parsed.data.items?.length;

  const productTracking = [
    trackServerProductEvent({
      distinctId: user.id,
      event: productEvents.storefrontUpdated,
      properties: {
        guidebook_id: id,
        source: "guidebook_editor",
        status: storefrontEnabled ? "enabled" : "disabled",
        storefront_enabled: storefrontEnabled,
        store_item_count: itemCount,
      },
    }),
  ];

  if (storefrontEnabled && !previousEnabled) {
    productTracking.push(
      trackServerProductEvent({
        distinctId: user.id,
        event: productEvents.storeEnabled,
        properties: {
          guidebook_id: id,
          source: "guidebook_editor",
          status: "enabled",
          storefront_enabled: true,
          store_item_count: itemCount,
        },
      })
    );
  }

  void Promise.all(productTracking).catch((err) => {
    console.warn("Storefront analytics tracking failed", err);
  });

  return NextResponse.json({
    storefront: {
      id: storefront.id,
      enabled: storefrontEnabled,
      paymentMethodIds,
    },
    _draft: serializeDraftTouch(draft),
  });
}
