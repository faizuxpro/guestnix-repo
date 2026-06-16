import type { StorePaymentMethod } from "@/lib/store/payment-methods";
import type { StoreItemType } from "@/lib/store/types";

export type EditorStorefrontCatalogItem = {
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

export type EditorStorefrontAssignment = {
  id: string;
  storeItemId: string;
  orderIndex: number;
  visible: boolean;
  maxQuantity: number | null;
  item: EditorStorefrontCatalogItem;
};

export type EditorStorefrontData = {
  storefront: {
    id: string | null;
    enabled: boolean;
    paymentMethodIds: string[];
    items: EditorStorefrontAssignment[];
  };
  catalogItems: EditorStorefrontCatalogItem[];
  paymentMethods: StorePaymentMethod[];
  ownerUserId?: string;
  _draft?: {
    draftRevision?: number;
    updatedAt?: string;
  } | null;
};

export type EditorStorefrontPatchResult = {
  storefront: {
    id: string;
    enabled: boolean;
    paymentMethodIds: string[];
  };
  _draft?: {
    draftRevision?: number;
    updatedAt?: string;
  } | null;
};
