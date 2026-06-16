"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Check,
  ImageIcon,
  Link as LinkIcon,
  Loader2,
  Plus,
  Star,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AssetsHubPickerButton } from "@/components/editor/assets/AssetsHubPickerButton";
import { PLACE_CATEGORIES } from "@/lib/constants";
import { getMediaAssetUrl } from "@/lib/assets-hub";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { nearbyCategoryLabel } from "@/lib/nearby-categories";
import {
  extractNearbyEnrichedData,
  mergePlaceContact,
} from "@/lib/nearby-enriched";
import {
  mergePlaceImageTags,
  normalizePlaceImageUrls,
  readPlaceImageUrls,
} from "@/lib/place-images";
import { cn } from "@/lib/utils";
import type { SavedPlace } from "./useSavedPlaces";
import type { CreatePlaceInput, UpdatePlaceInput } from "@/lib/validations";

type Category = (typeof PLACE_CATEGORIES)[number];

export type DraftPlaceTarget = {
  kind: "draft";
  lat: number;
  lng: number;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  openingHours?: string | null;
  tags?: Record<string, unknown> | null;
};

export type PlaceEditTarget =
  | { kind: "saved"; place: SavedPlace }
  | DraftPlaceTarget;

type Props = {
  open: boolean;
  target: PlaceEditTarget | null;
  onClose: () => void;
  onCreate: (input: CreatePlaceInput) => Promise<SavedPlace | null>;
  onUpdate: (id: string, patch: UpdatePlaceInput) => Promise<boolean>;
};

type FieldValues = {
  name: string;
  category: Category;
  description: string;
  address: string;
  phone: string;
  website: string;
  email: string;
  images: string[];
  openingHours: string;
  lat: string;
  lng: string;
  cuisine: string;
  placeType: string;
  activities: string;
  facilities: string;
  priceRange: string;
  booking: string;
  brand: string;
  rating: string;
  wifi: boolean;
  outdoorSeating: boolean;
  wheelchair: boolean;
  parking: boolean;
  takeaway: boolean;
  delivery: boolean;
  paymentCards: boolean;
  paymentCash: boolean;
  paymentContactless: boolean;
  dietVegetarian: boolean;
  dietVegan: boolean;
  dietGlutenFree: boolean;
  dietHalal: boolean;
  customDetails: CustomDetail[];
};

type BooleanFieldKey =
  | "wifi"
  | "outdoorSeating"
  | "wheelchair"
  | "parking"
  | "takeaway"
  | "delivery"
  | "paymentCards"
  | "paymentCash"
  | "paymentContactless"
  | "dietVegetarian"
  | "dietVegan"
  | "dietGlutenFree"
  | "dietHalal";

type CustomDetail = {
  key: string;
  value: string;
};

type BlurFieldKey = Exclude<
  keyof FieldValues,
  "images" | "customDetails" | BooleanFieldKey
>;

const MANAGED_PLACE_TAG_KEYS = new Set([
  "activity",
  "amenity",
  "brand",
  "booking",
  "charge",
  "cuisine",
  "delivery",
  "description",
  "description:en",
  "email",
  "fee",
  "facilities",
  "galleryImageUrls",
  "guestnix:activities",
  "guestnix:custom_details",
  "guestnix:facilities",
  "guestnix:place_type",
  "image",
  "imageUrls",
  "internet_access",
  "leisure",
  "name",
  "note",
  "note:en",
  "opening_hours",
  "opening_hours:covid19",
  "operator",
  "parking",
  "parking:fee",
  "phone",
  "placeImageUrls",
  "price",
  "price_range",
  "reservation",
  "shop",
  "sport",
  "stars",
  "takeaway",
  "telephone",
  "tourism",
  "url",
  "website",
  "wheelchair",
  "wifi",
  "contact:email",
  "contact:phone",
  "contact:website",
  "diet:gluten_free",
  "diet:halal",
  "diet:vegan",
  "diet:vegetarian",
  "payment:cash",
  "payment:contactless",
  "payment:credit_cards",
  "addr:city",
  "addr:housenumber",
  "addr:postcode",
  "addr:street",
]);

const EMPTY_FIELDS: FieldValues = {
  name: "",
  category: "other",
  description: "",
  address: "",
  phone: "",
  website: "",
  email: "",
  images: [],
  openingHours: "",
  lat: "",
  lng: "",
  cuisine: "",
  placeType: "",
  activities: "",
  facilities: "",
  priceRange: "",
  booking: "",
  brand: "",
  rating: "",
  wifi: false,
  outdoorSeating: false,
  wheelchair: false,
  parking: false,
  takeaway: false,
  delivery: false,
  paymentCards: false,
  paymentCash: false,
  paymentContactless: false,
  dietVegetarian: false,
  dietVegan: false,
  dietGlutenFree: false,
  dietHalal: false,
  customDetails: [],
};

function toCategory(value: string): Category {
  return (PLACE_CATEGORIES as readonly string[]).includes(value)
    ? (value as Category)
    : "other";
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  return `https://${trimmed}`;
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter(Boolean)
      .join(", ");
  }
  return "";
}

function readFirstString(tags: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toStringValue(tags[key]);
    if (value) return value;
  }
  return "";
}

function readBooleanTag(tags: Record<string, unknown>, key: string) {
  const value = String(tags[key] ?? "").trim().toLowerCase();
  return value === "yes" || value === "true" || value === "1";
}

function normalizeListText(value: string) {
  return value
    .split(/[;,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function textToTagList(value: string) {
  return value
    .split(/[;,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(";");
}

function displayTagValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object" && value !== null) return "";
  return toStringValue(value);
}

function readNamespacedCustomDetails(value: unknown): CustomDetail[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): CustomDetail | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const key = toStringValue(record.key);
      const detailValue = displayTagValue(record.value);
      if (!key || !detailValue) return null;
      return { key, value: detailValue };
    })
    .filter((detail): detail is CustomDetail => Boolean(detail));
}

function readCustomDetails(tags: Record<string, unknown>): CustomDetail[] {
  if (Object.prototype.hasOwnProperty.call(tags, "guestnix:custom_details")) {
    return readNamespacedCustomDetails(tags["guestnix:custom_details"]);
  }
  return Object.entries(tags)
    .filter(([key, value]) => {
      if (MANAGED_PLACE_TAG_KEYS.has(key)) return false;
      if (key.startsWith("source:")) return false;
      return Boolean(displayTagValue(value));
    })
    .map(([key, value]) => ({ key, value: displayTagValue(value) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function setTagString(
  tags: Record<string, unknown>,
  key: string,
  value: string,
  options: { list?: boolean } = {}
) {
  const trimmed = value.trim();
  if (!trimmed) {
    delete tags[key];
    return;
  }
  tags[key] = options.list ? textToTagList(trimmed) : trimmed;
}

function setTagBoolean(tags: Record<string, unknown>, key: string, value: boolean) {
  if (value) {
    tags[key] = "yes";
  } else {
    delete tags[key];
  }
}

function richFieldsFromTags(tags: Record<string, unknown>) {
  const placeType =
    readFirstString(tags, ["guestnix:place_type"]) ||
    normalizeListText(
      readFirstString(tags, ["amenity", "shop", "tourism", "leisure", "sport"])
    );
  return {
    cuisine: normalizeListText(readFirstString(tags, ["cuisine"])),
    placeType,
    activities: normalizeListText(
      readFirstString(tags, ["guestnix:activities", "activity", "sport"])
    ),
    facilities: normalizeListText(
      readFirstString(tags, ["guestnix:facilities", "facilities"])
    ),
    priceRange: readFirstString(tags, ["price_range", "price", "fee", "charge"]),
    booking: readFirstString(tags, ["reservation", "booking"]),
    brand: readFirstString(tags, ["brand", "operator"]),
    rating: readFirstString(tags, ["stars"]),
    wifi:
      readBooleanTag(tags, "wifi") ||
      String(tags.internet_access ?? "").trim().toLowerCase() === "wlan",
    outdoorSeating: readBooleanTag(tags, "outdoor_seating"),
    wheelchair: readBooleanTag(tags, "wheelchair"),
    parking:
      readBooleanTag(tags, "parking") ||
      String(tags["parking:fee"] ?? "").trim().toLowerCase() === "no",
    takeaway: readBooleanTag(tags, "takeaway"),
    delivery: readBooleanTag(tags, "delivery"),
    paymentCards: readBooleanTag(tags, "payment:credit_cards"),
    paymentCash: readBooleanTag(tags, "payment:cash"),
    paymentContactless: readBooleanTag(tags, "payment:contactless"),
    dietVegetarian: readBooleanTag(tags, "diet:vegetarian"),
    dietVegan: readBooleanTag(tags, "diet:vegan"),
    dietGlutenFree: readBooleanTag(tags, "diet:gluten_free"),
    dietHalal: readBooleanTag(tags, "diet:halal"),
    customDetails: readCustomDetails(tags),
  };
}

function mergeRichFieldsIntoTags(
  baseTags: Record<string, unknown>,
  values: FieldValues
) {
  const next = { ...baseTags };
  setTagString(next, "cuisine", values.cuisine, { list: true });
  setTagString(next, "guestnix:place_type", values.placeType);
  setTagString(next, "guestnix:activities", values.activities, { list: true });
  setTagString(next, "guestnix:facilities", values.facilities, { list: true });
  setTagString(next, "price_range", values.priceRange);
  setTagString(next, "reservation", values.booking);
  setTagString(next, "brand", values.brand);
  setTagString(next, "stars", values.rating);

  setTagBoolean(next, "wifi", values.wifi);
  if (values.wifi) {
    next.internet_access = "wlan";
  } else {
    delete next.internet_access;
  }
  setTagBoolean(next, "outdoor_seating", values.outdoorSeating);
  setTagBoolean(next, "wheelchair", values.wheelchair);
  setTagBoolean(next, "parking", values.parking);
  if (!values.parking) delete next["parking:fee"];
  setTagBoolean(next, "takeaway", values.takeaway);
  setTagBoolean(next, "delivery", values.delivery);
  setTagBoolean(next, "payment:credit_cards", values.paymentCards);
  setTagBoolean(next, "payment:cash", values.paymentCash);
  setTagBoolean(next, "payment:contactless", values.paymentContactless);
  setTagBoolean(next, "diet:vegetarian", values.dietVegetarian);
  setTagBoolean(next, "diet:vegan", values.dietVegan);
  setTagBoolean(next, "diet:gluten_free", values.dietGlutenFree);
  setTagBoolean(next, "diet:halal", values.dietHalal);

  const customDetails: Array<{ key: string; value: string }> = [];
  for (const detail of values.customDetails) {
    const key = detail.key.trim();
    const value = detail.value.trim();
    if (!key || !value) continue;
    customDetails.push({ key, value });
  }
  next["guestnix:custom_details"] = customDetails;

  return next;
}

function fieldsFromPlace(place: SavedPlace): FieldValues {
  const enriched = extractNearbyEnrichedData(place.tags);
  const merged = mergePlaceContact(place, enriched);
  const tags = place.tags ?? {};
  return {
    name: place.name,
    category: toCategory(place.category),
    description: place.description ?? "",
    address: merged.address,
    phone: merged.phone,
    website: merged.website,
    email: merged.email,
    images: readPlaceImageUrls(place),
    openingHours: merged.openingHours,
    lat: String(place.lat),
    lng: String(place.lng),
    ...richFieldsFromTags(tags),
  };
}

function fieldsFromDraft(target: DraftPlaceTarget): FieldValues {
  const enriched = extractNearbyEnrichedData(target.tags);
  const merged = mergePlaceContact(target, enriched);
  const tags = target.tags ?? {};
  return {
    ...EMPTY_FIELDS,
    name: target.name ?? "",
    category: toCategory(target.category ?? "other"),
    description: target.description ?? "",
    address: merged.address,
    phone: merged.phone,
    website: merged.website,
    email: merged.email,
    images: readPlaceImageUrls(target),
    openingHours: merged.openingHours,
    lat: String(target.lat),
    lng: String(target.lng),
    ...richFieldsFromTags(tags),
  };
}

function targetKey(target: PlaceEditTarget | null) {
  if (!target) return "none";
  if (target.kind === "saved") return `saved:${target.place.id}`;
  return `draft:${target.name ?? ""}:${target.lat.toFixed(5)},${target.lng.toFixed(5)}`;
}

function serializeFieldValues(values: FieldValues) {
  return JSON.stringify(values);
}

function normalizeSavedFields(
  input: CreatePlaceInput,
  values: FieldValues
): FieldValues {
  return {
    ...values,
    name: input.name,
    category: input.category,
    description: input.description ?? "",
    address: input.address ?? "",
    phone: input.phone ?? "",
    website: input.website ?? "",
    email: input.email ?? "",
    images: normalizePlaceImageUrls(values.images),
    openingHours: input.openingHours ?? "",
    lat: String(input.lat),
    lng: String(input.lng),
    ...richFieldsFromTags(input.tags ?? {}),
  };
}

export function PlaceEditPanel(props: Props) {
  const { open, target, onClose } = props;
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[1100] flex justify-end transition-[backdrop-filter,background-color] duration-200 ${
        open ? "bg-slate-900/20 pointer-events-auto" : "bg-transparent"
      }`}
      aria-hidden={!open}
    >
      <aside
        className={`pointer-events-auto flex h-full w-full max-w-xl flex-col border-l border-border/80 bg-background shadow-xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label={target?.kind === "draft" ? "New place" : "Edit place"}
      >
        {target ? (
          <PlaceEditForm
            key={targetKey(target)}
            target={target}
            onClose={onClose}
            onCreate={props.onCreate}
            onUpdate={props.onUpdate}
          />
        ) : (
          <header className="flex items-center justify-between gap-2 border-b border-border/80 bg-card px-4 py-3">
            <h3 className="text-sm font-semibold">Edit place</h3>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close edit panel"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
        )}
      </aside>
    </div>
  );
}

type FormProps = {
  target: PlaceEditTarget;
  onClose: () => void;
  onCreate: (input: CreatePlaceInput) => Promise<SavedPlace | null>;
  onUpdate: (id: string, patch: UpdatePlaceInput) => Promise<boolean>;
};

function PlaceEditForm({ target, onClose, onCreate, onUpdate }: FormProps) {
  const initialFields =
    target.kind === "saved"
      ? fieldsFromPlace(target.place)
      : fieldsFromDraft(target);
  const initialSavedId = target.kind === "saved" ? target.place.id : null;
  const initialTags =
    target.kind === "saved" ? target.place.tags ?? {} : target.tags ?? {};

  const [fields, setFields] = useState<FieldValues>(initialFields);
  const [savedId, setSavedId] = useState<string | null>(initialSavedId);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [baselineKey, setBaselineKey] = useState(() =>
    serializeFieldValues(initialFields)
  );
  const tagsRef = useRef<Record<string, unknown>>(initialTags);
  const savedStateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDraft = savedId === null;
  const hasUnsavedChanges = serializeFieldValues(fields) !== baselineKey;

  const setField = useCallback(
    <K extends keyof FieldValues>(key: K, value: FieldValues[K]) => {
      setFields((prev) => ({ ...prev, [key]: value }));
      setStatus((current) => (current === "saved" ? "idle" : current));
    },
    []
  );

  const flashSaved = useCallback(() => {
    setStatus("saved");
    if (savedStateTimer.current) clearTimeout(savedStateTimer.current);
    savedStateTimer.current = setTimeout(() => {
      setStatus((s) => (s === "saved" ? "idle" : s));
    }, 1200);
  }, []);

  const buildCreateInput = useCallback(
    (values: FieldValues): CreatePlaceInput | null => {
      const lat = Number(values.lat);
      const lng = Number(values.lng);
      if (!values.name.trim()) {
        toast.error("Place name is required.");
        return null;
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast.error("Valid latitude and longitude are required.");
        return null;
      }
      const imageUrls = normalizePlaceImageUrls(values.images);
      const richTags = mergeRichFieldsIntoTags(tagsRef.current, values);
      return {
        name: values.name.trim(),
        category: values.category,
        description: values.description.trim() || null,
        lat,
        lng,
        address: values.address.trim() || null,
        phone: values.phone.trim() || null,
        website: values.website.trim() ? normalizeUrl(values.website) : null,
        email: values.email.trim() || null,
        imageUrl: imageUrls[0] ?? null,
        openingHours: values.openingHours.trim() || null,
        tags: mergePlaceImageTags(richTags, imageUrls),
      };
    },
    []
  );

  const saveImages = useCallback(
    (nextValues: string[]) => {
      const nextImages = normalizePlaceImageUrls(nextValues);
      setFields((prev) => ({ ...prev, images: nextImages }));
      setStatus((current) => (current === "saved" ? "idle" : current));
    },
    []
  );

  const handleBlur = useCallback(
    (key: BlurFieldKey) => {
      void key;
      if (status === "saved") setStatus("idle");
    },
    [status]
  );

  const handleBooleanChange = useCallback(
    (key: BooleanFieldKey, value: boolean) => {
      setFields((prev) => ({ ...prev, [key]: value }));
      setStatus((current) => (current === "saved" ? "idle" : current));
    },
    []
  );

  const handleCustomDetailsChange = useCallback(
    (nextDetails: CustomDetail[]) => {
      setFields((prev) => ({ ...prev, customDetails: nextDetails }));
      setStatus((current) => (current === "saved" ? "idle" : current));
    },
    []
  );

  const handleSave = useCallback(async () => {
    const input = buildCreateInput(fields);
    if (!input) return;
    setStatus("saving");

    if (isDraft) {
      const created = await onCreate(input);
      if (created) {
        const next = fieldsFromPlace(created);
        setBaselineKey(serializeFieldValues(next));
        tagsRef.current = created.tags ?? {};
        setFields(next);
        setSavedId(created.id);
        flashSaved();
      } else {
        setStatus("error");
      }
      return;
    }

    if (!savedId) {
      setStatus("error");
      return;
    }

    const ok = await onUpdate(savedId, input);
    if (ok) {
      const next = normalizeSavedFields(input, fields);
      setBaselineKey(serializeFieldValues(next));
      tagsRef.current = input.tags ?? {};
      setFields(next);
      flashSaved();
    } else {
      setStatus("error");
    }
  }, [buildCreateInput, fields, flashSaved, isDraft, onCreate, onUpdate, savedId]);

  const statusBadge = useMemo(() => {
    if (status === "saving") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving
        </span>
      );
    }
    if (status === "saved") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
          <Check className="h-3 w-3" />
          Saved
        </span>
      );
    }
    if (status === "error") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
          Error
        </span>
      );
    }
    return null;
  }, [status]);

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-border/80 bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">
            {isDraft ? "New place" : "Edit place"}
          </h3>
          {statusBadge}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close edit panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label className="text-xs">Name</Label>
            <Input
              value={fields.name}
              placeholder="e.g. Sunset Cafe"
              onChange={(e) => setField("name", e.target.value)}
              onBlur={() => void handleBlur("name")}
              autoFocus={isDraft}
            />
          </div>

          <PlaceImagesField
            images={fields.images}
            onChange={(nextImages) => void saveImages(nextImages)}
          />

          <div className="grid gap-1">
            <Label className="text-xs">Category</Label>
            <select
              value={fields.category}
              onChange={(e) => setField("category", toCategory(e.target.value))}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {PLACE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {nearbyCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={fields.description}
              rows={3}
              placeholder="What guests should know about it"
              onChange={(e) => setField("description", e.target.value)}
              onBlur={() => void handleBlur("description")}
            />
          </div>

          <div className="grid gap-1">
            <Label className="text-xs">Address</Label>
            <Input
              value={fields.address}
              onChange={(e) => setField("address", e.target.value)}
              onBlur={() => void handleBlur("address")}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">Latitude</Label>
              <Input
                value={fields.lat}
                onChange={(e) => setField("lat", e.target.value)}
                onBlur={() => void handleBlur("lat")}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Longitude</Label>
              <Input
                value={fields.lng}
                onChange={(e) => setField("lng", e.target.value)}
                onBlur={() => void handleBlur("lng")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">Phone</Label>
              <Input
                value={fields.phone}
                onChange={(e) => setField("phone", e.target.value)}
                onBlur={() => void handleBlur("phone")}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Website</Label>
              <Input
                value={fields.website}
                onChange={(e) => setField("website", e.target.value)}
                onBlur={() => void handleBlur("website")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">Email</Label>
              <Input
                value={fields.email}
                onChange={(e) => setField("email", e.target.value)}
                onBlur={() => void handleBlur("email")}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Opening hours</Label>
              <Input
                value={fields.openingHours}
                onChange={(e) => setField("openingHours", e.target.value)}
                onBlur={() => void handleBlur("openingHours")}
              />
            </div>
          </div>

          <RichPlaceDetailsField
            fields={fields}
            setField={setField}
            onBlur={handleBlur}
            onBooleanChange={handleBooleanChange}
            onCustomDetailsDraft={(details) =>
              setField("customDetails", details)
            }
            onCustomDetailsCommit={handleCustomDetailsChange}
          />
        </div>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border/80 bg-card px-4 py-3">
        <div className="text-[11px] text-muted-foreground">
          {hasUnsavedChanges ? "Unsaved changes" : "No pending changes"}
        </div>
        {isDraft ? (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Discard
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={status === "saving" || !fields.name.trim()}
            >
              {status === "saving" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save place
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={
                status === "saving" || !fields.name.trim() || !hasUnsavedChanges
              }
            >
              {status === "saving" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save changes
            </Button>
          </div>
        )}
      </footer>
    </>
  );
}

type PlaceImagesFieldProps = {
  images: string[];
  onChange: (images: string[]) => void | Promise<void>;
  disabled?: boolean;
};

type SetPlaceField = <K extends keyof FieldValues>(
  key: K,
  value: FieldValues[K]
) => void;

type RichPlaceDetailsFieldProps = {
  fields: FieldValues;
  setField: SetPlaceField;
  onBlur: (key: BlurFieldKey) => void | Promise<void>;
  onBooleanChange: (key: BooleanFieldKey, value: boolean) => void;
  onCustomDetailsDraft: (details: CustomDetail[]) => void;
  onCustomDetailsCommit: (details: CustomDetail[]) => void;
  disabled?: boolean;
};

function RichPlaceDetailsField({
  fields,
  setField,
  onBlur,
  onBooleanChange,
  onCustomDetailsDraft,
  onCustomDetailsCommit,
  disabled = false,
}: RichPlaceDetailsFieldProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/80 bg-muted/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Rich place details</Label>
        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Guest-facing
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">Place type</Label>
          <Input
            value={fields.placeType}
            placeholder="Restaurant, museum, beach"
            onChange={(event) => setField("placeType", event.target.value)}
            onBlur={() => void onBlur("placeType")}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Brand / operator</Label>
          <Input
            value={fields.brand}
            placeholder="Brand or operator"
            onChange={(event) => setField("brand", event.target.value)}
            onBlur={() => void onBlur("brand")}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-1">
        <Label className="text-xs">Food types / cuisine</Label>
        <Input
          value={fields.cuisine}
          placeholder="Italian, pizza, vegan"
          onChange={(event) => setField("cuisine", event.target.value)}
          onBlur={() => void onBlur("cuisine")}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">Activities</Label>
          <Textarea
            value={fields.activities}
            rows={3}
            placeholder="Swimming, hiking, live music"
            onChange={(event) => setField("activities", event.target.value)}
            onBlur={() => void onBlur("activities")}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Facilities</Label>
          <Textarea
            value={fields.facilities}
            rows={3}
            placeholder="Restrooms, lockers, rentals"
            onChange={(event) => setField("facilities", event.target.value)}
            onBlur={() => void onBlur("facilities")}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">Price range</Label>
          <Input
            value={fields.priceRange}
            placeholder="$, $$, free"
            onChange={(event) => setField("priceRange", event.target.value)}
            onBlur={() => void onBlur("priceRange")}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Booking</Label>
          <Input
            value={fields.booking}
            placeholder="Walk-ins, reservations"
            onChange={(event) => setField("booking", event.target.value)}
            onBlur={() => void onBlur("booking")}
            disabled={disabled}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Rating</Label>
          <Input
            value={fields.rating}
            placeholder="4.5"
            onChange={(event) => setField("rating", event.target.value)}
            onBlur={() => void onBlur("rating")}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="text-xs">Amenities & services</Label>
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip
            label="Wi-Fi"
            checked={fields.wifi}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("wifi", checked)}
          />
          <ToggleChip
            label="Outdoor seating"
            checked={fields.outdoorSeating}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("outdoorSeating", checked)}
          />
          <ToggleChip
            label="Accessible"
            checked={fields.wheelchair}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("wheelchair", checked)}
          />
          <ToggleChip
            label="Parking"
            checked={fields.parking}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("parking", checked)}
          />
          <ToggleChip
            label="Takeaway"
            checked={fields.takeaway}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("takeaway", checked)}
          />
          <ToggleChip
            label="Delivery"
            checked={fields.delivery}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("delivery", checked)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="text-xs">Diet & payments</Label>
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip
            label="Vegetarian"
            checked={fields.dietVegetarian}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("dietVegetarian", checked)}
          />
          <ToggleChip
            label="Vegan"
            checked={fields.dietVegan}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("dietVegan", checked)}
          />
          <ToggleChip
            label="Gluten-free"
            checked={fields.dietGlutenFree}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("dietGlutenFree", checked)}
          />
          <ToggleChip
            label="Halal"
            checked={fields.dietHalal}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("dietHalal", checked)}
          />
          <ToggleChip
            label="Cards"
            checked={fields.paymentCards}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("paymentCards", checked)}
          />
          <ToggleChip
            label="Cash"
            checked={fields.paymentCash}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("paymentCash", checked)}
          />
          <ToggleChip
            label="Contactless"
            checked={fields.paymentContactless}
            disabled={disabled}
            onChange={(checked) => onBooleanChange("paymentContactless", checked)}
          />
        </div>
      </div>

      <CustomDetailsField
        details={fields.customDetails}
        onDraft={onCustomDetailsDraft}
        onCommit={onCustomDetailsCommit}
        disabled={disabled}
      />
    </div>
  );
}

function ToggleChip({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        checked
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border/70 bg-background text-muted-foreground",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3 w-3 accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

function CustomDetailsField({
  details,
  onDraft,
  onCommit,
  disabled,
}: {
  details: CustomDetail[];
  onDraft: (details: CustomDetail[]) => void;
  onCommit: (details: CustomDetail[]) => void;
  disabled?: boolean;
}) {
  const update = (index: number, patch: Partial<CustomDetail>) => {
    const next = details.map((detail, detailIndex) =>
      detailIndex === index ? { ...detail, ...patch } : detail
    );
    onDraft(next);
  };

  const remove = (index: number) => {
    const next = details.filter((_, detailIndex) => detailIndex !== index);
    onDraft(next);
    onCommit(next);
  };

  const add = () => {
    onDraft([...details, { key: "", value: "" }]);
  };

  return (
    <div className="grid gap-2 rounded-md border border-border/70 bg-background p-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Additional details</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px]"
          onClick={add}
          disabled={disabled}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add detail
        </Button>
      </div>
      {details.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/15 px-3 py-2 text-[11px] text-muted-foreground">
          No additional details.
        </div>
      ) : (
        <div className="grid gap-2">
          {details.map((detail, index) => (
            <div
              key={`detail-${index}`}
              className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] gap-1.5"
            >
              <Input
                value={detail.key}
                placeholder="Label"
                className="h-8 text-xs"
                disabled={disabled}
                onChange={(event) => update(index, { key: event.target.value })}
                onBlur={() => onCommit(details)}
              />
              <Input
                value={detail.value}
                placeholder="Value"
                className="h-8 text-xs"
                disabled={disabled}
                onChange={(event) =>
                  update(index, { value: event.target.value })
                }
                onBlur={() => onCommit(details)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove detail"
                disabled={disabled}
                onClick={() => remove(index)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceImagesField({
  images,
  onChange,
  disabled = false,
}: PlaceImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlValue, setUrlValue] = useState("");

  const commit = useCallback(
    (nextImages: string[]) => {
      void onChange(normalizePlaceImageUrls(nextImages));
    },
    [onChange]
  );

  const addUrl = useCallback(() => {
    const [url] = normalizePlaceImageUrls([urlValue]);
    if (!url) {
      toast.error("Enter a valid image URL.");
      return;
    }
    if (images.includes(url)) {
      toast.message("That image is already in this place.");
      setUrlValue("");
      return;
    }
    commit([...images, url]);
    setUrlValue("");
  }, [commit, images, urlValue]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const selected = Array.from(files);
      const imageFiles = selected.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        toast.error("Please choose image files.");
        return;
      }
      if (imageFiles.length !== selected.length) {
        toast.message("Only image files were added.");
      }

      setIsUploading(true);
      setUploadProgress(1);
      const uploaded: string[] = [];

      for (const [fileIndex, file] of imageFiles.entries()) {
        try {
          const result = await uploadMediaFile(file, {
            onProgress: (progress) => {
              const aggregate = Math.round(
                ((fileIndex + progress / 100) / imageFiles.length) * 100
              );
              setUploadProgress(Math.max(1, Math.min(100, aggregate)));
            },
          });
          uploaded.push(result.url);
        } catch (err) {
          toast.error("Couldn't upload image", {
            description: err instanceof Error ? err.message : undefined,
          });
          continue;
        }
      }

      setIsUploading(false);
      window.setTimeout(() => setUploadProgress(0), 400);
      if (uploaded.length === 0) return;

      commit([...images, ...uploaded]);
      toast.success(
        uploaded.length === 1
          ? "Image uploaded to Media"
          : `${uploaded.length} images uploaded to Media`
      );
    },
    [commit, images]
  );

  const removeImage = useCallback(
    (index: number) => {
      commit(images.filter((_, imageIndex) => imageIndex !== index));
    },
    [commit, images]
  );

  const setCover = useCallback(
    (index: number) => {
      if (index === 0) return;
      const image = images[index];
      if (!image) return;
      commit([image, ...images.filter((_, imageIndex) => imageIndex !== index)]);
    },
    [commit, images]
  );

  return (
    <div className="grid gap-2 rounded-lg border border-border/80 bg-muted/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Place images</Label>
        <AssetsHubPickerButton
          assetType="media"
          label="Add saved media"
          emptyText="No saved media yet."
          onSelect={(asset) => {
            const url = getMediaAssetUrl(asset);
            if (!url) {
              toast.error("Saved media is missing a URL.");
              return;
            }
            if (images.includes(url)) {
              toast.message("That image is already in this place.");
              return;
            }
            commit([...images, url]);
            toast.success("Saved media added");
          }}
        />
      </div>

      <button
        type="button"
        disabled={disabled || isUploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (disabled || isUploading) return;
          void uploadFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-24 w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-left transition",
          isDragging
            ? "border-primary/60 bg-primary/10 ring-2 ring-primary/20"
            : "border-border/80 bg-background hover:border-primary/40 hover:bg-primary/5",
          (disabled || isUploading) && "cursor-not-allowed opacity-70"
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">
            {isUploading
              ? "Uploading..."
              : isDragging
                ? "Drop images"
                : "Upload photos"}
          </span>
          <span className="block text-[11px] text-muted-foreground">
            Multiple images, up to 5MB each
          </span>
        </span>
      </button>
      {isUploading ? (
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

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = event.currentTarget.files;
          if (files) void uploadFiles(files);
          event.currentTarget.value = "";
        }}
      />

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="group relative overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
              />
              <div className="absolute left-1.5 top-1.5 rounded-full bg-slate-950/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {index === 0 ? "Cover" : index + 1}
              </div>
              <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  disabled={index === 0}
                  onClick={() => setCover(index)}
                  aria-label="Set as cover image"
                  className="h-7 w-7 bg-white/95 text-slate-700 shadow-sm hover:bg-white"
                >
                  <Star className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  onClick={() => removeImage(index)}
                  aria-label="Remove image"
                  className="h-7 w-7 bg-white/95 text-slate-700 shadow-sm hover:bg-white hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border/70 bg-background px-3 py-2 text-[11px] text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          <span>No images yet.</span>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <LinkIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={urlValue}
            placeholder="Paste image URL"
            className="h-8 pl-7 text-xs"
            onChange={(event) => setUrlValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addUrl();
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={addUrl}
          disabled={!urlValue.trim()}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
