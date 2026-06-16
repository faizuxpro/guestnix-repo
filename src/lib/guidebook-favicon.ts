import type { HeroData } from "./hero-data";

export const GUIDEBOOK_FAVICON_SETTINGS_KEY = "favicon";
export const GUESTNIX_FAVICON_URL =
  "/brand/Guestnix icon (for light bg).svg";

export const GUIDEBOOK_FAVICON_SOURCES = [
  "guestnix",
  "custom",
  "header",
  "home",
  "host",
] as const;

export type GuidebookFaviconSettingSource =
  (typeof GUIDEBOOK_FAVICON_SOURCES)[number];

export type GuidebookFaviconSettings = {
  source: GuidebookFaviconSettingSource;
  custom_url: string | null;
};

export type GuidebookFaviconSourceType = GuidebookFaviconSettingSource;

export type GuidebookFaviconSource = {
  url: string;
  source: GuidebookFaviconSourceType;
  fit: "contain" | "cover";
};

type GuidebookFaviconInput = {
  branding?: Record<string, unknown> | null;
  heroData?: HeroData | null;
  settings?: Record<string, unknown> | null;
};

type TopbarLogoMode = "default" | "custom" | "hidden";

const DEFAULT_FAVICON_SETTINGS: GuidebookFaviconSettings = {
  source: "guestnix",
  custom_url: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readIconUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function readTopbarBrand(
  settings: Record<string, unknown> | null | undefined
): { logoMode: TopbarLogoMode; logoUrl: string | null } {
  const topbar = isRecord(settings?.topbar) ? settings.topbar : {};
  const brand = isRecord(topbar.brand) ? topbar.brand : {};
  const logoMode =
    brand.logo_mode === "custom" || brand.logo_mode === "hidden"
      ? brand.logo_mode
      : "default";

  return {
    logoMode,
    logoUrl: readIconUrl(brand.logo_url),
  };
}

export function normalizeGuidebookFaviconSettings(
  settings: Record<string, unknown> | null | undefined
): GuidebookFaviconSettings {
  const raw = isRecord(settings?.[GUIDEBOOK_FAVICON_SETTINGS_KEY])
    ? (settings[GUIDEBOOK_FAVICON_SETTINGS_KEY] as Record<string, unknown>)
    : {};
  const source = GUIDEBOOK_FAVICON_SOURCES.includes(
    raw.source as GuidebookFaviconSettingSource
  )
    ? (raw.source as GuidebookFaviconSettingSource)
    : DEFAULT_FAVICON_SETTINGS.source;

  return {
    source,
    custom_url: readIconUrl(raw.custom_url),
  };
}

function resolveHeaderLogo(guidebook: GuidebookFaviconInput): string | null {
  const topbar = readTopbarBrand(guidebook.settings);
  if (topbar.logoMode === "hidden") return null;
  if (topbar.logoMode === "custom") return topbar.logoUrl;

  return (
    readIconUrl(guidebook.heroData?.property.logo_url) ??
    readIconUrl(guidebook.branding?.logo_url)
  );
}

function fallbackSource(): GuidebookFaviconSource {
  return { url: GUESTNIX_FAVICON_URL, source: "guestnix", fit: "contain" };
}

export function resolveGuidebookFaviconSource(
  guidebook: GuidebookFaviconInput
): GuidebookFaviconSource {
  const favicon = normalizeGuidebookFaviconSettings(guidebook.settings);

  if (favicon.source === "custom") {
    return favicon.custom_url
      ? { url: favicon.custom_url, source: "custom", fit: "contain" }
      : fallbackSource();
  }

  if (favicon.source === "header") {
    const url = resolveHeaderLogo(guidebook);
    return url ? { url, source: "header", fit: "contain" } : fallbackSource();
  }

  if (favicon.source === "home") {
    const url = readIconUrl(guidebook.heroData?.property.logo_url);
    return url ? { url, source: "home", fit: "contain" } : fallbackSource();
  }

  if (favicon.source === "host") {
    const url = readIconUrl(guidebook.heroData?.host.avatar_url);
    return url ? { url, source: "host", fit: "cover" } : fallbackSource();
  }

  return fallbackSource();
}

export function resolveGuidebookFaviconUrl(
  guidebook: GuidebookFaviconInput
): string {
  return resolveGuidebookFaviconSource(guidebook).url;
}
