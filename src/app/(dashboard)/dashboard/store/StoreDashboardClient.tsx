"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
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
type RequestPriorityFilter =
  | "all"
  | "open"
  | "needs_review"
  | "proof_ready"
  | "ready_to_deliver";

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
const REQUEST_PRIORITY_FILTERS: Array<{
  value: RequestPriorityFilter;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All tickets",
    description: "Every request in the queue.",
  },
  {
    value: "open",
    label: "Open",
    description: "Still moving through the workflow.",
  },
  {
    value: "needs_review",
    label: "Needs review",
    description: "Approve or cancel these first.",
  },
  {
    value: "proof_ready",
    label: "Proof ready",
    description: "Payment proof is waiting.",
  },
  {
    value: "ready_to_deliver",
    label: "Ready to deliver",
    description: "Payment is settled.",
  },
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
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100";
  }
  if (status === "accepted") {
    return "border-primary/20 bg-primary/5 text-primary dark:border-primary/25 dark:bg-primary/10 dark:text-primary";
  }
  if (status === "fulfilled") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100";
  }
  if (status === "cancelled") {
    return "border-border bg-muted text-muted-foreground dark:bg-muted/40";
  }
  return "border-border bg-muted text-muted-foreground";
}

function requestStatusDotClasses(status: string) {
  if (status === "new") return "bg-amber-500";
  if (status === "accepted") return "bg-primary";
  if (status === "fulfilled") return "bg-emerald-500";
  if (status === "cancelled") return "bg-muted-foreground";
  return "bg-muted-foreground";
}

function paymentStatusClasses(status: string) {
  if (status === "proof_submitted") {
    return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100";
  }
  if (status === "external_paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100";
  }
  if (status === "not_required") {
    return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-200";
  }
  return "border-border bg-muted/70 text-muted-foreground";
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

function isOpenRequest(request: Pick<RequestSummary, "status">) {
  return request.status !== "fulfilled" && request.status !== "cancelled";
}

function isReadyToDeliver(
  request: Pick<RequestSummary, "status" | "paymentStatus">
) {
  return (
    request.status === "accepted" &&
    (request.paymentStatus === "external_paid" ||
      request.paymentStatus === "not_required")
  );
}

function matchesPriorityFilter(
  request: RequestSummary,
  filter: RequestPriorityFilter
) {
  if (filter === "all") return true;
  if (filter === "open") return isOpenRequest(request);
  if (filter === "needs_review") return request.status === "new";
  if (filter === "proof_ready") return request.paymentStatus === "proof_submitted";
  return isReadyToDeliver(request);
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
    return "border-primary/20 bg-primary/5 text-primary dark:border-primary/25 dark:bg-primary/10 dark:text-primary";
  }
  if (tone === "waiting") {
    return "border-border bg-muted/50 text-foreground";
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
  const [priorityFilter, setPriorityFilter] =
    useState<RequestPriorityFilter>("open");
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
    if (!matchesPriorityFilter(request, priorityFilter)) return false;
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
    const readyToDeliver = requests.filter(isReadyToDeliver).length;
    const open = requests.filter(isOpenRequest).length;
    return { needsReview, proofReady, readyToDeliver, open };
  }, [requests]);

  const priorityCounts: Record<RequestPriorityFilter, number> = {
    all: requests.length,
    open: requestStats.open,
    needs_review: requestStats.needsReview,
    proof_ready: requestStats.proofReady,
    ready_to_deliver: requestStats.readyToDeliver,
  };

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
    const id = makePaymentMethodId();
    setPaymentMethods((methods) => [
      ...methods,
      {
        id,
        type,
        label: meta.label,
        value: "",
        instructions: null,
        active: true,
        orderIndex: methods.length,
      },
    ]);
    return id;
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
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
          <section className="grid gap-4 border-b border-border/70 pb-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="h-6 border-primary/20 bg-primary/5 text-primary">
                  {requestStats.open} open
                </Badge>
                <Badge variant="outline" className="h-6">
                  {requests.length} total
                </Badge>
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Request command queue
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Review guest extras, confirm proof, and move paid requests to
                delivery from one focused queue.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <select
                className="h-9 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Status"
              >
                {REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "all"
                      ? "All states"
                      : requestStatusCopy(status).label}
                  </option>
                ))}
              </select>
              <select
                className="h-9 min-w-[190px] rounded-md border border-input bg-background px-2 text-sm"
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
          </section>

          <div className="grid gap-2 md:grid-cols-5">
            {REQUEST_PRIORITY_FILTERS.map((filter) => (
              <RequestQueueFocusButton
                key={filter.value}
                label={filter.label}
                description={filter.description}
                value={priorityCounts[filter.value]}
                active={priorityFilter === filter.value}
                onClick={() => setPriorityFilter(filter.value)}
              />
            ))}
          </div>

          <section className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="grid gap-2 border-b border-border/70 bg-muted/25 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground lg:grid-cols-[minmax(220px,1.1fr)_minmax(280px,1.5fr)_150px_170px]">
              <span>Guest</span>
              <span>Request</span>
              <span className="hidden lg:block">Timing</span>
              <span className="hidden text-right lg:block">Action</span>
            </div>

            {loadingRequests ? (
              <RequestQueueSkeleton />
            ) : filteredRequests.length === 0 ? (
              <div className="grid min-h-[320px] place-items-center border-dashed border-border bg-muted/10 p-8 text-center">
                <div>
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/70" />
                  <p className="mt-3 font-medium">No matching requests.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No requests are in this queue view right now.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/70">
                {filteredRequests.map((request) => (
                  <RequestQueueRow key={request.id} request={request} />
                ))}
              </div>
            )}
          </section>

          <p className="text-xs text-muted-foreground">
            Showing {filteredRequests.length} of {requests.length} request
            tickets.
          </p>
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
        <div className="mx-auto grid w-full max-w-5xl gap-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Payment setup
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Reusable manual payment details for approved Store requests,
              selected per guidebook Store.
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
  addPaymentMethod: (type: StorePaymentMethodType) => string;
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
  const activeMethods = paymentMethods.filter((method) => method.active).length;
  const hiddenMethods = paymentMethods.length - activeMethods;
  const detailedMethods = paymentMethods.filter(
    (method) => method.value.trim() || method.instructions?.trim()
  ).length;
  const setupStatus = loading
    ? "Loading setup"
    : saving
      ? "Saving setup"
      : dirty
        ? "Unsaved changes"
        : "Setup saved";
  const setupDescription = loading
    ? "Fetching your saved payment options."
    : dirty
      ? "Save changes before guests rely on these details."
      : paymentMethods.length > 0
        ? "These methods are ready to attach inside guidebook Store editors."
        : "Add at least one method to start taking manual payments.";
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [highlightedMethodId, setHighlightedMethodId] = useState<string | null>(
    null
  );
  const methodRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const currentEditingMethodId =
    editingMethodId &&
    paymentMethods.some((method) => method.id === editingMethodId)
      ? editingMethodId
      : null;
  const currentHighlightedMethodId =
    highlightedMethodId &&
    paymentMethods.some((method) => method.id === highlightedMethodId)
      ? highlightedMethodId
      : null;

  useEffect(() => {
    if (!currentHighlightedMethodId) return;
    methodRefs.current[currentHighlightedMethodId]?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [currentHighlightedMethodId, paymentMethods.length]);

  function handleAddPaymentMethod(type: StorePaymentMethodType) {
    const methodId = addPaymentMethod(type);
    setEditingMethodId(null);
    setHighlightedMethodId(methodId);
  }

  function handleEditPaymentMethod(methodId: string) {
    setEditingMethodId(methodId);
    setHighlightedMethodId(null);
  }

  function handleRemovePaymentMethod(methodId: string) {
    if (editingMethodId === methodId) setEditingMethodId(null);
    if (highlightedMethodId === methodId) setHighlightedMethodId(null);
    removePaymentMethod(methodId);
  }

  return (
    <section className="grid gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <WalletCards className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold tracking-tight">
                Payment methods
              </h3>
              {dirty ? (
                <Badge
                  variant="outline"
                  className="h-6 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                >
                  Unsaved
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Guestnix does not collect payment. Approved paid requests show
              selected methods and collect proof for host confirmation.
            </p>
            {paymentMethods.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="h-6">
                  {paymentMethods.length} total
                </Badge>
                <Badge
                  variant="outline"
                  className="h-6 border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                >
                  {activeMethods} visible
                </Badge>
                {hiddenMethods > 0 ? (
                  <Badge variant="outline" className="h-6">
                    {hiddenMethods} hidden
                  </Badge>
                ) : null}
                <Badge variant="outline" className="h-6">
                  {detailedMethods} with details
                </Badge>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <span
              className={cn(
                "inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium",
                dirty
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              {setupStatus}
            </span>
            <Button
              type="button"
              size="sm"
              disabled={loading || saving || !dirty}
              onClick={() => void savePaymentSettings()}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? "Saving" : "Save"}
            </Button>
            <AddPaymentMethodButton
              disabled={loading || saving}
              onAdd={handleAddPaymentMethod}
            />
          </div>
        </div>

        <div className="grid gap-2 p-3">
          {paymentMethods.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
              <WalletCards className="mx-auto h-8 w-8 text-muted-foreground/70" />
              <p className="mt-3 text-sm font-medium">
                No payment methods saved yet
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                Use Add method in the top-right to create the first option.
              </p>
            </div>
          ) : (
            paymentMethods.map((method, index) => (
              <PaymentMethodRow
                key={method.id}
                rowRef={(node) => {
                  methodRefs.current[method.id] = node;
                }}
                method={method}
                index={index}
                count={paymentMethods.length}
                disabled={loading || saving}
                editing={currentEditingMethodId === method.id}
                highlighted={currentHighlightedMethodId === method.id}
                onEdit={() => handleEditPaymentMethod(method.id)}
                onDoneEdit={() => setEditingMethodId(null)}
                onChange={(patch) => updatePaymentMethod(method.id, patch)}
                onRemove={() => handleRemovePaymentMethod(method.id)}
                onMove={(direction) => movePaymentMethod(index, direction)}
              />
            ))
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <Label htmlFor="store-payment-instructions">
                Shared payment note
              </Label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Optional note shown with every selected method, such as what to
                write in the memo.
              </p>
            </div>
          </div>
          <Textarea
            id="store-payment-instructions"
            value={paymentInstructions}
            maxLength={2000}
            disabled={loading}
            onChange={(event) => setPaymentInstructions(event.target.value)}
            placeholder="Example: include your request code in the payment memo so we can match your payment quickly."
            className="min-h-28 resize-y text-sm"
          />
          <p className="mt-2 text-right text-[11px] text-muted-foreground">
            {paymentInstructions.length}/2000
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start gap-2">
            <CreditCard className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Manual payment flow</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Select the saved methods each guidebook Store can offer after
                host approval.
              </p>
            </div>
          </div>
          <p className="mt-3 rounded-md border border-border/70 bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
            {setupDescription}
          </p>
        </div>
      </div>
    </section>
  );
}

function PaymentMethodRow({
  rowRef,
  method,
  index,
  count,
  disabled,
  editing,
  highlighted,
  onEdit,
  onDoneEdit,
  onChange,
  onRemove,
  onMove,
}: {
  rowRef: (node: HTMLDivElement | null) => void;
  method: StorePaymentMethod;
  index: number;
  count: number;
  disabled: boolean;
  editing: boolean;
  highlighted: boolean;
  onEdit: () => void;
  onDoneEdit: () => void;
  onChange: (patch: Partial<StorePaymentMethod>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const meta = getStorePaymentMethodMeta(method.type);
  const fieldId = method.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const displayLabel = method.label.trim() || meta.label;
  const paymentDetail = method.value.trim();
  const instructions = method.instructions?.trim() ?? "";
  const missingDetail = !paymentDetail;

  if (!editing) {
    return (
      <div
        ref={rowRef}
        className={cn(
          "rounded-md border border-border bg-background transition-colors",
          !method.active && "bg-muted/20",
          highlighted && "border-primary/40 bg-primary/5 ring-2 ring-primary/15"
        )}
      >
        <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white shadow-sm"
              style={{ backgroundColor: meta.hue }}
              aria-hidden
            >
              <Icon icon={meta.icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{displayLabel}</p>
                <span className="text-xs text-muted-foreground">
                  {meta.label}
                </span>
                {highlighted ? (
                  <Badge
                    variant="outline"
                    className="h-5 border-primary/30 bg-primary/5 text-primary"
                  >
                    New
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                {missingDetail ? (
                  <Badge
                    variant="outline"
                    className="h-6 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
                  >
                    Needs detail
                  </Badge>
                ) : (
                  <span className="max-w-full truncate rounded-md bg-muted px-2 py-1 text-xs text-foreground">
                    {paymentDetail}
                  </span>
                )}
                {instructions ? (
                  <span className="max-w-full truncate text-xs text-muted-foreground">
                    {instructions}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex h-8 items-center gap-2 rounded-md border border-border bg-card px-2">
              {method.active ? (
                <Eye className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-xs font-medium">
                {method.active ? "Visible" : "Hidden"}
              </span>
              <Switch
                size="sm"
                checked={method.active}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  onChange({ active: checked === true })
                }
                aria-label={method.active ? "Hide method" : "Show method"}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={onEdit}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Button>
            <div className="flex items-center gap-1">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      className={cn(
        "rounded-md border border-primary/30 bg-background p-3 shadow-sm ring-1 ring-primary/10 transition-colors",
        !method.active && "bg-muted/20"
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex h-9 max-w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Change payment method - currently ${meta.label}`}
                    disabled={disabled}
                  >
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-white"
                      style={{ backgroundColor: meta.hue }}
                      aria-hidden
                    >
                      <Icon icon={meta.icon} className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{meta.label}</span>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                }
              />
              <PopoverContent align="start" sideOffset={8} className="w-[320px] p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Change payment type
                </p>
                <PaymentMethodGrid
                  compact
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

            <Badge
              variant="outline"
              className={cn(
                "h-6",
                method.active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                  : "border-border bg-muted text-muted-foreground"
              )}
            >
              {method.active ? "Visible to guests" : "Hidden"}
            </Badge>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label htmlFor={`${fieldId}-label`}>Display name</Label>
            <Input
              id={`${fieldId}-label`}
              value={method.label}
              disabled={disabled}
              onChange={(event) => onChange({ label: event.target.value })}
              placeholder={meta.label}
              className="h-9 text-sm"
              aria-label={`${meta.label} label`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-2.5">
            {method.active ? (
              <Eye className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium">
              {method.active ? "Visible" : "Hidden"}
            </span>
            <Switch
              size="sm"
              checked={method.active}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onChange({ active: checked === true })
              }
              aria-label={method.active ? "Hide method" : "Show method"}
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={onDoneEdit}
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Done
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
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-value`}>Payment detail</Label>
          <Input
            id={`${fieldId}-value`}
            value={method.value}
            disabled={disabled}
            onChange={(event) => onChange({ value: event.target.value })}
            placeholder={meta.valuePlaceholder}
            className="h-9 text-sm"
            aria-label={`${meta.label} payment detail`}
          />
          <p className="text-[11px] leading-4 text-muted-foreground">
            Shown exactly to guests after approval.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-instructions`}>Guest instructions</Label>
          <Textarea
            id={`${fieldId}-instructions`}
            value={method.instructions ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({ instructions: event.target.value || null })
            }
            placeholder={meta.instructionsPlaceholder}
            className="min-h-20 resize-y text-sm"
            aria-label={`${meta.label} instructions`}
          />
        </div>
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
      <PopoverTrigger render={<Button type="button" size="sm" disabled={disabled} />}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add method
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[320px] p-3">
        <div className="mb-2">
          <p className="text-sm font-semibold">Add payment method</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Added methods appear at the end of the list.
          </p>
        </div>
        <PaymentMethodGrid
          compact
          current={null}
          disabled={disabled}
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
  disabled = false,
  compact = false,
  onSelect,
}: {
  current: StorePaymentMethodType | null;
  disabled?: boolean;
  compact?: boolean;
  onSelect: (type: StorePaymentMethodType) => void;
}) {
  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
      {STORE_PAYMENT_METHOD_META.map((method) => {
        const selected = current === method.type;
        return (
          <button
            key={method.type}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(method.type)}
            aria-label={method.label}
            title={method.label}
            className={cn(
              "group flex min-h-14 w-full min-w-0 items-center gap-2 rounded-md border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              compact && "min-h-11",
              selected
                ? "border-transparent text-white shadow-md"
                : "border-border/70 bg-background hover:border-primary/35 hover:bg-primary/5",
              disabled && "cursor-not-allowed opacity-60"
            )}
            style={
              selected
                ? {
                    backgroundColor: method.hue,
                    boxShadow: `0 0 0 2px ${hexWithAlpha(
                      method.hue,
                      0.25
                    )}, 0 8px 18px -12px ${hexWithAlpha(method.hue, 0.8)}`,
                  }
                : undefined
            }
          >
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-md text-white shadow-sm",
                compact && "h-7 w-7",
                selected && "bg-white/20 shadow-none"
              )}
              style={selected ? undefined : { backgroundColor: method.hue }}
              aria-hidden
            >
              <Icon icon={method.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 overflow-hidden">
              <span className="block truncate text-xs font-semibold">
                {method.label}
              </span>
              {!compact ? (
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[11px]",
                    selected ? "text-white/80" : "text-muted-foreground"
                  )}
                >
                  {method.valuePlaceholder}
                </span>
              ) : null}
            </span>
            {selected ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function RequestQueueFocusButton({
  label,
  description,
  value,
  active,
  onClick,
}: {
  label: string;
  description: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-28 rounded-lg border p-3 text-left transition hover:border-primary/30 hover:bg-muted/30",
        active
          ? "border-primary/35 bg-primary/5 shadow-sm"
          : "border-border bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <span
          className={cn(
            "grid h-8 min-w-8 place-items-center rounded-md border px-2 text-sm font-semibold tabular-nums",
            active
              ? "border-primary/25 bg-background text-primary"
              : "border-border bg-muted/40 text-foreground"
          )}
        >
          {value}
        </span>
      </div>
    </button>
  );
}

function RequestQueueSkeleton() {
  return (
    <div className="divide-y divide-border/70">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="grid gap-4 p-4 lg:grid-cols-[minmax(220px,1.1fr)_minmax(280px,1.5fr)_150px_170px]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-32 rounded-full bg-muted" />
              <div className="h-3 w-44 rounded-full bg-muted" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded-full bg-muted" />
            <div className="h-3 w-1/2 rounded-full bg-muted" />
          </div>
          <div className="h-8 rounded-md bg-muted" />
          <div className="h-8 rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}

function RequestAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/5 text-sm font-semibold text-primary">
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

function requestQueueAccentClasses(
  tone: ReturnType<typeof requestNextAction>["tone"]
) {
  if (tone === "attention") return "before:bg-amber-500";
  if (tone === "ready") return "before:bg-primary";
  if (tone === "success") return "before:bg-emerald-500";
  if (tone === "muted") return "before:bg-muted-foreground/40";
  return "before:bg-border";
}

function requestQueueCtaLabel(request: RequestSummary) {
  if (request.status === "new") return "Review";
  if (request.paymentStatus === "proof_submitted") return "Confirm payment";
  if (isReadyToDeliver(request)) return "Deliver";
  if (request.status === "accepted") return "Track payment";
  if (request.status === "fulfilled") return "View record";
  if (request.status === "cancelled") return "View record";
  return "Open ticket";
}

function RequestQueueRow({
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
      className={cn(
        "group relative grid gap-4 bg-background p-4 text-left transition before:absolute before:inset-y-4 before:left-0 before:w-1 before:rounded-r-full hover:bg-muted/25 lg:grid-cols-[minmax(220px,1.1fr)_minmax(280px,1.5fr)_150px_170px] lg:items-center",
        requestQueueAccentClasses(action.tone)
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <RequestAvatar name={request.guestName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{request.guestName}</p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Home className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{request.guidebookTitle}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <RequestStatusBadge status={request.status} />
            <PaymentStatusBadge status={request.paymentStatus} />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        {previewItems.length > 0 ? (
          <div className="mb-2 flex items-center gap-1.5">
            {previewItems.map((item) => (
              <StoreItemArtwork
                key={item.id}
                imageUrl={item.imageUrl}
                name={item.itemName}
                className="h-10 w-10"
              />
            ))}
            {overflowCount > 0 ? (
              <span className="grid h-10 w-10 place-items-center rounded-md border border-dashed border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                +{overflowCount}
              </span>
            ) : null}
          </div>
        ) : null}
        <p className="line-clamp-2 text-sm font-semibold">
          {requestItemSummary(request)}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {action.label}
        </p>
      </div>

      <div className="grid gap-1 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate font-medium text-foreground">
            {request.requestCode}
          </span>
        </span>
        {requestedAt ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3 shrink-0" />
            {requestedAt}
          </span>
        ) : null}
        {requestedFor ? (
          <span className="inline-flex items-center gap-1.5">
            <Package className="h-3 w-3 shrink-0" />
            For {requestedFor}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <span className="text-sm font-semibold tabular-nums">
          {request.subtotalLabel}
        </span>
        <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition group-hover:border-primary/30 group-hover:text-primary">
          {requestQueueCtaLabel(request)}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
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
  const action = requestNextAction(request);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-5">
      <section className="border-b border-border/70 pb-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-lg border border-border bg-background p-4 lg:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <RequestAvatar name={request.guestName} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                      {request.requestCode}
                    </span>
                    <RequestStatusBadge status={request.status} />
                    <PaymentStatusBadge status={request.paymentStatus} />
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                    {request.guestName}
                  </h2>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                    <Home className="h-4 w-4 shrink-0" />
                    <span className="truncate">{request.guidebookTitle}</span>
                  </p>
                </div>
              </div>

              <div className="min-w-36 rounded-md border border-border bg-muted/25 px-4 py-3 sm:text-right">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Request total
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {request.subtotalLabel}
                </p>
              </div>
            </div>
          </div>

          <div className={cn("rounded-lg border p-4", actionToneClasses(action.tone))}>
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase opacity-70">
                  Next action
                </p>
                <h3 className="mt-1 text-lg font-semibold">{action.label}</h3>
                <p className="mt-1 text-sm leading-6 opacity-80">
                  {action.description}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <RequestCurrentStepActions
                request={request}
                updateRequest={updateRequest}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
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
          <div className="rounded-md border border-border/70 bg-background p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <WalletCards className="h-3.5 w-3.5" />
              Payment
            </p>
            <p className="mt-1 truncate text-sm font-semibold">
              {paymentCopy.label}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid content-start gap-5">
          <RequestProgressPanel request={request} updateRequest={updateRequest} />

          <section className="overflow-hidden rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Requested items</h3>
              </div>
              <Badge variant="outline">{request.items.length} items</Badge>
            </div>
            <div className="divide-y divide-border/70">
              {request.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 p-4 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center"
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
            <section className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Guest note</h3>
              </div>
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm leading-6">
                {request.guestNote}
              </p>
            </section>
          ) : null}

          <section className="rounded-lg border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
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

        <aside className="overflow-hidden rounded-lg border border-border bg-background xl:sticky xl:top-4 xl:self-start">
          <section className="p-4">
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

          <section className="border-t border-border/70 p-4">
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

          <section className="border-t border-border/70 p-4">
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
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Request flow</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {action.label}
          </p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>
      <ol className="grid gap-4 p-4 md:grid-cols-5 md:gap-0">
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
            <li
              key={step.label}
              className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-3 md:block md:pr-4"
            >
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "absolute bottom-[-1rem] left-[13px] top-8 w-px bg-border md:bottom-auto md:left-7 md:right-0 md:top-3.5 md:h-px md:w-auto",
                    state === "complete" && "bg-primary/35",
                    state === "active" && "bg-amber-300"
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 grid h-7 w-7 place-items-center rounded-full border bg-background",
                  state === "complete" &&
                    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100",
                  state === "active" &&
                    "border-amber-300 bg-amber-50 text-amber-800 ring-4 ring-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/10",
                  state === "blocked" &&
                    "border-border bg-muted text-muted-foreground",
                  state === "next" &&
                    "border-primary/30 bg-primary/5 text-primary",
                  state === "pending" && "border-border bg-muted/30 text-muted-foreground"
                )}
              >
                {state === "complete" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : state === "blocked" ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 md:mt-3">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {stateLabel}
                </p>
                <p className="mt-1 text-sm font-semibold">{step.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {step.description}
                </p>
                {stepTimes[index] ? (
                  <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                    {stepTimes[index]}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div className={cn("border-t border-border/70 p-4", actionToneClasses(action.tone))}>
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{action.label}</p>
            <p className="mt-0.5 text-xs leading-5 opacity-80">
              {action.description}
            </p>
          </div>
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
            size="lg"
            onClick={() => void updateRequest({ status: "accepted" })}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Approve
          </Button>
          <Button
            type="button"
            size="lg"
            variant="destructive"
            onClick={() => void updateRequest({ status: "cancelled" })}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Cancel
          </Button>
        </>
      ) : null}
      {canConfirmPayment ? (
        <Button
          type="button"
          size="lg"
          onClick={() => void updateRequest({ paymentStatus: "external_paid" })}
        >
          <WalletCards className="mr-1.5 h-4 w-4" />
          Confirm payment
        </Button>
      ) : null}
      {canFulfill ? (
        <Button
          type="button"
          size="lg"
          onClick={() => void updateRequest({ status: "fulfilled" })}
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Mark delivered
        </Button>
      ) : null}
      {!canAccept && !canConfirmPayment && !canFulfill ? (
        <span className="inline-flex min-h-9 items-center rounded-md border border-current/15 bg-background/40 px-3 text-sm font-medium">
          No immediate host action
        </span>
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
      <div className="mt-4 grid gap-3 border-t border-current/10 pt-4 text-sm">
        <p className="font-medium">Review before approving</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <RequestMiniFact label="Guest" value={request.guestName} />
          <RequestMiniFact label="Items" value={requestItemSummary(request)} />
          <RequestMiniFact label="Total" value={request.subtotalLabel} />
        </div>
        {request.guestNote ? (
          <p className="whitespace-pre-wrap rounded-md bg-background/55 p-3 leading-6">
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
      <div className="mt-4 grid gap-3 border-t border-current/10 pt-4 text-sm">
        <p className="font-medium">Payment details the guest sees</p>
        {request.paymentInstructions ? (
          <p className="whitespace-pre-wrap rounded-md bg-background/55 p-3 leading-6">
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
          <p className="rounded-md border border-dashed border-current/20 p-3 text-xs text-muted-foreground">
            No payment methods are attached to this guidebook Store yet.
          </p>
        )}
      </div>
    );
  }

  if (request.paymentStatus === "proof_submitted") {
    return (
      <div className="mt-4 grid gap-3 border-t border-current/10 pt-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            <WalletCards className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Payment proof is ready to review</p>
              <p className="mt-1 text-xs opacity-75">
                Submitted{" "}
                {formatRequestDateTime(request.paymentProofSubmittedAt) ??
                  "recently"}
              </p>
            </div>
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
          <p className="whitespace-pre-wrap rounded-md bg-background/55 p-3 leading-6">
            {request.paymentProofNote}
          </p>
        ) : null}
      </div>
    );
  }

  if (request.status === "accepted" && paymentSettled) {
    return (
      <div className="mt-4 grid gap-3 border-t border-current/10 pt-4 text-sm">
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
      <div className="mt-4 border-t border-current/10 pt-4 text-sm">
        Completed{" "}
        {formatRequestDateTime(request.fulfilledAt) ?? "without a timestamp"}.
      </div>
    );
  }

  if (request.status === "cancelled") {
    return (
      <div className="mt-4 border-t border-current/10 pt-4 text-sm">
        Cancelled{" "}
        {formatRequestDateTime(request.cancelledAt) ?? "without a timestamp"}.
      </div>
    );
  }

  if (noPayment) {
    return (
      <div className="mt-4 border-t border-current/10 pt-4 text-sm">
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
