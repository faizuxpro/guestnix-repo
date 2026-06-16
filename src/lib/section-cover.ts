export const SECTION_COVER_SETTINGS_KEY = "section_cover";
export const SECTION_COVER_DESIGN_SETTINGS_KEY = "section_cover_design";

export const SECTION_COVER_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80";

export type SectionCoverHeight = "compact" | "medium" | "tall";
export type SectionCoverTitlePosition = "top" | "center" | "bottom";
export type SectionCoverTitleAlign = "left" | "center" | "right";
export type SectionCoverTitleStyle = "solid" | "glass" | "minimal" | "outline";
export type SectionCoverTitleSize = "small" | "medium" | "large";
export type SectionCoverTitleCornerStyle =
  | "sharp"
  | "top"
  | "bottom"
  | "rounded";

export type SectionCoverTitleShadow = {
  enabled: boolean;
  color: string;
  opacity: number;
  blur: number;
  offset_x: number;
  offset_y: number;
};

export const SECTION_COVER_TITLE_SHADOW_BLUR_MAX = 48;
export const SECTION_COVER_TITLE_SHADOW_OFFSET_MIN = -24;
export const SECTION_COVER_TITLE_SHADOW_OFFSET_MAX = 24;

export type SectionCoverContentSettings = {
  title_text: string;
  image_url: string | null;
  image_position: {
    x: number;
    y: number;
  };
};

export type SectionCoverDesignSettings = {
  enabled: boolean;
  height: SectionCoverHeight;
  overlay_opacity: number;
  title_position: SectionCoverTitlePosition;
  title_align: SectionCoverTitleAlign;
  title_style: SectionCoverTitleStyle;
  title_bg_color: string;
  title_color: string;
  title_font_size: number;
  title_bg_width: number;
  title_box_width: number;
  title_radius: number;
  title_corner_style: SectionCoverTitleCornerStyle;
  title_shadow: SectionCoverTitleShadow;
};

export type SectionCoverSettings = SectionCoverContentSettings &
  SectionCoverDesignSettings;

export const DEFAULT_SECTION_COVER_CONTENT_SETTINGS: SectionCoverContentSettings = {
  title_text: "",
  image_url: null,
  image_position: { x: 50, y: 50 },
};

export const DEFAULT_SECTION_COVER_DESIGN_SETTINGS: SectionCoverDesignSettings = {
  enabled: true,
  height: "tall",
  overlay_opacity: 0.4,
  title_position: "bottom",
  title_align: "center",
  title_style: "solid",
  title_bg_color: "#f2f4f4",
  title_color: "#002927",
  title_font_size: 30,
  title_bg_width: 80,
  title_box_width: 100,
  title_radius: 20,
  title_corner_style: "top",
  title_shadow: {
    enabled: false,
    color: "#0F172A",
    opacity: 0.72,
    blur: 18,
    offset_x: 0,
    offset_y: 8,
  },
};

export const DEFAULT_SECTION_COVER_SETTINGS: SectionCoverSettings = {
  ...DEFAULT_SECTION_COVER_CONTENT_SETTINGS,
  ...DEFAULT_SECTION_COVER_DESIGN_SETTINGS,
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
) {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function readNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function readColor(value: unknown, fallback: string) {
  return typeof value === "string" && HEX_COLOR_RE.test(value) ? value : fallback;
}

function readNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readText(value: unknown, fallback: string) {
  return typeof value === "string" ? value.slice(0, 160) : fallback;
}

function readTitleShadow(
  value: unknown,
  fallback: SectionCoverTitleShadow
): SectionCoverTitleShadow {
  const raw = isRecord(value) ? value : {};
  return {
    enabled:
      typeof raw.enabled === "boolean" ? raw.enabled : fallback.enabled,
    color: readColor(raw.color, fallback.color),
    opacity: readNumber(raw.opacity, fallback.opacity, 0, 1),
    blur: readNumber(
      raw.blur,
      fallback.blur,
      0,
      SECTION_COVER_TITLE_SHADOW_BLUR_MAX
    ),
    offset_x: readNumber(
      raw.offset_x,
      fallback.offset_x,
      SECTION_COVER_TITLE_SHADOW_OFFSET_MIN,
      SECTION_COVER_TITLE_SHADOW_OFFSET_MAX
    ),
    offset_y: readNumber(
      raw.offset_y,
      fallback.offset_y,
      SECTION_COVER_TITLE_SHADOW_OFFSET_MIN,
      SECTION_COVER_TITLE_SHADOW_OFFSET_MAX
    ),
  };
}

function legacyTitleSizeToPixels(value: unknown, fallback: number) {
  switch (value) {
    case "small":
      return 18;
    case "medium":
      return 23;
    case "large":
      return 28;
    default:
      return fallback;
  }
}

export function normalizeSectionCoverSettings(
  itemSettings: Record<string, unknown> | null | undefined,
  guidebookSettings?: Record<string, unknown> | null | undefined
): SectionCoverSettings {
  const rawContent = isRecord(itemSettings?.[SECTION_COVER_SETTINGS_KEY])
    ? (itemSettings[SECTION_COVER_SETTINGS_KEY] as Record<string, unknown>)
    : {};
  const hasSharedDesign = isRecord(
    guidebookSettings?.[SECTION_COVER_DESIGN_SETTINGS_KEY]
  );
  const rawDesign = hasSharedDesign
    ? (guidebookSettings?.[
        SECTION_COVER_DESIGN_SETTINGS_KEY
      ] as Record<string, unknown>)
    : rawContent;
  const defaults = DEFAULT_SECTION_COVER_SETTINGS;
  const rawPosition = isRecord(rawContent.image_position)
    ? rawContent.image_position
    : {};
  const titleBoxWidth = readNumber(
    rawDesign.title_box_width,
    defaults.title_box_width,
    35,
    100
  );
  const titleBgWidth = Math.min(
    titleBoxWidth,
    readNumber(rawDesign.title_bg_width, defaults.title_bg_width, 0, 100)
  );

  return {
    enabled:
      typeof rawDesign.enabled === "boolean" ? rawDesign.enabled : defaults.enabled,
    title_text: readText(rawContent.title_text, defaults.title_text),
    image_url: readNullableString(rawContent.image_url),
    image_position: {
      x: readNumber(rawPosition.x, defaults.image_position.x, 0, 100),
      y: readNumber(rawPosition.y, defaults.image_position.y, 0, 100),
    },
    height: readEnum(
      rawDesign.height,
      ["compact", "medium", "tall"] as const,
      defaults.height
    ),
    overlay_opacity: readNumber(
      rawDesign.overlay_opacity,
      defaults.overlay_opacity,
      0,
      0.75
    ),
    title_position: readEnum(
      rawDesign.title_position,
      ["top", "center", "bottom"] as const,
      defaults.title_position
    ),
    title_align: readEnum(
      rawDesign.title_align,
      ["left", "center", "right"] as const,
      defaults.title_align
    ),
    title_style: readEnum(
      rawDesign.title_style,
      ["solid", "glass", "minimal", "outline"] as const,
      defaults.title_style
    ),
    title_bg_color: readColor(rawDesign.title_bg_color, defaults.title_bg_color),
    title_color: readColor(rawDesign.title_color, defaults.title_color),
    title_font_size: readNumber(
      rawDesign.title_font_size,
      legacyTitleSizeToPixels(rawDesign.title_size, defaults.title_font_size),
      14,
      52
    ),
    title_bg_width: titleBgWidth,
    title_box_width: titleBoxWidth,
    title_radius: readNumber(rawDesign.title_radius, defaults.title_radius, 0, 32),
    title_corner_style: readEnum(
      rawDesign.title_corner_style,
      ["sharp", "top", "bottom", "rounded"] as const,
      defaults.title_corner_style
    ),
    title_shadow: readTitleShadow(
      rawDesign.title_shadow,
      defaults.title_shadow
    ),
  };
}
