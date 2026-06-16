import {
  DEFAULT_STORE_INTRO_SETTINGS,
  DEFAULT_STORE_LISTING_STYLE,
  type StoreIntroSettings,
  type StoreListingStyle,
} from "@/lib/store/settings";
import type { SnapshotStorefront, StoreItemType } from "@/lib/store/types";

export type StorefrontPreviewSource = {
  id: string | null;
  enabled: boolean;
  items: Array<{
    id: string;
    orderIndex: number;
    visible: boolean;
    maxQuantity: number | null;
    item: {
      id: string;
      itemType: StoreItemType;
      name: string;
      description: string | null;
      imageUrl: string | null;
      priceCents: number;
      currency: string;
      unitLabel: string | null;
      category: string | null;
      active: boolean;
    };
  }>;
};

export function storefrontToPreviewSnapshot(
  storefront: StorefrontPreviewSource,
  options: {
    intro?: StoreIntroSettings;
    listingStyle?: StoreListingStyle;
  } = {}
): SnapshotStorefront {
  return {
    id: storefront.id ?? "draft-storefront",
    enabled: storefront.enabled,
    intro: options.intro ?? DEFAULT_STORE_INTRO_SETTINGS,
    listingStyle: options.listingStyle ?? DEFAULT_STORE_LISTING_STYLE,
    items: storefront.items
      .filter((assignment) => assignment.visible && assignment.item.active)
      .map((assignment) => ({
        id: assignment.item.id,
        assignmentId: assignment.id,
        itemType: assignment.item.itemType,
        name: assignment.item.name,
        description: assignment.item.description,
        imageUrl: assignment.item.imageUrl,
        priceCents: assignment.item.priceCents,
        currency: assignment.item.currency,
        unitLabel: assignment.item.unitLabel,
        category: assignment.item.category,
        maxQuantity: assignment.maxQuantity,
        orderIndex: assignment.orderIndex,
      })),
  };
}
