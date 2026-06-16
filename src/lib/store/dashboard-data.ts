import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  guidebooks,
  storeItems,
  storeRequestItems,
  storeRequests,
  storeSettings,
} from "@/lib/db/schema";
import {
  normalizeStorePaymentMethods,
} from "@/lib/store/payment-methods";
import { formatStoreMoney } from "@/lib/store/public";
import { STORE_REQUEST_STATUSES } from "@/lib/store/types";
import type {
  DashboardStoreCatalogItem,
  DashboardStoreInitialData,
  DashboardStorePaymentSettings,
  DashboardStoreRequestSummary,
} from "@/lib/store/dashboard-types";

type StoreRequestFilters = {
  status?: string | null;
  guidebookId?: string | null;
  selectedRequestId?: string | null;
};

export function serializeDashboardStoreItem(
  row: typeof storeItems.$inferSelect
): DashboardStoreCatalogItem {
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializeDashboardStoreSettings(
  row: typeof storeSettings.$inferSelect | null
): DashboardStorePaymentSettings {
  return {
    paymentInstructions: row?.paymentInstructions ?? null,
    paymentMethods: normalizeStorePaymentMethods(row?.paymentMethods),
  };
}

export async function getDashboardStoreCatalogItems(userId: string) {
  const rows = await db
    .select()
    .from(storeItems)
    .where(eq(storeItems.userId, userId))
    .orderBy(asc(storeItems.name), asc(storeItems.createdAt));

  return rows.map(serializeDashboardStoreItem);
}

export async function getDashboardStorePaymentSettings(userId: string) {
  const row = await db.query.storeSettings.findFirst({
    where: eq(storeSettings.userId, userId),
  });

  return serializeDashboardStoreSettings(row ?? null);
}

export async function getDashboardStoreRequests(
  userId: string,
  filtersInput: StoreRequestFilters = {}
): Promise<DashboardStoreRequestSummary[]> {
  const filters = [eq(storeRequests.userId, userId)];
  const { status, guidebookId, selectedRequestId } = filtersInput;

  if (
    status &&
    (STORE_REQUEST_STATUSES as readonly string[]).includes(status)
  ) {
    filters.push(eq(storeRequests.status, status));
  }

  if (guidebookId) {
    filters.push(eq(storeRequests.guidebookId, guidebookId));
  }

  if (selectedRequestId) {
    filters.push(eq(storeRequests.id, selectedRequestId));
  }

  const rows = await db
    .select({
      request: storeRequests,
      guidebookTitle: guidebooks.title,
      guidebookSlug: guidebooks.slug,
    })
    .from(storeRequests)
    .innerJoin(guidebooks, eq(storeRequests.guidebookId, guidebooks.id))
    .where(and(...filters))
    .orderBy(desc(storeRequests.createdAt))
    .limit(100);

  const requestIds = rows.map((row) => row.request.id);
  const itemRows =
    requestIds.length > 0
      ? await db
          .select({
            item: storeRequestItems,
            imageUrl: storeItems.imageUrl,
            itemType: storeItems.itemType,
            category: storeItems.category,
          })
          .from(storeRequestItems)
          .leftJoin(storeItems, eq(storeRequestItems.storeItemId, storeItems.id))
          .where(inArray(storeRequestItems.requestId, requestIds))
      : [];

  const itemsByRequest = new Map<string, typeof itemRows>();
  for (const row of itemRows) {
    const list = itemsByRequest.get(row.item.requestId) ?? [];
    list.push(row);
    itemsByRequest.set(row.item.requestId, list);
  }

  return rows.map(({ request: row, guidebookTitle, guidebookSlug }) => {
    const items = itemsByRequest.get(row.id) ?? [];

    return {
      id: row.id,
      requestCode: row.requestCode,
      guidebookId: row.guidebookId,
      guidebookTitle,
      guidebookSlug,
      guestName: row.guestName,
      guestEmail: row.guestEmail,
      guestPhone: row.guestPhone,
      status: row.status,
      paymentStatus: row.paymentStatus,
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      paymentProofSubmittedAt:
        row.paymentProofSubmittedAt?.toISOString() ?? null,
      paymentConfirmedAt: row.paymentConfirmedAt?.toISOString() ?? null,
      fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      currency: row.currency,
      subtotalCents: row.subtotalCents,
      subtotalLabel: formatStoreMoney(row.subtotalCents, row.currency),
      itemSummary: items
        .map(({ item }) => `${item.quantity}x ${item.itemName}`)
        .join(", "),
      itemCount: items.reduce((sum, { item }) => sum + item.quantity, 0),
      items: items.map(({ item, imageUrl, itemType, category }) => ({
        id: item.id,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        quantity: item.quantity,
        imageUrl,
        itemType,
        category,
      })),
      requestedFor: row.requestedFor?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
}

export async function getDashboardStoreInitialData(
  userId: string
): Promise<DashboardStoreInitialData> {
  const [requests, catalogItems, paymentSettings] = await Promise.all([
    getDashboardStoreRequests(userId),
    getDashboardStoreCatalogItems(userId),
    getDashboardStorePaymentSettings(userId),
  ]);

  return { requests, catalogItems, paymentSettings };
}
