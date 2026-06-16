export const TOPBAR_SETTINGS_KEY = "topbar";

export const TOPBAR_LOGO_MODES = ["default", "custom", "hidden"] as const;
export const TOPBAR_SEARCH_STYLES = [
  "pill",
  "glass",
  "outline",
  "minimal",
] as const;
export const TOPBAR_SEARCH_EXPAND_BEHAVIORS = ["expand", "static"] as const;
export const TOPBAR_SEARCH_MOTIONS = ["normal", "reduced", "off"] as const;

export type TopbarLogoMode = (typeof TOPBAR_LOGO_MODES)[number];
export type TopbarSearchStyle = (typeof TOPBAR_SEARCH_STYLES)[number];
export type TopbarSearchExpandBehavior =
  (typeof TOPBAR_SEARCH_EXPAND_BEHAVIORS)[number];
export type TopbarSearchMotion = (typeof TOPBAR_SEARCH_MOTIONS)[number];

export type TopbarSettings = {
  brand: {
    logo_mode: TopbarLogoMode;
    logo_url: string | null;
    show_title: boolean;
  };
  layout: {
    logo_size: number;
    height: number;
  };
  page_name: {
    visible: boolean;
  };
  actions: {
    search_icon: string;
    share_icon: string;
  };
  search: {
    style: TopbarSearchStyle;
    expand_behavior: TopbarSearchExpandBehavior;
    motion: TopbarSearchMotion;
  };
};

export type TopbarSettingsPatch = {
  brand?: Partial<TopbarSettings["brand"]>;
  layout?: Partial<TopbarSettings["layout"]>;
  page_name?: Partial<TopbarSettings["page_name"]>;
  actions?: Partial<TopbarSettings["actions"]>;
  search?: Partial<TopbarSettings["search"]>;
};

export const DEFAULT_TOPBAR_SETTINGS: TopbarSettings = {
  brand: {
    logo_mode: "default",
    logo_url: null,
    show_title: true,
  },
  layout: {
    logo_size: 28,
    height: 64,
  },
  page_name: {
    visible: true,
  },
  actions: {
    search_icon: "",
    share_icon: "",
  },
  search: {
    style: "pill",
    expand_behavior: "expand",
    motion: "normal",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown, fallback: string, max = 20000) {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function readNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function readNullableString(value: unknown, max = 2048) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : null;
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

export function normalizeTopbarSettings(
  guidebookSettings: Record<string, unknown> | null | undefined
): TopbarSettings {
  const raw = isRecord(guidebookSettings?.[TOPBAR_SETTINGS_KEY])
    ? (guidebookSettings[TOPBAR_SETTINGS_KEY] as Record<string, unknown>)
    : {};
  const brand = isRecord(raw.brand) ? raw.brand : {};
  const layout = isRecord(raw.layout) ? raw.layout : {};
  const pageName = isRecord(raw.page_name) ? raw.page_name : {};
  const actions = isRecord(raw.actions) ? raw.actions : {};
  const search = isRecord(raw.search) ? raw.search : {};
  const defaults = DEFAULT_TOPBAR_SETTINGS;

  return {
    brand: {
      logo_mode: readEnum(
        brand.logo_mode,
        TOPBAR_LOGO_MODES,
        defaults.brand.logo_mode
      ),
      logo_url: readNullableString(brand.logo_url),
      show_title: readBoolean(brand.show_title, defaults.brand.show_title),
    },
    layout: {
      logo_size: readNumber(
        layout.logo_size,
        defaults.layout.logo_size,
        18,
        72
      ),
      height: readNumber(layout.height, defaults.layout.height, 48, 104),
    },
    page_name: {
      visible: readBoolean(pageName.visible, defaults.page_name.visible),
    },
    actions: {
      search_icon: readString(
        actions.search_icon,
        defaults.actions.search_icon
      ),
      share_icon: readString(actions.share_icon, defaults.actions.share_icon),
    },
    search: {
      style: readEnum(
        search.style,
        TOPBAR_SEARCH_STYLES,
        defaults.search.style
      ),
      expand_behavior: readEnum(
        search.expand_behavior,
        TOPBAR_SEARCH_EXPAND_BEHAVIORS,
        defaults.search.expand_behavior
      ),
      motion: readEnum(
        search.motion,
        TOPBAR_SEARCH_MOTIONS,
        defaults.search.motion
      ),
    },
  };
}

export function writeTopbarSettings(
  guidebookSettings: Record<string, unknown> | null | undefined,
  patch: TopbarSettingsPatch
): Record<string, unknown> {
  const current = normalizeTopbarSettings(guidebookSettings);
  const next: TopbarSettings = {
    brand: { ...current.brand, ...(patch.brand ?? {}) },
    layout: { ...current.layout, ...(patch.layout ?? {}) },
    page_name: { ...current.page_name, ...(patch.page_name ?? {}) },
    actions: { ...current.actions, ...(patch.actions ?? {}) },
    search: { ...current.search, ...(patch.search ?? {}) },
  };

  return {
    ...(guidebookSettings ?? {}),
    [TOPBAR_SETTINGS_KEY]: next,
  };
}
