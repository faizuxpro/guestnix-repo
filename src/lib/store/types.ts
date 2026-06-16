import type {
  StoreIntroSettings,
  StoreListingStyle,
} from "@/lib/store/settings";
import type { StorePaymentMethod } from "@/lib/store/payment-methods";

export const STORE_REQUEST_STATUSES = [
  "new",
  "accepted",
  "fulfilled",
  "cancelled",
] as const;

export type StoreRequestStatus = (typeof STORE_REQUEST_STATUSES)[number];

export const STORE_PAYMENT_STATUSES = [
  "external_pending",
  "proof_submitted",
  "external_paid",
  "not_required",
] as const;

export type StorePaymentStatus = (typeof STORE_PAYMENT_STATUSES)[number];

export const STORE_MESSAGE_AUTHOR_TYPES = ["guest", "host"] as const;

export type StoreMessageAuthorType = (typeof STORE_MESSAGE_AUTHOR_TYPES)[number];

export const STORE_ITEM_TYPES = ["product", "service"] as const;

export type StoreItemType = (typeof STORE_ITEM_TYPES)[number];

export type SnapshotStorefrontItem = {
  id: string;
  assignmentId: string;
  itemType: StoreItemType;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  currency: string;
  unitLabel: string | null;
  category: string | null;
  maxQuantity: number | null;
  orderIndex: number;
};

export type SnapshotStorefront = {
  id: string;
  enabled: boolean;
  intro: StoreIntroSettings;
  listingStyle: StoreListingStyle;
  items: SnapshotStorefrontItem[];
};

export type StoreRequestPaymentMethod = StorePaymentMethod;

export type StoreSelection = {
  storeItemId: string;
  quantity: number;
};

export type StoreRequestLine = {
  storeItemId: string;
  itemName: string;
  itemDescription: string | null;
  unitPriceCents: number;
  currency: string;
  quantity: number;
  lineTotalCents: number;
};
