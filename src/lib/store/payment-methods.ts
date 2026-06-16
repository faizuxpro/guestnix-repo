export const STORE_PAYMENT_METHOD_TYPES = [
  "venmo",
  "zelle",
  "cash_app",
  "paypal",
  "apple_pay",
  "card_link",
  "bank_transfer",
  "cash",
  "other",
] as const;

export type StorePaymentMethodType =
  (typeof STORE_PAYMENT_METHOD_TYPES)[number];

export type StorePaymentMethod = {
  id: string;
  type: StorePaymentMethodType;
  label: string;
  value: string;
  instructions: string | null;
  active: boolean;
  orderIndex: number;
};

export type StorePaymentMethodMeta = {
  type: StorePaymentMethodType;
  label: string;
  icon: string;
  hue: string;
  valuePlaceholder: string;
  instructionsPlaceholder: string;
};

export const STORE_PAYMENT_METHOD_META: StorePaymentMethodMeta[] = [
  {
    type: "venmo",
    label: "Venmo",
    icon: "ph:contactless-payment-fill",
    hue: "#3d95ce",
    valuePlaceholder: "@yourhandle",
    instructionsPlaceholder: "Ask guests to include their request code.",
  },
  {
    type: "zelle",
    label: "Zelle",
    icon: "ph:bank-fill",
    hue: "#6d1ed4",
    valuePlaceholder: "your-email@example.com or (555) 123-4567",
    instructionsPlaceholder: "Share the name guests should see before sending.",
  },
  {
    type: "cash_app",
    label: "Cash App",
    icon: "ph:currency-dollar-simple-fill",
    hue: "#00d632",
    valuePlaceholder: "$yourcashtag",
    instructionsPlaceholder: "Ask guests to include their request code.",
  },
  {
    type: "paypal",
    label: "PayPal",
    icon: "ph:paypal-logo-fill",
    hue: "#003087",
    valuePlaceholder: "https://paypal.me/yourname",
    instructionsPlaceholder: "Mention friends/family or goods/services if needed.",
  },
  {
    type: "apple_pay",
    label: "Apple Pay",
    icon: "ph:apple-logo-fill",
    hue: "#111827",
    valuePlaceholder: "Phone or email for Apple Cash",
    instructionsPlaceholder: "Tell guests what contact detail to use.",
  },
  {
    type: "card_link",
    label: "Card link",
    icon: "ph:credit-card-fill",
    hue: "#0f766e",
    valuePlaceholder: "Payment link or 'I will send one after approval'",
    instructionsPlaceholder: "Explain when the secure card link will be sent.",
  },
  {
    type: "bank_transfer",
    label: "Bank transfer",
    icon: "ph:building-office-fill",
    hue: "#475569",
    valuePlaceholder: "Bank transfer details or invoice process",
    instructionsPlaceholder: "Keep sensitive account details minimal.",
  },
  {
    type: "cash",
    label: "Cash",
    icon: "ph:money-fill",
    hue: "#15803d",
    valuePlaceholder: "Cash on arrival or at delivery",
    instructionsPlaceholder: "Tell guests when and where cash is accepted.",
  },
  {
    type: "other",
    label: "Other",
    icon: "ph:link-simple-bold",
    hue: "#64748b",
    valuePlaceholder: "Payment link, phone number, or instructions",
    instructionsPlaceholder: "Add any manual payment detail guests need.",
  },
];

const DEFAULT_META =
  STORE_PAYMENT_METHOD_META[STORE_PAYMENT_METHOD_META.length - 1];

export function getStorePaymentMethodMeta(type: StorePaymentMethodType) {
  return (
    STORE_PAYMENT_METHOD_META.find((entry) => entry.type === type) ??
    DEFAULT_META
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readMethodType(value: unknown): StorePaymentMethodType {
  return STORE_PAYMENT_METHOD_TYPES.includes(
    value as StorePaymentMethodType
  )
    ? (value as StorePaymentMethodType)
    : "other";
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readNullableString(value: unknown) {
  if (typeof value === "string") return value;
  return null;
}

export function normalizeStorePaymentMethods(
  value: unknown
): StorePaymentMethod[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();

  return value
    .map((entry, index): StorePaymentMethod | null => {
      if (!isRecord(entry)) return null;
      const type = readMethodType(entry.type);
      const meta = getStorePaymentMethodMeta(type);
      const id = readString(entry.id).trim() || `${type}-${index}`;
      if (seen.has(id)) return null;
      seen.add(id);

      const label = readString(entry.label, meta.label).trim() || meta.label;
      const valueText = readString(entry.value).trim();
      const instructions = readNullableString(entry.instructions);
      const orderIndex =
        typeof entry.orderIndex === "number" && Number.isFinite(entry.orderIndex)
          ? Math.max(0, Math.round(entry.orderIndex))
          : index;

      return {
        id,
        type,
        label,
        value: valueText,
        instructions: instructions?.trim() || null,
        active: typeof entry.active === "boolean" ? entry.active : true,
        orderIndex,
      };
    })
    .filter((entry): entry is StorePaymentMethod => Boolean(entry))
    .sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
      return a.label.localeCompare(b.label);
    })
    .map((entry, index) => ({ ...entry, orderIndex: index }));
}

export function filterSelectedStorePaymentMethods({
  paymentMethods,
  selectedIds,
}: {
  paymentMethods: StorePaymentMethod[];
  selectedIds: string[];
}) {
  const selected = new Set(selectedIds);
  return paymentMethods
    .filter((method) => method.active && selected.has(method.id))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function normalizeStorePaymentMethodIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    ),
  ];
}
