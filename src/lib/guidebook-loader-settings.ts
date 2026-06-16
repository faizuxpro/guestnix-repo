import type { CustomFont } from "@/lib/fonts/catalog";

export const GUIDEBOOK_LOADER_SETTINGS_KEY = "loading_screen";
export const GUIDEBOOK_LOADER_MIN_DURATION_MS = 3_000;

export const GUIDEBOOK_LOADER_VARIANTS = [
  "sunset",
  "spinner",
  "dots",
  "custom",
] as const;

export type GuidebookLoaderVariant =
  (typeof GUIDEBOOK_LOADER_VARIANTS)[number];

export type GuidebookLoaderSettings = {
  enabled: boolean;
  variant: GuidebookLoaderVariant;
  title: string;
  subtitle: string;
  background_color: string;
  background_color_override: boolean;
  foreground_color: string;
  foreground_color_override: boolean;
  accent_color: string;
  accent_color_override: boolean;
  animation_size: number;
  glow_opacity: number;
  show_logo: boolean;
  logo_url: string | null;
  custom_asset_url: string | null;
  heading_font: string;
  body_font: string;
  custom_fonts: CustomFont[];
};

export type PublishedGuidebookLoaderConfig = GuidebookLoaderSettings & {
  schemaVersion: 1;
};

type LoaderDefaults = {
  title?: string | null;
  subtitle?: string | null;
  logoUrl?: string | null;
};

const DEFAULT_LOADER: GuidebookLoaderSettings = {
  enabled: true,
  variant: "sunset",
  title: "Welcome",
  subtitle: "Preparing your guidebook",
  background_color: "#002927",
  background_color_override: false,
  foreground_color: "#ffffff",
  foreground_color_override: false,
  accent_color: "#e8c36a",
  accent_color_override: false,
  animation_size: 112,
  glow_opacity: 100,
  show_logo: true,
  logo_url: null,
  custom_asset_url: null,
  heading_font: "Fraunces",
  body_font: "Montserrat",
  custom_fonts: [],
};

const VARIANT_SET = new Set<string>(GUIDEBOOK_LOADER_VARIANTS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.slice(0, maxLength);
}

function readNonEmptyString(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function readNullableUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? trimmed
      : null;
  } catch {
    return null;
  }
}

function readHex(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(trimmed) ? trimmed : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function readBrandColor(
  branding: Record<string, unknown> | null | undefined,
  key: string,
  fallback: string
) {
  return readHex(branding?.[key], fallback);
}

function readCustomFonts(value: unknown): CustomFont[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((font): CustomFont[] => {
    if (!isRecord(font)) return [];
    const family = readNonEmptyString(font.family, "", 80);
    if (!family) return [];
    if (font.source !== "google" && font.source !== "upload") return [];

    const next: CustomFont = {
      family,
      source: font.source,
    };
    const url = readNullableUrl(font.url);
    if (url) next.url = url;
    if (
      font.format === "woff2" ||
      font.format === "woff" ||
      font.format === "ttf" ||
      font.format === "otf"
    ) {
      next.format = font.format;
    }
    if (Array.isArray(font.weights)) {
      const weights = font.weights
        .filter(
          (weight): weight is number =>
            typeof weight === "number" &&
            Number.isInteger(weight) &&
            weight >= 100 &&
            weight <= 900
        )
        .slice(0, 10);
      if (weights.length) next.weights = weights;
    }
    if (typeof font.italics === "boolean") {
      next.italics = font.italics;
    }
    if (next.source === "upload" && !next.url) return [];
    return [next];
  });
}

function hasDefaultLogo(defaults: LoaderDefaults) {
  return Object.prototype.hasOwnProperty.call(defaults, "logoUrl");
}

function normalizeHexForRgb(value: string) {
  const match = value.trim().replace("#", "").match(/^([0-9a-f]{3,8})$/i);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .slice(0, 3)
      .split("")
      .map((char) => char + char)
      .join("");
  } else {
    hex = hex.slice(0, 6);
  }
  if (hex.length !== 6) return null;
  return hex;
}

function pickReadableForeground(background: string) {
  const normalized = normalizeHexForRgb(background);
  if (!normalized) return DEFAULT_LOADER.foreground_color;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#0f172a" : "#ffffff";
}

export function getGuidebookLoaderThemeColors(
  branding?: Record<string, unknown> | null
) {
  const background_color = readBrandColor(
    branding,
    "primary_color",
    DEFAULT_LOADER.background_color
  );
  return {
    background_color,
    foreground_color: pickReadableForeground(background_color),
    accent_color: readBrandColor(
      branding,
      "accent_color",
      readBrandColor(branding, "secondary_color", DEFAULT_LOADER.accent_color)
    ),
  };
}

export function normalizeGuidebookLoaderSettings(
  settings?: Record<string, unknown> | null,
  branding?: Record<string, unknown> | null,
  defaults: LoaderDefaults = {}
): GuidebookLoaderSettings {
  const raw = isRecord(settings?.[GUIDEBOOK_LOADER_SETTINGS_KEY])
    ? (settings?.[GUIDEBOOK_LOADER_SETTINGS_KEY] as Record<string, unknown>)
    : {};
  const themeColors = getGuidebookLoaderThemeColors(branding);
  const backgroundColorOverride = readBoolean(
    raw.background_color_override,
    DEFAULT_LOADER.background_color_override
  );
  const backgroundColor = backgroundColorOverride
    ? readHex(raw.background_color, themeColors.background_color)
    : themeColors.background_color;
  const foregroundColorOverride = readBoolean(
    raw.foreground_color_override,
    DEFAULT_LOADER.foreground_color_override
  );
  const foregroundColorFallback = pickReadableForeground(backgroundColor);
  const foregroundColor = foregroundColorOverride
    ? readHex(raw.foreground_color, foregroundColorFallback)
    : foregroundColorFallback;
  const accentColorOverride = readBoolean(
    raw.accent_color_override,
    DEFAULT_LOADER.accent_color_override
  );
  const accentColor = accentColorOverride
    ? readHex(raw.accent_color, themeColors.accent_color)
    : themeColors.accent_color;
  const logoUrl = hasDefaultLogo(defaults)
    ? readNullableUrl(defaults.logoUrl) ?? null
    : readNullableUrl(branding?.logo_url) ?? readNullableUrl(raw.logo_url) ?? null;
  const headingFont = readNonEmptyString(
    branding?.heading_font,
    readNonEmptyString(
      branding?.font_family,
      readNonEmptyString(raw.heading_font, DEFAULT_LOADER.heading_font, 80),
      80
    ),
    80
  );
  const bodyFont = readNonEmptyString(
    branding?.body_font,
    readNonEmptyString(
      branding?.font_family,
      readNonEmptyString(raw.body_font, DEFAULT_LOADER.body_font, 80),
      80
    ),
    80
  );
  const brandingCustomFonts = readCustomFonts(branding?.custom_fonts);
  const customFonts = brandingCustomFonts.length
    ? brandingCustomFonts
    : readCustomFonts(raw.custom_fonts);
  const variant =
    typeof raw.variant === "string" && VARIANT_SET.has(raw.variant)
      ? (raw.variant as GuidebookLoaderVariant)
      : DEFAULT_LOADER.variant;

  return {
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : DEFAULT_LOADER.enabled,
    variant,
    title: readString(raw.title, defaults.title || DEFAULT_LOADER.title, 120),
    subtitle: readString(
      raw.subtitle,
      defaults.subtitle || DEFAULT_LOADER.subtitle,
      180
    ),
    background_color: backgroundColor,
    background_color_override: backgroundColorOverride,
    foreground_color: foregroundColor,
    foreground_color_override: foregroundColorOverride,
    accent_color: accentColor,
    accent_color_override: accentColorOverride,
    animation_size: readNumber(raw.animation_size, DEFAULT_LOADER.animation_size, 48, 240),
    glow_opacity: readNumber(raw.glow_opacity, DEFAULT_LOADER.glow_opacity, 0, 100),
    show_logo:
      typeof raw.show_logo === "boolean" ? raw.show_logo : DEFAULT_LOADER.show_logo,
    logo_url: logoUrl,
    custom_asset_url: readNullableUrl(raw.custom_asset_url),
    heading_font: headingFont,
    body_font: bodyFont,
    custom_fonts: customFonts,
  };
}

export function createPublishedGuidebookLoaderConfig(
  settings: Record<string, unknown>,
  branding: Record<string, unknown>,
  defaults: LoaderDefaults = {}
): PublishedGuidebookLoaderConfig {
  const normalized = normalizeGuidebookLoaderSettings(settings, branding, defaults);

  return {
    schemaVersion: 1,
    ...normalized,
    background_color_override: true,
    foreground_color_override: true,
    accent_color_override: true,
  };
}
