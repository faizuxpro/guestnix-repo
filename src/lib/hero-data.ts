import { z } from "zod";
import type { HostSocialLink, HostSocialPlatform } from "@/types/blocks";

const HOST_SOCIAL_PLATFORMS: readonly HostSocialPlatform[] = [
  "website",
  "airbnb",
  "facebook",
  "instagram",
  "twitter",
  "whatsapp",
  "youtube",
  "tiktok",
  "linkedin",
  "other",
];

export type HeroOverlayPreset = "classic" | "minimal" | "card";
export type HeroButtonStyle =
  | "tower"
  | "halo"
  | "compass"
  | "bar";
export type HeroButtonAnimation =
  | "pulse"
  | "breathe"
  | "bounce"
  | "shimmer"
  | "none";
export type HeroButtonSpeed = "slow" | "normal" | "fast";
export type HeroButtonArrowStyle =
  | "triangle"
  | "chevron"
  | "line"
  | "dots"
  | "none";
/** Logo height in px. Legacy "sm"|"md"|"lg" values are migrated on read. */
export type HeroLogoSize = number;
export const HERO_LOGO_SIZE_MIN = 32;
export const HERO_LOGO_SIZE_MAX = 200;
export const HERO_LOGO_SIZE_DEFAULT = 80;
/**
 * Logo crop shape.
 *   natural — keep the image's native aspect ratio (good for horizontal logos)
 *   rounded — square crop with variable corner radius
 *   circle  — square crop with 50% radius
 */
export type HeroLogoShape = "natural" | "rounded" | "circle";
export type HeroImageFit = "cover" | "contain";
export const HERO_LOGO_RADIUS_DEFAULT = 16;
export const HERO_GLASS_BLUR_DEFAULT = 22;
export const HERO_GLASS_BLUR_MAX = 40;
export const HERO_SOLID_BACKGROUND_OPACITY_DEFAULT = 1;
export type HeroSolidBackgroundColor = {
  enabled: boolean;
  color: string;
};
export const HERO_SOLID_BACKGROUND_COLOR_DEFAULT: HeroSolidBackgroundColor = {
  enabled: false,
  color: "#002927",
};
export type HeroGlassShadow = {
  enabled: boolean;
  color: string;
  opacity: number;
  blur: number;
  offset_x: number;
  offset_y: number;
};
export const HERO_GLASS_SHADOW_DEFAULT: HeroGlassShadow = {
  enabled: true,
  color: "#0F172A",
  opacity: 0.9,
  blur: 5,
  offset_x: -1,
  offset_y: 2,
};
export const HERO_GLASS_SHADOW_BLUR_MAX = 48;
export const HERO_GLASS_SHADOW_OFFSET_MIN = -24;
export const HERO_GLASS_SHADOW_OFFSET_MAX = 24;
export type HeroSplashBlockType =
  | "logo"
  | "title"
  | "tagline"
  | "host"
  | "contact"
  | "times"
  | "button";
export type HeroSplashContactVariant = "cards" | "chips" | "minimal" | "list";
export type HeroSplashAlign = "left" | "center" | "right";
export type HeroSplashIconStyle =
  | "plain"
  | "soft"
  | "circle"
  | "square"
  | "inverted";
export type HeroSplashIconAnimation =
  | "none"
  | "float"
  | "pulse"
  | "glow"
  | "bounce";
export type HeroSplashBlockStyle = {
  /** Empty means inherit the block's theme font. */
  font_family: string;
  font_size: number;
  font_weight: number;
  line_height: number;
  padding_top: number;
  padding_bottom: number;
  max_width: number;
  color_enabled: boolean;
  color: string;
  variant: HeroSplashContactVariant;
  icon_size: number;
  icon_align: HeroSplashAlign;
  icon_style: HeroSplashIconStyle;
  icon_animation: HeroSplashIconAnimation;
  icon_phone: string;
  icon_email: string;
  icon_address: string;
  icon_checkin: string;
  icon_checkout: string;
  card_radius: number;
  card_opacity: number;
  card_border_opacity: number;
  inherit_contact_style: boolean;
};
export type HeroSplashBlock = {
  id: HeroSplashBlockType;
  type: HeroSplashBlockType;
  visible: boolean;
  style: HeroSplashBlockStyle;
};
export type HeroSplashContainerStyle = {
  width: number;
  min_height: number;
  max_height: number;
  padding_x: number;
  padding_y: number;
  gap: number;
  align: HeroSplashAlign;
};
export const HERO_SPLASH_BLOCK_TYPES: readonly HeroSplashBlockType[] = [
  "logo",
  "title",
  "tagline",
  "host",
  "contact",
  "times",
  "button",
];
export const HERO_SPLASH_TEXT_SIZE_MIN = 10;
export const HERO_SPLASH_TEXT_SIZE_MAX = 72;
export const HERO_SPLASH_LINE_HEIGHT_MIN = 0.85;
export const HERO_SPLASH_LINE_HEIGHT_MAX = 2.2;
export const HERO_SPLASH_PADDING_MAX = 80;
export const HERO_SPLASH_WIDTH_MIN = 120;
export const HERO_SPLASH_WIDTH_MAX = 520;
export const HERO_SPLASH_ICON_SIZE_MIN = 10;
export const HERO_SPLASH_ICON_SIZE_MAX = 42;
export const HERO_SPLASH_CARD_RADIUS_MAX = 40;
export const HERO_SPLASH_CONTAINER_WIDTH_MIN = 260;
export const HERO_SPLASH_CONTAINER_WIDTH_MAX = 720;
export const HERO_SPLASH_CONTAINER_HEIGHT_MIN = 0;
export const HERO_SPLASH_CONTAINER_HEIGHT_MAX = 1600;
export const HERO_SPLASH_CONTAINER_PADDING_MAX = 80;
export const HERO_SPLASH_CONTAINER_GAP_MAX = 40;
export const HERO_SPLASH_CONTAINER_DEFAULT: HeroSplashContainerStyle = {
  width: 420,
  min_height: 0,
  max_height: 760,
  padding_x: 24,
  padding_y: 32,
  gap: 14,
  align: "center",
};
export type HeroBackgroundType = "image" | "color" | "gradient";
export type HeroBackgroundPattern =
  | "none"
  | "dots"
  | "grid"
  | "diagonal"
  | "noise";
export type HostPhotoSource = "host_avatar" | "property_logo";

export type HeroPropertyFields = {
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  country: string;
  cover_image_url: string | null;
  logo_url: string | null;
};

export type HeroHostFields = {
  name: string;
  phone: string;
  email: string;
  bio: string;
  languages: string;
  superhost: boolean;
  avatar_url: string | null;
  social: HostSocialLink[];
};

export type HeroHomeShowFlags = {
  logo: boolean;
  subtitle: boolean;
  host_name: boolean;
  phone: boolean;
  email: boolean;
  address: boolean;
  times: boolean;
};

function splashBlockStyleDefaults(
  type: HeroSplashBlockType
): HeroSplashBlockStyle {
  const base: HeroSplashBlockStyle = {
    font_family: "",
    font_size: 16,
    font_weight: 600,
    line_height: 1.3,
    padding_top: 0,
    padding_bottom: 0,
    max_width: 320,
    color_enabled: false,
    color: "#FFFFFF",
    variant: "cards",
    icon_size: 18,
    icon_align: "center",
    icon_style: "plain",
    icon_animation: "none",
    icon_phone: "lucide:phone",
    icon_email: "lucide:mail",
    icon_address: "lucide:map-pin",
    icon_checkin: "lucide:log-in",
    icon_checkout: "lucide:log-out",
    card_radius: 16,
    card_opacity: 0.55,
    card_border_opacity: 0.2,
    inherit_contact_style: false,
  };

  if (type === "title") {
    return {
      ...base,
      font_size: 38,
      font_weight: 700,
      line_height: 1.1,
      max_width: 420,
    };
  }
  if (type === "tagline") {
    return {
      ...base,
      font_size: 16,
      font_weight: 500,
      line_height: 1.55,
      max_width: 360,
    };
  }
  if (type === "host") {
    return {
      ...base,
      font_size: 17,
      font_weight: 650,
      line_height: 1.35,
      max_width: 340,
    };
  }
  if (type === "logo") {
    return {
      ...base,
      max_width: 280,
      card_opacity: 0,
      card_border_opacity: 0,
    };
  }
  if (type === "times") {
    return {
      ...base,
      font_size: 14,
      font_weight: 650,
      line_height: 1.2,
      max_width: 320,
      icon_size: 17,
      inherit_contact_style: true,
    };
  }
  if (type === "button") {
    return {
      ...base,
      font_size: 13,
      font_weight: 700,
      line_height: 1.1,
      max_width: 240,
      card_opacity: 0,
      card_border_opacity: 0,
    };
  }

  return base;
}

function defaultSplashBlockVisibility(
  type: HeroSplashBlockType,
  show?: Partial<HeroHomeShowFlags>
) {
  if (type === "logo") return show?.logo ?? true;
  if (type === "tagline") return show?.subtitle ?? true;
  if (type === "host") return show?.host_name ?? true;
  if (type === "contact") {
    return (show?.phone ?? true) || (show?.email ?? true) || (show?.address ?? true);
  }
  if (type === "times") return show?.times ?? false;
  return true;
}

export function buildDefaultSplashBlocks(
  show?: Partial<HeroHomeShowFlags>
): HeroSplashBlock[] {
  return HERO_SPLASH_BLOCK_TYPES.map((type) => ({
    id: type,
    type,
    visible: defaultSplashBlockVisibility(type, show),
    style: splashBlockStyleDefaults(type),
  }));
}

function normalizeSplashBlock(
  block: HeroSplashBlock | undefined,
  type: HeroSplashBlockType,
  show?: Partial<HeroHomeShowFlags>
): HeroSplashBlock {
  const defaults = buildDefaultSplashBlocks(show).find((item) => item.type === type)!;
  if (!block) return defaults;
  return {
    id: type,
    type,
    visible:
      typeof block.visible === "boolean" ? block.visible : defaults.visible,
    style: {
      ...defaults.style,
      ...(block.style ?? {}),
    },
  };
}

export function normalizeSplashBlocks(
  blocks: HeroSplashBlock[] | undefined,
  show?: Partial<HeroHomeShowFlags>
): HeroSplashBlock[] {
  if (!Array.isArray(blocks)) return buildDefaultSplashBlocks(show);
  const byType = new Map<HeroSplashBlockType, HeroSplashBlock>();
  for (const block of blocks) {
    const type = block?.type;
    if (type && HERO_SPLASH_BLOCK_TYPES.includes(type) && !byType.has(type)) {
      byType.set(type, block);
    }
  }

  const ordered: HeroSplashBlockType[] = [];
  for (const block of blocks) {
    const type = block?.type;
    if (type && HERO_SPLASH_BLOCK_TYPES.includes(type) && !ordered.includes(type)) {
      ordered.push(type);
    }
  }
  const missing = HERO_SPLASH_BLOCK_TYPES.filter((type) => !ordered.includes(type));

  return [...ordered, ...missing].map((type) =>
    normalizeSplashBlock(byType.get(type), type, show)
  );
}

export type HeroHostPageShowFlags = {
  avatar: boolean;
  bio: boolean;
  languages: boolean;
  superhost: boolean;
  phone: boolean;
  email: boolean;
  address: boolean;
  social: boolean;
};

export type HeroHomeBackground = {
  type: HeroBackgroundType;
  position: { x: number; y: number };
  overlay_opacity: number;
  blur: number;
  pattern: HeroBackgroundPattern;
  color: string;
  gradient_from: string;
  gradient_to: string;
  gradient_angle: number;
  /**
   * When true (default), the splash color / gradient / pattern are taken from
   * the guidebook's Brand settings instead of the custom fields on this object.
   * Hosts toggle this off to override the splash separately.
   */
  use_brand: boolean;
};

export type HeroHomeTimes = {
  checkin_label: string;
  checkin_time: string;
  checkout_label: string;
  checkout_time: string;
};

export type HeroHomeConfig = {
  preset: HeroOverlayPreset;
  button_style: HeroButtonStyle;
  button_label: string;
  button_animation: HeroButtonAnimation;
  button_speed: HeroButtonSpeed;
  button_arrow_style: HeroButtonArrowStyle;
  host_label: string;
  show: HeroHomeShowFlags;
  times: HeroHomeTimes;
  logo: {
    size: HeroLogoSize;
    shape: HeroLogoShape;
    /** 0–50, percent of half the shorter side. Used when shape === "rounded". */
    corner_radius: number;
    /**
     * "cover" fills the shape (crops if aspect ratio differs).
     * "contain" fits the whole image inside (leaves padding around it).
     * Only meaningful when shape !== "natural".
     */
    fit: HeroImageFit;
  };
  /** Background opacity for the Solid preset content panel. */
  solid_background_opacity: number;
  /** Optional custom background color for the Solid preset content panel. */
  solid_background_color: HeroSolidBackgroundColor;
  /** Backdrop-filter blur (px) for the Glass preset content panel. */
  glass_blur: number;
  /** Optional custom shadow applied to Glass preset text, logo, and icons. */
  glass_shadow: HeroGlassShadow;
  /** Ordered, splash-safe content blocks used by the home overlay. */
  splash_blocks: HeroSplashBlock[];
  /** Size and spacing for the overlay panel used by Solid and Glass. */
  overlay_container: HeroSplashContainerStyle;
  background: HeroHomeBackground;
};

export type HeroHostPageConfig = {
  photo_source: HostPhotoSource;
  photo_fit: HeroImageFit;
  show: HeroHostPageShowFlags;
};

export type HeroData = {
  property: HeroPropertyFields;
  host: HeroHostFields;
  home: HeroHomeConfig;
  host_page: HeroHostPageConfig;
};

const socialLinkSchema = z.object({
  platform: z.enum(HOST_SOCIAL_PLATFORMS as [HostSocialPlatform, ...HostSocialPlatform[]]),
  url: z.string(),
  label: z.string().optional(),
});

// Accept legacy `title`/`subtitle` keys and silently fold them into the new
// `name`/`tagline` fields so older guidebooks keep working in the editor.
const propertySchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object") return value;
    const v = value as Record<string, unknown>;
    const next: Record<string, unknown> = { ...v };
    if (next.name === undefined && typeof v.title === "string") {
      next.name = v.title;
    }
    if (next.tagline === undefined && typeof v.subtitle === "string") {
      next.tagline = v.subtitle;
    }
    delete next.title;
    delete next.subtitle;
    delete next.address_url;
    return next;
  },
  z.object({
    name: z.string().default(""),
    tagline: z.string().default(""),
    address: z.string().default(""),
    city: z.string().default(""),
    state: z.string().default(""),
    country: z.string().default(""),
    cover_image_url: z.string().nullable().default(null),
    logo_url: z.string().nullable().default(null),
  })
);

const hostSchema = z.object({
  name: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  bio: z.string().default(""),
  languages: z.string().default(""),
  superhost: z.boolean().default(false),
  avatar_url: z.string().nullable().default(null),
  social: z.array(socialLinkSchema).default([]),
});

const homeShowSchema = z.object({
  logo: z.boolean().default(true),
  subtitle: z.boolean().default(true),
  host_name: z.boolean().default(true),
  phone: z.boolean().default(true),
  email: z.boolean().default(true),
  address: z.boolean().default(true),
  times: z.boolean().default(false),
});

const homeTimesSchema = z.object({
  checkin_label: z.string().default("Check-in"),
  checkin_time: z.string().default("4:00 PM"),
  checkout_label: z.string().default("Check-out"),
  checkout_time: z.string().default("11:00 AM"),
});

// Map legacy "top"/"center"/"bottom" string into the new { x, y } shape so
// guidebooks saved before the focal-point control still render correctly.
const backgroundPositionSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      if (value === "top") return { x: 50, y: 0 };
      if (value === "bottom") return { x: 50, y: 100 };
      return { x: 50, y: 50 };
    }
    return value;
  },
  z
    .object({
      x: z.number().min(0).max(100).default(50),
      y: z.number().min(0).max(100).default(50),
    })
    .default({ x: 50, y: 50 })
);

const backgroundSchema = z
  .object({
    type: z.enum(["image", "color", "gradient"]).default("image"),
    position: backgroundPositionSchema,
    overlay_opacity: z.number().min(0).max(1).default(0.55),
    blur: z.number().min(0).max(20).default(0),
    pattern: z
      .enum(["none", "dots", "grid", "diagonal", "noise"])
      .default("none"),
    color: z.string().default("#002927"),
    gradient_from: z.string().default("#002927"),
    gradient_to: z.string().default("#0a4a47"),
    gradient_angle: z.number().min(0).max(360).default(135),
    use_brand: z.boolean().default(true),
  })
  .default({
    type: "image",
    position: { x: 50, y: 50 },
    overlay_opacity: 0.55,
    blur: 0,
    pattern: "none",
    color: "#002927",
    gradient_from: "#002927",
    gradient_to: "#0a4a47",
    gradient_angle: 135,
    use_brand: true,
  });

// Migrate legacy `logo.position` + enum `size` (sm/md/lg) into the new shape.
// Splash logo is always centred above the title now; size is a px height.
const logoSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object") return value;
    const v = value as Record<string, unknown>;
    const next: Record<string, unknown> = { ...v };
    delete (next as Record<string, unknown>).position;
    // Migrate enum -> number. Old enum values were natural-height; for the
    // circle (avatar) usage they were rendered ~1.4× larger, so the migrated
    // values land between those two so existing layouts stay close.
    if (typeof v.size === "string") {
      if (v.size === "sm") next.size = 56;
      else if (v.size === "md") next.size = 80;
      else if (v.size === "lg") next.size = 112;
      else next.size = HERO_LOGO_SIZE_DEFAULT;
    }
    // shape defaults to "circle" so existing avatar logos keep their look.
    if (typeof v.shape !== "string") next.shape = "circle";
    if (typeof v.corner_radius !== "number") {
      next.corner_radius = HERO_LOGO_RADIUS_DEFAULT;
    }
    // fit defaults to "cover" — matches the existing object-fit: cover CSS.
    if (typeof v.fit !== "string") next.fit = "cover";
    return next;
  },
  z
    .object({
      size: z
        .number()
        .min(HERO_LOGO_SIZE_MIN)
        .max(HERO_LOGO_SIZE_MAX)
        .default(HERO_LOGO_SIZE_DEFAULT),
      shape: z
        .enum(["natural", "rounded", "circle"])
        .default("circle"),
      corner_radius: z
        .number()
        .min(0)
        .max(50)
        .default(HERO_LOGO_RADIUS_DEFAULT),
      fit: z.enum(["cover", "contain"]).default("cover"),
    })
    .default({
      size: HERO_LOGO_SIZE_DEFAULT,
      shape: "circle",
      corner_radius: HERO_LOGO_RADIUS_DEFAULT,
      fit: "cover",
    })
);

const glassShadowSchema = z
  .object({
    enabled: z.boolean().default(HERO_GLASS_SHADOW_DEFAULT.enabled),
    color: z.string().default(HERO_GLASS_SHADOW_DEFAULT.color),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .default(HERO_GLASS_SHADOW_DEFAULT.opacity),
    blur: z
      .number()
      .min(0)
      .max(HERO_GLASS_SHADOW_BLUR_MAX)
      .default(HERO_GLASS_SHADOW_DEFAULT.blur),
    offset_x: z
      .number()
      .min(HERO_GLASS_SHADOW_OFFSET_MIN)
      .max(HERO_GLASS_SHADOW_OFFSET_MAX)
      .default(HERO_GLASS_SHADOW_DEFAULT.offset_x),
    offset_y: z
      .number()
      .min(HERO_GLASS_SHADOW_OFFSET_MIN)
      .max(HERO_GLASS_SHADOW_OFFSET_MAX)
      .default(HERO_GLASS_SHADOW_DEFAULT.offset_y),
  })
  .default(HERO_GLASS_SHADOW_DEFAULT);

const solidBackgroundColorSchema = z
  .object({
    enabled: z.boolean().default(HERO_SOLID_BACKGROUND_COLOR_DEFAULT.enabled),
    color: z.string().default(HERO_SOLID_BACKGROUND_COLOR_DEFAULT.color),
  })
  .default(HERO_SOLID_BACKGROUND_COLOR_DEFAULT);

const splashBlockStyleSchema = z.object({
  font_family: z.string().optional(),
  font_size: z
    .number()
    .min(HERO_SPLASH_TEXT_SIZE_MIN)
    .max(HERO_SPLASH_TEXT_SIZE_MAX)
    .optional(),
  font_weight: z.number().min(100).max(900).optional(),
  line_height: z
    .number()
    .min(HERO_SPLASH_LINE_HEIGHT_MIN)
    .max(HERO_SPLASH_LINE_HEIGHT_MAX)
    .optional(),
  padding_top: z.number().min(0).max(HERO_SPLASH_PADDING_MAX).optional(),
  padding_bottom: z.number().min(0).max(HERO_SPLASH_PADDING_MAX).optional(),
  max_width: z
    .number()
    .min(HERO_SPLASH_WIDTH_MIN)
    .max(HERO_SPLASH_WIDTH_MAX)
    .optional(),
  color_enabled: z.boolean().optional(),
  color: z.string().optional(),
  variant: z
    .enum(["cards", "chips", "minimal", "list"])
    .optional(),
  icon_size: z
    .number()
    .min(HERO_SPLASH_ICON_SIZE_MIN)
    .max(HERO_SPLASH_ICON_SIZE_MAX)
    .optional(),
  icon_align: z.enum(["left", "center", "right"]).optional(),
  icon_style: z
    .enum(["plain", "soft", "circle", "square", "inverted"])
    .optional(),
  icon_animation: z
    .enum(["none", "float", "pulse", "glow", "bounce"])
    .optional(),
  icon_phone: z.string().optional(),
  icon_email: z.string().optional(),
  icon_address: z.string().optional(),
  icon_checkin: z.string().optional(),
  icon_checkout: z.string().optional(),
  card_radius: z
    .number()
    .min(0)
    .max(HERO_SPLASH_CARD_RADIUS_MAX)
    .optional(),
  card_opacity: z.number().min(0).max(1).optional(),
  card_border_opacity: z.number().min(0).max(1).optional(),
  inherit_contact_style: z.boolean().optional(),
});

const splashBlockSchema = z
  .object({
    id: z.enum(HERO_SPLASH_BLOCK_TYPES as [HeroSplashBlockType, ...HeroSplashBlockType[]]),
    type: z.enum(HERO_SPLASH_BLOCK_TYPES as [HeroSplashBlockType, ...HeroSplashBlockType[]]),
    visible: z.boolean().default(true),
    style: splashBlockStyleSchema.default({}),
  })
  .transform((block) => ({
    ...block,
    id: block.type,
    style: {
      ...splashBlockStyleDefaults(block.type),
      ...block.style,
    },
  }));

const splashContainerSchema = z
  .object({
    width: z
      .number()
      .min(HERO_SPLASH_CONTAINER_WIDTH_MIN)
      .max(HERO_SPLASH_CONTAINER_WIDTH_MAX)
      .default(HERO_SPLASH_CONTAINER_DEFAULT.width),
    min_height: z
      .number()
      .min(HERO_SPLASH_CONTAINER_HEIGHT_MIN)
      .max(HERO_SPLASH_CONTAINER_HEIGHT_MAX)
      .default(HERO_SPLASH_CONTAINER_DEFAULT.min_height),
    max_height: z
      .number()
      .min(HERO_SPLASH_CONTAINER_HEIGHT_MIN)
      .max(HERO_SPLASH_CONTAINER_HEIGHT_MAX)
      .default(HERO_SPLASH_CONTAINER_DEFAULT.max_height),
    padding_x: z
      .number()
      .min(0)
      .max(HERO_SPLASH_CONTAINER_PADDING_MAX)
      .default(HERO_SPLASH_CONTAINER_DEFAULT.padding_x),
    padding_y: z
      .number()
      .min(0)
      .max(HERO_SPLASH_CONTAINER_PADDING_MAX)
      .default(HERO_SPLASH_CONTAINER_DEFAULT.padding_y),
    gap: z
      .number()
      .min(0)
      .max(HERO_SPLASH_CONTAINER_GAP_MAX)
      .default(HERO_SPLASH_CONTAINER_DEFAULT.gap),
    align: z.enum(["left", "center", "right"]).default("center"),
  })
  .default(HERO_SPLASH_CONTAINER_DEFAULT);

const homeSchema = z.object({
  preset: z.enum(["classic", "minimal", "card"]).default("classic"),
  button_style: z
    .preprocess(
      (v) =>
        v === "pill" || v === "solid" || v === "outline" || v === "orb"
          ? "tower"
          : v,
      z.enum(["tower", "halo", "compass", "bar"])
    )
    .default("tower"),
  button_label: z.string().default("Enter Guide"),
  button_animation: z
    .enum(["pulse", "breathe", "bounce", "shimmer", "none"])
    .default("pulse"),
  button_speed: z.enum(["slow", "normal", "fast"]).default("normal"),
  button_arrow_style: z
    .enum(["triangle", "chevron", "line", "dots", "none"])
    .default("triangle"),
  host_label: z.string().default("Hosted by"),
  show: homeShowSchema.default({
    logo: true,
    subtitle: true,
    host_name: true,
    phone: true,
    email: true,
    address: true,
    times: false,
  }),
  times: homeTimesSchema.default({
    checkin_label: "Check-in",
    checkin_time: "4:00 PM",
    checkout_label: "Check-out",
    checkout_time: "11:00 AM",
  }),
  logo: logoSchema,
  solid_background_opacity: z
    .number()
    .min(0)
    .max(1)
    .default(HERO_SOLID_BACKGROUND_OPACITY_DEFAULT),
  solid_background_color: solidBackgroundColorSchema,
  glass_blur: z
    .number()
    .min(0)
    .max(HERO_GLASS_BLUR_MAX)
    .default(HERO_GLASS_BLUR_DEFAULT),
  glass_shadow: glassShadowSchema,
  splash_blocks: z
    .array(splashBlockSchema)
    .default(buildDefaultSplashBlocks()),
  overlay_container: splashContainerSchema,
  background: backgroundSchema,
});

const hostPageShowSchema = z.object({
  avatar: z.boolean().default(true),
  bio: z.boolean().default(true),
  languages: z.boolean().default(true),
  superhost: z.boolean().default(true),
  phone: z.boolean().default(true),
  email: z.boolean().default(true),
  address: z.boolean().default(false),
  social: z.boolean().default(true),
});

const hostPageSchema = z.object({
  photo_source: z.enum(["host_avatar", "property_logo"]).default("host_avatar"),
  photo_fit: z.enum(["cover", "contain"]).default("cover"),
  show: hostPageShowSchema.default({
    avatar: true,
    bio: true,
    languages: true,
    superhost: true,
    phone: true,
    email: true,
    address: false,
    social: true,
  }),
});

const HOME_DEFAULTS: HeroHomeConfig = {
  preset: "classic",
  button_style: "tower",
  button_label: "Enter Guide",
  button_animation: "pulse",
  button_speed: "normal",
  button_arrow_style: "triangle",
  host_label: "Hosted by",
  show: {
    logo: true,
    subtitle: true,
    host_name: true,
    phone: true,
    email: true,
    address: true,
    times: false,
  },
  times: {
    checkin_label: "Check-in",
    checkin_time: "4:00 PM",
    checkout_label: "Check-out",
    checkout_time: "11:00 AM",
  },
  logo: {
    size: HERO_LOGO_SIZE_DEFAULT,
    shape: "circle",
    corner_radius: HERO_LOGO_RADIUS_DEFAULT,
    fit: "cover",
  },
  solid_background_opacity: HERO_SOLID_BACKGROUND_OPACITY_DEFAULT,
  solid_background_color: { ...HERO_SOLID_BACKGROUND_COLOR_DEFAULT },
  glass_blur: HERO_GLASS_BLUR_DEFAULT,
  glass_shadow: { ...HERO_GLASS_SHADOW_DEFAULT },
  splash_blocks: buildDefaultSplashBlocks(),
  overlay_container: { ...HERO_SPLASH_CONTAINER_DEFAULT },
  background: {
    type: "image",
    position: { x: 50, y: 50 },
    overlay_opacity: 0.55,
    blur: 0,
    pattern: "none",
    color: "#002927",
    gradient_from: "#002927",
    gradient_to: "#0a4a47",
    gradient_angle: 135,
    use_brand: true,
  },
};

const HOST_PAGE_DEFAULTS: HeroHostPageConfig = {
  photo_source: "host_avatar",
  photo_fit: "cover",
  show: {
    avatar: true,
    bio: true,
    languages: true,
    superhost: true,
    phone: true,
    email: true,
    address: false,
    social: true,
  },
};

export const heroDataSchema = z.object({
  property: propertySchema.default({
    name: "",
    tagline: "",
    address: "",
    city: "",
    state: "",
    country: "",
    cover_image_url: null,
    logo_url: null,
  }),
  host: hostSchema.default({
    name: "",
    phone: "",
    email: "",
    bio: "",
    languages: "",
    superhost: false,
    avatar_url: null,
    social: [],
  }),
  home: homeSchema.default(HOME_DEFAULTS),
  host_page: hostPageSchema.default(HOST_PAGE_DEFAULTS),
});

export const heroDataPatchSchema = z
  .object({
    property: z
      .object({
        name: z.string().optional(),
        tagline: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        cover_image_url: z.string().nullable().optional(),
        logo_url: z.string().nullable().optional(),
      })
      .partial()
      .optional(),
    host: hostSchema.partial().optional(),
    home: homeSchema
      .extend({
        show: homeShowSchema.partial(),
        times: z.object({
          checkin_label: z.string().optional(),
          checkin_time: z.string().optional(),
          checkout_label: z.string().optional(),
          checkout_time: z.string().optional(),
        }),
        logo: z
          .object({
            size: z
              .number()
              .min(HERO_LOGO_SIZE_MIN)
              .max(HERO_LOGO_SIZE_MAX)
              .optional(),
            shape: z.enum(["natural", "rounded", "circle"]).optional(),
            corner_radius: z.number().min(0).max(50).optional(),
            fit: z.enum(["cover", "contain"]).optional(),
          })
          .optional(),
        solid_background_opacity: z.number().min(0).max(1).optional(),
        solid_background_color: z
          .object({
            enabled: z.boolean().optional(),
            color: z.string().optional(),
          })
          .optional(),
        glass_blur: z
          .number()
          .min(0)
          .max(HERO_GLASS_BLUR_MAX)
          .optional(),
        glass_shadow: z
          .object({
            enabled: z.boolean().optional(),
            color: z.string().optional(),
            opacity: z.number().min(0).max(1).optional(),
            blur: z
              .number()
              .min(0)
              .max(HERO_GLASS_SHADOW_BLUR_MAX)
              .optional(),
            offset_x: z
              .number()
              .min(HERO_GLASS_SHADOW_OFFSET_MIN)
              .max(HERO_GLASS_SHADOW_OFFSET_MAX)
              .optional(),
            offset_y: z
              .number()
              .min(HERO_GLASS_SHADOW_OFFSET_MIN)
              .max(HERO_GLASS_SHADOW_OFFSET_MAX)
              .optional(),
          })
          .optional(),
        splash_blocks: z.array(splashBlockSchema).optional(),
        overlay_container: z
          .object({
            width: z
              .number()
              .min(HERO_SPLASH_CONTAINER_WIDTH_MIN)
              .max(HERO_SPLASH_CONTAINER_WIDTH_MAX)
              .optional(),
            min_height: z
              .number()
              .min(HERO_SPLASH_CONTAINER_HEIGHT_MIN)
              .max(HERO_SPLASH_CONTAINER_HEIGHT_MAX)
              .optional(),
            max_height: z
              .number()
              .min(HERO_SPLASH_CONTAINER_HEIGHT_MIN)
              .max(HERO_SPLASH_CONTAINER_HEIGHT_MAX)
              .optional(),
            padding_x: z
              .number()
              .min(0)
              .max(HERO_SPLASH_CONTAINER_PADDING_MAX)
              .optional(),
            padding_y: z
              .number()
              .min(0)
              .max(HERO_SPLASH_CONTAINER_PADDING_MAX)
              .optional(),
            gap: z
              .number()
              .min(0)
              .max(HERO_SPLASH_CONTAINER_GAP_MAX)
              .optional(),
            align: z.enum(["left", "center", "right"]).optional(),
          })
          .optional(),
        background: z
          .object({
            type: z.enum(["image", "color", "gradient"]).optional(),
            position: z
              .object({
                x: z.number().min(0).max(100).optional(),
                y: z.number().min(0).max(100).optional(),
              })
              .optional(),
            overlay_opacity: z.number().min(0).max(1).optional(),
            blur: z.number().min(0).max(20).optional(),
            pattern: z
              .enum(["none", "dots", "grid", "diagonal", "noise"])
              .optional(),
            color: z.string().optional(),
            gradient_from: z.string().optional(),
            gradient_to: z.string().optional(),
            gradient_angle: z.number().min(0).max(360).optional(),
            use_brand: z.boolean().optional(),
          })
          .optional(),
      })
      .partial()
      .optional(),
    host_page: z
      .object({
        photo_source: z.enum(["host_avatar", "property_logo"]).optional(),
        photo_fit: z.enum(["cover", "contain"]).optional(),
        show: hostPageShowSchema.partial().optional(),
      })
      .optional(),
  })
  .partial();

export const DEFAULT_HERO_DATA: HeroData = heroDataSchema.parse({});

export const DEFAULT_HOME_CONFIG = HOME_DEFAULTS;
export const DEFAULT_HOST_PAGE_CONFIG = HOST_PAGE_DEFAULTS;

export function buildHomePresetPatch(
  nextPreset: HeroOverlayPreset,
  currentPreset?: HeroOverlayPreset
): Partial<HeroHomeConfig> {
  const shadowCapablePresets: readonly HeroOverlayPreset[] = ["card", "minimal"];
  if (
    shadowCapablePresets.includes(nextPreset) &&
    !shadowCapablePresets.includes(currentPreset ?? "classic")
  ) {
    return {
      preset: nextPreset,
      glass_shadow: { ...HERO_GLASS_SHADOW_DEFAULT },
    };
  }
  return { preset: nextPreset };
}

function rawHomeHasSplashBlocks(raw: unknown) {
  if (!raw || typeof raw !== "object") return false;
  const home = (raw as { home?: unknown }).home;
  return Boolean(
    home &&
      typeof home === "object" &&
      Array.isArray((home as { splash_blocks?: unknown }).splash_blocks)
  );
}

function normalizeSplashContainerStyle(
  container: HeroSplashContainerStyle
): HeroSplashContainerStyle {
  return {
    ...HERO_SPLASH_CONTAINER_DEFAULT,
    ...container,
  };
}

function normalizeHeroDataSplashState(data: HeroData, raw: unknown): HeroData {
  const sourceBlocks = rawHomeHasSplashBlocks(raw)
    ? data.home.splash_blocks
    : buildDefaultSplashBlocks(data.home.show);
  return {
    ...data,
    home: {
      ...data.home,
      splash_blocks: normalizeSplashBlocks(sourceBlocks, data.home.show),
      overlay_container: normalizeSplashContainerStyle(data.home.overlay_container),
    },
  };
}

export function extractHeroSplashFontFamilies(
  heroData: HeroData | HeroHomeConfig | null | undefined
): string[] {
  const home = heroData && "home" in heroData ? heroData.home : heroData;
  if (!home) return [];
  return home.splash_blocks
    .map((block) => block.style.font_family.trim())
    .filter(Boolean);
}

type SeedInput = {
  guidebookTitle?: string | null;
  hostName?: string | null;
  hostEmail?: string | null;
  propertyAddress?: string | null;
  propertyCity?: string | null;
  propertyState?: string | null;
  propertyCountry?: string | null;
};

/**
 * Build pre-filled hero data for a freshly seeded guidebook.
 * Pulls real fields from profile/property when available so hosts
 * don't see a blank splash on day one.
 */
export function buildSeedHeroData(input: SeedInput): HeroData {
  const data = structuredClone(DEFAULT_HERO_DATA);
  if (input.guidebookTitle) data.property.name = input.guidebookTitle;
  if (input.propertyAddress) data.property.address = input.propertyAddress;
  if (input.propertyCity) data.property.city = input.propertyCity;
  if (input.propertyState) data.property.state = input.propertyState;
  if (input.propertyCountry) data.property.country = input.propertyCountry;
  if (input.hostName) data.host.name = input.hostName;
  if (input.hostEmail) data.host.email = input.hostEmail;
  return data;
}

/**
 * Normalize any-shape hero data from the DB into the canonical HeroData
 * structure. Missing fields are filled in with defaults; unrecognized
 * keys are dropped.
 */
export function normalizeHeroData(raw: unknown): HeroData {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_HERO_DATA);
  const result = heroDataSchema.safeParse(raw);
  if (result.success) return normalizeHeroDataSplashState(result.data, raw);
  return structuredClone(DEFAULT_HERO_DATA);
}

/**
 * Join address fields into a single human-readable string, skipping any
 * blank parts. Used for splash display and the Maps URL.
 */
export function formatFullAddress(
  property: Pick<HeroPropertyFields, "address" | "city" | "state" | "country">
): string {
  const trim = (v: string | null | undefined) => (v ?? "").trim();
  return [
    trim(property.address),
    trim(property.city),
    trim(property.state),
    trim(property.country),
  ]
    .filter((part) => part.length > 0)
    .join(", ");
}

/**
 * Address string used for nearby search. Skips the street number/road since
 * Overpass/Nominatim often can't resolve a specific street address but does
 * resolve city/state/country reliably.
 */
export function formatLocationSearchAddress(
  property: Pick<HeroPropertyFields, "city" | "state" | "country">
): string {
  const trim = (v: string | null | undefined) => (v ?? "").trim();
  return [trim(property.city), trim(property.state), trim(property.country)]
    .filter((part) => part.length > 0)
    .join(", ");
}

/**
 * Build a Google Maps directions URL for the property. On mobile the
 * platform intercepts and opens the default map app; on desktop it
 * opens maps.google.com. Returns null when there's no address text.
 */
export function buildPropertyMapHref(
  property: Pick<
    HeroPropertyFields,
    "address" | "city" | "state" | "country"
  >
): string | null {
  const full = formatFullAddress(property);
  if (!full) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    full
  )}`;
}
