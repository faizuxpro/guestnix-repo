import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  guidebookStorefrontItems,
  guidebookStorefronts,
  storeItems,
  storeSettings,
} from "@/lib/db/schema";
import {
  normalizeStorePaymentMethodIds,
  normalizeStorePaymentMethods,
} from "@/lib/store/payment-methods";
import type {
  EditorStorefrontCatalogItem,
  EditorStorefrontData,
} from "@/lib/store/editor-storefront-types";

function serializeEditorCatalogItem(
  row: typeof storeItems.$inferSelect
): EditorStorefrontCatalogItem {
  return {
    id: row.id,
    itemType: row.itemType === "service" ? "service" : "product",
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    priceCents: row.priceCents,
    currency: row.currency,
    unitLabel: row.unitLabel,
    category: row.category,
    active: row.active,
  };
}

async function serializeEditorStorefront(
  row: typeof guidebookStorefronts.$inferSelect | null
): Promise<EditorStorefrontData["storefront"]> {
  if (!row) {
    return {
      id: null,
      enabled: false,
      paymentMethodIds: [],
      items: [],
    };
  }

  const assignmentRows = await db
    .select({
      assignment: guidebookStorefrontItems,
      item: storeItems,
    })
    .from(guidebookStorefrontItems)
    .innerJoin(storeItems, eq(guidebookStorefrontItems.storeItemId, storeItems.id))
    .where(eq(guidebookStorefrontItems.storefrontId, row.id))
    .orderBy(asc(guidebookStorefrontItems.orderIndex), asc(storeItems.name));

  return {
    id: row.id,
    enabled: row.enabled,
    paymentMethodIds: normalizeStorePaymentMethodIds(row.paymentMethodIds),
    items: assignmentRows.map(({ assignment, item }) => ({
      id: assignment.id,
      storeItemId: assignment.storeItemId,
      orderIndex: assignment.orderIndex,
      visible: assignment.visible,
      maxQuantity: assignment.maxQuantity,
      item: serializeEditorCatalogItem(item),
    })),
  };
}

export async function getEditorStorefrontData({
  guidebookId,
  ownerUserId,
}: {
  guidebookId: string;
  ownerUserId: string;
}): Promise<EditorStorefrontData> {
  const [storefront, catalogRows, settingsRow] = await Promise.all([
    db.query.guidebookStorefronts.findFirst({
      where: eq(guidebookStorefronts.guidebookId, guidebookId),
    }),
    db
      .select()
      .from(storeItems)
      .where(eq(storeItems.userId, ownerUserId))
      .orderBy(asc(storeItems.name), asc(storeItems.createdAt)),
    db.query.storeSettings.findFirst({
      where: eq(storeSettings.userId, ownerUserId),
    }),
  ]);

  return {
    storefront: await serializeEditorStorefront(storefront ?? null),
    catalogItems: catalogRows.map(serializeEditorCatalogItem),
    paymentMethods: normalizeStorePaymentMethods(settingsRow?.paymentMethods),
    ownerUserId,
  };
}
