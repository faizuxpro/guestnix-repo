export type StoreIntroSettings = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export const STORE_LISTING_STYLES = ["compact", "catalogue"] as const;

export type StoreListingStyle = (typeof STORE_LISTING_STYLES)[number];

export type GuidebookStoreSettings = {
  intro: StoreIntroSettings;
  listingStyle: StoreListingStyle;
};

export const DEFAULT_STORE_INTRO_SETTINGS: StoreIntroSettings = {
  enabled: true,
  eyebrow: "Store",
  title: "Store",
  subtitle: "Request extras and services for your stay.",
};

export const DEFAULT_STORE_LISTING_STYLE: StoreListingStyle = "compact";

export const DEFAULT_GUIDEBOOK_STORE_SETTINGS: GuidebookStoreSettings = {
  intro: DEFAULT_STORE_INTRO_SETTINGS,
  listingStyle: DEFAULT_STORE_LISTING_STYLE,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readListingStyle(value: unknown): StoreListingStyle {
  return STORE_LISTING_STYLES.includes(value as StoreListingStyle)
    ? (value as StoreListingStyle)
    : DEFAULT_STORE_LISTING_STYLE;
}

export function normalizeGuidebookStoreSettings(
  value: unknown
): GuidebookStoreSettings {
  const src = isRecord(value) ? value : {};
  const intro = isRecord(src.intro) ? src.intro : {};

  return {
    intro: {
      enabled: readBoolean(
        intro.enabled,
        DEFAULT_STORE_INTRO_SETTINGS.enabled
      ),
      eyebrow: readString(intro.eyebrow, DEFAULT_STORE_INTRO_SETTINGS.eyebrow),
      title: readString(intro.title, DEFAULT_STORE_INTRO_SETTINGS.title),
      subtitle: readString(intro.subtitle, DEFAULT_STORE_INTRO_SETTINGS.subtitle),
    },
    listingStyle: readListingStyle(src.listingStyle),
  };
}

export function readStoreSettingsFromGuidebookSettings(
  settings: Record<string, unknown> | null | undefined
): GuidebookStoreSettings {
  if (!settings) return { ...DEFAULT_GUIDEBOOK_STORE_SETTINGS };
  return normalizeGuidebookStoreSettings(settings.store);
}
