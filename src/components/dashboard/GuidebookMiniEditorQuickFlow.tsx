"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  CircleDollarSign,
  Compass,
  ExternalLink,
  FileUp,
  Globe,
  ImageIcon,
  Info,
  LayoutDashboard,
  Loader2,
  MapPin,
  Navigation,
  Paintbrush,
  RefreshCcw,
  ShoppingBag,
  UserRound,
  Wifi,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RuntimeFontLoader } from "@/components/fonts/RuntimeFontLoader";
import { DESIGN_PRESETS, type DesignPreset } from "@/components/editor/design/presets";
import { LanguageProvider } from "@/components/guidebook/LanguageContext";
import { PwaInstallProvider } from "@/components/guidebook/pwa/PwaInstallProvider";
import { SunsetLakehouseTemplate } from "@/templates/sunset-lakehouse/TemplateRoot";
import {
  buildSeedGuidebookSettings,
  sunsetLakehouseSeed,
} from "@/templates/sunset-lakehouse/seed";
import type {
  TemplateGuidebook,
  TemplatePlace,
  TemplateSection,
} from "@/templates/sunset-lakehouse/types";
import { PLACE_CATEGORIES } from "@/lib/constants";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { cn } from "@/lib/utils";
import { normalizeHeroData, type HeroData, type HeroOverlayPreset } from "@/lib/hero-data";
import { DEFAULT_NEARBY_SETTINGS, type NearbySettings } from "@/lib/nearby";
import {
  DEFAULT_GUIDEBOOK_STORE_SETTINGS,
} from "@/lib/store/settings";
import {
  buildQuickVariableRenderPayload,
  resolveQuickVariablesInBlockContent,
  resolveQuickVariablesInString,
  resolveQuickVariablesInValue,
  type QuickVariablesSettings,
} from "@/lib/quick-variables";
import {
  STORE_PAYMENT_METHOD_META,
  type StorePaymentMethod,
  type StorePaymentMethodType,
} from "@/lib/store/payment-methods";
import type { SnapshotStorefront } from "@/lib/store/types";
import type { BottomNavSlot } from "@/types/bottom-nav";

type StepId = "details" | "media" | "template" | "places" | "store" | "publish";
type SplashAlign = "left" | "center" | "right";
type SplashVertical = "top" | "center" | "bottom";
type StoreItemType = "product" | "service";
type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

type Property = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

type GuidebookResponse = {
  id: string;
  slug: string;
  title: string;
};

type PublishResponse = {
  publicUrl?: string;
};

type DiscoveredPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  tags: Record<string, unknown>;
};

type StoreItemResponse = {
  item: {
    id: string;
    name: string;
    priceCents: number;
    currency: string;
  };
};

type StoreSettingsResponse = {
  settings: {
    paymentInstructions: string | null;
    paymentMethods: StorePaymentMethod[];
  };
};

const DEMO_URL = "/demo/sunset-template";

const STEPS: Array<{
  id: StepId;
  title: string;
  description: string;
}> = [
  { id: "template", title: "Style", description: "Template" },
  { id: "details", title: "Details", description: "Basics" },
  { id: "media", title: "Media", description: "Splash" },
  { id: "places", title: "Local Spots", description: "Map" },
  { id: "store", title: "Store", description: "Items" },
  { id: "publish", title: "Publish", description: "Review" },
];

const GUIDE_TEMPLATES = [
  {
    id: "sunset-lakehouse",
    name: "Sunset Lakehouse",
    description: "Available now.",
    active: true,
    demoUrl: DEMO_URL,
    colors: ["#002927", "#d4a23a", "#faf6ef"],
    image: "/marketing/templates/oceanview-villa.jpg",
    accent: "#d4a23a",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Coming soon.",
    active: false,
    colors: ["#111827", "#94a3b8", "#ffffff"],
    image: "/marketing/templates/city-flat.jpg",
    accent: "#7dd3fc",
  },
  {
    id: "cozy-cabin",
    name: "Cozy Cabin",
    description: "Coming soon.",
    active: false,
    colors: ["#2d4a2a", "#b4612d", "#f5ebd9"],
    image: "/marketing/templates/alpine-cabin.jpg",
    accent: "#b4612d",
  },
];

const STYLE_COMBOS = DESIGN_PRESETS.slice(0, 20);

const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  restaurant: "Restaurants",
  cafe: "Cafes",
  bar: "Bars",
  grocery: "Groceries",
  park: "Parks",
  beach: "Beaches",
  attraction: "Attractions",
  museum: "Museums",
  shopping: "Shopping",
  pharmacy: "Pharmacies",
  hospital: "Hospitals",
  transport: "Transport",
  gas_station: "Gas",
  gym: "Gyms",
  other: "Other",
};

const DEFAULT_PLACE_CATEGORIES: PlaceCategory[] = [
  "restaurant",
  "cafe",
  "grocery",
  "attraction",
  "pharmacy",
  "transport",
];

function stepIndex(step: StepId) {
  return STEPS.findIndex((item) => item.id === step);
}

function nextStep(step: StepId): StepId {
  return STEPS[Math.min(stepIndex(step) + 1, STEPS.length - 1)].id;
}

function nonEmptyRecord(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0)
      .map(([key, value]) => [key, { value }])
  );
}

function compactLocation(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

function parseCoordinates(input: string) {
  const trimmed = input.trim();
  const regex =
    /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  if (!regex.test(trimmed)) return null;
  const [latRaw, lngRaw] = trimmed.split(",");
  const lat = Number(latRaw.trim());
  const lng = Number(lngRaw.trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function priceToCents(value: string) {
  const amount = Number(value.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount * 100));
}

function backgroundPositionFor(value: SplashVertical) {
  if (value === "top") return { x: 50, y: 18 };
  if (value === "bottom") return { x: 50, y: 82 };
  return { x: 50, y: 50 };
}

function paymentMeta(type: StorePaymentMethodType) {
  return (
    STORE_PAYMENT_METHOD_META.find((item) => item.type === type) ??
    STORE_PAYMENT_METHOD_META[STORE_PAYMENT_METHOD_META.length - 1]
  );
}

const SEED_HERO_DATA = normalizeHeroData(sunsetLakehouseSeed.heroData);
const SEED_SECTION_IDS = sunsetLakehouseSeed.sections.map(
  (_section, index) => `seed-section-${index}`
);
const SEED_PREVIEW_SETTINGS = buildSeedGuidebookSettings(
  sunsetLakehouseSeed,
  SEED_SECTION_IDS
);
const SEED_PREVIEW_SECTIONS: TemplateSection[] =
  sunsetLakehouseSeed.sections.map((section, sectionIndex) => ({
    id: SEED_SECTION_IDS[sectionIndex],
    title: section.title,
    icon: section.icon,
    orderIndex: sectionIndex,
    isVisible: section.isVisible ?? true,
    kind: section.kind ?? "guide",
    displayMode: section.displayMode ?? "popup",
    itemSettings: section.itemSettings ?? {},
    blocks: section.blocks.map((block, blockIndex) => ({
      id: `seed-block-${sectionIndex}-${blockIndex}`,
      type: block.type,
      content: block.content,
      isVisible: block.isVisible ?? true,
      orderIndex: blockIndex,
    })),
  }));
const SEED_BRANDING = sunsetLakehouseSeed.branding as Record<string, unknown>;
const SEED_BOTTOM_NAV = sunsetLakehouseSeed.bottomNav as BottomNavSlot[];
const SEED_NEARBY_SETTINGS =
  (SEED_PREVIEW_SETTINGS.nearby as NearbySettings | undefined) ??
  DEFAULT_NEARBY_SETTINGS;

const DEFAULT_SPLASH_VISIBILITY = {
  logo: SEED_HERO_DATA.home.show.logo,
  tagline: SEED_HERO_DATA.home.show.subtitle,
  host: SEED_HERO_DATA.home.show.host_name,
  contact:
    SEED_HERO_DATA.home.show.phone ||
    SEED_HERO_DATA.home.show.email ||
    SEED_HERO_DATA.home.show.address,
  times: SEED_HERO_DATA.home.show.times,
  button:
    SEED_HERO_DATA.home.splash_blocks.find((block) => block.type === "button")
      ?.visible ?? true,
};

type SplashVisibility = typeof DEFAULT_SPLASH_VISIBILITY;
type StepState = "complete" | "missing" | "active" | "upcoming";
type PreviewFeaturedView = "home" | "guide" | "nearby" | "store";
type FlowMode = "choice" | "quick";
type MiniHeroDataPatch = {
  property?: Partial<HeroData["property"]>;
  host?: Partial<HeroData["host"]>;
  home?: Partial<
    Omit<
      HeroData["home"],
      | "show"
      | "times"
      | "logo"
      | "solid_background_color"
      | "glass_shadow"
      | "overlay_container"
      | "background"
    >
  > & {
    show?: Partial<HeroData["home"]["show"]>;
    times?: Partial<HeroData["home"]["times"]>;
    logo?: Partial<HeroData["home"]["logo"]>;
    solid_background_color?: Partial<HeroData["home"]["solid_background_color"]>;
    glass_shadow?: Partial<HeroData["home"]["glass_shadow"]>;
    overlay_container?: Partial<HeroData["home"]["overlay_container"]>;
    background?: Partial<Omit<HeroData["home"]["background"], "position">> & {
      position?: Partial<HeroData["home"]["background"]["position"]>;
    };
  };
  host_page?: Partial<Omit<HeroData["host_page"], "show">> & {
    show?: Partial<HeroData["host_page"]["show"]>;
  };
};

const MINI_PREVIEW_CANVAS = { width: 390, height: 844 };
const MINI_PREVIEW_STAGE_SPACING = { horizontal: 8, top: 4, bottom: 4 };

function hasPatchContent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some((item) => {
    if (item === undefined) return false;
    if (item && typeof item === "object" && !Array.isArray(item)) {
      return hasPatchContent(item);
    }
    return true;
  });
}

function mergeHeroDataPatch(base: HeroData, patch: MiniHeroDataPatch): HeroData {
  return normalizeHeroData({
    property: { ...base.property, ...(patch.property ?? {}) },
    host: { ...base.host, ...(patch.host ?? {}) },
    home: {
      ...base.home,
      ...(patch.home ?? {}),
      show: {
        ...base.home.show,
        ...(patch.home?.show ?? {}),
      },
      times: {
        ...base.home.times,
        ...(patch.home?.times ?? {}),
      },
      logo: {
        ...base.home.logo,
        ...(patch.home?.logo ?? {}),
      },
      solid_background_color: {
        ...base.home.solid_background_color,
        ...(patch.home?.solid_background_color ?? {}),
      },
      glass_shadow: {
        ...base.home.glass_shadow,
        ...(patch.home?.glass_shadow ?? {}),
      },
      overlay_container: {
        ...base.home.overlay_container,
        ...(patch.home?.overlay_container ?? {}),
      },
      background: {
        ...base.home.background,
        ...(patch.home?.background ?? {}),
        position: {
          ...base.home.background.position,
          ...(patch.home?.background?.position ?? {}),
        },
      },
    },
    host_page: {
      ...base.host_page,
      ...(patch.host_page ?? {}),
      show: {
        ...base.host_page.show,
        ...(patch.host_page?.show ?? {}),
      },
    },
  });
}

function quickVariablesSettings(
  values: Record<string, { value: string }>
): QuickVariablesSettings {
  return {
    schema_version: 1,
    values,
    custom: [],
    updated_at: null,
    updated_by: null,
  };
}

function resolvePreviewSections(
  sections: TemplateSection[],
  payload: ReturnType<typeof buildQuickVariableRenderPayload>
): TemplateSection[] {
  return sections.map((section) => ({
    ...section,
    title: resolveQuickVariablesInString(section.title, payload),
    itemSettings: resolveQuickVariablesInValue(section.itemSettings, payload),
    blocks: section.blocks.map((block) => ({
      ...block,
      content: resolveQuickVariablesInBlockContent(
        block.type,
        block.content,
        payload
      ),
    })),
  }));
}

function seedSplashBlocksWithVisibility(visibility: SplashVisibility) {
  return SEED_HERO_DATA.home.splash_blocks.map((block) => {
    const visible =
      block.type === "logo"
        ? visibility.logo
        : block.type === "tagline"
          ? visibility.tagline
          : block.type === "host"
            ? visibility.host
            : block.type === "contact"
              ? visibility.contact
              : block.type === "times"
                ? visibility.times
                : block.type === "button"
                  ? visibility.button
                  : block.visible;

    return {
      ...block,
      visible,
      style: { ...block.style },
    };
  });
}

function buildMiniPreviewPlaces(places: DiscoveredPlace[]): TemplatePlace[] {
  return places.map((place) => ({
    id: place.id,
    name: place.name,
    category: place.category,
    description: place.description,
    lat: place.lat,
    lng: place.lng,
    address: place.address,
    phone: place.phone,
    website: place.website,
    email: place.email,
    imageUrl: place.imageUrl,
    openingHours: place.openingHours,
    tags: place.tags ?? null,
  }));
}

function averagePlaceCenter(places: DiscoveredPlace[]) {
  const mappable = places.filter(
    (place) =>
      Number.isFinite(place.lat) &&
      Number.isFinite(place.lng) &&
      !(place.lat === 0 && place.lng === 0)
  );
  if (mappable.length === 0) return null;
  return {
    lat: mappable.reduce((sum, place) => sum + place.lat, 0) / mappable.length,
    lng: mappable.reduce((sum, place) => sum + place.lng, 0) / mappable.length,
  };
}

function buildMiniPreviewNearbySettings(input: {
  places: DiscoveredPlace[];
  location: string;
  radius: string;
  categories: PlaceCategory[];
}): NearbySettings {
  const center = averagePlaceCenter(input.places);
  return {
    ...SEED_NEARBY_SETTINGS,
    show_map: true,
    center_lat: center?.lat ?? SEED_NEARBY_SETTINGS.center_lat,
    center_lng: center?.lng ?? SEED_NEARBY_SETTINGS.center_lng,
    zoom: SEED_NEARBY_SETTINGS.zoom,
    radius_miles: Number(input.radius) || SEED_NEARBY_SETTINGS.radius_miles,
    categories: input.categories,
    search_categories: input.categories,
    location_name: input.location || SEED_NEARBY_SETTINGS.location_name,
    intro: {
      ...SEED_NEARBY_SETTINGS.intro,
      subtitle: input.location
        ? "Hand-picked spots around {{property_location}}"
        : SEED_NEARBY_SETTINGS.intro.subtitle,
    },
  };
}

function buildMiniPreviewStorefront(input: {
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  itemType: StoreItemType;
  force?: boolean;
}): SnapshotStorefront | null {
  const name = input.name.trim();
  if (!name && !input.force) return null;
  return {
    id: "mini-storefront",
    enabled: true,
    intro: DEFAULT_GUIDEBOOK_STORE_SETTINGS.intro,
    listingStyle: DEFAULT_GUIDEBOOK_STORE_SETTINGS.listingStyle,
    items: name
      ? [
          {
            id: "mini-store-item",
            assignmentId: "mini-store-assignment",
            itemType: input.itemType,
            name,
            description: input.description.trim() || null,
            imageUrl: null,
            priceCents: input.priceCents,
            currency: input.currency || "USD",
            unitLabel: null,
            category: null,
            maxQuantity: null,
            orderIndex: 0,
          },
        ]
      : [],
  };
}

export function GuidebookMiniEditorQuickFlow({
  properties,
  sourceOverride,
}: {
  properties: Property[];
  sourceOverride?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = sourceOverride ?? searchParams.get("source");
  const initialPropertyId = searchParams.get("property") ?? "none";

  const [flowMode, setFlowMode] = useState<FlowMode>("quick");
  const [step, setStep] = useState<StepId>("template");
  const [guidebookId, setGuidebookId] = useState<string | null>(null);
  const [guidebookSlug, setGuidebookSlug] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [propertyChoice, setPropertyChoice] = useState(initialPropertyId);
  const [propertyName, setPropertyName] = useState("");
  const [tagline, setTagline] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateRegion, setStateRegion] = useState("");
  const [country, setCountry] = useState("");
  const [hostName, setHostName] = useState("");
  const [hostEmail, setHostEmail] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [hostBio, setHostBio] = useState("");
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [checkinTime, setCheckinTime] = useState("4:00 PM");
  const [checkoutTime, setCheckoutTime] = useState("11:00 AM");
  const [parkingSpot, setParkingSpot] = useState("");
  const [parkingNote, setParkingNote] = useState("");
  const [doorCode, setDoorCode] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [lockboxCode, setLockboxCode] = useState("");
  const [onCallPhone, setOnCallPhone] = useState("");

  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [hostPhotoUrl, setHostPhotoUrl] = useState<string | null>(null);
  const [overlayPreset, setOverlayPreset] = useState<HeroOverlayPreset>("classic");
  const [splashAlign, setSplashAlign] = useState<SplashAlign>("center");
  const [splashVertical, setSplashVertical] = useState<SplashVertical>("center");
  const [splashVisibility, setSplashVisibility] = useState<SplashVisibility>(
    DEFAULT_SPLASH_VISIBILITY
  );

  const [templateId, setTemplateId] = useState("sunset-lakehouse");
  const [templateTouched, setTemplateTouched] = useState(false);
  const [styleTouched, setStyleTouched] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("sunset-lakehouse");
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverRadius, setDiscoverRadius] = useState("3");
  const [discovering, setDiscovering] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [placeCategories, setPlaceCategories] = useState<PlaceCategory[]>(
    DEFAULT_PLACE_CATEGORIES
  );
  const [discoveredPlaces, setDiscoveredPlaces] = useState<DiscoveredPlace[]>([]);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set());
  const [placesSaved, setPlacesSaved] = useState(false);

  const [storeItemType, setStoreItemType] = useState<StoreItemType>("service");
  const [storeItemName, setStoreItemName] = useState("");
  const [storeItemDescription, setStoreItemDescription] = useState("");
  const [storeItemPrice, setStoreItemPrice] = useState("");
  const [storeCurrency, setStoreCurrency] = useState("USD");
  const [paymentType, setPaymentType] = useState<StorePaymentMethodType>("venmo");
  const [paymentLabel, setPaymentLabel] = useState("Venmo");
  const [paymentValue, setPaymentValue] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [savedStoreItemId, setSavedStoreItemId] = useState<string | null>(null);
  const [savedPaymentMethodId, setSavedPaymentMethodId] = useState<string | null>(null);

  const selectedProperty =
    propertyChoice !== "none" && propertyChoice !== "new"
      ? properties.find((property) => property.id === propertyChoice) ?? null
      : null;
  const selectedPreset =
    STYLE_COMBOS.find((preset) => preset.id === selectedPresetId) ??
    STYLE_COMBOS[0];
  const propertyDisplayName =
    selectedProperty?.name ?? propertyName.trim() ?? "";
  const resolvedTitle =
    title.trim() || propertyDisplayName || "Sunset Lake House Guide";
  const resolvedLocation =
    selectedProperty
      ? compactLocation([
          selectedProperty.address,
          selectedProperty.city,
          selectedProperty.state,
          selectedProperty.country,
        ])
      : compactLocation([address, city, stateRegion, country]);
  const selectedPlaces = discoveredPlaces.filter((place) =>
    selectedPlaceIds.has(place.id)
  );
  const currentStorePriceCents = priceToCents(storeItemPrice);
  const editorHref = guidebookId
    ? `/dashboard/guidebooks/${guidebookId}/editor`
    : null;
  const dashboardHref = guidebookId
    ? `/dashboard/guidebooks/${guidebookId}`
    : null;
  const activeIndex = stepIndex(step);

  const previewFamilies = useMemo(() => {
    const families = new Set<string>();
    for (const preset of STYLE_COMBOS) {
      families.add(preset.branding.heading_font);
      families.add(preset.branding.body_font);
    }
    return [...families];
  }, []);

  const activePreviewView: PreviewFeaturedView =
    step === "template"
      ? "guide"
      : step === "places"
        ? "nearby"
        : step === "store"
          ? "store"
          : "home";
  const splashVisibilityChanged = Object.entries(DEFAULT_SPLASH_VISIBILITY).some(
    ([key, value]) => splashVisibility[key as keyof SplashVisibility] !== value
  );
  const stepCompletion: Record<StepId, boolean> = {
    template: Boolean(
      templateId === "sunset-lakehouse" && (templateTouched || styleTouched)
    ),
    details: Boolean(
      title.trim() ||
        selectedProperty ||
        propertyName.trim() ||
        address.trim() ||
        city.trim() ||
        stateRegion.trim() ||
        country.trim() ||
        tagline.trim() ||
        hostName.trim() ||
        hostEmail.trim() ||
        hostPhone.trim() ||
        hostBio.trim() ||
        wifiName.trim() ||
        wifiPassword.trim() ||
        parkingSpot.trim() ||
        parkingNote.trim() ||
        doorCode.trim() ||
        gateCode.trim() ||
        lockboxCode.trim() ||
        onCallPhone.trim()
    ),
    media: Boolean(
      coverImageUrl ||
        logoUrl ||
        hostPhotoUrl ||
        overlayPreset !== "classic" ||
        splashAlign !== "center" ||
        splashVertical !== "center" ||
        splashVisibilityChanged
    ),
    places: selectedPlaces.length > 0,
    store: Boolean(storeItemName.trim() || paymentValue.trim()),
    publish: Boolean(publicUrl),
  };
  const stepStates = STEPS.reduce<Record<StepId, StepState>>((acc, item, index) => {
    acc[item.id] = stepCompletion[item.id]
      ? "complete"
      : index < activeIndex
        ? "missing"
        : index === activeIndex
          ? "active"
          : "upcoming";
    return acc;
  }, {} as Record<StepId, StepState>);
  const previewHeroPatch = heroDataPatch();
  const previewHeroDataBase = mergeHeroDataPatch(SEED_HERO_DATA, previewHeroPatch);
  const previewQuickVariableValues = nonEmptyRecord({
    property_name: propertyDisplayName,
    property_location: resolvedLocation,
    host_name: hostName,
    host_email: hostEmail,
    host_phone: hostPhone,
    checkin_time: checkinTime,
    checkout_time: checkoutTime,
    wifi_network_name: wifiName,
    wifi_password: wifiPassword,
    parking_spot: parkingSpot,
    parking_note: parkingNote,
    door_code: doorCode,
    gate_code: gateCode,
    lockbox_code: lockboxCode,
    on_call_phone: onCallPhone,
  });
  const quickVariablePayload = buildQuickVariableRenderPayload({
    quickVariables: quickVariablesSettings(previewQuickVariableValues),
    mode: "draft",
    context: {
      guidebookTitle: title.trim() || null,
      propertyName: propertyDisplayName || null,
      propertyLocation: resolvedLocation || null,
      hostName: hostName.trim() || null,
      hostPhone: hostPhone.trim() || null,
      hostEmail: hostEmail.trim() || null,
      heroData: previewHeroDataBase,
    },
  });
  const previewHeroData = resolveQuickVariablesInValue(
    previewHeroDataBase,
    quickVariablePayload
  ) as HeroData;
  const previewPlaces = buildMiniPreviewPlaces(selectedPlaces);
  const previewNearbySettings = buildMiniPreviewNearbySettings({
    places: selectedPlaces,
    location: resolvedLocation,
    radius: discoverRadius,
    categories: placeCategories,
  });
  const previewStorefront = buildMiniPreviewStorefront({
    name: storeItemName,
    description: storeItemDescription,
    priceCents: currentStorePriceCents,
    currency: storeCurrency,
    itemType: storeItemType,
    force: activePreviewView === "store" || Boolean(paymentValue.trim()),
  });
  const previewBrandingBase = styleTouched ? selectedPreset.branding : SEED_BRANDING;
  const previewBranding = resolveQuickVariablesInValue(
    logoUrl ? { ...previewBrandingBase, logo_url: logoUrl } : previewBrandingBase,
    quickVariablePayload
  ) as Record<string, unknown>;
  const previewGuidebook: TemplateGuidebook = {
    id: guidebookId ?? "mini-guidebook-draft",
    title: resolveQuickVariablesInString(
      title.trim() || propertyDisplayName || "{{property_name}}",
      quickVariablePayload
    ),
    slug: guidebookSlug ?? "preview-guidebook",
    templateId,
    branding: previewBranding,
    heroData: previewHeroData,
  };
  const previewSections = resolvePreviewSections(
    SEED_PREVIEW_SECTIONS,
    quickVariablePayload
  );
  const previewBottomNav = resolveQuickVariablesInValue(
    SEED_BOTTOM_NAV,
    quickVariablePayload
  ) as BottomNavSlot[];
  const previewSettingsInput: Record<string, unknown> = {
    ...SEED_PREVIEW_SETTINGS,
    ...(activePreviewView === "nearby" || selectedPlaces.length > 0
      ? { nearby: previewNearbySettings }
      : {}),
    ...(previewStorefront
      ? {
          store: {
            intro: DEFAULT_GUIDEBOOK_STORE_SETTINGS.intro,
            listingStyle: DEFAULT_GUIDEBOOK_STORE_SETTINGS.listingStyle,
          },
        }
      : {}),
    ai_chat_enabled: false,
  };
  const previewGuidebookSettings = resolveQuickVariablesInValue(
    previewSettingsInput,
    quickVariablePayload
  ) as Record<string, unknown>;

  function closeModal() {
    router.push("/dashboard/guidebooks");
  }

  async function createPropertyIfNeeded() {
    if (propertyChoice === "none") return null;
    if (propertyChoice !== "new") return propertyChoice;
    if (!propertyName.trim()) return null;

    const result = await apiFetch<Property>("/api/properties", {
      method: "POST",
      body: {
        name: propertyName.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: stateRegion.trim() || undefined,
        country: country.trim() || undefined,
      },
    });

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't save property" });
      return null;
    }

    setPropertyChoice(result.data.id);
    return result.data.id;
  }

  async function ensureDraft() {
    if (guidebookId) return guidebookId;

    const propertyId = await createPropertyIfNeeded();
    const result = await apiFetch<GuidebookResponse>("/api/guidebooks", {
      method: "POST",
      body: {
        title: resolvedTitle,
        propertyId: propertyId ?? undefined,
        templateId,
      },
    });

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't create guidebook" });
      return null;
    }

    setGuidebookId(result.data.id);
    setGuidebookSlug(result.data.slug);
    return result.data.id;
  }

  function heroDataPatch(overrides?: {
    cover?: string | null;
    logo?: string | null;
    hostPhoto?: string | null;
    preset?: HeroOverlayPreset;
    align?: SplashAlign;
    vertical?: SplashVertical;
  }) {
    const nextCover = overrides?.cover !== undefined ? overrides.cover : coverImageUrl;
    const nextLogo = overrides?.logo !== undefined ? overrides.logo : logoUrl;
    const nextHostPhoto =
      overrides?.hostPhoto !== undefined ? overrides.hostPhoto : hostPhotoUrl;
    const nextPreset = overrides?.preset ?? overlayPreset;
    const nextAlign = overrides?.align ?? splashAlign;
    const nextVertical = overrides?.vertical ?? splashVertical;
    const patch: MiniHeroDataPatch = {};
    const propertyPatch: NonNullable<MiniHeroDataPatch["property"]> = {};
    const hostPatch: NonNullable<MiniHeroDataPatch["host"]> = {};
    const homePatch: NonNullable<MiniHeroDataPatch["home"]> = {};

    if (propertyDisplayName.trim()) propertyPatch.name = propertyDisplayName.trim();
    if (tagline.trim()) propertyPatch.tagline = tagline.trim();
    if (address.trim()) propertyPatch.address = address.trim();
    if (city.trim()) propertyPatch.city = city.trim();
    if (stateRegion.trim()) propertyPatch.state = stateRegion.trim();
    if (country.trim()) propertyPatch.country = country.trim();
    if (nextCover) propertyPatch.cover_image_url = nextCover;
    if (nextLogo) propertyPatch.logo_url = nextLogo;
    if (hasPatchContent(propertyPatch)) patch.property = propertyPatch;

    if (hostName.trim()) hostPatch.name = hostName.trim();
    if (hostPhone.trim()) hostPatch.phone = hostPhone.trim();
    if (hostEmail.trim()) hostPatch.email = hostEmail.trim();
    if (hostBio.trim()) hostPatch.bio = hostBio.trim();
    if (nextHostPhoto) hostPatch.avatar_url = nextHostPhoto;
    if (hasPatchContent(hostPatch)) patch.host = hostPatch;

    if (nextPreset !== SEED_HERO_DATA.home.preset) {
      homePatch.preset = nextPreset;
    }

    if (splashVisibilityChanged) {
      const show = {
        logo: splashVisibility.logo,
        subtitle: splashVisibility.tagline,
        host_name: splashVisibility.host,
        phone: splashVisibility.contact,
        email: splashVisibility.contact,
        address: splashVisibility.contact,
        times: splashVisibility.times,
      };
      homePatch.show = show;
      homePatch.splash_blocks =
        seedSplashBlocksWithVisibility(splashVisibility);
    }

    if (nextAlign !== SEED_HERO_DATA.home.overlay_container.align) {
      homePatch.overlay_container = { align: nextAlign };
    }

    const backgroundPatch: NonNullable<MiniHeroDataPatch["home"]>["background"] = {};
    if (nextCover) {
      backgroundPatch.type = "image";
      backgroundPatch.position = backgroundPositionFor(nextVertical);
      backgroundPatch.use_brand = true;
    } else if (nextVertical !== "center") {
      backgroundPatch.position = backgroundPositionFor(nextVertical);
    }
    if (nextPreset !== SEED_HERO_DATA.home.preset) {
      backgroundPatch.overlay_opacity = nextPreset === "minimal" ? 0.42 : 0.58;
    }
    if (hasPatchContent(backgroundPatch)) {
      homePatch.background = backgroundPatch;
    }
    if (hasPatchContent(homePatch)) patch.home = homePatch;

    if (nextHostPhoto) {
      patch.host_page = {
        photo_source: "host_avatar",
        show: {
          avatar: true,
          bio: true,
        },
      };
    }

    return patch;
  }

  async function saveHeroAndBranding(
    id: string,
    overrides?: Parameters<typeof heroDataPatch>[0] & {
      designPreset?: DesignPreset;
    }
  ) {
    const presetForSave = overrides?.designPreset ?? selectedPreset;
    const heroPatch = heroDataPatch(overrides);
    const logoForSave = overrides?.logo !== undefined ? overrides.logo : logoUrl;
    const brandingPatch: Record<string, unknown> = {};
    if (styleTouched || overrides?.designPreset) {
      Object.assign(brandingPatch, presetForSave.branding);
    }
    if (logoForSave) {
      brandingPatch.logo_url = logoForSave;
    }

    const body: Record<string, unknown> = {
      title: resolvedTitle,
      templateId,
    };
    if (Object.keys(brandingPatch).length > 0) {
      body.branding = brandingPatch;
    }
    if (hasPatchContent(heroPatch)) {
      body.heroData = heroPatch;
    }

    const result = await apiFetch(`/api/guidebooks/${id}`, {
      method: "PATCH",
      body,
    });

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't save guidebook setup" });
      return false;
    }

    return true;
  }

  async function saveQuickVariables(id: string) {
    const values = nonEmptyRecord({
      property_name: propertyDisplayName,
      property_location: resolvedLocation,
      host_name: hostName,
      host_email: hostEmail,
      host_phone: hostPhone,
      checkin_time: checkinTime,
      checkout_time: checkoutTime,
      wifi_network_name: wifiName,
      wifi_password: wifiPassword,
      parking_spot: parkingSpot,
      parking_note: parkingNote,
      door_code: doorCode,
      gate_code: gateCode,
      lockbox_code: lockboxCode,
      on_call_phone: onCallPhone,
    });

    if (Object.keys(values).length === 0) return true;

    const result = await apiFetch(`/api/guidebooks/${id}/quick-variables`, {
      method: "PATCH",
      body: { values, custom: [] },
    });

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't save Quick Variables" });
      return false;
    }

    return true;
  }

  async function saveCurrentSetup() {
    setSaving(true);
    try {
      const id = await ensureDraft();
      if (!id) return null;
      const [heroOk, variablesOk] = await Promise.all([
        saveHeroAndBranding(id),
        saveQuickVariables(id),
      ]);
      return heroOk && variablesOk ? id : null;
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(kind: "cover" | "logo" | "hostPhoto", file: File | null) {
    if (!file) return;

    setUploading(kind);
    try {
      const uploaded = await uploadMediaFile(file, {
        folder: "guidebook-onboarding",
        name: file.name,
        tags: ["guidebook", kind],
      });
      if (kind === "cover") setCoverImageUrl(uploaded.url);
      if (kind === "logo") setLogoUrl(uploaded.url);
      if (kind === "hostPhoto") setHostPhotoUrl(uploaded.url);

      const id = await ensureDraft();
      if (id) {
        await saveHeroAndBranding(id, {
          cover: kind === "cover" ? uploaded.url : coverImageUrl,
          logo: kind === "logo" ? uploaded.url : logoUrl,
          hostPhoto: kind === "hostPhoto" ? uploaded.url : hostPhotoUrl,
        });
      }
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function applyStylePreset(preset: DesignPreset) {
    setStyleTouched(true);
    setSelectedPresetId(preset.id);
    if (!guidebookId) return;
    setSaving(true);
    try {
      await saveHeroAndBranding(guidebookId, { designPreset: preset });
    } finally {
      setSaving(false);
    }
  }

  function shuffleStyle() {
    const pool = STYLE_COMBOS.filter((preset) => preset.id !== selectedPresetId);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? STYLE_COMBOS[0];
    if (pick) void applyStylePreset(pick);
  }

  async function detectCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not available in this browser.");
      return;
    }

    setIsDetectingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });
      const label = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      setDiscoverQuery(label);
      toast.success("Current location selected");
    } catch {
      toast.error("Could not detect location.");
    } finally {
      setIsDetectingLocation(false);
    }
  }

  async function discoverPlaces() {
    const id = await saveCurrentSetup();
    if (!id) return;

    setDiscovering(true);
    try {
      const query = discoverQuery.trim() || resolvedLocation || propertyDisplayName;
      const coords = parseCoordinates(query);
      const body = {
        radiusMiles: Number(discoverRadius) || 3,
        limit: 40,
        categories: placeCategories,
        ...(coords
          ? { lat: coords.lat, lng: coords.lng }
          : { locationQuery: query }),
      };
      const result = await apiFetch<{
        places: DiscoveredPlace[];
      }>(`/api/guidebooks/${id}/places/discover`, {
        method: "POST",
        body,
      });

      if (!result.ok) {
        toastApiError(result.error, { title: "Couldn't discover nearby places" });
        return;
      }

      setDiscoveredPlaces(result.data.places);
      setSelectedPlaceIds(new Set(result.data.places.slice(0, 8).map((place) => place.id)));
      setPlacesSaved(false);
      toast.success("Nearby places found");
    } finally {
      setDiscovering(false);
    }
  }

  async function savePlaces() {
    if (selectedPlaces.length === 0) return true;
    const id = await saveCurrentSetup();
    if (!id) return false;

    const result = await apiFetch(`/api/guidebooks/${id}/places`, {
      method: "PUT",
      body: {
        places: selectedPlaces.map((place) => ({
          name: place.name,
          category: place.category,
          description: place.description,
          lat: place.lat,
          lng: place.lng,
          address: place.address,
          phone: place.phone,
          website: place.website,
          email: place.email,
          imageUrl: place.imageUrl,
          openingHours: place.openingHours,
          tags: place.tags ?? {},
        })),
      },
    });

    if (!result.ok) {
      toastApiError(result.error, { title: "Couldn't add places to map" });
      return false;
    }

    setPlacesSaved(true);
    toast.success("Local spots added");
    return true;
  }

  async function saveStore() {
    const hasItem = storeItemName.trim().length > 0;
    const hasPayment = paymentValue.trim().length > 0;
    if (!hasItem && !hasPayment) return true;

    const id = await saveCurrentSetup();
    if (!id) return false;

    let itemId = savedStoreItemId;
    if (hasItem && !itemId) {
      const result = await apiFetch<StoreItemResponse>("/api/dashboard/store/items", {
        method: "POST",
        body: {
          itemType: storeItemType,
          name: storeItemName,
          description: storeItemDescription,
          priceCents: currentStorePriceCents,
          currency: storeCurrency,
          active: true,
        },
      });

      if (!result.ok) {
        toastApiError(result.error, { title: "Couldn't create store item" });
        return false;
      }

      itemId = result.data.item.id;
      setSavedStoreItemId(itemId);
    }

    let methodId = savedPaymentMethodId;
    if (hasPayment && !methodId) {
      const settings = await apiFetch<StoreSettingsResponse>(
        "/api/dashboard/store/settings"
      );
      const existing = settings.ok ? settings.data.settings.paymentMethods : [];
      const idBase = `${paymentType}-${Date.now().toString(36)}`;
      methodId = idBase;
      const nextMethod: StorePaymentMethod = {
        id: methodId,
        type: paymentType,
        label: paymentLabel.trim() || paymentMeta(paymentType).label,
        value: paymentValue,
        instructions: paymentInstructions.trim() || null,
        active: true,
        orderIndex: existing.length,
      };
      const result = await apiFetch<StoreSettingsResponse>(
        "/api/dashboard/store/settings",
        {
          method: "PATCH",
          body: {
            paymentInstructions,
            paymentMethods: [...existing, nextMethod],
          },
        }
      );

      if (!result.ok) {
        toastApiError(result.error, { title: "Couldn't save payment method" });
        return false;
      }

      setSavedPaymentMethodId(methodId);
    }

    const storefrontResult = await apiFetch(`/api/guidebooks/${id}/storefront`, {
      method: "PATCH",
      body: {
        enabled: true,
        paymentMethodIds: methodId ? [methodId] : [],
        items: itemId
          ? [
              {
                storeItemId: itemId,
                visible: true,
                orderIndex: 0,
                maxQuantity: null,
              },
            ]
          : [],
      },
    });

    if (!storefrontResult.ok) {
      toastApiError(storefrontResult.error, {
        title: "Couldn't add item to guidebook store",
      });
      return false;
    }

    toast.success("Store quick setup saved");
    return true;
  }

  async function openFullEditor() {
    const id = await saveCurrentSetup();
    if (id) router.push(`/dashboard/guidebooks/${id}/editor`);
  }

  async function goNext() {
    if (step === "details" || step === "media" || step === "template") {
      const id = await saveCurrentSetup();
      if (id) setStep(nextStep(step));
      return;
    }
    if (step === "places") {
      const ok = await savePlaces();
      if (ok) setStep("store");
      return;
    }
    if (step === "store") {
      const ok = await saveStore();
      if (ok) setStep("publish");
      return;
    }
    await publishGuidebook();
  }

  async function publishGuidebook() {
    setPublishing(true);
    try {
      const id = await saveCurrentSetup();
      if (!id) return;
      if (selectedPlaces.length > 0 && !placesSaved) {
        const placesOk = await savePlaces();
        if (!placesOk) return;
      }
      const storeOk = await saveStore();
      if (!storeOk) return;

      const result = await apiFetch<PublishResponse>(`/api/guidebooks/${id}/publish`, {
        method: "POST",
      });

      if (!result.ok) {
        toastApiError(result.error, { title: "Couldn't publish guidebook" });
        return;
      }

      setPublicUrl(result.data.publicUrl ?? (guidebookSlug ? `/g/${guidebookSlug}` : null));
      toast.success("Guidebook published");
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  function skipStep() {
    if (step !== "publish") setStep(nextStep(step));
  }

  function togglePlace(placeId: string) {
    setSelectedPlaceIds((current) => {
      const next = new Set(current);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      setPlacesSaved(false);
      return next;
    });
  }

  function toggleCategory(category: PlaceCategory) {
    setPlaceCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  }

  function updatePaymentType(type: StorePaymentMethodType) {
    setPaymentType(type);
    setPaymentLabel(paymentMeta(type).label);
    setSavedPaymentMethodId(null);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && closeModal()}>
      <RuntimeFontLoader fontFamilies={previewFamilies} id="guidebook-mini-editor" />
      <DialogContent
        showCloseButton={false}
        className={cn(
          "min-w-0 gap-0 overflow-hidden p-0",
          flowMode === "choice"
            ? "max-h-[720px] sm:!max-w-[860px]"
            : "max-h-[980px] sm:!max-w-[1360px]"
        )}
        style={
          flowMode === "choice"
            ? {
                width: "min(calc(100vw - 2rem), 860px)",
                maxWidth: "860px",
                height: "min(620px, calc(100dvh - 2rem))",
              }
            : {
                width: "calc(100vw - 2rem)",
                maxWidth: "1360px",
                height: "calc(100dvh - 2rem)",
              }
        }
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Create your guidebook</DialogTitle>
          <DialogDescription>
            Guided setup for publishing a guest-ready guidebook.
          </DialogDescription>
        </DialogHeader>

        {flowMode === "choice" ? (
          <GuidebookStartChoice
            source={source}
            saving={saving}
            onQuickStart={() => setFlowMode("quick")}
            onFullEditor={() => void openFullEditor()}
            onClose={closeModal}
          />
        ) : (
        <div className="grid h-full min-h-0 min-w-0 bg-[#f7faf9] lg:grid-cols-[minmax(0,1fr)_minmax(390px,470px)]">
          <section className="flex min-h-0 min-w-0 flex-col border-r bg-white">
          <header className="shrink-0 border-b bg-white px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge variant="secondary" className="mb-1.5">
                  {source === "onboarding" ? "Plan selected" : "Guided setup"}
                </Badge>
                <h1 className="font-heading text-lg font-semibold">
                  Create a guest-ready guidebook
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={() => void openFullEditor()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  Open in Advanced Editor
                </Button>
                <Button variant="ghost" size="icon" onClick={closeModal} aria-label="Close setup">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <StepRail
              activeIndex={activeIndex}
              states={stepStates}
              onSelect={(id) => setStep(id)}
            />
          </header>

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white p-4">
              {step === "details" ? (
                <DetailsStep
                  propertyChoice={propertyChoice}
                  setPropertyChoice={setPropertyChoice}
                  properties={properties}
                  title={title}
                  setTitle={setTitle}
                  propertyName={propertyName}
                  setPropertyName={setPropertyName}
                  tagline={tagline}
                  setTagline={setTagline}
                  address={address}
                  setAddress={setAddress}
                  city={city}
                  setCity={setCity}
                  stateRegion={stateRegion}
                  setStateRegion={setStateRegion}
                  country={country}
                  setCountry={setCountry}
                  hostName={hostName}
                  setHostName={setHostName}
                  hostEmail={hostEmail}
                  setHostEmail={setHostEmail}
                  hostPhone={hostPhone}
                  setHostPhone={setHostPhone}
                  hostBio={hostBio}
                  setHostBio={setHostBio}
                  wifiName={wifiName}
                  setWifiName={setWifiName}
                  wifiPassword={wifiPassword}
                  setWifiPassword={setWifiPassword}
                  checkinTime={checkinTime}
                  setCheckinTime={setCheckinTime}
                  checkoutTime={checkoutTime}
                  setCheckoutTime={setCheckoutTime}
                  parkingSpot={parkingSpot}
                  setParkingSpot={setParkingSpot}
                  parkingNote={parkingNote}
                  setParkingNote={setParkingNote}
                  doorCode={doorCode}
                  setDoorCode={setDoorCode}
                  gateCode={gateCode}
                  setGateCode={setGateCode}
                  lockboxCode={lockboxCode}
                  setLockboxCode={setLockboxCode}
                  onCallPhone={onCallPhone}
                  setOnCallPhone={setOnCallPhone}
                />
              ) : null}

              {step === "media" ? (
                <MediaStep
                  coverImageUrl={coverImageUrl}
                  logoUrl={logoUrl}
                  hostPhotoUrl={hostPhotoUrl}
                  uploading={uploading}
                  onUpload={handleUpload}
                  overlayPreset={overlayPreset}
                  setOverlayPreset={setOverlayPreset}
                  splashAlign={splashAlign}
                  setSplashAlign={setSplashAlign}
                  splashVertical={splashVertical}
                  setSplashVertical={setSplashVertical}
                  visibility={splashVisibility}
                  setVisibility={setSplashVisibility}
                />
              ) : null}

              {step === "template" ? (
                <TemplateStep
                  templateId={templateId}
                  setTemplateId={(value) => {
                    setTemplateTouched(true);
                    setTemplateId(value);
                  }}
                  selectedPresetId={selectedPresetId}
                  onPreset={applyStylePreset}
                  onShuffle={shuffleStyle}
                  saving={saving}
                />
              ) : null}

              {step === "places" ? (
                <PlacesStep
                  query={discoverQuery}
                  setQuery={setDiscoverQuery}
                  fallbackQuery={resolvedLocation || propertyDisplayName}
                  radius={discoverRadius}
                  setRadius={setDiscoverRadius}
                  categories={placeCategories}
                  toggleCategory={toggleCategory}
                  discovering={discovering}
                  isDetectingLocation={isDetectingLocation}
                  detectCurrentLocation={detectCurrentLocation}
                  discoverPlaces={discoverPlaces}
                  places={discoveredPlaces}
                  selectedIds={selectedPlaceIds}
                  togglePlace={togglePlace}
                />
              ) : null}

              {step === "store" ? (
                <StoreStep
                  itemType={storeItemType}
                  setItemType={setStoreItemType}
                  name={storeItemName}
                  setName={(value) => {
                    setStoreItemName(value);
                    setSavedStoreItemId(null);
                  }}
                  description={storeItemDescription}
                  setDescription={setStoreItemDescription}
                  price={storeItemPrice}
                  setPrice={setStoreItemPrice}
                  currency={storeCurrency}
                  setCurrency={setStoreCurrency}
                  paymentType={paymentType}
                  setPaymentType={updatePaymentType}
                  paymentLabel={paymentLabel}
                  setPaymentLabel={setPaymentLabel}
                  paymentValue={paymentValue}
                  setPaymentValue={(value) => {
                    setPaymentValue(value);
                    setSavedPaymentMethodId(null);
                  }}
                  paymentInstructions={paymentInstructions}
                  setPaymentInstructions={setPaymentInstructions}
                />
              ) : null}

              {step === "publish" ? (
                <PublishStep
                  title={resolvedTitle}
                  location={resolvedLocation}
                  hostName={hostName}
                  wifiName={wifiName}
                  placesCount={selectedPlaces.length}
                  storeReady={Boolean(storeItemName || paymentValue)}
                  publicUrl={publicUrl}
                  editorHref={editorHref}
                />
              ) : null}
          </main>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-white px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Step {activeIndex + 1} of {STEPS.length}. Every step can be skipped and edited later.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {step !== "publish" ? (
                <Button variant="ghost" onClick={skipStep} disabled={saving || publishing}>
                  Skip this step
                </Button>
              ) : null}
              {step === "publish" && publicUrl ? (
                <>
                  {dashboardHref ? (
                    <Button variant="outline" render={<Link href={dashboardHref} />}>
                      <LayoutDashboard className="h-4 w-4" />
                      Go to dashboard
                    </Button>
                  ) : null}
                  <Button render={<Link href={publicUrl} target="_blank" rel="noopener" />}>
                    <ExternalLink className="h-4 w-4" />
                    View live
                  </Button>
                </>
              ) : (
                <Button onClick={() => void goNext()} disabled={saving || publishing || discovering}>
                  {saving || publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : step === "publish" ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {step === "publish" ? "Publish guidebook" : "Save and continue"}
                </Button>
              )}
            </div>
          </footer>
          </section>

          <MiniEditorGuidebookPreview
            activeView={activePreviewView}
            guidebook={previewGuidebook}
            sections={previewSections}
            places={previewPlaces}
            bottomNav={previewBottomNav}
            storefront={previewStorefront}
            nearbySettings={previewNearbySettings}
            guidebookSettings={previewGuidebookSettings}
          />
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GuidebookStartChoice({
  source,
  saving,
  onQuickStart,
  onFullEditor,
  onClose,
}: {
  source: string | null;
  saving: boolean;
  onQuickStart: () => void;
  onFullEditor: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <Badge variant="secondary" className="mb-2">
            {source === "onboarding" ? "Plan selected" : "Create guidebook"}
          </Badge>
          <h1 className="font-heading text-xl font-semibold">
            How do you want to start?
          </h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close setup">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <main className="grid min-h-0 flex-1 place-items-center p-5">
        <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={onQuickStart}
            className="group rounded-lg border bg-[#f7faf9] p-5 text-left transition hover:border-primary hover:bg-white hover:shadow-sm"
          >
            <span className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground">
              <Check className="h-5 w-5" />
            </span>
            <span className="mt-5 block font-heading text-xl font-semibold">
              I want to do it in 5 minutes
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">
              Fast setup with a live phone preview.
            </span>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
              Quick start
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>

          <button
            type="button"
            onClick={onFullEditor}
            disabled={saving}
            className="group rounded-lg border bg-white p-5 text-left transition hover:border-primary hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="grid size-11 place-items-center rounded-md bg-muted text-foreground">
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Paintbrush className="h-5 w-5" />
              )}
            </span>
            <span className="mt-5 block font-heading text-xl font-semibold">
              I love creativity
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">
              Open the Advanced Editor and customize every detail.
            </span>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
              Advanced Editor
              <ExternalLink className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}

function StepRail({
  activeIndex,
  states,
  onSelect,
}: {
  activeIndex: number;
  states: Record<StepId, StepState>;
  onSelect: (id: StepId) => void;
}) {
  return (
    <div className="mt-3 pb-1">
      <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-[0.2857rem] border border-[rgba(34,36,38,.15)] bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] lg:flex-row">
        {STEPS.map((step, index) => {
          const state = states[step.id];
          const completed = state === "complete";
          const missing = state === "missing";
          const active = index === activeIndex;
          const visualState = active
            ? "active"
            : completed
              ? "completed"
              : missing
                ? "missing"
                : "future";
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelect(step.id)}
              aria-current={active ? "step" : undefined}
              style={{ zIndex: STEPS.length - index }}
              className={cn(
                "group relative flex min-h-[68px] min-w-0 flex-1 basis-0 cursor-pointer items-center border-b border-[rgba(34,36,38,.15)] px-3 py-2.5 text-left transition-[background-color,box-shadow,opacity] duration-300 ease-in-out last:border-b-0 lg:min-h-[62px] lg:border-b-0 lg:border-r lg:px-2.5 lg:py-2 lg:last:border-r-0 xl:min-h-[68px] xl:px-3.5",
                index < STEPS.length - 1 &&
                  "after:absolute after:bottom-0 after:left-1/2 after:z-10 after:h-4 after:w-4 after:-translate-x-1/2 after:translate-y-1/2 after:rotate-45 after:border-b after:border-r after:border-[rgba(34,36,38,.15)] after:transition-colors after:duration-300 after:content-[''] lg:after:top-1/2 lg:after:right-0 lg:after:bottom-auto lg:after:left-auto lg:after:-translate-y-1/2 lg:after:translate-x-1/2 lg:after:rotate-[-45deg]",
                visualState === "completed" && "bg-[#042129] text-white after:bg-[#042129]",
                visualState === "active" &&
                  "bg-[#eafcf0] text-[#042129] shadow-[inset_0_0_0_1px_rgba(111,239,139,0.35)] after:bg-[#eafcf0]",
                visualState === "missing" && "bg-amber-50 text-amber-950 after:bg-amber-50",
                visualState === "future" && "bg-white text-[#042129] opacity-60 after:bg-white hover:opacity-80"
              )}
            >
              <span
                className={cn(
                  "relative z-20 mr-2 flex w-6 shrink-0 items-center justify-center text-[2rem] font-light leading-none text-[#042129]/25 transition-all duration-300 ease-out xl:mr-3 xl:w-7 xl:text-[2.25rem]",
                  visualState === "completed" &&
                    "scale-100 text-[#6fef8b]",
                  visualState === "active" && "scale-105 font-medium text-[#042129]",
                  visualState === "missing" && "text-[2rem] font-medium text-amber-600",
                  visualState === "future" && "text-[#042129]/25"
                )}
              >
                {visualState === "completed" ? (
                  <Check className="h-6 w-6 stroke-[3] xl:h-7 xl:w-7" />
                ) : visualState === "missing" ? (
                  "?"
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "relative z-20 min-w-0 flex-1 transition-transform duration-300 ease-out",
                  visualState === "active" && "translate-x-1"
                )}
              >
                <span className="block truncate text-[0.88rem] font-bold leading-tight xl:text-[0.95rem]">
                  {step.title}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[0.72rem] font-normal leading-tight transition-colors duration-300 xl:text-[0.8rem]",
                    visualState === "completed"
                      ? "text-white/70"
                      : visualState === "missing"
                        ? "text-amber-700"
                        : "text-black/50"
                  )}
                >
                  {missing ? "Missing" : step.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-heading text-xl font-semibold">{title}</h2>
      {body ? (
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DetailsStep(props: {
  propertyChoice: string;
  setPropertyChoice: (value: string) => void;
  properties: Property[];
  title: string;
  setTitle: (value: string) => void;
  propertyName: string;
  setPropertyName: (value: string) => void;
  tagline: string;
  setTagline: (value: string) => void;
  address: string;
  setAddress: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  stateRegion: string;
  setStateRegion: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  hostName: string;
  setHostName: (value: string) => void;
  hostEmail: string;
  setHostEmail: (value: string) => void;
  hostPhone: string;
  setHostPhone: (value: string) => void;
  hostBio: string;
  setHostBio: (value: string) => void;
  wifiName: string;
  setWifiName: (value: string) => void;
  wifiPassword: string;
  setWifiPassword: (value: string) => void;
  checkinTime: string;
  setCheckinTime: (value: string) => void;
  checkoutTime: string;
  setCheckoutTime: (value: string) => void;
  parkingSpot: string;
  setParkingSpot: (value: string) => void;
  parkingNote: string;
  setParkingNote: (value: string) => void;
  doorCode: string;
  setDoorCode: (value: string) => void;
  gateCode: string;
  setGateCode: (value: string) => void;
  lockboxCode: string;
  setLockboxCode: (value: string) => void;
  onCallPhone: string;
  setOnCallPhone: (value: string) => void;
}) {
  return (
    <div>
      <StepIntro
        eyebrow="Step 2 of 6"
        title="Basics and essentials"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Guidebook title">
          <Input
            value={props.title}
            onChange={(event) => props.setTitle(event.target.value)}
            placeholder="Oceanview Villa Welcome Guide"
          />
        </Field>
        <Field label="Property">
          <Select
            value={props.propertyChoice}
            onValueChange={(value) => props.setPropertyChoice(value ?? "none")}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No saved property yet</SelectItem>
              <SelectItem value="new">Add a new property</SelectItem>
              {props.properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {props.propertyChoice === "new" || props.propertyChoice === "none" ? (
          <>
            <Field label="Property name">
              <Input
                value={props.propertyName}
                onChange={(event) => props.setPropertyName(event.target.value)}
                placeholder="Oceanview Villa"
              />
            </Field>
            <Field label="Property tagline">
              <Input
                value={props.tagline}
                onChange={(event) => props.setTagline(event.target.value)}
                placeholder="Steps from the beach with sunset views"
              />
            </Field>
            <Field label="Street address">
              <Input
                value={props.address}
                onChange={(event) => props.setAddress(event.target.value)}
                placeholder="12 Beach Road"
              />
            </Field>
            <Field label="City">
              <Input
                value={props.city}
                onChange={(event) => props.setCity(event.target.value)}
                placeholder="Malibu"
              />
            </Field>
            <Field label="State or region">
              <Input
                value={props.stateRegion}
                onChange={(event) => props.setStateRegion(event.target.value)}
                placeholder="California"
              />
            </Field>
            <Field label="Country">
              <Input
                value={props.country}
                onChange={(event) => props.setCountry(event.target.value)}
                placeholder="United States"
              />
            </Field>
          </>
        ) : (
          <Field label="Property tagline">
            <Input
              value={props.tagline}
              onChange={(event) => props.setTagline(event.target.value)}
              placeholder="A short welcome line for the splash"
            />
          </Field>
        )}
      </div>

      <SectionDivider icon={UserRound} label="Host details" />
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Host name">
          <Input value={props.hostName} onChange={(e) => props.setHostName(e.target.value)} placeholder="Jane Cooper" />
        </Field>
        <Field label="Host email">
          <Input value={props.hostEmail} onChange={(e) => props.setHostEmail(e.target.value)} placeholder="host@example.com" />
        </Field>
        <Field label="Host phone">
          <Input value={props.hostPhone} onChange={(e) => props.setHostPhone(e.target.value)} placeholder="+1 555 0100" />
        </Field>
        <div className="md:col-span-3">
          <Field label="Short host note">
            <Textarea value={props.hostBio} onChange={(e) => props.setHostBio(e.target.value)} placeholder="Welcome! We are nearby if you need anything during your stay." />
          </Field>
        </div>
      </div>

      <SectionDivider icon={Wifi} label="Guest essentials" />
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Wi-Fi network">
          <Input value={props.wifiName} onChange={(e) => props.setWifiName(e.target.value)} placeholder="Guest WiFi" />
        </Field>
        <Field label="Wi-Fi password">
          <Input value={props.wifiPassword} onChange={(e) => props.setWifiPassword(e.target.value)} placeholder="guest-access" />
        </Field>
        <Field label="On-call phone">
          <Input value={props.onCallPhone} onChange={(e) => props.setOnCallPhone(e.target.value)} placeholder="+1 555 0101" />
        </Field>
        <Field label="Check-in time">
          <Input value={props.checkinTime} onChange={(e) => props.setCheckinTime(e.target.value)} placeholder="4:00 PM" />
        </Field>
        <Field label="Check-out time">
          <Input value={props.checkoutTime} onChange={(e) => props.setCheckoutTime(e.target.value)} placeholder="11:00 AM" />
        </Field>
        <Field label="Parking spot">
          <Input value={props.parkingSpot} onChange={(e) => props.setParkingSpot(e.target.value)} placeholder="Spot 4 behind the building" />
        </Field>
        <Field label="Door code">
          <Input value={props.doorCode} onChange={(e) => props.setDoorCode(e.target.value)} placeholder="1234" />
        </Field>
        <Field label="Gate/building code">
          <Input value={props.gateCode} onChange={(e) => props.setGateCode(e.target.value)} placeholder="#2468" />
        </Field>
        <Field label="Lockbox code">
          <Input value={props.lockboxCode} onChange={(e) => props.setLockboxCode(e.target.value)} placeholder="A-4321" />
        </Field>
        <div className="md:col-span-3">
          <Field label="Parking note">
            <Textarea value={props.parkingNote} onChange={(e) => props.setParkingNote(e.target.value)} placeholder="Please do not park in the neighboring driveway. Street parking is free overnight." />
          </Field>
        </div>
      </div>
    </div>
  );
}

function MediaStep(props: {
  coverImageUrl: string | null;
  logoUrl: string | null;
  hostPhotoUrl: string | null;
  uploading: string | null;
  onUpload: (kind: "cover" | "logo" | "hostPhoto", file: File | null) => void;
  overlayPreset: HeroOverlayPreset;
  setOverlayPreset: (value: HeroOverlayPreset) => void;
  splashAlign: SplashAlign;
  setSplashAlign: (value: SplashAlign) => void;
  splashVertical: SplashVertical;
  setSplashVertical: (value: SplashVertical) => void;
  visibility: {
    logo: boolean;
    tagline: boolean;
    host: boolean;
    contact: boolean;
    times: boolean;
    button: boolean;
  };
  setVisibility: React.Dispatch<
    React.SetStateAction<{
      logo: boolean;
      tagline: boolean;
      host: boolean;
      contact: boolean;
      times: boolean;
      button: boolean;
    }>
  >;
}) {
  return (
    <div>
      <StepIntro
        eyebrow="Step 3 of 6"
        title="Splash media"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <UploadCard
          title="Background image"
          icon={ImageIcon}
          imageUrl={props.coverImageUrl}
          busy={props.uploading === "cover"}
          onFile={(file) => props.onUpload("cover", file)}
        />
        <UploadCard
          title="Property logo"
          icon={Building2}
          imageUrl={props.logoUrl}
          busy={props.uploading === "logo"}
          onFile={(file) => props.onUpload("logo", file)}
        />
        <UploadCard
          title="Host photo"
          icon={Camera}
          imageUrl={props.hostPhotoUrl}
          busy={props.uploading === "hostPhoto"}
          onFile={(file) => props.onUpload("hostPhoto", file)}
        />
      </div>

      <SectionDivider icon={Paintbrush} label="Splash treatment" />
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Overlay style">
          <Select value={props.overlayPreset} onValueChange={(value) => props.setOverlayPreset(value as HeroOverlayPreset)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">Classic hero</SelectItem>
              <SelectItem value="minimal">Minimal glass</SelectItem>
              <SelectItem value="card">Card overlay</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Horizontal position">
          <Select value={props.splashAlign} onValueChange={(value) => props.setSplashAlign(value as SplashAlign)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Background focus">
          <Select value={props.splashVertical} onValueChange={(value) => props.setSplashVertical(value as SplashVertical)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {Object.entries({
          logo: "Logo",
          tagline: "Tagline",
          host: "Host name",
          contact: "Contact/address",
          times: "Check-in/out",
          button: "Enter button",
        }).map(([key, label]) => (
          <ToggleRow
            key={key}
            label={label}
            checked={props.visibility[key as keyof typeof props.visibility]}
            onChange={() =>
              props.setVisibility((current) => ({
                ...current,
                [key]: !current[key as keyof typeof current],
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}

function TemplateStep(props: {
  templateId: string;
  setTemplateId: (value: string) => void;
  selectedPresetId: string;
  onPreset: (preset: DesignPreset) => void;
  onShuffle: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <StepIntro
        eyebrow="Step 1 of 6"
        title="Template and style"
      />
      <div className="grid gap-3 md:grid-cols-3">
        {GUIDE_TEMPLATES.map((template) => (
          <article
            key={template.id}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-white text-left transition-all",
              props.templateId === template.id && template.active
                ? "border-[#042129]/70 shadow-md ring-1 ring-[#042129]/15"
                : "border-border hover:border-primary/40",
              !template.active && "opacity-75"
            )}
          >
            <button
              type="button"
              disabled={!template.active}
              onClick={() => template.active && props.setTemplateId(template.id)}
              className="block w-full text-left disabled:cursor-not-allowed"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/30">
                <Image
                  src={template.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 210px"
                  className="scale-110 object-cover blur-md"
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-black/10" />
                <Image
                  src={template.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 210px"
                  className="object-contain"
                />
                {props.templateId === template.id && template.active ? (
                  <Badge className="absolute left-2 top-2 gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-[#042129] shadow-sm ring-1 ring-black/10 hover:bg-white/95">
                    <Check className="h-3.5 w-3.5 text-[#d4a23a]" />
                    Selected
                  </Badge>
                ) : null}
                {!template.active ? (
                  <Badge
                    variant="secondary"
                    className="absolute right-2 top-2 bg-white/90 text-[11px]"
                  >
                    Coming soon
                  </Badge>
                ) : null}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold">{template.name}</h3>
                  {props.templateId === template.id && template.active ? (
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#042129] text-white">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
              </div>
            </button>
            <Button
              variant="outline"
              size="sm"
              className="mx-3 mb-3 w-[calc(100%-1.5rem)]"
              disabled={!template.demoUrl}
              render={
                template.demoUrl ? (
                  <Link href={template.demoUrl} target="_blank" rel="noopener" />
                ) : (
                  <span />
                )
              }
            >
              <ExternalLink className="h-4 w-4" />
              {template.demoUrl ? "Open demo" : "Coming soon"}
            </Button>
          </article>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-semibold">Color and font combination</h3>
          <p className="text-sm text-muted-foreground">
            {STYLE_COMBOS.length} curated combinations.
          </p>
        </div>
        <Button variant="outline" onClick={props.onShuffle} disabled={props.saving}>
          {props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Feeling lucky
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STYLE_COMBOS.map((preset) => (
          <StyleComboCard
            key={preset.id}
            preset={preset}
            selected={props.selectedPresetId === preset.id}
            onClick={() => props.onPreset(preset)}
          />
        ))}
      </div>
    </div>
  );
}

function CoordinatesHelpPopover({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "h-8 w-8 shrink-0 rounded-md border border-primary/20 bg-primary/10 text-primary shadow-sm hover:border-primary/35 hover:bg-primary/15",
              className
            )}
            aria-label="How to use precise map coordinates"
          />
        }
      >
        <Info className="h-4 w-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-[min(380px,calc(100vw-24px))] gap-0 overflow-hidden rounded-xl border border-primary/20 bg-background p-0 text-left shadow-xl ring-1 ring-primary/10"
      >
        <div className="border-b border-border/70 bg-primary/5 px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-foreground">
                Precise property pin
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Use coordinates for the precise, exact location pin of your
                property.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-3.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Go to Google Maps and right-click your place. A dropdown appears
            with the coordinates at the top. Copy them and paste them here.
          </p>
          <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/25 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/help/google-maps-coordinates-help.svg"
              alt="Google Maps menu showing coordinates at the top after right-clicking a place."
              className="block aspect-[843/793] w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PlacesStep(props: {
  query: string;
  setQuery: (value: string) => void;
  fallbackQuery: string;
  radius: string;
  setRadius: (value: string) => void;
  categories: PlaceCategory[];
  toggleCategory: (category: PlaceCategory) => void;
  discovering: boolean;
  isDetectingLocation: boolean;
  detectCurrentLocation: () => void;
  discoverPlaces: () => void;
  places: DiscoveredPlace[];
  selectedIds: Set<string>;
  togglePlace: (id: string) => void;
}) {
  return (
    <div>
      <StepIntro
        eyebrow="Step 4 of 6"
        title="Local spots"
      />
      <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_140px_auto] lg:items-end">
          <Field label="Search location">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={props.query}
                onChange={(event) => props.setQuery(event.target.value)}
                placeholder="City, address, neighborhood, or lat,lng"
                className="h-10 pl-9 pr-11"
              />
              <CoordinatesHelpPopover className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 border-transparent bg-muted/60 shadow-none hover:bg-muted" />
            </div>
          </Field>
          <Field label="Location">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full whitespace-nowrap px-3 lg:w-auto"
              onClick={() => void props.detectCurrentLocation()}
              disabled={props.isDetectingLocation}
              aria-label="Use current location"
            >
              {props.isDetectingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              Current location
            </Button>
          </Field>
          <Field label="Radius">
            <Select value={props.radius} onValueChange={(value) => props.setRadius(value ?? "3")}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 mile</SelectItem>
                <SelectItem value="3">3 miles</SelectItem>
                <SelectItem value="5">5 miles</SelectItem>
                <SelectItem value="10">10 miles</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button
            type="button"
            className="h-10 w-full whitespace-nowrap lg:w-auto"
            onClick={() => void props.discoverPlaces()}
            disabled={props.discovering}
          >
            {props.discovering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Compass className="h-4 w-4" />
            )}
            {props.discovering ? "Discovering" : "Discover"}
          </Button>
        </div>
        {props.fallbackQuery ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Default: {props.fallbackQuery}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {DEFAULT_PLACE_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => props.toggleCategory(category)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              props.categories.includes(category)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {props.discovering ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Discovering nearby places...
        </div>
      ) : null}

      <div className="mt-6 max-h-[560px] overflow-y-auto rounded-lg border">
          {props.places.length === 0 ? (
            <div className="grid min-h-60 place-items-center p-8 text-center text-sm text-muted-foreground">
              Discover nearby places to choose recommendations for guests.
            </div>
          ) : (
            props.places.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => props.togglePlace(place.id)}
                className="flex w-full items-start gap-3 border-b p-3 text-left last:border-b-0 hover:bg-muted/30"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded border",
                    props.selectedIds.has(place.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {props.selectedIds.has(place.id) ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{place.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {CATEGORY_LABELS[place.category]} {place.address ? `- ${place.address}` : ""}
                  </span>
                  {place.description ? (
                    <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                      {place.description}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          )}
      </div>
    </div>
  );
}

function StoreStep(props: {
  itemType: StoreItemType;
  setItemType: (value: StoreItemType) => void;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  price: string;
  setPrice: (value: string) => void;
  currency: string;
  setCurrency: (value: string) => void;
  paymentType: StorePaymentMethodType;
  setPaymentType: (value: StorePaymentMethodType) => void;
  paymentLabel: string;
  setPaymentLabel: (value: string) => void;
  paymentValue: string;
  setPaymentValue: (value: string) => void;
  paymentInstructions: string;
  setPaymentInstructions: (value: string) => void;
}) {
  const meta = paymentMeta(props.paymentType);
  return (
    <div>
      <StepIntro
        eyebrow="Step 5 of 6"
        title="Store and payment"
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-lg border bg-muted/15 p-4">
          <div className="mb-4 flex items-center gap-2 font-medium">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Store item
          </div>
          <div className="space-y-4">
            <Field label="Item type">
              <Select value={props.itemType} onValueChange={(value) => props.setItemType(value as StoreItemType)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Item name">
              <Input value={props.name} onChange={(e) => props.setName(e.target.value)} placeholder="Early check-in" />
            </Field>
            <Field label="Description">
              <Textarea value={props.description} onChange={(e) => props.setDescription(e.target.value)} placeholder="Subject to availability. We will confirm by message." />
            </Field>
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <Field label="Price">
                <Input value={props.price} onChange={(e) => props.setPrice(e.target.value)} placeholder="35" />
              </Field>
              <Field label="Currency">
                <Input value={props.currency} onChange={(e) => props.setCurrency(e.target.value.toUpperCase())} maxLength={3} />
              </Field>
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-muted/15 p-4">
          <div className="mb-4 flex items-center gap-2 font-medium">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            Payment method
          </div>
          <div className="space-y-4">
            <Field label="Method">
              <Select value={props.paymentType} onValueChange={(value) => props.setPaymentType(value as StorePaymentMethodType)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORE_PAYMENT_METHOD_META.map((method) => (
                    <SelectItem key={method.type} value={method.type}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Display label">
              <Input value={props.paymentLabel} onChange={(e) => props.setPaymentLabel(e.target.value)} placeholder={meta.label} />
            </Field>
            <Field label="Payment detail">
              <Input value={props.paymentValue} onChange={(e) => props.setPaymentValue(e.target.value)} placeholder={meta.valuePlaceholder} />
            </Field>
            <Field label="Instructions">
              <Textarea value={props.paymentInstructions} onChange={(e) => props.setPaymentInstructions(e.target.value)} placeholder={meta.instructionsPlaceholder} />
            </Field>
          </div>
        </section>
      </div>
    </div>
  );
}

function PublishStep({
  title,
  location,
  hostName,
  wifiName,
  placesCount,
  storeReady,
  publicUrl,
  editorHref,
}: {
  title: string;
  location: string;
  hostName: string;
  wifiName: string;
  placesCount: number;
  storeReady: boolean;
  publicUrl: string | null;
  editorHref: string | null;
}) {
  const items = [
    { label: "Guidebook title", detail: title, done: Boolean(title) },
    { label: "Property location", detail: location || "Skipped", done: Boolean(location) },
    { label: "Host details", detail: hostName || "Skipped", done: Boolean(hostName) },
    { label: "Wi-Fi details", detail: wifiName || "Skipped", done: Boolean(wifiName) },
    { label: "Local spots", detail: `${placesCount} selected`, done: placesCount > 0 },
    { label: "Store", detail: storeReady ? "Configured" : "Skipped", done: storeReady },
  ];
  return (
    <div>
      <StepIntro
        eyebrow="Step 6 of 6"
        title={publicUrl ? "Published and ready to share" : "Review and publish"}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-lg border bg-background p-4">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-md border", item.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-muted bg-muted/30 text-muted-foreground")}>
              {item.done ? <Check className="h-4 w-4" /> : "?"}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{item.label}</span>
              <span className="block truncate text-sm text-muted-foreground">{item.detail}</span>
            </span>
          </div>
        ))}
      </div>
      {publicUrl ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="font-medium">Guest link</div>
          <div className="mt-1 break-all">{publicUrl}</div>
        </div>
      ) : null}
      {editorHref ? (
        <Button className="mt-5" variant="outline" render={<Link href={editorHref} />}>
          <ExternalLink className="h-4 w-4" />
          Open Advanced Editor
        </Button>
      ) : null}
    </div>
  );
}

function SectionDivider({ icon: Icon, label }: { icon: typeof UserRound; label: string }) {
  return (
    <div className="mb-4 mt-7 flex items-center gap-2 border-t pt-5 font-medium">
      <Icon className="h-4 w-4 text-primary" />
      {label}
    </div>
  );
}

function UploadCard({
  title,
  icon: Icon,
  imageUrl,
  busy,
  onFile,
}: {
  title: string;
  icon: typeof ImageIcon;
  imageUrl: string | null;
  busy: boolean;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-3 flex aspect-[1.35/1] items-center justify-center overflow-hidden rounded-md border bg-muted/30">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <Label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border bg-card text-sm font-medium hover:bg-muted/40">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        {title}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </Label>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
        checked ? "border-primary/40 bg-primary/5" : "border-border bg-background"
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={cn(
          "grid size-5 place-items-center rounded border",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}

function StyleComboCard({
  preset,
  selected,
  onClick,
}: {
  preset: DesignPreset;
  selected: boolean;
  onClick: () => void;
}) {
  const b = preset.branding;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "overflow-hidden rounded-lg border bg-background text-left transition-all hover:-translate-y-0.5 hover:shadow-sm",
        selected ? "border-primary ring-2 ring-primary/15" : "border-border"
      )}
    >
      <div className="relative h-24" style={{ backgroundColor: b.background_color }}>
        <div className="absolute inset-x-0 top-0 h-6" style={{ backgroundColor: b.primary_color }} />
        <div className="absolute bottom-3 left-3 right-3">
          <div
            className="text-lg font-semibold"
            style={{ color: b.primary_color, fontFamily: `"${b.heading_font}", serif` }}
          >
            Welcome
          </div>
          <div className="mt-1 flex gap-1">
            {[b.primary_color, b.secondary_color, b.accent_color].map((color) => (
              <span key={color} className="size-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{preset.name}</span>
          {selected ? <Check className="h-4 w-4 text-primary" /> : null}
        </div>
        <p className="truncate text-xs text-muted-foreground">{preset.tagline}</p>
      </div>
    </button>
  );
}

function MiniPhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden rounded-[36px] p-1.5",
        "bg-[#e0e0e0] ring-1 ring-[#d0d0d0]",
        "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.18),0_8px_16px_-6px_rgba(0,0,0,0.08)]"
      )}
    >
      <div className="pointer-events-none absolute left-1/2 top-1.5 z-20 flex h-[18px] w-[100px] -translate-x-1/2 items-center justify-center gap-1 rounded-b-[12px] bg-[#e0e0e0]">
        <span className="block h-[6px] w-[6px] rounded-full border border-[#bbb] bg-[#c8c8c8]" />
        <span className="block h-[3px] w-10 rounded-[2px] bg-[#c8c8c8]" />
      </div>
      <div className="flex-1 overflow-hidden rounded-[30px] bg-background">
        {children}
      </div>
    </div>
  );
}

function MiniEditorGuidebookPreview({
  activeView,
  guidebook,
  sections,
  places,
  bottomNav,
  storefront,
  nearbySettings,
  guidebookSettings,
}: {
  activeView: PreviewFeaturedView;
  guidebook: TemplateGuidebook;
  sections: TemplateSection[];
  places: TemplatePlace[];
  bottomNav: BottomNavSlot[];
  storefront: SnapshotStorefront | null;
  nearbySettings: NearbySettings;
  guidebookSettings: Record<string, unknown>;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const setFeaturedViewRef = useRef<
    ((view: "home" | "host" | "nearby" | "store" | null) => void) | null
  >(null);

  const handleRegisterSetFeaturedView = useCallback(
    (fn: (view: "home" | "host" | "nearby" | "store" | null) => void) => {
      setFeaturedViewRef.current = fn;
      fn(activeView === "guide" ? null : activeView);
    },
    [activeView]
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const measure = () => {
      setViewportSize({ width: node.clientWidth, height: node.clientHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setFeaturedViewRef.current?.(activeView === "guide" ? null : activeView);
  }, [activeView, storefront]);

  const scale = useMemo(() => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return 1;
    const availableWidth = Math.max(
      1,
      viewportSize.width - MINI_PREVIEW_STAGE_SPACING.horizontal * 2
    );
    const availableHeight = Math.max(
      1,
      viewportSize.height -
        MINI_PREVIEW_STAGE_SPACING.top -
        MINI_PREVIEW_STAGE_SPACING.bottom
    );
    const fit = Math.min(
      availableWidth / MINI_PREVIEW_CANVAS.width,
      availableHeight / MINI_PREVIEW_CANVAS.height
    );
    return Math.max(0.1, Math.min(1, fit));
  }, [viewportSize.height, viewportSize.width]);

  const previewLabel =
    activeView === "guide"
      ? "Guide"
      : activeView === "nearby"
      ? "Nearby"
      : activeView === "store"
        ? "Store"
        : "Welcome";

  return (
    <aside
      aria-label={`${previewLabel} preview`}
      className="relative hidden min-h-0 min-w-0 overflow-hidden bg-[#eaf0ed] p-2 lg:block"
    >
      <div ref={viewportRef} className="relative h-full min-h-0 overflow-hidden">
        <div
          className="absolute left-1/2"
          style={{
            top: `${MINI_PREVIEW_STAGE_SPACING.top}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div
            className="will-change-transform"
            style={{
              width: `${MINI_PREVIEW_CANVAS.width}px`,
              height: `${MINI_PREVIEW_CANVAS.height}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              transition: "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
          >
            <MiniPhoneFrame>
              <LanguageProvider baseLanguage="en" available={[]} isolated>
                <PwaInstallProvider>
                  <div className="relative h-full w-full">
                    <SunsetLakehouseTemplate
                      guidebook={guidebook}
                      sections={sections}
                      places={places}
                      bottomNav={bottomNav}
                      storefront={storefront}
                      nearbySettings={nearbySettings}
                      guidebookSettings={guidebookSettings}
                      skipIntro={activeView !== "home"}
                      isPreview
                      previewDevice="mobile"
                      registerSetFeaturedView={handleRegisterSetFeaturedView}
                    />
                  </div>
                </PwaInstallProvider>
              </LanguageProvider>
            </MiniPhoneFrame>
          </div>
        </div>
      </div>
    </aside>
  );
}
