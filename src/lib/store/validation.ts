import { z } from "zod";
import { isSafeHttpUrl } from "@/lib/safe-url";
import {
  STORE_ITEM_TYPES,
  STORE_PAYMENT_STATUSES,
  STORE_REQUEST_STATUSES,
} from "@/lib/store/types";
import { STORE_PAYMENT_METHOD_TYPES } from "@/lib/store/payment-methods";

const nullableText = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    },
    z.string().max(max).nullable().optional()
  );

const currencySchema = z
  .string()
  .trim()
  .length(3)
  .transform((value) => value.toUpperCase());

const dateTimeSchema = z
  .preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z
      .string()
      .trim()
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Enter a valid date and time",
      })
      .optional()
  );

const optionalText = (max: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().max(max).optional()
  );

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().email().max(320).optional()
);

const STORE_PROOF_VALUE_PREFIX = "store-proof:";
const URL_SCHEME_RE = /^[a-z][a-z\d+.-]*:/i;
const BARE_DOMAIN_RE = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:[/?#:]|$)/i;

function normalizePaymentProofValue(value: string | null | undefined) {
  if (!value) return value;
  if (value.startsWith(STORE_PROOF_VALUE_PREFIX)) return value;
  if (URL_SCHEME_RE.test(value)) return value;
  return BARE_DOMAIN_RE.test(value) ? `https://${value}` : value;
}

function isAllowedPaymentProofValue(value: string | null | undefined) {
  if (!value) return true;
  return value.startsWith(STORE_PROOF_VALUE_PREFIX) || isSafeHttpUrl(value);
}

export const storeItemCreateSchema = z.object({
  itemType: z.enum(STORE_ITEM_TYPES).default("product"),
  name: z.string().trim().min(1, "Name is required").max(140),
  description: nullableText(1200),
  imageUrl: nullableText(2048),
  priceCents: z.number().int().min(0).max(10_000_000).default(0),
  currency: currencySchema.default("USD"),
  unitLabel: nullableText(60),
  category: nullableText(80),
  active: z.boolean().default(true),
});

export const storeItemUpdateSchema = storeItemCreateSchema.partial();

export const storefrontAssignmentSchema = z.object({
  storeItemId: z.string().uuid(),
  visible: z.boolean().default(true),
  orderIndex: z.number().int().min(0).default(0),
  maxQuantity: z.number().int().min(1).max(999).nullable().optional(),
});

export const storefrontPatchSchema = z.object({
  enabled: z.boolean().optional(),
  paymentMethodIds: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
  items: z.array(storefrontAssignmentSchema).max(100).optional(),
});

export const storeSettingsPatchSchema = z.object({
  paymentInstructions: nullableText(2000),
  paymentMethods: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(120),
        type: z.enum(STORE_PAYMENT_METHOD_TYPES),
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().max(500).default(""),
        instructions: nullableText(1000),
        active: z.boolean().default(true),
        orderIndex: z.number().int().min(0).max(999).default(0),
      })
    )
    .max(30)
    .optional(),
});

export const publicStoreRequestCreateSchema = z.object({
  items: z
    .array(
      z.object({
        storeItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(999),
      })
    )
    .min(1, "Choose at least one item")
    .max(50),
  guestName: optionalText(120),
  guestEmail: optionalEmail,
  guestPhone: optionalText(80),
  guestNote: optionalText(1200),
  requestedFor: dateTimeSchema.optional(),
  chatSessionToken: z.preprocess(
    (value) => {
      if (value == null) return undefined;
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().max(240).optional()
  ),
});

export const publicStoreRequestMessageSchema = z.object({
  content: z.string().trim().min(1, "Message is required").max(3000),
});

export const publicStoreRequestPaymentProofSchema = z
  .object({
    paymentProofUrl: optionalText(2048)
      .transform(normalizePaymentProofValue)
      .refine(isAllowedPaymentProofValue, {
        message: "Use a valid http(s) payment proof link or upload a proof file",
      }),
    paymentProofNote: optionalText(1200),
  })
  .refine(
    (value) => Boolean(value.paymentProofUrl || value.paymentProofNote),
    {
      message: "Add a payment proof file, link, or reference note",
      path: ["paymentProofNote"],
    }
  );

export const hostStoreRequestUpdateSchema = z.object({
  status: z.enum(STORE_REQUEST_STATUSES).optional(),
  paymentStatus: z.enum(STORE_PAYMENT_STATUSES).optional(),
  hostNote: nullableText(2000),
});

export const hostStoreRequestMessageSchema = z.object({
  content: z.string().trim().min(1, "Message is required").max(3000),
});
