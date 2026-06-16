export const BOTTOM_NAV_DESIGN_SETTINGS_KEY = "bottom_nav_design";

export type BottomNavDockMode = "floating" | "attached" | "centered";
export type BottomNavContainerStyle =
  | "brand"
  | "surface"
  | "glass"
  | "outline"
  | "solid_brand"
  | "minimal";
export type BottomNavBrandRole = "primary" | "secondary" | "accent";
export type BottomNavActiveStyle =
  | "pill"
  | "underline"
  | "dot"
  | "icon_ring"
  | "none";
export type BottomNavActiveForegroundRole =
  | BottomNavBrandRole
  | "auto_contrast";
export type BottomNavItemLayout = "stacked" | "inline";
export type BottomNavLabelVisibility = "show" | "hide" | "active";
export type BottomNavLabelCase = "uppercase" | "title" | "none";
export type BottomNavBadgeStyle = "count" | "dot" | "hidden";
export type BottomNavBadgeColorRole =
  | "danger"
  | BottomNavBrandRole;
export type BottomNavMotion = "normal" | "reduced" | "off";

export type BottomNavDesignSettings = {
  dock: {
    mode: BottomNavDockMode;
  };
  container: {
    style: BottomNavContainerStyle;
    solid_color_role: BottomNavBrandRole;
    radius: number;
    shadow: number;
    border: number;
    blur: number;
    opacity: number;
  };
  spacing: {
    height: number;
    side_inset: number;
    bottom_offset: number;
    clearance: number;
    max_width: number;
    padding_x: number;
    padding_y: number;
    item_gap: number;
    safe_area: boolean;
  };
  item: {
    layout: BottomNavItemLayout;
    label_visibility: BottomNavLabelVisibility;
    label_case: BottomNavLabelCase;
    icon_scale: number;
    label_size_override: boolean;
    label_size: number;
    height: number;
    radius: number;
  };
  active: {
    style: BottomNavActiveStyle;
    background_role: BottomNavBrandRole;
    foreground_role: BottomNavActiveForegroundRole;
    padding_x: number;
  };
  badge: {
    style: BottomNavBadgeStyle;
    color_role: BottomNavBadgeColorRole;
  };
  behavior: {
    show_during_intro: boolean;
    motion: BottomNavMotion;
  };
};

export type BottomNavDesignSettingsPatch = {
  dock?: Partial<BottomNavDesignSettings["dock"]>;
  container?: Partial<BottomNavDesignSettings["container"]>;
  spacing?: Partial<BottomNavDesignSettings["spacing"]>;
  item?: Partial<BottomNavDesignSettings["item"]>;
  active?: Partial<BottomNavDesignSettings["active"]>;
  badge?: Partial<BottomNavDesignSettings["badge"]>;
  behavior?: Partial<BottomNavDesignSettings["behavior"]>;
};

export const BOTTOM_NAV_DOCK_MODES = [
  "floating",
  "attached",
  "centered",
] as const;
export const BOTTOM_NAV_CONTAINER_STYLES = [
  "brand",
  "surface",
  "glass",
  "outline",
  "solid_brand",
  "minimal",
] as const;
export const BOTTOM_NAV_BRAND_ROLES = [
  "primary",
  "secondary",
  "accent",
] as const;
export const BOTTOM_NAV_ACTIVE_STYLES = [
  "pill",
  "underline",
  "dot",
  "icon_ring",
  "none",
] as const;
export const BOTTOM_NAV_ACTIVE_FOREGROUND_ROLES = [
  "auto_contrast",
  "primary",
  "secondary",
  "accent",
] as const;
export const BOTTOM_NAV_ITEM_LAYOUTS = ["stacked", "inline"] as const;
export const BOTTOM_NAV_LABEL_VISIBILITIES = [
  "show",
  "hide",
  "active",
] as const;
export const BOTTOM_NAV_LABEL_CASES = [
  "uppercase",
  "title",
  "none",
] as const;
export const BOTTOM_NAV_BADGE_STYLES = ["count", "dot", "hidden"] as const;
export const BOTTOM_NAV_BADGE_COLOR_ROLES = [
  "danger",
  "primary",
  "secondary",
  "accent",
] as const;
export const BOTTOM_NAV_MOTIONS = ["normal", "reduced", "off"] as const;

export const DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS: BottomNavDesignSettings = {
  dock: {
    mode: "floating",
  },
  container: {
    style: "brand",
    solid_color_role: "primary",
    radius: 20,
    shadow: 2,
    border: 0,
    blur: 0,
    opacity: 1,
  },
  spacing: {
    height: 66,
    side_inset: 10,
    bottom_offset: 10,
    clearance: 16,
    max_width: 1600,
    padding_x: 8,
    padding_y: 0,
    item_gap: 8,
    safe_area: true,
  },
  item: {
    layout: "stacked",
    label_visibility: "show",
    label_case: "uppercase",
    icon_scale: 1,
    label_size_override: false,
    label_size: 9.3,
    height: 50,
    radius: 40,
  },
  active: {
    style: "pill",
    background_role: "accent",
    foreground_role: "primary",
    padding_x: 0,
  },
  badge: {
    style: "count",
    color_role: "danger",
  },
  behavior: {
    show_during_intro: false,
    motion: "normal",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
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

function readLegacyIconScale(value: unknown) {
  return readNumber(
    value,
    DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.icon_scale,
    0.4,
    2.5
  );
}

export function normalizeBottomNavDesignSettings(
  guidebookSettings: Record<string, unknown> | null | undefined,
  options: { legacyIconScale?: unknown } = {}
): BottomNavDesignSettings {
  const raw = isRecord(guidebookSettings?.[BOTTOM_NAV_DESIGN_SETTINGS_KEY])
    ? (guidebookSettings[BOTTOM_NAV_DESIGN_SETTINGS_KEY] as Record<
        string,
        unknown
      >)
    : {};
  const dock = isRecord(raw.dock) ? raw.dock : {};
  const container = isRecord(raw.container) ? raw.container : {};
  const spacing = isRecord(raw.spacing) ? raw.spacing : {};
  const item = isRecord(raw.item) ? raw.item : {};
  const active = isRecord(raw.active) ? raw.active : {};
  const badge = isRecord(raw.badge) ? raw.badge : {};
  const behavior = isRecord(raw.behavior) ? raw.behavior : {};
  const legacyIconScale = readLegacyIconScale(options.legacyIconScale);

  return {
    dock: {
      mode: readEnum(
        dock.mode,
        BOTTOM_NAV_DOCK_MODES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.dock.mode
      ),
    },
    container: {
      style: readEnum(
        container.style,
        BOTTOM_NAV_CONTAINER_STYLES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.container.style
      ),
      solid_color_role: readEnum(
        container.solid_color_role,
        BOTTOM_NAV_BRAND_ROLES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.container.solid_color_role
      ),
      radius: readNumber(
        container.radius,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.container.radius,
        0,
        40
      ),
      shadow: readNumber(
        container.shadow,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.container.shadow,
        0,
        4
      ),
      border: readNumber(
        container.border,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.container.border,
        0,
        3
      ),
      blur: readNumber(
        container.blur,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.container.blur,
        0,
        28
      ),
      opacity: readNumber(
        container.opacity,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.container.opacity,
        0.45,
        1
      ),
    },
    spacing: {
      height: readNumber(
        spacing.height,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.height,
        48,
        104
      ),
      side_inset: readNumber(
        spacing.side_inset,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.side_inset,
        0,
        48
      ),
      bottom_offset: readNumber(
        spacing.bottom_offset,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.bottom_offset,
        0,
        56
      ),
      clearance: readNumber(
        spacing.clearance,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.clearance,
        0,
        120
      ),
      max_width: readNumber(
        spacing.max_width,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.max_width,
        280,
        1600
      ),
      padding_x: readNumber(
        spacing.padding_x,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.padding_x,
        0,
        28
      ),
      padding_y: readNumber(
        spacing.padding_y,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.padding_y,
        0,
        20
      ),
      item_gap: readNumber(
        spacing.item_gap,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.item_gap,
        0,
        24
      ),
      safe_area: readBoolean(
        spacing.safe_area,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.safe_area
      ),
    },
    item: {
      layout: readEnum(
        item.layout,
        BOTTOM_NAV_ITEM_LAYOUTS,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.layout
      ),
      label_visibility: readEnum(
        item.label_visibility,
        BOTTOM_NAV_LABEL_VISIBILITIES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.label_visibility
      ),
      label_case: readEnum(
        item.label_case,
        BOTTOM_NAV_LABEL_CASES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.label_case
      ),
      icon_scale: readNumber(item.icon_scale, legacyIconScale, 0.4, 2.5),
      label_size_override: readBoolean(
        item.label_size_override,
        typeof item.label_size === "number" &&
          item.label_size !== DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.label_size
      ),
      label_size: readNumber(
        item.label_size,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.label_size,
        8,
        16
      ),
      height: readNumber(
        item.height,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.height,
        36,
        80
      ),
      radius: readNumber(
        item.radius,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.radius,
        0,
        48
      ),
    },
    active: {
      style: readEnum(
        active.style,
        BOTTOM_NAV_ACTIVE_STYLES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.active.style
      ),
      background_role: readEnum(
        active.background_role,
        BOTTOM_NAV_BRAND_ROLES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.active.background_role
      ),
      foreground_role: readEnum(
        active.foreground_role,
        BOTTOM_NAV_ACTIVE_FOREGROUND_ROLES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.active.foreground_role
      ),
      padding_x: readNumber(
        active.padding_x,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.active.padding_x,
        0,
        28
      ),
    },
    badge: {
      style: readEnum(
        badge.style,
        BOTTOM_NAV_BADGE_STYLES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.badge.style
      ),
      color_role: readEnum(
        badge.color_role,
        BOTTOM_NAV_BADGE_COLOR_ROLES,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.badge.color_role
      ),
    },
    behavior: {
      show_during_intro: readBoolean(
        behavior.show_during_intro,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.behavior.show_during_intro
      ),
      motion: readEnum(
        behavior.motion,
        BOTTOM_NAV_MOTIONS,
        DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.behavior.motion
      ),
    },
  };
}

export function writeBottomNavDesignSettings(
  guidebookSettings: Record<string, unknown> | null | undefined,
  patch: BottomNavDesignSettingsPatch,
  options: { legacyIconScale?: unknown } = {}
): Record<string, unknown> {
  const current = normalizeBottomNavDesignSettings(guidebookSettings, options);
  const next: BottomNavDesignSettings = {
    dock: { ...current.dock, ...(patch.dock ?? {}) },
    container: { ...current.container, ...(patch.container ?? {}) },
    spacing: { ...current.spacing, ...(patch.spacing ?? {}) },
    item: { ...current.item, ...(patch.item ?? {}) },
    active: { ...current.active, ...(patch.active ?? {}) },
    badge: { ...current.badge, ...(patch.badge ?? {}) },
    behavior: { ...current.behavior, ...(patch.behavior ?? {}) },
  };

  return {
    ...(guidebookSettings ?? {}),
    [BOTTOM_NAV_DESIGN_SETTINGS_KEY]: next,
  };
}

function px(value: number) {
  return `${value}px`;
}

function brandColor(role: BottomNavBrandRole) {
  return `var(--${role})`;
}

function brandContrast(role: BottomNavBrandRole) {
  return `var(--${role}-contrast)`;
}

function shadowValue(value: number) {
  if (value <= 0) return "none";
  if (value <= 1) return "0 8px 24px -16px rgba(0, 0, 0, 0.25)";
  if (value <= 2) {
    return "0 12px 40px -12px rgba(var(--primary-rgb), 0.55), 0 4px 14px rgba(0, 0, 0, 0.08)";
  }
  if (value <= 3) {
    return "0 18px 48px -18px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.12)";
  }
  return "0 24px 60px -20px rgba(0, 0, 0, 0.5), 0 12px 28px rgba(0, 0, 0, 0.16)";
}

function containerColors(container: BottomNavDesignSettings["container"]) {
  if (container.style === "solid_brand") {
    const role = container.solid_color_role;
    return {
      background: brandColor(role),
      foreground: `color-mix(in srgb, ${brandContrast(role)} 70%, transparent)`,
      hover: brandContrast(role),
      border: `color-mix(in srgb, ${brandContrast(role)} 22%, transparent)`,
    };
  }

  if (container.style === "surface") {
    return {
      background: "rgba(255, 255, 255, var(--sl-bottomnav-opacity))",
      foreground: "color-mix(in srgb, var(--primary) 72%, transparent)",
      hover: "var(--primary)",
      border: "rgba(10, 35, 33, 0.08)",
    };
  }

  if (container.style === "glass") {
    return {
      background: "rgba(255, 255, 255, calc(var(--sl-bottomnav-opacity) * 0.72))",
      foreground: "color-mix(in srgb, var(--primary) 72%, transparent)",
      hover: "var(--primary)",
      border: "rgba(255, 255, 255, 0.52)",
    };
  }

  if (container.style === "outline") {
    return {
      background: "rgba(255, 255, 255, calc(var(--sl-bottomnav-opacity) * 0.54))",
      foreground: "color-mix(in srgb, var(--primary) 68%, transparent)",
      hover: "var(--primary)",
      border: "color-mix(in srgb, var(--primary) 20%, transparent)",
    };
  }

  if (container.style === "minimal") {
    return {
      background: "transparent",
      foreground: "color-mix(in srgb, var(--primary) 70%, transparent)",
      hover: "var(--primary)",
      border: "transparent",
    };
  }

  return {
    background: "var(--brand-surface, var(--primary))",
    foreground: "rgba(255, 255, 255, 0.65)",
    hover: "rgba(255, 255, 255, 0.9)",
    border: "transparent",
  };
}

function badgeBackground(role: BottomNavBadgeColorRole) {
  return role === "danger" ? "#e1295a" : brandColor(role);
}

function badgeForeground(role: BottomNavBadgeColorRole) {
  return role === "danger" ? "#ffffff" : brandContrast(role);
}

export function createBottomNavRootVars(
  settings: BottomNavDesignSettings
): Record<string, string> {
  return {
    "--sl-bottomnav-height": px(settings.spacing.height),
    "--sl-bottomnav-edge-gap": px(settings.spacing.bottom_offset),
    "--sl-bottomnav-clearance": px(settings.spacing.clearance),
    "--sl-bottomnav-safe-area": settings.spacing.safe_area
      ? "env(safe-area-inset-bottom, 0px)"
      : "0px",
  };
}

export function createBottomNavElementVars(
  settings: BottomNavDesignSettings
): Record<string, string> {
  const colors = containerColors(settings.container);
  const activeBackground = brandColor(settings.active.background_role);
  const activeForeground =
    settings.active.foreground_role === "auto_contrast"
      ? brandContrast(settings.active.background_role)
      : brandColor(settings.active.foreground_role);

  return {
    "--sl-bottomnav-side-inset": px(settings.spacing.side_inset),
    "--sl-bottomnav-max-width": px(settings.spacing.max_width),
    "--sl-bottomnav-padding-x": px(settings.spacing.padding_x),
    "--sl-bottomnav-padding-y": px(settings.spacing.padding_y),
    "--sl-bottomnav-item-gap": px(settings.spacing.item_gap),
    "--sl-bottomnav-radius": px(settings.container.radius),
    "--sl-bottomnav-shadow": shadowValue(settings.container.shadow),
    "--sl-bottomnav-border-width": px(settings.container.border),
    "--sl-bottomnav-border-color": colors.border,
    "--sl-bottomnav-blur": px(settings.container.blur),
    "--sl-bottomnav-opacity": String(settings.container.opacity),
    "--sl-bottomnav-bg": colors.background,
    "--sl-bottomnav-fg": colors.foreground,
    "--sl-bottomnav-hover-fg": colors.hover,
    "--sl-bottomnav-active-bg": activeBackground,
    "--sl-bottomnav-active-fg": activeForeground,
    "--sl-bottomnav-active-contrast": brandContrast(
      settings.active.background_role
    ),
    "--sl-bottomnav-active-padding-x": px(settings.active.padding_x),
    "--sl-bottomnav-item-height": px(settings.item.height),
    "--sl-bottomnav-item-radius": px(settings.item.radius),
    "--sl-bottomnav-icon-scale": String(settings.item.icon_scale),
    "--sl-bottomnav-label-size": settings.item.label_size_override
      ? px(settings.item.label_size)
      : `calc(${px(
          DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.label_size
        )} * var(--secondary-font-scale))`,
    "--sl-bottomnav-badge-bg": badgeBackground(settings.badge.color_role),
    "--sl-bottomnav-badge-fg": badgeForeground(settings.badge.color_role),
  };
}
