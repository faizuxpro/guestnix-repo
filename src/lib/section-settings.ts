export const SECTION_INDEX_SETTINGS_KEY = "section_index";

export type SectionIndexLayout = "grid" | "list" | "bento";

export type SectionIndexCardStyle =
  | "surface"
  | "outline"
  | "elevated"
  | "solid_brand";

export type SectionIndexBrandRole = "primary" | "secondary" | "accent";
export type SectionIndexIconPlacement = "top" | "left" | "right" | "hidden";
export type SectionIndexListIconPlacement = Exclude<
  SectionIndexIconPlacement,
  "top"
>;
export type SectionIndexBentoPattern = "compact" | "balanced" | "showcase";

export type SectionIndexIntroSettings = {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export type SectionIndexCardSettings = {
  style: SectionIndexCardStyle;
  solid_color_role: SectionIndexBrandRole;
  radius: number;
  shadow: number;
  padding: number;
};

export type SectionIndexSpacingSettings = {
  gap: number;
  page_x: number;
  page_top: number;
  page_bottom: number;
  max_width: number;
};

export type SectionIndexGridSettings = {
  icon_placement: SectionIndexIconPlacement;
  card_min_width: number;
  card_min_height: number;
};

export type SectionIndexListSettings = {
  icon_placement: SectionIndexListIconPlacement;
  row_height: number;
  show_arrow: boolean;
};

export type SectionIndexBentoSettings = {
  icon_placement: SectionIndexIconPlacement;
  card_min_width: number;
  card_min_height: number;
  pattern: SectionIndexBentoPattern;
};

export type SectionIndexSettings = {
  layout: SectionIndexLayout;
  intro: SectionIndexIntroSettings;
  card: SectionIndexCardSettings;
  spacing: SectionIndexSpacingSettings;
  grid: SectionIndexGridSettings;
  list: SectionIndexListSettings;
  bento: SectionIndexBentoSettings;
};

export const DEFAULT_SECTION_INDEX_INTRO_SETTINGS: SectionIndexIntroSettings = {
  enabled: true,
  eyebrow: "The Guide",
  title: "Everything you need",
  subtitle: "Tap any section to dive in.",
};

export const DEFAULT_SECTION_INDEX_CARD_SETTINGS: SectionIndexCardSettings = {
  style: "surface",
  solid_color_role: "primary",
  radius: 18,
  shadow: 1,
  padding: 16,
};

export const DEFAULT_SECTION_INDEX_SPACING_SETTINGS: SectionIndexSpacingSettings =
  {
    gap: 12,
    page_x: 16,
    page_top: 16,
    page_bottom: 32,
    max_width: 680,
  };

export const DEFAULT_SECTION_INDEX_GRID_SETTINGS: SectionIndexGridSettings = {
  icon_placement: "top",
  card_min_width: 150,
  card_min_height: 112,
};

export const DEFAULT_SECTION_INDEX_LIST_SETTINGS: SectionIndexListSettings = {
  icon_placement: "left",
  row_height: 60,
  show_arrow: true,
};

export const DEFAULT_SECTION_INDEX_BENTO_SETTINGS: SectionIndexBentoSettings = {
  icon_placement: "top",
  card_min_width: 150,
  card_min_height: 112,
  pattern: "balanced",
};

export const DEFAULT_SECTION_INDEX_SETTINGS: SectionIndexSettings = {
  layout: "grid",
  intro: DEFAULT_SECTION_INDEX_INTRO_SETTINGS,
  card: DEFAULT_SECTION_INDEX_CARD_SETTINGS,
  spacing: DEFAULT_SECTION_INDEX_SPACING_SETTINGS,
  grid: DEFAULT_SECTION_INDEX_GRID_SETTINGS,
  list: DEFAULT_SECTION_INDEX_LIST_SETTINGS,
  bento: DEFAULT_SECTION_INDEX_BENTO_SETTINGS,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function readLayout(value: unknown): SectionIndexLayout {
  if (value === "masonry") return "bento";

  return readEnum(
    value,
    ["grid", "list", "bento"] as const,
    DEFAULT_SECTION_INDEX_SETTINGS.layout
  );
}

function readIconPlacement(
  value: unknown,
  fallback: SectionIndexIconPlacement
): SectionIndexIconPlacement {
  return readEnum(
    value,
    ["top", "left", "right", "hidden"] as const,
    fallback
  );
}

function readListIconPlacement(
  value: unknown,
  fallback: SectionIndexListIconPlacement
): SectionIndexListIconPlacement {
  return readEnum(value, ["left", "right", "hidden"] as const, fallback);
}

function readBentoPattern(value: unknown): SectionIndexBentoPattern {
  if (value === "subtle") return "compact";
  if (value === "mixed") return "showcase";

  return readEnum(
    value,
    ["compact", "balanced", "showcase"] as const,
    DEFAULT_SECTION_INDEX_BENTO_SETTINGS.pattern
  );
}

export function normalizeSectionIndexSettings(
  guidebookSettings: Record<string, unknown> | null | undefined
): SectionIndexSettings {
  const raw = isRecord(guidebookSettings?.[SECTION_INDEX_SETTINGS_KEY])
    ? (guidebookSettings[SECTION_INDEX_SETTINGS_KEY] as Record<string, unknown>)
    : {};
  const intro = isRecord(raw.intro) ? raw.intro : {};
  const card = isRecord(raw.card) ? raw.card : {};
  const spacing = isRecord(raw.spacing) ? raw.spacing : {};
  const grid = isRecord(raw.grid) ? raw.grid : {};
  const list = isRecord(raw.list) ? raw.list : {};
  const bento = isRecord(raw.bento)
    ? raw.bento
    : isRecord(raw.masonry)
    ? raw.masonry
    : {};

  return {
    layout: readLayout(raw.layout),
    intro: {
      enabled: readBoolean(
        intro.enabled,
        DEFAULT_SECTION_INDEX_INTRO_SETTINGS.enabled
      ),
      eyebrow: readString(
        intro.eyebrow,
        DEFAULT_SECTION_INDEX_INTRO_SETTINGS.eyebrow
      ),
      title: readString(intro.title, DEFAULT_SECTION_INDEX_INTRO_SETTINGS.title),
      subtitle: readString(
        intro.subtitle,
        DEFAULT_SECTION_INDEX_INTRO_SETTINGS.subtitle
      ),
    },
    card: {
      style: readEnum(
        card.style,
        ["surface", "outline", "elevated", "solid_brand"] as const,
        DEFAULT_SECTION_INDEX_CARD_SETTINGS.style
      ),
      solid_color_role: readEnum(
        card.solid_color_role,
        ["primary", "secondary", "accent"] as const,
        DEFAULT_SECTION_INDEX_CARD_SETTINGS.solid_color_role
      ),
      radius: readNumber(
        card.radius,
        DEFAULT_SECTION_INDEX_CARD_SETTINGS.radius,
        0,
        36
      ),
      shadow: readNumber(
        card.shadow,
        DEFAULT_SECTION_INDEX_CARD_SETTINGS.shadow,
        0,
        4
      ),
      padding: readNumber(
        card.padding,
        DEFAULT_SECTION_INDEX_CARD_SETTINGS.padding,
        8,
        32
      ),
    },
    spacing: {
      gap: readNumber(
        spacing.gap,
        DEFAULT_SECTION_INDEX_SPACING_SETTINGS.gap,
        4,
        36
      ),
      page_x: readNumber(
        spacing.page_x,
        DEFAULT_SECTION_INDEX_SPACING_SETTINGS.page_x,
        0,
        48
      ),
      page_top: readNumber(
        spacing.page_top,
        DEFAULT_SECTION_INDEX_SPACING_SETTINGS.page_top,
        0,
        72
      ),
      page_bottom: readNumber(
        spacing.page_bottom,
        DEFAULT_SECTION_INDEX_SPACING_SETTINGS.page_bottom,
        0,
        96
      ),
      max_width: readNumber(
        spacing.max_width,
        DEFAULT_SECTION_INDEX_SPACING_SETTINGS.max_width,
        320,
        1200
      ),
    },
    grid: {
      icon_placement: readIconPlacement(
        grid.icon_placement,
        DEFAULT_SECTION_INDEX_GRID_SETTINGS.icon_placement
      ),
      card_min_width: readNumber(
        grid.card_min_width,
        DEFAULT_SECTION_INDEX_GRID_SETTINGS.card_min_width,
        112,
        320
      ),
      card_min_height: readNumber(
        grid.card_min_height,
        DEFAULT_SECTION_INDEX_GRID_SETTINGS.card_min_height,
        72,
        220
      ),
    },
    list: {
      icon_placement: readListIconPlacement(
        list.icon_placement,
        DEFAULT_SECTION_INDEX_LIST_SETTINGS.icon_placement
      ),
      row_height: readNumber(
        list.row_height,
        DEFAULT_SECTION_INDEX_LIST_SETTINGS.row_height,
        48,
        128
      ),
      show_arrow: readBoolean(
        list.show_arrow,
        DEFAULT_SECTION_INDEX_LIST_SETTINGS.show_arrow
      ),
    },
    bento: {
      icon_placement: readIconPlacement(
        bento.icon_placement,
        DEFAULT_SECTION_INDEX_BENTO_SETTINGS.icon_placement
      ),
      card_min_width: readNumber(
        bento.card_min_width,
        DEFAULT_SECTION_INDEX_BENTO_SETTINGS.card_min_width,
        112,
        320
      ),
      card_min_height: readNumber(
        bento.card_min_height,
        DEFAULT_SECTION_INDEX_BENTO_SETTINGS.card_min_height,
        72,
        240
      ),
      pattern: readBentoPattern(bento.pattern ?? bento.rhythm),
    },
  };
}
