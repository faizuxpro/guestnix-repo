import type {
  SnapshotStorefront,
  SnapshotStorefrontItem,
  StoreRequestLine,
  StoreSelection,
} from "@/lib/store/types";

export function normalizeStoreCurrency(currency: string | null | undefined) {
  const normalized = (currency ?? "USD").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "USD";
}

export function formatStoreMoney(
  cents: number,
  currency: string | null | undefined
) {
  const safeCents = Number.isFinite(cents) ? cents : 0;
  const safeCurrency = normalizeStoreCurrency(currency);

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCents % 100 === 0 ? 0 : 2,
    }).format(safeCents / 100);
  } catch {
    return `${safeCurrency} ${(safeCents / 100).toFixed(2)}`;
  }
}

export function getPublicStorefrontItems(
  storefront: SnapshotStorefront | null | undefined
): SnapshotStorefrontItem[] {
  if (!storefront?.enabled) {
    return [];
  }

  return [...storefront.items].sort((a, b) => {
    if (a.orderIndex !== b.orderIndex) {
      return a.orderIndex - b.orderIndex;
    }

    return a.name.localeCompare(b.name);
  });
}

export function isStorefrontPubliclyAvailable(
  storefront: SnapshotStorefront | null | undefined
) {
  return getPublicStorefrontItems(storefront).length > 0;
}

export function calculateStoreRequestLines(
  items: SnapshotStorefrontItem[],
  selections: StoreSelection[]
): { lines: StoreRequestLine[]; subtotalCents: number; currency: string } {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const lines: StoreRequestLine[] = [];
  let currency: string | null = null;

  for (const selection of selections) {
    if (seen.has(selection.storeItemId)) {
      throw new Error("Duplicate store item selection");
    }
    seen.add(selection.storeItemId);

    const item = itemById.get(selection.storeItemId);
    if (!item) {
      throw new Error("Store item is unavailable");
    }

    if (
      item.maxQuantity !== null &&
      item.maxQuantity !== undefined &&
      selection.quantity > item.maxQuantity
    ) {
      throw new Error(`${item.name} is limited to ${item.maxQuantity}`);
    }

    const itemCurrency = normalizeStoreCurrency(item.currency);
    if (currency && currency !== itemCurrency) {
      throw new Error("Store requests can include one currency at a time");
    }
    currency = itemCurrency;

    const lineTotalCents = item.priceCents * selection.quantity;
    lines.push({
      storeItemId: item.id,
      itemName: item.name,
      itemDescription: item.description,
      unitPriceCents: item.priceCents,
      currency: itemCurrency,
      quantity: selection.quantity,
      lineTotalCents,
    });
  }

  return {
    lines,
    subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
    currency: currency ?? "USD",
  };
}
