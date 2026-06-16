"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  Circle,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Home,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-fetch";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { normalizeSafeUrl } from "@/lib/safe-url";
import type {
  DashboardStoreCatalogItem,
  DashboardStoreInitialData,
  DashboardStoreRequestSummary,
} from "@/lib/store/dashboard-types";
import {
  getStorePaymentMethodMeta,
  STORE_PAYMENT_METHOD_META,
  type StorePaymentMethod,
  type StorePaymentMethodType,
} from "@/lib/store/payment-methods";
import { formatStoreMoney } from "@/lib/store/public";
import type { StoreItemType } from "@/lib/store/types";
import { toastApiError } from "@/lib/toast-error";
import { cn } from "@/lib/utils";

type StoreTab = "requests" | "catalogue" | "payments";

type StoreTabAccent = {
  bg: string;
  color: string;
};

type CatalogItem = DashboardStoreCatalogItem;

type CatalogItemDraft = {
  itemType: StoreItemType;
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  currency: string;
  unitLabel: string;
  category: string;
  active: boolean;
};

type ServicePreset = {
  id: string;
  name: string;
  description: string;
  price: string;
  unitLabel: string;
  category: string;
};

export type RequestSummary = DashboardStoreRequestSummary;

export type RequestDetail = Omit<RequestSummary, "items"> & {
  guidebookSlug: string;
  currency: string;
  subtotalCents: number;
  paymentInstructions: string | null;
  paymentMethods: StorePaymentMethod[];
  guestNote: string | null;
  hostNote: string | null;
  paymentProofUrl: string | null;
  paymentProofNote: string | null;
  items: Array<{
    id: string;
    storeItemId: string | null;
    itemName: string;
    itemDescription: string | null;
    unitPriceCents: number;
    currency: string;
    quantity: number;
    lineTotalCents: number;
    lineTotalLabel: string;
    imageUrl: string | null;
    itemType: string | null;
    category: string | null;
  }>;
  messages: Array<{
    id: string;
    authorType: "guest" | "host" | string;
    content: string;
    createdAt: string;
  }>;
};

const REQUEST_STATUSES = ["all", "new", "accepted", "fulfilled", "cancelled"];
const PAYMENT_STATUSES = [
  "external_pending",
  "proof_submitted",
  "external_paid",
  "not_required",
];
const STORE_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const REQUEST_STATUS_COPY: Record<
  string,
  { label: string; description: string }
> = {
  new: {
    label: "Needs review",
    description: "Guest is waiting for your approval.",
  },
  accepted: {
    label: "Approved",
    description: "The request is moving through payment or delivery.",
  },
  fulfilled: {
    label: "Delivered",
    description: "This request has been completed.",
  },
  cancelled: {
    label: "Cancelled",
    description: "This request was stopped.",
  },
};

const PAYMENT_STATUS_COPY: Record<
  string,
  { label: string; description: string }
> = {
  external_pending: {
    label: "Payment pending",
    description: "Waiting for the guest to submit payment proof.",
  },
  proof_submitted: {
    label: "Proof received",
    description: "Review the proof and confirm payment.",
  },
  external_paid: {
    label: "Paid",
    description: "Payment has been confirmed.",
  },
  not_required: {
    label: "No payment",
    description: "This request can be delivered without payment.",
  },
};

const STORE_TABS: Array<{
  value: StoreTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: StoreTabAccent;
}> = [
  {
    value: "requests",
    label: "Requests",
    icon: MessageSquare,
    accent: { bg: "#EEF6FF", color: "#2563EB" },
  },
  {
    value: "catalogue",
    label: "Catalogue",
    icon: ShoppingBag,
    accent: { bg: "#ECFDF5", color: "#059669" },
  },
  {
    value: "payments",
    label: "Payments",
    icon: CreditCard,
    accent: { bg: "#FFF7ED", color: "#EA580C" },
  },
];

const CATALOG_ITEM_TYPE_OPTIONS: Array<{
  value: StoreItemType;
  label: string;
}> = [
  { value: "service", label: "Service" },
  { value: "product", label: "Product" },
];

const SERVICE_PRESETS: ServicePreset[] = [
  {
    id: "airport-pickup",
    name: "Airport pickup",
    description: "Private arrival transfer from the airport to the property.",
    price: "65.00",
    unitLabel: "per trip",
    category: "Transport",
  },
  {
    id: "airport-dropoff",
    name: "Airport drop-off",
    description: "Private departure transfer from the property to the airport.",
    price: "65.00",
    unitLabel: "per trip",
    category: "Transport",
  },
  {
    id: "early-check-in",
    name: "Early check-in",
    description: "Access the property before the standard check-in time when available.",
    price: "35.00",
    unitLabel: "per stay",
    category: "Arrival",
  },
  {
    id: "late-checkout",
    name: "Late checkout",
    description: "Keep the property longer on departure day when the calendar allows.",
    price: "35.00",
    unitLabel: "per stay",
    category: "Departure",
  },
  {
    id: "grocery-prestock",
    name: "Grocery pre-stock",
    description: "Have selected essentials stocked before guests arrive.",
    price: "45.00",
    unitLabel: "service fee",
    category: "Food",
  },
  {
    id: "breakfast-basket",
    name: "Breakfast basket",
    description: "A simple breakfast bundle with coffee, fruit, pastries, and juice.",
    price: "39.00",
    unitLabel: "per basket",
    category: "Food",
  },
  {
    id: "private-chef",
    name: "Private chef dinner",
    description: "Coordinate an in-home dinner prepared by a local chef.",
    price: "180.00",
    unitLabel: "starting at",
    category: "Food",
  },
  {
    id: "housekeeping-refresh",
    name: "Housekeeping refresh",
    description: "Light cleaning, trash removal, and general reset during the stay.",
    price: "55.00",
    unitLabel: "per visit",
    category: "Housekeeping",
  },
  {
    id: "linen-change",
    name: "Mid-stay linen change",
    description: "Fresh sheets, towels, and basic bedroom reset.",
    price: "40.00",
    unitLabel: "per visit",
    category: "Housekeeping",
  },
  {
    id: "laundry-pickup",
    name: "Laundry pickup",
    description: "Pickup and return laundry service arranged during the stay.",
    price: "30.00",
    unitLabel: "service fee",
    category: "Housekeeping",
  },
  {
    id: "baby-gear",
    name: "Baby gear setup",
    description: "Crib, high chair, and basic baby essentials placed before arrival.",
    price: "45.00",
    unitLabel: "per stay",
    category: "Family",
  },
  {
    id: "pet-cleaning",
    name: "Pet cleaning package",
    description: "Additional cleaning support for stays with approved pets.",
    price: "50.00",
    unitLabel: "per stay",
    category: "Pets",
  },
  {
    id: "bike-rental",
    name: "Bicycle rental",
    description: "Daily bicycle rental arranged for exploring the local area.",
    price: "25.00",
    unitLabel: "per day",
    category: "Activities",
  },
  {
    id: "kayak-rental",
    name: "Kayak rental",
    description: "Single kayak rental arranged for nearby water access.",
    price: "35.00",
    unitLabel: "per day",
    category: "Activities",
  },
  {
    id: "beach-kit",
    name: "Beach kit setup",
    description: "Chairs, umbrella, towels, and cooler prepared for beach days.",
    price: "30.00",
    unitLabel: "per day",
    category: "Activities",
  },
  {
    id: "firewood",
    name: "Firewood setup",
    description: "Firewood and kindling prepared for the fireplace or fire pit.",
    price: "28.00",
    unitLabel: "per bundle",
    category: "Comfort",
  },
  {
    id: "celebration",
    name: "Celebration setup",
    description: "Simple birthday or anniversary setup with decor and welcome note.",
    price: "60.00",
    unitLabel: "per setup",
    category: "Occasions",
  },
  {
    id: "wine-cheese",
    name: "Wine and cheese welcome",
    description: "A local wine and cheese board waiting for guests at arrival.",
    price: "55.00",
    unitLabel: "per board",
    category: "Occasions",
  },
  {
    id: "local-tour",
    name: "Local tour booking",
    description: "Help arrange a guided local experience or neighborhood tour.",
    price: "75.00",
    unitLabel: "starting at",
    category: "Activities",
  },
  {
    id: "massage",
    name: "In-home massage booking",
    description: "Coordinate a licensed massage therapist visit at the property.",
    price: "120.00",
    unitLabel: "per session",
    category: "Wellness",
  },
];

function tabAccentStyle(accent: StoreTabAccent, active: boolean) {
  if (!active) return undefined;

  return {
    backgroundColor: accent.bg,
    borderColor: `${accent.color}33`,
    color: accent.color,
  };
}

function blankCatalogDraft(): CatalogItemDraft {
  return {
    itemType: "product",
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    currency: "USD",
    unitLabel: "",
    category: "",
    active: true,
  };
}

function catalogDraftFromItem(item: CatalogItem | null): CatalogItemDraft {
  if (!item) return blankCatalogDraft();

  return {
    itemType: item.itemType,
    name: item.name,
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
    price: priceFromCents(item.priceCents),
    currency: item.currency,
    unitLabel: item.unitLabel ?? "",
    category: item.category ?? "",
    active: item.active,
  };
}

function catalogDraftFromServicePreset(preset: ServicePreset): CatalogItemDraft {
  return {
    ...blankCatalogDraft(),
    itemType: "service",
    name: preset.name,
    description: preset.description,
    price: preset.price,
    unitLabel: preset.unitLabel,
    category: preset.category,
  };
}

function makePaymentMethodId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pm-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function centsFromPrice(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function priceFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

function requestStatusCopy(status: string) {
  return (
    REQUEST_STATUS_COPY[status] ?? {
      label: labelize(status),
      description: "Status update.",
    }
  );
}

function paymentStatusCopy(status: string) {
  return (
    PAYMENT_STATUS_COPY[status] ?? {
      label: labelize(status),
      description: "Payment update.",
    }
  );
}

function requestStatusClasses(status: string) {
  if (status === "new") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  }
  if (status === "accepted") {
    return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200";
  }
  if (status === "fulfilled") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  }
  if (status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200";
  }
  return "border-border bg-muted text-muted-foreground";
}

function requestStatusDotClasses(status: string) {
  if (status === "new") return "bg-amber-500";
  if (status === "accepted") return "bg-sky-500";
  if (status === "fulfilled") return "bg-emerald-500";
  if (status === "cancelled") return "bg-rose-500";
  return "bg-muted-foreground";
}

function paymentStatusClasses(status: string) {
  if (status === "proof_submitted") {
    return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200";
  }
  if (status === "external_paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  }
  if (status === "not_required") {
    return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200";
  }
  return "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200";
}

function initialsForName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = parts.map((part) => part[0]?.toUpperCase()).join("");
  return initials || "G";
}

function formatRequestDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function requestItemSummary(
  request: Pick<RequestSummary, "itemSummary" | "itemCount">
) {
  const summary = request.itemSummary?.trim();
  if (summary) return summary;
  const itemCount = request.itemCount ?? 0;
  if (itemCount === 1) return "1 requested item";
  return `${itemCount} requested items`;
}

function requestNextAction(
  request: Pick<RequestDetail, "status" | "paymentStatus">
) {
  if (request.status === "cancelled") {
    return {
      label: "Request cancelled",
      description: "No further action is needed unless you reopen it manually.",
      tone: "muted" as const,
    };
  }
  if (request.status === "fulfilled") {
    return {
      label: "Delivered",
      description: "This request is complete and ready for records.",
      tone: "success" as const,
    };
  }
  if (request.status === "new") {
    return {
      label: "Review the request",
      description: "Approve it to send the guest payment instructions, or cancel if you cannot fulfill it.",
      tone: "attention" as const,
    };
  }
  if (request.paymentStatus === "proof_submitted") {
    return {
      label: "Confirm payment",
      description: "The guest uploaded proof. Review it, then confirm payment.",
      tone: "attention" as const,
    };
  }
  if (
    request.status === "accepted" &&
    (request.paymentStatus === "external_paid" ||
      request.paymentStatus === "not_required")
  ) {
    return {
      label: "Deliver the request",
      description: "Payment is settled. Mark it delivered when the service or item is handled.",
      tone: "ready" as const,
    };
  }
  return {
    label: "Waiting on guest",
    description: "The request is approved. The guest needs to send payment proof next.",
    tone: "waiting" as const,
  };
}

function actionToneClasses(tone: ReturnType<typeof requestNextAction>["tone"]) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100";
  }
  if (tone === "ready") {
    return "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100";
  }
  if (tone === "waiting") {
    return "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-100";
  }
  if (tone === "muted") {
    return "border-border bg-muted/40 text-muted-foreground";
  }
  return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100";
}

function hexWithAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isApproved(request: Pick<RequestDetail, "status">) {
  return request.status === "accepted" || request.status === "fulfilled";
}

function storeProgressSteps(
  request: Pick<RequestDetail, "status" | "paymentStatus">
) {
  const noPayment = request.paymentStatus === "not_required";
  const proofSubmitted =
    request.paymentStatus === "proof_submitted" ||
    request.paymentStatus === "external_paid";
  const paymentConfirmed =
    request.paymentStatus === "external_paid" || noPayment;
  const cancelled = request.status === "cancelled";

  return [
    {
      label: "Guest request",
      description: "Guest submitted their extras request.",
      complete: true,
      active: false,
    },
    {
      label: "Review",
      description: "Host approves or cancels the request.",
      complete: isApproved(request),
      active: request.status === "new" && !cancelled,
      blocked: cancelled,
    },
    {
      label: noPayment ? "No payment" : "Guest payment",
      description: noPayment
        ? "Payment is not required for this request."
        : "Guest sends payment proof after approval.",
      complete: noPayment || proofSubmitted,
      active:
        !noPayment &&
        isApproved(request) &&
        request.paymentStatus === "external_pending" &&
        !cancelled,
      blocked: cancelled,
    },
    {
      label: "Confirm",
      description: noPayment
        ? "Payment confirmation is skipped."
        : "Host confirms the uploaded proof.",
      complete: paymentConfirmed,
      active:
        !noPayment &&
        request.paymentStatus === "proof_submitted" &&
        !cancelled,
      blocked: cancelled,
    },
    {
      label: "Deliver",
      description: "Host marks the request handled.",
      complete: request.status === "fulfilled",
      active:
        request.status === "accepted" &&
        paymentConfirmed &&
        !cancelled,
      blocked: cancelled,
    },
  ];
}

export function StoreDashboardClient({
  initialData,
}: {
  initialData?: DashboardStoreInitialData;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRequestId = searchParams.get("request");
  const initialTab: StoreTab = (() => {
    if (initialRequestId) return "requests";
    const tab = searchParams.get("tab");
    if (tab === "catalog" || tab === "catalogue") return "catalogue";
    if (tab === "payments") return "payments";
    return "requests";
  })();
  const [activeTab, setActiveTab] = useState<StoreTab>(initialTab);
  const [requests, setRequests] = useState<RequestSummary[]>(
    () => initialData?.requests ?? []
  );
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(
    () => initialData?.catalogItems ?? []
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [guidebookFilter, setGuidebookFilter] = useState("all");
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const initialPaymentInstructions =
    initialData?.paymentSettings.paymentInstructions ?? "";
  const initialPaymentMethods =
    initialData?.paymentSettings.paymentMethods ?? [];
  const [paymentInstructions, setPaymentInstructions] = useState(
    initialPaymentInstructions
  );
  const [savedPaymentInstructions, setSavedPaymentInstructions] = useState(
    initialPaymentInstructions
  );
  const [paymentMethods, setPaymentMethods] =
    useState<StorePaymentMethod[]>(initialPaymentMethods);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<
    StorePaymentMethod[]
  >(initialPaymentMethods);
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [catalogueCategoryFilter, setCatalogueCategoryFilter] = useState("all");
  const [catalogueTypeFilter, setCatalogueTypeFilter] = useState<
    "all" | StoreItemType
  >("all");
  const [catalogueStatusFilter, setCatalogueStatusFilter] = useState<
    "all" | "active" | "hidden"
  >("all");
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [createProductInitialDraft, setCreateProductInitialDraft] =
    useState<CatalogItemDraft | null>(null);
  const [servicePresetsOpen, setServicePresetsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogItem | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const guidebookOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const request of requests) {
      map.set(request.guidebookId, request.guidebookTitle);
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [requests]);

  const filteredRequests = requests.filter((request) => {
    if (statusFilter !== "all" && request.status !== statusFilter) return false;
    if (guidebookFilter !== "all" && request.guidebookId !== guidebookFilter) {
      return false;
    }
    return true;
  });

  const requestStats = useMemo(() => {
    const needsReview = requests.filter((request) => request.status === "new")
      .length;
    const proofReady = requests.filter(
      (request) => request.paymentStatus === "proof_submitted"
    ).length;
    const readyToDeliver = requests.filter(
      (request) =>
        request.status === "accepted" &&
        (request.paymentStatus === "external_paid" ||
          request.paymentStatus === "not_required")
    ).length;
    const open = requests.filter(
      (request) =>
        request.status !== "fulfilled" && request.status !== "cancelled"
    ).length;
    return { needsReview, proofReady, readyToDeliver, open };
  }, [requests]);

  const tabCounts = useMemo(
    () => ({
      requests: requests.length,
      catalogue: catalogItems.length,
      payments: paymentMethods.filter((method) => method.active).length,
    }),
    [catalogItems.length, paymentMethods, requests.length]
  );

  const catalogueCategoryOptions = useMemo(() => {
    const categories = new Set<string>();
    for (const item of catalogItems) {
      const category = item.category?.trim();
      if (category) categories.add(category);
    }
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [catalogItems]);

  const catalogueStats = useMemo(() => {
    const active = catalogItems.filter((item) => item.active).length;
    const services = catalogItems.filter(
      (item) => item.itemType === "service"
    ).length;
    const products = catalogItems.length - services;
    return {
      active,
      services,
      products,
      hidden: catalogItems.length - active,
    };
  }, [catalogItems]);

  const filteredCatalogItems = useMemo(() => {
    const query = catalogueQuery.trim().toLowerCase();
    return catalogItems.filter((item) => {
      if (catalogueStatusFilter === "active" && !item.active) {
        return false;
      }
      if (catalogueStatusFilter === "hidden" && item.active) {
        return false;
      }
      if (
        catalogueTypeFilter !== "all" &&
        item.itemType !== catalogueTypeFilter
      ) {
        return false;
      }
      if (
        catalogueCategoryFilter !== "all" &&
        item.category !== catalogueCategoryFilter
      ) {
        return false;
      }
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false) ||
        (item.category?.toLowerCase().includes(query) ?? false) ||
        (item.unitLabel?.toLowerCase().includes(query) ?? false)
      );
    });
  }, [
    catalogItems,
    catalogueCategoryFilter,
    catalogueQuery,
    catalogueStatusFilter,
    catalogueTypeFilter,
  ]);

  useEffect(() => {
    if (initialRequestId) {
      router.replace(`/dashboard/store/requests/${initialRequestId}`);
    }
  }, [initialRequestId, router]);

  async function loadRequests() {
    setLoadingRequests(true);
    const result = await apiFetch<{ requests: RequestSummary[] }>(
      "/api/dashboard/store/requests"
    );
    setLoadingRequests(false);
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load Store requests",
        onRetry: () => void loadRequests(),
      });
      return;
    }
    setRequests(result.data.requests);
  }

  async function loadCatalog() {
    setLoadingCatalog(true);
    const result = await apiFetch<{ items: CatalogItem[] }>(
      "/api/dashboard/store/items"
    );
    setLoadingCatalog(false);
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load catalog",
        onRetry: () => void loadCatalog(),
      });
      return;
    }
    setCatalogItems(result.data.items);
  }

  async function loadPaymentSettings() {
    setLoadingPaymentSettings(true);
    const result = await apiFetch<{
      settings: {
        paymentInstructions: string | null;
        paymentMethods: StorePaymentMethod[];
      };
    }>("/api/dashboard/store/settings");
    setLoadingPaymentSettings(false);
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load payment setup",
        onRetry: () => void loadPaymentSettings(),
      });
      return;
    }
    const next = result.data.settings.paymentInstructions ?? "";
    const methods = result.data.settings.paymentMethods ?? [];
    setPaymentInstructions(next);
    setSavedPaymentInstructions(next);
    setPaymentMethods(methods);
    setSavedPaymentMethods(methods);
  }

  useEffect(() => {
    if (initialData) return;

    const timer = window.setTimeout(() => {
      void loadRequests();
      void loadCatalog();
      void loadPaymentSettings();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createCatalogItem(draft: CatalogItemDraft) {
    if (!draft.name.trim()) return false;
    const result = await apiFetch<{ item: CatalogItem }>(
      "/api/dashboard/store/items",
      {
        method: "POST",
        body: {
          itemType: draft.itemType,
          name: draft.name,
          description: draft.description,
          imageUrl: draft.imageUrl,
          priceCents: centsFromPrice(draft.price),
          currency: draft.currency || "USD",
          unitLabel: draft.unitLabel,
          category: draft.category,
          active: draft.active,
        },
      }
    );
    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't create item" });
      return false;
    }
    setCatalogItems((items) => [result.data.item, ...items]);
    return true;
  }

  async function updateCatalogItem(item: CatalogItem, draft: CatalogItemDraft) {
    if (!draft.name.trim()) return false;
    const result = await apiFetch<{ item: CatalogItem }>(
      `/api/dashboard/store/items/${item.id}`,
      {
        method: "PATCH",
        body: {
          itemType: draft.itemType,
          name: draft.name,
          description: draft.description,
          imageUrl: draft.imageUrl,
          priceCents: centsFromPrice(draft.price),
          currency: draft.currency || "USD",
          unitLabel: draft.unitLabel,
          category: draft.category,
          active: draft.active,
        },
      }
    );
    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't save item" });
      return false;
    }
    setCatalogItems((items) =>
      items.map((entry) =>
        entry.id === result.data.item.id ? result.data.item : entry
      )
    );
    return true;
  }

  async function deleteCatalogItem(item: CatalogItem) {
    if (!window.confirm(`Delete "${item.name}" from your catalogue?`)) return;
    setDeletingProductId(item.id);
    const result = await apiFetch(`/api/dashboard/store/items/${item.id}`, {
      method: "DELETE",
    });
    setDeletingProductId(null);
    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't delete item" });
      return;
    }
    setCatalogItems((items) => items.filter((entry) => entry.id !== item.id));
    setEditingProduct((current) => (current?.id === item.id ? null : current));
  }

  async function savePaymentSettings() {
    setSavingPaymentSettings(true);
    const result = await apiFetch<{
      settings: {
        paymentInstructions: string | null;
        paymentMethods: StorePaymentMethod[];
      };
    }>("/api/dashboard/store/settings", {
      method: "PATCH",
      body: {
        paymentInstructions,
        paymentMethods: paymentMethods.map((method, index) => ({
          ...method,
          orderIndex: index,
        })),
      },
    });
    setSavingPaymentSettings(false);
    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't save payment setup" });
      return;
    }
    const next = result.data.settings.paymentInstructions ?? "";
    const methods = result.data.settings.paymentMethods ?? [];
    setPaymentInstructions(next);
    setSavedPaymentInstructions(next);
    setPaymentMethods(methods);
    setSavedPaymentMethods(methods);
  }

  function addPaymentMethod(type: StorePaymentMethodType) {
    const meta = getStorePaymentMethodMeta(type);
    setPaymentMethods((methods) => [
      ...methods,
      {
        id: makePaymentMethodId(),
        type,
        label: meta.label,
        value: "",
        instructions: null,
        active: true,
        orderIndex: methods.length,
      },
    ]);
  }

  function updatePaymentMethod(
    methodId: string,
    patch: Partial<StorePaymentMethod>
  ) {
    setPaymentMethods((methods) =>
      methods.map((method) =>
        method.id === methodId ? { ...method, ...patch } : method
      )
    );
  }

  function removePaymentMethod(methodId: string) {
    setPaymentMethods((methods) =>
      methods
        .filter((method) => method.id !== methodId)
        .map((method, index) => ({ ...method, orderIndex: index }))
    );
  }

  function movePaymentMethod(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= paymentMethods.length) return;
    const next = paymentMethods.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setPaymentMethods(
      next.map((method, methodIndex) => ({
        ...method,
        orderIndex: methodIndex,
      }))
    );
  }

  function openBlankCatalogDialog() {
    setCreateProductInitialDraft(null);
    setCreateProductOpen(true);
  }

  function openPresetCatalogDialog(preset: ServicePreset) {
    setCreateProductInitialDraft(catalogDraftFromServicePreset(preset));
    setServicePresetsOpen(false);
    setCreateProductOpen(true);
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as StoreTab)}
      className="h-full min-h-0 gap-0 bg-background"
    >
      <header className="border-b border-border/70 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Store</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage guest Store requests, catalogue items, and payment setup.
            </p>
          </div>
          {activeTab === "catalogue" ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setServicePresetsOpen(true)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Service presets
              </Button>
              <Button type="button" onClick={openBlankCatalogDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 shrink-0 overflow-x-auto pb-1">
          <TabsList className="w-max justify-start gap-1 bg-transparent p-0">
            {STORE_TABS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.value;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="border border-border/60 bg-background/80 px-2.5 data-active:shadow-none"
                  style={tabAccentStyle(item.accent, active)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <StoreCountPill count={tabCounts[item.value]} active={active} />
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
      </header>

      <TabsContent
        value="requests"
        className="m-0 min-h-0 flex-1 overflow-y-auto p-5"
      >
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Request queue
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {requestStats.open} open requests across {requests.length} total.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadRequests()}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <RequestQueueStat
                label="Needs review"
                value={requestStats.needsReview}
                tone="attention"
              />
              <RequestQueueStat
                label="Proof received"
                value={requestStats.proofReady}
                tone="payment"
              />
              <RequestQueueStat
                label="Ready to deliver"
                value={requestStats.readyToDeliver}
                tone="ready"
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Status"
                >
                  {REQUEST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status === "all"
                        ? "All request states"
                        : requestStatusCopy(status).label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm"
                  value={guidebookFilter}
                  onChange={(event) => setGuidebookFilter(event.target.value)}
                  aria-label="Guidebook"
                >
                  <option value="all">All guidebooks</option>
                  {guidebookOptions.map((guidebook) => (
                    <option key={guidebook.id} value={guidebook.id}>
                      {guidebook.title}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredRequests.length} shown
              </p>
            </div>

            <div className="mt-4">
              {loadingRequests ? (
                <RequestQueueSkeleton />
              ) : filteredRequests.length === 0 ? (
                <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                  <div>
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/70" />
                    <p className="mt-3 font-medium">No matching requests.</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No requests are in this queue view right now.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredRequests.map((request) => (
                    <RequestQueueCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </TabsContent>

      <TabsContent
        value="catalogue"
        className="m-0 min-h-0 flex-1 overflow-y-auto p-5"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Catalogue
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Present guest services and products as requestable extras.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadCatalog()}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StoreMetricCard
              label="Services"
              value={catalogueStats.services}
            />
            <StoreMetricCard
              label="Products"
              value={catalogueStats.products}
            />
            <StoreMetricCard
              label="Active items"
              value={catalogueStats.active}
            />
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={catalogueQuery}
                onChange={(event) => setCatalogueQuery(event.target.value)}
                placeholder="Search catalogue..."
                className="pl-8"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={catalogueTypeFilter}
                onChange={(event) =>
                  setCatalogueTypeFilter(
                    event.target.value as "all" | StoreItemType
                  )
                }
                aria-label="Catalogue type"
              >
                <option value="all">All types</option>
                <option value="service">Services</option>
                <option value="product">Products</option>
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={catalogueStatusFilter}
                onChange={(event) =>
                  setCatalogueStatusFilter(
                    event.target.value as "all" | "active" | "hidden"
                  )
                }
                aria-label="Catalogue status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="hidden">Hidden only</option>
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={catalogueCategoryFilter}
                onChange={(event) =>
                  setCatalogueCategoryFilter(event.target.value)
                }
                aria-label="Catalogue category"
              >
                <option value="all">All categories</option>
                {catalogueCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingCatalog ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Loading catalogue...
            </p>
          ) : catalogItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-16 text-center">
              <ShoppingBag className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
              <p className="text-sm font-medium">No catalogue items yet</p>
              <Button
                type="button"
                className="mt-4"
                onClick={openBlankCatalogDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </div>
          ) : filteredCatalogItems.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No catalogue items match these filters.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCatalogItems.map((item) => (
                <CatalogProductCard
                  key={item.id}
                  item={item}
                  deleting={deletingProductId === item.id}
                  onEdit={() => setEditingProduct(item)}
                  onDelete={() => void deleteCatalogItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent
        value="payments"
        className="m-0 min-h-0 flex-1 overflow-y-auto p-5"
      >
        <div className="mx-auto grid w-full max-w-3xl gap-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Payment setup
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add reusable payment methods once, then attach them to each guidebook
              store.
            </p>
          </div>
          <PaymentSettingsPanel
            paymentInstructions={paymentInstructions}
            savedPaymentInstructions={savedPaymentInstructions}
            paymentMethods={paymentMethods}
            savedPaymentMethods={savedPaymentMethods}
            loading={loadingPaymentSettings}
            saving={savingPaymentSettings}
            setPaymentInstructions={setPaymentInstructions}
            addPaymentMethod={addPaymentMethod}
            updatePaymentMethod={updatePaymentMethod}
            removePaymentMethod={removePaymentMethod}
            movePaymentMethod={movePaymentMethod}
            savePaymentSettings={savePaymentSettings}
          />
        </div>
      </TabsContent>

      {createProductOpen ? (
        <CatalogItemDialog
          key={`create-product-${createProductInitialDraft?.name ?? "blank"}`}
          initialDraft={createProductInitialDraft}
          open={createProductOpen}
          onOpenChange={(open) => {
            setCreateProductOpen(open);
            if (!open) setCreateProductInitialDraft(null);
          }}
          onSubmit={createCatalogItem}
        />
      ) : null}

      <ServicePresetDialog
        open={servicePresetsOpen}
        onOpenChange={setServicePresetsOpen}
        onSelect={openPresetCatalogDialog}
      />

      {editingProduct ? (
        <CatalogItemDialog
          key={editingProduct.id}
          item={editingProduct}
          open={Boolean(editingProduct)}
          onOpenChange={(open) => {
            if (!open) setEditingProduct(null);
          }}
          onSubmit={(draft) => updateCatalogItem(editingProduct, draft)}
        />
      ) : null}
    </Tabs>
  );
}

function StoreCountPill({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={cn(
        "ml-1 rounded-full px-1.5 text-[11px] font-medium tabular-nums",
        active
          ? "bg-white/70 text-current ring-1 ring-black/5"
          : "bg-muted-foreground/15"
      )}
    >
      {count}
    </span>
  );
}

function StoreMetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function PaymentSettingsPanel({
  paymentInstructions,
  savedPaymentInstructions,
  paymentMethods,
  savedPaymentMethods,
  loading,
  saving,
  setPaymentInstructions,
  addPaymentMethod,
  updatePaymentMethod,
  removePaymentMethod,
  movePaymentMethod,
  savePaymentSettings,
}: {
  paymentInstructions: string;
  savedPaymentInstructions: string;
  paymentMethods: StorePaymentMethod[];
  savedPaymentMethods: StorePaymentMethod[];
  loading: boolean;
  saving: boolean;
  setPaymentInstructions: (value: string) => void;
  addPaymentMethod: (type: StorePaymentMethodType) => void;
  updatePaymentMethod: (
    methodId: string,
    patch: Partial<StorePaymentMethod>
  ) => void;
  removePaymentMethod: (methodId: string) => void;
  movePaymentMethod: (index: number, direction: -1 | 1) => void;
  savePaymentSettings: () => Promise<void>;
}) {
  const dirty =
    paymentInstructions !== savedPaymentInstructions ||
    JSON.stringify(paymentMethods) !== JSON.stringify(savedPaymentMethods);

  return (
    <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        <CreditCard className="mt-0.5 h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold">Payment setup</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Guests see this after you approve a paid Store request. Guestnix does
            not collect the payment. Select the relevant methods inside each
            guidebook&apos;s Store editor.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {paymentMethods.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-xs leading-5 text-muted-foreground">
            Add payment methods hosts can reuse across guidebooks, then choose
            the right ones from each guidebook&apos;s Store editor.
          </p>
        ) : (
          paymentMethods.map((method, index) => (
            <PaymentMethodRow
              key={method.id}
              method={method}
              index={index}
              count={paymentMethods.length}
              disabled={loading || saving}
              onChange={(patch) => updatePaymentMethod(method.id, patch)}
              onRemove={() => removePaymentMethod(method.id)}
              onMove={(direction) => movePaymentMethod(index, direction)}
            />
          ))
        )}
        <AddPaymentMethodButton
          disabled={loading || saving}
          onAdd={addPaymentMethod}
        />
      </div>

      <Textarea
        value={paymentInstructions}
        maxLength={2000}
        disabled={loading}
        onChange={(event) => setPaymentInstructions(event.target.value)}
        placeholder={
          "Optional note shown with selected methods, e.g. include your request code in the payment memo."
        }
        className="min-h-24 resize-y text-sm"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {loading ? "Loading..." : dirty ? "Unsaved changes" : "Saved"}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={loading || saving || !dirty}
          onClick={() => void savePaymentSettings()}
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "Saving" : "Save setup"}
        </Button>
      </div>
    </section>
  );
}

function PaymentMethodRow({
  method,
  index,
  count,
  disabled,
  onChange,
  onRemove,
  onMove,
}: {
  method: StorePaymentMethod;
  index: number;
  count: number;
  disabled: boolean;
  onChange: (patch: Partial<StorePaymentMethod>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const meta = getStorePaymentMethodMeta(method.type);

  return (
    <div className="rounded-md border border-border/70 bg-muted/10 p-2">
      <div className="flex items-center gap-1.5">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white shadow-sm transition-transform hover:scale-105"
                style={{ backgroundColor: meta.hue }}
                aria-label={`Change payment method - currently ${meta.label}`}
                disabled={disabled}
              >
                <Icon icon={meta.icon} className="h-4 w-4" aria-hidden />
              </button>
            }
          />
          <PopoverContent align="start" sideOffset={6} className="w-[280px] p-2">
            <PaymentMethodGrid
              current={method.type}
              onSelect={(type) => {
                const nextMeta = getStorePaymentMethodMeta(type);
                onChange({
                  type,
                  label:
                    method.label === meta.label || !method.label.trim()
                      ? nextMeta.label
                      : method.label,
                });
                setPickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <Input
          value={method.label}
          disabled={disabled}
          onChange={(event) => onChange({ label: event.target.value })}
          placeholder={meta.label}
          className="h-9 min-w-0 flex-1 text-sm"
          aria-label={`${meta.label} label`}
        />

        <Button
          type="button"
          variant={method.active ? "outline" : "secondary"}
          size="icon-sm"
          disabled={disabled}
          onClick={() => onChange({ active: !method.active })}
          aria-label={method.active ? "Hide method" : "Show method"}
        >
          {method.active ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled || index === 0}
          onClick={() => onMove(-1)}
          aria-label="Move method up"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled || index === count - 1}
          onClick={() => onMove(1)}
          aria-label="Move method down"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          onClick={onRemove}
          className="text-destructive"
          aria-label="Remove payment method"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-2 grid gap-2">
        <Input
          value={method.value}
          disabled={disabled}
          onChange={(event) => onChange({ value: event.target.value })}
          placeholder={meta.valuePlaceholder}
          className="h-9 text-sm"
          aria-label={`${meta.label} payment detail`}
        />
        <Textarea
          value={method.instructions ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange({ instructions: event.target.value || null })
          }
          placeholder={meta.instructionsPlaceholder}
          className="min-h-16 resize-y text-sm"
          aria-label={`${meta.label} instructions`}
        />
      </div>
    </div>
  );
}

function AddPaymentMethodButton({
  disabled,
  onAdd,
}: {
  disabled: boolean;
  onAdd: (type: StorePaymentMethodType) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/70 bg-background/40 px-3 py-2 text-[12px] font-medium text-muted-foreground transition-all hover:border-primary/45 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            Add payment method
          </button>
        }
      />
      <PopoverContent align="start" sideOffset={6} className="w-[280px] p-2">
        <PaymentMethodGrid
          current={null}
          onSelect={(type) => {
            onAdd(type);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function PaymentMethodGrid({
  current,
  onSelect,
}: {
  current: StorePaymentMethodType | null;
  onSelect: (type: StorePaymentMethodType) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {STORE_PAYMENT_METHOD_META.map((method) => {
        const selected = current === method.type;
        return (
          <button
            key={method.type}
            type="button"
            onClick={() => onSelect(method.type)}
            aria-label={method.label}
            title={method.label}
            className={cn(
              "group flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md border text-[9px] font-medium transition-all",
              selected
                ? "border-transparent text-white shadow-md"
                : "border-border/70 text-muted-foreground hover:scale-[1.03] hover:border-foreground/40 hover:text-foreground"
            )}
            style={
              selected
                ? {
                    backgroundColor: method.hue,
                    boxShadow: `0 0 0 2px ${hexWithAlpha(
                      method.hue,
                      0.45
                    )}, 0 4px 10px -4px ${hexWithAlpha(method.hue, 0.6)}`,
                  }
                : undefined
            }
          >
            <Icon icon={method.icon} className="h-4 w-4" aria-hidden />
            <span className="truncate leading-none">{method.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function RequestQueueStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "attention" | "payment" | "ready";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-3",
        tone === "attention" &&
          "border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10",
        tone === "payment" &&
          "border-violet-200 bg-violet-50/70 dark:border-violet-500/30 dark:bg-violet-500/10",
        tone === "ready" &&
          "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10"
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function RequestQueueSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="rounded-lg border border-border bg-background p-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded-full bg-muted" />
              <div className="h-3 w-3/4 rounded-full bg-muted" />
            </div>
          </div>
          <div className="mt-3 h-28 rounded-md bg-muted/70" />
        </div>
      ))}
    </div>
  );
}

function RequestAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sky-200 bg-sky-50 text-sm font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
      {initialsForName(name)}
    </span>
  );
}

function RequestStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const copy = requestStatusCopy(status);
  return (
    <Badge
      variant="outline"
      className={cn("h-6 gap-1.5 border px-2", requestStatusClasses(status), className)}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", requestStatusDotClasses(status))}
        aria-hidden
      />
      {copy.label}
    </Badge>
  );
}

function PaymentStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const copy = paymentStatusCopy(status);
  return (
    <Badge
      variant="outline"
      className={cn("h-6 border px-2", paymentStatusClasses(status), className)}
    >
      {copy.label}
    </Badge>
  );
}

function StoreItemArtwork({
  imageUrl,
  name,
  className,
}: {
  imageUrl: string | null;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted/40 text-muted-foreground",
        className
      )}
      aria-label={name}
    >
      {imageUrl ? (
        <span
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
          aria-hidden
        />
      ) : (
        <Package className="h-4 w-4" aria-hidden />
      )}
    </span>
  );
}

function RequestQueueCard({
  request,
}: {
  request: RequestSummary;
}) {
  const action = requestNextAction(request);
  const requestedAt = formatRequestDateTime(request.createdAt);
  const requestedFor = formatRequestDateTime(request.requestedFor);
  const previewItems = request.items.slice(0, 3);
  const overflowCount = Math.max(0, request.items.length - previewItems.length);

  return (
    <Link
      href={`/dashboard/store/requests/${request.id}`}
      className="group block min-h-full rounded-lg border border-border bg-background p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <RequestAvatar name={request.guestName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {request.guestName}
              </p>
              <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <Home className="h-3 w-3 shrink-0" />
                <span className="truncate">{request.guidebookTitle}</span>
              </p>
            </div>
            <RequestStatusBadge status={request.status} />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-border/70 bg-muted/25 p-3">
        {previewItems.length > 0 ? (
          <div className="mb-3 flex items-center gap-1.5">
            {previewItems.map((item) => (
              <StoreItemArtwork
                key={item.id}
                imageUrl={item.imageUrl}
                name={item.itemName}
                className="h-12 w-12"
              />
            ))}
            {overflowCount > 0 ? (
              <span className="grid h-12 w-12 place-items-center rounded-md border border-dashed border-border bg-background text-xs font-semibold text-muted-foreground">
                +{overflowCount}
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-start gap-2">
          <Package className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-medium">
              {requestItemSummary(request)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {action.label}
              {requestedFor ? ` - For ${requestedFor}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground">
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate font-medium text-foreground">
            {request.requestCode}
          </span>
          {requestedAt ? <span className="shrink-0">- {requestedAt}</span> : null}
        </span>
        <span className="shrink-0 text-sm font-semibold">
          {request.subtotalLabel}
        </span>
      </div>
    </Link>
  );
}

export function RequestDetailPanel({
  request,
  reply,
  setReply,
  updateRequest,
  sendReply,
}: {
  request: RequestDetail;
  reply: string;
  setReply: (value: string) => void;
  updateRequest: (patch: Record<string, unknown>) => Promise<void>;
  sendReply: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const [hostNote, setHostNote] = useState(request.hostNote ?? "");
  const requestedAt = formatRequestDateTime(request.createdAt);
  const requestedFor = formatRequestDateTime(request.requestedFor);
  const lastUpdated = formatRequestDateTime(request.updatedAt);
  const statusCopy = requestStatusCopy(request.status);
  const paymentCopy = paymentStatusCopy(request.paymentStatus);

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border/70 p-4 lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 gap-3">
              <RequestAvatar name={request.guestName} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {request.requestCode}
                  </span>
                  <RequestStatusBadge status={request.status} />
                  <PaymentStatusBadge status={request.paymentStatus} />
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {request.guestName}
                </h2>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                  <Home className="h-4 w-4 shrink-0" />
                  <span className="truncate">{request.guidebookTitle}</span>
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background px-4 py-3 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Request total
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {request.subtotalLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="rounded-md border border-border/70 bg-background p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Submitted
            </p>
            <p className="mt-1 text-sm font-semibold">
              {requestedAt ?? "Unknown"}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-background p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Requested for
            </p>
            <p className="mt-1 text-sm font-semibold">
              {requestedFor ?? "No date specified"}
            </p>
          </div>
          <div className="rounded-md border border-border/70 bg-background p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
              Last update
            </p>
            <p className="mt-1 text-sm font-semibold">
              {lastUpdated ?? "Unknown"}
            </p>
          </div>
        </div>
      </section>

      <RequestProgressPanel request={request} updateRequest={updateRequest} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">What they requested</h3>
            </div>
            <div className="mt-3 grid gap-2">
              {request.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-md border border-border/70 bg-background p-3 sm:grid-cols-[64px_minmax(0,1fr)_auto]"
                >
                  <StoreItemArtwork
                    imageUrl={item.imageUrl}
                    name={item.itemName}
                    className="h-14 w-14 sm:h-16 sm:w-16"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold">
                        {item.itemName}
                      </p>
                      <Badge variant="secondary">Qty {item.quantity}</Badge>
                      {item.category ? (
                        <Badge variant="outline">{item.category}</Badge>
                      ) : null}
                    </div>
                    {item.itemDescription ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {item.itemDescription}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatStoreMoney(item.unitPriceCents, item.currency)} per
                      item
                    </p>
                  </div>
                  <strong className="col-span-2 text-sm sm:col-span-1">
                    {item.lineTotalLabel}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          {request.guestNote ? (
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Guest note</h3>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-6">
                {request.guestNote}
              </p>
            </section>
          ) : null}

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Guest conversation</h3>
              </div>
              <Badge variant="outline">{request.messages.length} messages</Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {request.messages.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                  No messages yet. Your first reply will appear here and email
                  the guest.
                </div>
              ) : (
                request.messages.map((message) => {
                  const isHost = message.authorType === "host";
                  return (
                    <article
                      key={message.id}
                      className={cn("flex", isHost ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[84%] rounded-lg px-3 py-2 text-sm",
                          isHost
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        <p className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] opacity-70">
                          {isHost ? "You" : "Guest"}
                          <span className="font-medium normal-case tracking-normal">
                            {formatRequestDateTime(message.createdAt)}
                          </span>
                        </p>
                        <p className="whitespace-pre-wrap leading-6">
                          {message.content}
                        </p>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            <form
              className="mt-4 grid gap-2 border-t border-border/70 pt-4"
              onSubmit={sendReply}
            >
              <Textarea
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Reply to the guest about this request"
                className="min-h-24"
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={!reply.trim()}>
                  <Send className="mr-1.5 h-4 w-4" />
                  Send reply
                </Button>
              </div>
            </form>
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Sender</h3>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <RequestAvatar name={request.guestName} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {request.guestName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {request.guidebookTitle}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{request.guestEmail}</span>
              </p>
              {request.guestPhone ? (
                <p className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span className="truncate">{request.guestPhone}</span>
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">State controls</h3>
            </div>
            <div className="mt-3 grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Request state
                </Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={request.status}
                  onChange={(event) =>
                    void updateRequest({ status: event.target.value })
                  }
                >
                  {REQUEST_STATUSES.filter((status) => status !== "all").map(
                    (status) => (
                      <option key={status} value={status}>
                        {requestStatusCopy(status).label}
                      </option>
                    )
                  )}
                </select>
                <p className="text-xs leading-5 text-muted-foreground">
                  {statusCopy.description}
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Payment state
                </Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  value={request.paymentStatus}
                  onChange={(event) =>
                    void updateRequest({ paymentStatus: event.target.value })
                  }
                >
                  {PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {paymentStatusCopy(status).label}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 text-muted-foreground">
                  {paymentCopy.description}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Private host note</h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void updateRequest({ hostNote })}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save
              </Button>
            </div>
            <Textarea
              className="mt-3 min-h-28"
              value={hostNote}
              onChange={(event) => setHostNote(event.target.value)}
              placeholder="Internal note. Guests do not see this."
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function RequestProgressPanel({
  request,
  updateRequest,
}: {
  request: RequestDetail;
  updateRequest: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const steps = storeProgressSteps(request);
  const activeIndex = steps.findIndex((step) => step.active);
  const nextIndex =
    activeIndex >= 0
      ? steps.findIndex((step, index) => index > activeIndex && !step.complete)
      : -1;
  const action = requestNextAction(request);
  const stepTimes = [
    formatRequestDateTime(request.createdAt),
    request.status === "cancelled"
      ? formatRequestDateTime(request.cancelledAt)
      : formatRequestDateTime(request.acceptedAt),
    request.paymentStatus === "not_required"
      ? "Skipped"
      : formatRequestDateTime(request.paymentProofSubmittedAt),
    request.paymentStatus === "not_required"
      ? "Skipped"
      : formatRequestDateTime(request.paymentConfirmedAt),
    formatRequestDateTime(request.fulfilledAt),
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="p-4">
          <h3 className="text-sm font-semibold">Request flow</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Done, current, and next steps stay separated here.
          </p>
        </div>
        <div className="p-4">
          <RequestStatusBadge status={request.status} />
        </div>
      </div>
      <div className="grid gap-2 border-y border-border/70 bg-muted/20 p-3 md:grid-cols-5">
        {steps.map((step, index) => {
          const state = step.blocked
            ? "blocked"
            : step.complete
              ? "complete"
              : step.active
                ? "active"
                : index === nextIndex
                  ? "next"
                  : "pending";
          const stateLabel =
            state === "complete"
              ? "Done"
              : state === "active"
                ? "Current"
                : state === "next"
                  ? "Next"
                  : state === "blocked"
                    ? "Stopped"
                    : "Waiting";
          return (
            <div
              key={step.label}
              className={cn(
                "rounded-md border p-3",
                state === "complete" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
                state === "active" &&
                  "border-amber-200 bg-amber-50 text-amber-950 ring-1 ring-amber-200 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/20",
                state === "blocked" &&
                  "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
                state === "next" &&
                  "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100",
                state === "pending" && "border-border bg-muted/20"
              )}
            >
              <div className="flex items-center gap-2">
                {state === "complete" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : state === "blocked" ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] opacity-70">
                  {stateLabel}
                </p>
              </div>
              <p className="mt-2 text-sm font-semibold">{step.label}</p>
              <p className="mt-1 text-xs leading-5 opacity-75">
                {step.description}
              </p>
              {stepTimes[index] ? (
                <p className="mt-2 text-[11px] font-medium opacity-70">
                  {stepTimes[index]}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className={cn("p-4", actionToneClasses(action.tone))}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{action.label}</p>
              <p className="mt-0.5 text-xs leading-5 opacity-80">
                {action.description}
              </p>
            </div>
          </div>
          <RequestCurrentStepActions
            request={request}
            updateRequest={updateRequest}
          />
        </div>
        <RequestCurrentStepDisclosure
          request={request}
          updateRequest={updateRequest}
        />
      </div>
    </section>
  );
}

function RequestCurrentStepActions({
  request,
  updateRequest,
}: {
  request: RequestDetail;
  updateRequest: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const noPayment = request.paymentStatus === "not_required";
  const canAccept = request.status === "new";
  const canConfirmPayment = request.paymentStatus === "proof_submitted";
  const canFulfill =
    request.status === "accepted" &&
    (request.paymentStatus === "external_paid" || noPayment);

  return (
    <div className="flex flex-wrap gap-2">
      {canAccept ? (
        <>
          <Button
            type="button"
            size="sm"
            onClick={() => void updateRequest({ status: "accepted" })}
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => void updateRequest({ status: "cancelled" })}
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Cancel
          </Button>
        </>
      ) : null}
      {canConfirmPayment ? (
        <Button
          type="button"
          size="sm"
          onClick={() => void updateRequest({ paymentStatus: "external_paid" })}
        >
          <WalletCards className="mr-1.5 h-3.5 w-3.5" />
          Confirm payment
        </Button>
      ) : null}
      {canFulfill ? (
        <Button
          type="button"
          size="sm"
          onClick={() => void updateRequest({ status: "fulfilled" })}
        >
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
          Mark delivered
        </Button>
      ) : null}
    </div>
  );
}

function RequestCurrentStepDisclosure({
  request,
  updateRequest,
}: {
  request: RequestDetail;
  updateRequest: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const noPayment = request.paymentStatus === "not_required";
  const paymentSettled =
    request.paymentStatus === "external_paid" || request.paymentStatus === "not_required";
  const safePaymentProofUrl = normalizeSafeUrl(request.paymentProofUrl, {
    allowRelative: true,
    protocols: new Set(["http:", "https:"]),
  });

  if (request.status === "new") {
    return (
      <div className="mt-4 grid gap-3 rounded-lg border border-black/10 bg-background/70 p-3 text-sm dark:border-white/10">
        <p className="font-medium">Review before approving</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <RequestMiniFact label="Guest" value={request.guestName} />
          <RequestMiniFact label="Items" value={requestItemSummary(request)} />
          <RequestMiniFact label="Total" value={request.subtotalLabel} />
        </div>
        {request.guestNote ? (
          <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 leading-6">
            {request.guestNote}
          </p>
        ) : null}
      </div>
    );
  }

  if (
    request.status === "accepted" &&
    request.paymentStatus === "external_pending"
  ) {
    return (
      <div className="mt-4 grid gap-3 rounded-lg border border-black/10 bg-background/70 p-3 text-sm dark:border-white/10">
        <p className="font-medium">Payment details the guest sees</p>
        {request.paymentInstructions ? (
          <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 leading-6">
            {request.paymentInstructions}
          </p>
        ) : (
          <p className="text-muted-foreground">
            No payment note is configured for this Store.
          </p>
        )}
        {request.paymentMethods.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {request.paymentMethods.map((method) => (
              <RequestPaymentMethodCard key={method.id} method={method} />
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            No payment methods are attached to this guidebook Store yet.
          </p>
        )}
      </div>
    );
  }

  if (request.paymentStatus === "proof_submitted") {
    return (
      <div className="mt-4 grid gap-3 rounded-lg border border-black/10 bg-background/70 p-3 text-sm dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">Payment proof is ready to review</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Submitted{" "}
              {formatRequestDateTime(request.paymentProofSubmittedAt) ??
                "recently"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {safePaymentProofUrl ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                render={
                  <a
                    href={safePaymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Open proof
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={() =>
                void updateRequest({ paymentStatus: "external_paid" })
              }
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Confirm payment
            </Button>
          </div>
        </div>
        {request.paymentProofNote ? (
          <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 leading-6">
            {request.paymentProofNote}
          </p>
        ) : null}
      </div>
    );
  }

  if (request.status === "accepted" && paymentSettled) {
    return (
      <div className="mt-4 grid gap-3 rounded-lg border border-black/10 bg-background/70 p-3 text-sm dark:border-white/10">
        <p className="font-medium">Ready to deliver</p>
        <div className="grid gap-2">
          {request.items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-muted/40 p-2"
            >
              <StoreItemArtwork
                imageUrl={item.imageUrl}
                name={item.itemName}
                className="h-11 w-11"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {item.itemName}
                </span>
                <span className="text-xs text-muted-foreground">
                  Quantity {item.quantity}
                </span>
              </span>
              <span className="text-xs font-semibold">{item.lineTotalLabel}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (request.status === "fulfilled") {
    return (
      <div className="mt-4 rounded-lg border border-black/10 bg-background/70 p-3 text-sm dark:border-white/10">
        Completed{" "}
        {formatRequestDateTime(request.fulfilledAt) ?? "without a timestamp"}.
      </div>
    );
  }

  if (request.status === "cancelled") {
    return (
      <div className="mt-4 rounded-lg border border-black/10 bg-background/70 p-3 text-sm dark:border-white/10">
        Cancelled{" "}
        {formatRequestDateTime(request.cancelledAt) ?? "without a timestamp"}.
      </div>
    );
  }

  if (noPayment) {
    return (
      <div className="mt-4 rounded-lg border border-black/10 bg-background/70 p-3 text-sm dark:border-white/10">
        Payment is skipped for this request.
      </div>
    );
  }

  return null;
}

function RequestMiniFact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-background p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}

function RequestPaymentMethodCard({ method }: { method: StorePaymentMethod }) {
  const meta = getStorePaymentMethodMeta(method.type);

  return (
    <article className="grid grid-cols-[36px_minmax(0,1fr)] gap-2 rounded-md border border-border/70 bg-muted/20 p-2 text-sm">
      <span
        className="grid h-9 w-9 place-items-center rounded-md text-white"
        style={{ backgroundColor: meta.hue }}
        aria-hidden
      >
        <Icon icon={meta.icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <strong className="block truncate">{method.label || meta.label}</strong>
        {method.value ? (
          <span className="mt-0.5 block break-words text-muted-foreground">
            {method.value}
          </span>
        ) : null}
        {method.instructions ? (
          <span className="mt-1 block whitespace-pre-wrap text-muted-foreground">
            {method.instructions}
          </span>
        ) : null}
      </span>
    </article>
  );
}

function CatalogProductCard({
  item,
  deleting,
  onEdit,
  onDelete,
}: {
  item: CatalogItem;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm transition hover:border-primary/35 hover:shadow-md">
      <div className="relative h-44 bg-muted/30">
        {item.imageUrl ? (
          <div
            aria-hidden="true"
            className="h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${JSON.stringify(item.imageUrl)})` }}
          />
        ) : (
          <div className="grid h-full place-items-center bg-muted/30 text-muted-foreground">
            <ImageIcon className="h-9 w-9" />
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="bg-background/90">
            {item.itemType === "service" ? "Service" : "Product"}
          </Badge>
          <Badge
            variant={item.active ? "secondary" : "outline"}
            className="bg-background/90"
          >
            {item.active ? "Active" : "Hidden"}
          </Badge>
          {item.category ? (
            <Badge variant="outline" className="bg-background/90">
              {item.category}
            </Badge>
          ) : null}
        </div>

        <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition group-hover:opacity-100">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={onEdit}
            aria-label={`Edit ${item.name}`}
            className="bg-background/95"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={onDelete}
            disabled={deleting}
            aria-label={`Delete ${item.name}`}
            className="bg-background/95 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{item.name}</h3>
            <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-5 text-muted-foreground">
              {item.description || "No description added."}
            </p>
          </div>
          <strong className="shrink-0 text-sm">
            {formatStoreMoney(item.priceCents, item.currency)}
          </strong>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {item.currency}
          </Badge>
          {item.unitLabel ? (
            <Badge variant="outline" className="text-[10px]">
              {item.unitLabel}
            </Badge>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ServicePresetDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (preset: ServicePreset) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Service presets</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_PRESETS.map((preset) => (
            <article
              key={preset.id}
              className="flex min-h-full flex-col rounded-lg border border-border bg-background p-3 shadow-sm transition hover:border-primary/35 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">
                    {preset.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {preset.description}
                  </p>
                </div>
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {preset.category}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  ${preset.price}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {preset.unitLabel}
                </Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => onSelect(preset)}
              >
                Use preset
              </Button>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CatalogItemDialog({
  item = null,
  initialDraft = null,
  open,
  onOpenChange,
  onSubmit,
}: {
  item?: CatalogItem | null;
  initialDraft?: CatalogItemDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: CatalogItemDraft) => Promise<boolean>;
}) {
  const isEditing = Boolean(item);
  const [draft, setDraft] = useState<CatalogItemDraft>(() =>
    item ? catalogDraftFromItem(item) : initialDraft ?? blankCatalogDraft()
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const idPrefix = isEditing ? `edit-product-${item?.id}` : "new-product";

  function patchDraft(patch: Partial<CatalogItemDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function uploadImage(file: File | null) {
    if (!file) return;

    setUploadingImage(true);
    setUploadProgress(1);

    try {
      const result = await uploadMediaFile(file, {
        endpoint: "/api/dashboard/store/uploads",
        onProgress: setUploadProgress,
      });
      patchDraft({ imageUrl: result.url });
      toast.success("Image uploaded to Media");
    } catch (err) {
      toast.error("Couldn't upload image", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploadingImage(false);
      window.setTimeout(() => setUploadProgress(0), 400);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    const saved = await onSubmit(draft);
    setSaving(false);
    if (saved) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit item" : "Add item"}</DialogTitle>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2">
            {CATALOG_ITEM_TYPE_OPTIONS.map((option) => {
              const active = draft.itemType === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition",
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                  )}
                  onClick={() => patchDraft({ itemType: option.value })}
                >
                  {option.value === "service" ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Package className="h-4 w-4" />
                  )}
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
            <div
              aria-hidden="true"
              className="grid h-40 place-items-center overflow-hidden rounded-lg border border-border bg-muted/30"
            >
              {draft.imageUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${JSON.stringify(draft.imageUrl)})`,
                  }}
                />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-name`}>Name</Label>
                <Input
                  id={`${idPrefix}-name`}
                  value={draft.name}
                  onChange={(event) => patchDraft({ name: event.target.value })}
                  required
                  maxLength={140}
                  placeholder="Airport pickup"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-image`}>Image URL</Label>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <Input
                    id={`${idPrefix}-image`}
                    value={draft.imageUrl}
                    onChange={(event) =>
                      patchDraft({ imageUrl: event.target.value })
                    }
                    placeholder="https://..."
                  />
                  <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted">
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingImage ? "Uploading" : "Upload"}
                    <input
                      className="sr-only"
                      type="file"
                      accept={STORE_IMAGE_ACCEPT}
                      disabled={uploadingImage}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0] ?? null;
                        event.currentTarget.value = "";
                        void uploadImage(file);
                      }}
                    />
                  </label>
                </div>
                {uploadingImage ? (
                  <div className="space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Saving to Media... {uploadProgress}%
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-description`}>Description</Label>
            <Textarea
              id={`${idPrefix}-description`}
              value={draft.description}
              onChange={(event) =>
                patchDraft({ description: event.target.value })
              }
              maxLength={1200}
              className="min-h-24"
              placeholder="Short guest-facing product details"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_96px]">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-price`}>Price</Label>
              <Input
                id={`${idPrefix}-price`}
                value={draft.price}
                inputMode="decimal"
                onChange={(event) => patchDraft({ price: event.target.value })}
                placeholder="45.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-currency`}>Currency</Label>
              <Input
                id={`${idPrefix}-currency`}
                value={draft.currency}
                maxLength={3}
                onChange={(event) =>
                  patchDraft({ currency: event.target.value.toUpperCase() })
                }
                placeholder="USD"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-unit`}>Unit label</Label>
              <Input
                id={`${idPrefix}-unit`}
                value={draft.unitLabel}
                onChange={(event) =>
                  patchDraft({ unitLabel: event.target.value })
                }
                maxLength={60}
                placeholder="per stay"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-category`}>Category</Label>
              <Input
                id={`${idPrefix}-category`}
                value={draft.category}
                onChange={(event) =>
                  patchDraft({ category: event.target.value })
                }
                maxLength={80}
                placeholder="Transport"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
            <p className="text-sm font-medium">Visible to guests</p>
            <Switch
              checked={draft.active}
              onCheckedChange={(checked) =>
                patchDraft({ active: checked === true })
              }
              aria-label="Visible to guests"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !draft.name.trim()}>
              {saving ? "Saving..." : isEditing ? "Save item" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
