import type { StorePaymentMethod } from "@/lib/store/payment-methods";
import type { StoreItemType } from "@/lib/store/types";

export type DashboardStoreCatalogItem = {
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
  createdAt: string;
  updatedAt: string;
};

export type DashboardStoreRequestSummary = {
  id: string;
  requestCode: string;
  guidebookId: string;
  guidebookTitle: string;
  guidebookSlug: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  status: string;
  paymentStatus: string;
  acceptedAt: string | null;
  paymentProofSubmittedAt: string | null;
  paymentConfirmedAt: string | null;
  fulfilledAt: string | null;
  cancelledAt: string | null;
  currency: string;
  subtotalCents: number;
  subtotalLabel: string;
  itemSummary: string;
  itemCount: number;
  items: Array<{
    id: string;
    itemName: string;
    itemDescription: string | null;
    quantity: number;
    imageUrl: string | null;
    itemType: string | null;
    category: string | null;
  }>;
  requestedFor: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardStorePaymentSettings = {
  paymentInstructions: string | null;
  paymentMethods: StorePaymentMethod[];
};

export type DashboardStoreInitialData = {
  requests: DashboardStoreRequestSummary[];
  catalogItems: DashboardStoreCatalogItem[];
  paymentSettings: DashboardStorePaymentSettings;
};
