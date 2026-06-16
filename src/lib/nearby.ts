import { PLACE_CATEGORIES } from "@/lib/constants";

export type NearbyIntroSettings = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type NearbySettings = {
  show_map: boolean;
  center_lat: number;
  center_lng: number;
  zoom: number;
  categories: string[];
  location_name?: string | null;
  radius_miles?: number;
  places_limit?: number;
  search_categories?: string[];
  intro: NearbyIntroSettings;
};

export const DEFAULT_NEARBY_INTRO_SETTINGS: NearbyIntroSettings = {
  enabled: true,
  eyebrow: "Nearby",
  title: "Places Explorer",
  subtitle: "Recommended spots around {{property_location}}",
};

export const DEFAULT_NEARBY_SETTINGS: NearbySettings = {
  show_map: true,
  center_lat: 0,
  center_lng: 0,
  zoom: 13,
  categories: [],
  location_name: null,
  radius_miles: 3 as number,
  places_limit: 100 as number,
  search_categories: [],
  intro: DEFAULT_NEARBY_INTRO_SETTINGS,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value)].filter(
    (item): item is string =>
      typeof item === "string" && (PLACE_CATEGORIES as readonly string[]).includes(item)
  );
}

function readNullableString(value: unknown, fallback: string | null) {
  if (typeof value === "string") return value;
  if (value === null) return null;
  return fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readOptionalNumber(value: unknown, fallback: number | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return fallback;
}

export function normalizeNearbySettings(value: unknown): NearbySettings {
  const src = isRecord(value) ? value : {};
  const zoom = readNumber(src.zoom, DEFAULT_NEARBY_SETTINGS.zoom);
  const intro = isRecord(src.intro) ? src.intro : {};
  return {
    show_map: readBoolean(src.show_map, DEFAULT_NEARBY_SETTINGS.show_map),
    center_lat: readNumber(src.center_lat, DEFAULT_NEARBY_SETTINGS.center_lat),
    center_lng: readNumber(src.center_lng, DEFAULT_NEARBY_SETTINGS.center_lng),
    zoom: Math.max(1, Math.min(19, Math.round(zoom))),
    categories: readCategories(src.categories),
    location_name: readNullableString(
      src.location_name,
      DEFAULT_NEARBY_SETTINGS.location_name ?? null
    ),
    radius_miles: (() => {
      const val = readOptionalNumber(
        src.radius_miles,
        DEFAULT_NEARBY_SETTINGS.radius_miles
      );
      return typeof val === "number" ? Math.max(1, Math.min(10, val)) : undefined;
    })(),
    places_limit: (() => {
      const val = readOptionalNumber(
        src.places_limit,
        DEFAULT_NEARBY_SETTINGS.places_limit
      );
      return typeof val === "number"
        ? Math.max(10, Math.min(200, Math.round(val)))
        : undefined;
    })(),
    search_categories: readCategories(src.search_categories),
    intro: {
      enabled: readBoolean(
        intro.enabled,
        DEFAULT_NEARBY_INTRO_SETTINGS.enabled
      ),
      eyebrow: readString(intro.eyebrow, DEFAULT_NEARBY_INTRO_SETTINGS.eyebrow),
      title: readString(intro.title, DEFAULT_NEARBY_INTRO_SETTINGS.title),
      subtitle: readString(intro.subtitle, DEFAULT_NEARBY_INTRO_SETTINGS.subtitle),
    },
  };
}

export function readNearbySettingsFromGuidebookSettings(
  settings: Record<string, unknown> | null | undefined
): NearbySettings {
  if (!settings) return { ...DEFAULT_NEARBY_SETTINGS };
  return normalizeNearbySettings(settings.nearby);
}
