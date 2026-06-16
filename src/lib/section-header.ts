export const SECTION_HEADER_SETTINGS_KEY = "section_header";

export const SECTION_HEADER_BACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-source="guestnix"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`;
export const SECTION_HEADER_LINK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-source="guestnix"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;

export type SectionHeaderAlign = "left" | "center" | "right";
export type SectionHeaderDensity = "compact" | "comfortable";
export type SectionHeaderBackground = "brand" | "solid" | "transparent";
export type SectionHeaderIconStyle =
  | "plain"
  | "soft"
  | "circle"
  | "square"
  | "inverted";

export const SECTION_HEADER_ICON_SIZE_MIN = 14;
export const SECTION_HEADER_ICON_SIZE_MAX = 30;

export type SectionHeaderSettings = {
  enabled: boolean;
  show_icon: boolean;
  show_title: boolean;
  show_link: boolean;
  align: SectionHeaderAlign;
  density: SectionHeaderDensity;
  background: SectionHeaderBackground;
  sticky: boolean;
  back_icon: string;
  link_icon: string;
  back_icon_size: number;
  link_icon_size: number;
  icon_style: SectionHeaderIconStyle;
};

export const DEFAULT_SECTION_HEADER_SETTINGS: SectionHeaderSettings = {
  enabled: true,
  show_icon: true,
  show_title: true,
  show_link: true,
  align: "left",
  density: "comfortable",
  background: "brand",
  sticky: true,
  back_icon: SECTION_HEADER_BACK_ICON,
  link_icon: SECTION_HEADER_LINK_ICON,
  back_icon_size: 18,
  link_icon_size: 18,
  icon_style: "soft",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown, fallback: string, max = 20000) {
  return typeof value === "string" && value.trim().length > 0
    ? value.slice(0, max)
    : fallback;
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
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

export function normalizeSectionHeaderSettings(
  guidebookSettings: Record<string, unknown> | null | undefined
): SectionHeaderSettings {
  const raw = isRecord(guidebookSettings?.[SECTION_HEADER_SETTINGS_KEY])
    ? (guidebookSettings[SECTION_HEADER_SETTINGS_KEY] as Record<string, unknown>)
    : {};
  const defaults = DEFAULT_SECTION_HEADER_SETTINGS;

  return {
    enabled: readBoolean(raw.enabled, defaults.enabled),
    show_icon: readBoolean(raw.show_icon, defaults.show_icon),
    show_title: readBoolean(raw.show_title, defaults.show_title),
    show_link: readBoolean(raw.show_link, defaults.show_link),
    align: readEnum(raw.align, ["left", "center", "right"] as const, defaults.align),
    density: readEnum(
      raw.density,
      ["compact", "comfortable"] as const,
      defaults.density
    ),
    background: readEnum(
      raw.background,
      ["brand", "solid", "transparent"] as const,
      defaults.background
    ),
    sticky: readBoolean(raw.sticky, defaults.sticky),
    back_icon: readString(raw.back_icon, defaults.back_icon),
    link_icon: readString(raw.link_icon, defaults.link_icon),
    back_icon_size: readNumber(
      raw.back_icon_size,
      defaults.back_icon_size,
      SECTION_HEADER_ICON_SIZE_MIN,
      SECTION_HEADER_ICON_SIZE_MAX
    ),
    link_icon_size: readNumber(
      raw.link_icon_size,
      defaults.link_icon_size,
      SECTION_HEADER_ICON_SIZE_MIN,
      SECTION_HEADER_ICON_SIZE_MAX
    ),
    icon_style: readEnum(
      raw.icon_style,
      ["plain", "soft", "circle", "square", "inverted"] as const,
      defaults.icon_style
    ),
  };
}

export function writeSectionHeaderSettings(
  header: SectionHeaderSettings,
  patch: Partial<SectionHeaderSettings>
) {
  const next = { ...header, ...patch };

  return {
    [SECTION_HEADER_SETTINGS_KEY]: {
      enabled: next.enabled,
      show_icon: next.show_icon,
      show_title: next.show_title,
      show_link: next.show_link,
      align: next.align,
      density: next.density,
      background: next.background,
      sticky: next.sticky,
      back_icon: next.back_icon,
      link_icon: next.link_icon,
      back_icon_size: next.back_icon_size,
      link_icon_size: next.link_icon_size,
      icon_style: next.icon_style,
    },
  };
}
