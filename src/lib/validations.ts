import { z } from "zod";
import {
  BOTTOM_NAV_ACTIVE_FOREGROUND_ROLES,
  BOTTOM_NAV_ACTIVE_STYLES,
  BOTTOM_NAV_BADGE_COLOR_ROLES,
  BOTTOM_NAV_BADGE_STYLES,
  BOTTOM_NAV_BRAND_ROLES,
  BOTTOM_NAV_CONTAINER_STYLES,
  BOTTOM_NAV_DOCK_MODES,
  BOTTOM_NAV_ITEM_LAYOUTS,
  BOTTOM_NAV_LABEL_CASES,
  BOTTOM_NAV_LABEL_VISIBILITIES,
  BOTTOM_NAV_MOTIONS,
} from "@/lib/bottom-nav-settings";
import {
  TOPBAR_LOGO_MODES,
  TOPBAR_SEARCH_EXPAND_BEHAVIORS,
  TOPBAR_SEARCH_MOTIONS,
  TOPBAR_SEARCH_STYLES,
} from "@/lib/topbar-settings";
import { hasDuplicateBuiltinSlots } from "@/lib/bottom-nav";
import { BLOCK_TYPES, PLACE_CATEGORIES } from "@/lib/constants";
import { STORE_LISTING_STYLES } from "@/lib/store/settings";
import { GUIDEBOOK_LOADER_VARIANTS } from "@/lib/guidebook-loader-settings";
import { QUICK_VARIABLE_TYPES } from "@/lib/quick-variables";
import { GUIDEBOOK_FAVICON_SOURCES } from "@/lib/guidebook-favicon";
import { BOTTOM_NAV_MAX, BOTTOM_NAV_MIN } from "@/types/bottom-nav";
import type { BlockType } from "@/types/blocks";
import { heroDataPatchSchema } from "@/lib/hero-data";

// ─── Properties ──────────────────────────────────────
export const createPropertySchema = z.object({
  name: z.string().min(1, "Property name is required").max(100),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  timezone: z.string().max(50).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

// ─── Guidebooks ──────────────────────────────────────
export const createGuidebookSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  propertyId: z.string().uuid().optional(),
  templateId: z.string().default("sunset-lakehouse"),
});

const contentUnitMetaSchema = z.object({
  kind: z.enum(["guide", "featured"]).optional(),
  displayMode: z.enum(["popup", "full_page", "inline", "drawer"]).optional(),
  itemSettings: z.record(z.string(), z.unknown()).optional(),
});

const contentUnitsSchema = z.record(z.string(), contentUnitMetaSchema);
const sectionCoverDesignSchema = z.record(z.string(), z.unknown());
const topbarSettingsSchema = z
  .object({
    brand: z
      .object({
        logo_mode: z.enum(TOPBAR_LOGO_MODES).optional(),
        logo_url: z.string().max(2048).nullable().optional(),
        show_title: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    layout: z
      .object({
        logo_size: z.number().int().min(18).max(72).optional(),
        height: z.number().int().min(48).max(104).optional(),
      })
      .passthrough()
      .optional(),
    page_name: z
      .object({
        visible: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    actions: z
      .object({
        search_icon: z.string().max(20000).optional(),
        share_icon: z.string().max(20000).optional(),
      })
      .passthrough()
      .optional(),
    search: z
      .object({
        style: z.enum(TOPBAR_SEARCH_STYLES).optional(),
        expand_behavior: z.enum(TOPBAR_SEARCH_EXPAND_BEHAVIORS).optional(),
        motion: z.enum(TOPBAR_SEARCH_MOTIONS).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
const faviconSettingsSchema = z
  .object({
    source: z.enum(GUIDEBOOK_FAVICON_SOURCES).optional(),
    custom_url: z.string().max(2048).nullable().optional(),
  })
  .passthrough();
const bottomNavDesignSettingsSchema = z
  .object({
    dock: z
      .object({
        mode: z.enum(BOTTOM_NAV_DOCK_MODES).optional(),
      })
      .passthrough()
      .optional(),
    container: z
      .object({
        style: z.enum(BOTTOM_NAV_CONTAINER_STYLES).optional(),
        solid_color_role: z.enum(BOTTOM_NAV_BRAND_ROLES).optional(),
        radius: z.number().min(0).max(40).optional(),
        shadow: z.number().min(0).max(4).optional(),
        border: z.number().min(0).max(3).optional(),
        blur: z.number().min(0).max(28).optional(),
        opacity: z.number().min(0.45).max(1).optional(),
      })
      .passthrough()
      .optional(),
    spacing: z
      .object({
        height: z.number().min(48).max(104).optional(),
        side_inset: z.number().min(0).max(48).optional(),
        bottom_offset: z.number().min(0).max(56).optional(),
        clearance: z.number().min(0).max(120).optional(),
        max_width: z.number().min(280).max(1600).optional(),
        padding_x: z.number().min(0).max(28).optional(),
        padding_y: z.number().min(0).max(20).optional(),
        item_gap: z.number().min(0).max(24).optional(),
        safe_area: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    item: z
      .object({
        layout: z.enum(BOTTOM_NAV_ITEM_LAYOUTS).optional(),
        label_visibility: z.enum(BOTTOM_NAV_LABEL_VISIBILITIES).optional(),
        label_case: z.enum(BOTTOM_NAV_LABEL_CASES).optional(),
        icon_scale: z.number().min(0.4).max(2.5).optional(),
        label_size_override: z.boolean().optional(),
        label_size: z.number().min(8).max(16).optional(),
        height: z.number().min(36).max(80).optional(),
        radius: z.number().min(0).max(48).optional(),
      })
      .passthrough()
      .optional(),
    active: z
      .object({
        style: z.enum(BOTTOM_NAV_ACTIVE_STYLES).optional(),
        background_role: z.enum(BOTTOM_NAV_BRAND_ROLES).optional(),
        foreground_role: z.enum(BOTTOM_NAV_ACTIVE_FOREGROUND_ROLES).optional(),
        padding_x: z.number().min(0).max(28).optional(),
      })
      .passthrough()
      .optional(),
    badge: z
      .object({
        style: z.enum(BOTTOM_NAV_BADGE_STYLES).optional(),
        color_role: z.enum(BOTTOM_NAV_BADGE_COLOR_ROLES).optional(),
      })
      .passthrough()
      .optional(),
    behavior: z
      .object({
        show_during_intro: z.boolean().optional(),
        motion: z.enum(BOTTOM_NAV_MOTIONS).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
const sectionHeaderSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    show_icon: z.boolean().optional(),
    show_title: z.boolean().optional(),
    show_link: z.boolean().optional(),
    align: z.enum(["left", "center", "right"]).optional(),
    density: z.enum(["compact", "comfortable"]).optional(),
    background: z.enum(["brand", "solid", "transparent"]).optional(),
    sticky: z.boolean().optional(),
    back_icon: z.string().max(20000).optional(),
    link_icon: z.string().max(20000).optional(),
    back_icon_size: z.number().min(14).max(30).optional(),
    link_icon_size: z.number().min(14).max(30).optional(),
    icon_style: z
      .enum(["plain", "soft", "circle", "square", "inverted"])
      .optional(),
  })
  .passthrough();
const sectionIndexSettingsSchema = z
  .object({
    layout: z.enum(["grid", "list", "bento", "masonry"]).optional(),
    intro: z
      .object({
        enabled: z.boolean().optional(),
        eyebrow: z.string().max(80).optional(),
        title: z.string().max(120).optional(),
        subtitle: z.string().max(240).optional(),
      })
      .optional(),
    card: z
      .object({
        style: z
          .enum(["surface", "outline", "elevated", "solid_brand"])
          .optional(),
        solid_color_role: z.enum(["primary", "secondary", "accent"]).optional(),
        radius: z.number().min(0).max(36).optional(),
        shadow: z.number().min(0).max(4).optional(),
        padding: z.number().min(8).max(32).optional(),
      })
      .passthrough()
      .optional(),
    spacing: z
      .object({
        gap: z.number().min(4).max(36).optional(),
        page_x: z.number().min(0).max(48).optional(),
        page_top: z.number().min(0).max(72).optional(),
        page_bottom: z.number().min(0).max(96).optional(),
        max_width: z.number().min(320).max(1200).optional(),
      })
      .passthrough()
      .optional(),
    grid: z
      .object({
        icon_placement: z
          .enum(["top", "left", "right", "hidden"])
          .optional(),
        card_min_width: z.number().min(112).max(320).optional(),
        card_min_height: z.number().min(72).max(220).optional(),
      })
      .passthrough()
      .optional(),
    list: z
      .object({
        icon_placement: z.enum(["left", "right", "hidden"]).optional(),
        row_height: z.number().min(48).max(128).optional(),
        show_arrow: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    masonry: z
      .object({
        icon_placement: z
          .enum(["top", "left", "right", "hidden"])
          .optional(),
        card_min_width: z.number().min(112).max(320).optional(),
        card_min_height: z.number().min(72).max(240).optional(),
        rhythm: z.enum(["subtle", "balanced", "mixed"]).optional(),
      })
      .passthrough()
      .optional(),
    bento: z
      .object({
        icon_placement: z
          .enum(["top", "left", "right", "hidden"])
          .optional(),
        card_min_width: z.number().min(112).max(320).optional(),
        card_min_height: z.number().min(72).max(240).optional(),
        pattern: z.enum(["compact", "balanced", "showcase"]).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
const nearbySettingsSchema = z.object({
  show_map: z.boolean().optional(),
  center_lat: z.number().optional(),
  center_lng: z.number().optional(),
  zoom: z.number().optional(),
  categories: z.array(z.string()).optional(),
  location_name: z.string().max(200).nullable().optional(),
  radius_miles: z.number().optional(),
  places_limit: z.number().int().optional(),
  search_categories: z.array(z.string()).optional(),
  intro: z
    .object({
      enabled: z.boolean().optional(),
      eyebrow: z.string().max(80).optional(),
      title: z.string().max(120).optional(),
      subtitle: z.string().max(240).optional(),
    })
    .optional(),
});
const storeIntroSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    eyebrow: z.string().max(80).optional(),
    title: z.string().max(120).optional(),
    subtitle: z.string().max(240).optional(),
  })
  .passthrough();
const guidebookStoreSettingsSchema = z
  .object({
    intro: storeIntroSettingsSchema.optional(),
    listingStyle: z.enum(STORE_LISTING_STYLES).optional(),
  })
  .passthrough();
const chatWidgetSettingsSchema = z.object({
  placement: z
    .enum([
      "bottom-right",
      "bottom-center",
      "bottom-left",
      "top-right",
      "top-center",
      "top-left",
    ])
    .optional(),
  offsetY: z.number().int().min(0).max(240).optional(),
  size: z.enum(["small", "medium", "large"]).optional(),
  motion: z.enum(["lively", "calm", "off"]).optional(),
  bubbleShape: z.enum(["auto", "side", "center"]).optional(),
  glow: z.enum(["breathe", "still", "off"]).optional(),
  colorMode: z.enum(["multicolor", "brand"]).optional(),
});
const loaderHexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);
const customFontSchema = z
  .object({
    family: z.string().min(1).max(80),
    source: z.enum(["google", "upload"]),
    url: z.string().url().max(2048).optional(),
    format: z.enum(["woff2", "woff", "ttf", "otf"]).optional(),
    weights: z.array(z.number().int().min(100).max(900)).max(10).optional(),
    italics: z.boolean().optional(),
  })
  .refine(
    (font) =>
      font.source !== "upload" ||
      (typeof font.url === "string" && font.url.length > 0),
    { message: "Uploaded fonts require a url", path: ["url"] }
  );
const guidebookLoaderSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    variant: z.enum(GUIDEBOOK_LOADER_VARIANTS).optional(),
    title: z.string().max(120).optional(),
    subtitle: z.string().max(180).optional(),
    background_color: loaderHexColor.optional(),
    background_color_override: z.boolean().optional(),
    foreground_color: loaderHexColor.optional(),
    foreground_color_override: z.boolean().optional(),
    accent_color: loaderHexColor.optional(),
    accent_color_override: z.boolean().optional(),
    animation_size: z.number().int().min(48).max(240).optional(),
    glow_opacity: z.number().int().min(0).max(100).optional(),
    show_logo: z.boolean().optional(),
    logo_url: z.string().url().max(2048).nullable().optional(),
    custom_asset_url: z.string().url().max(2048).nullable().optional(),
    heading_font: z.string().max(80).optional(),
    body_font: z.string().max(80).optional(),
    custom_fonts: z.array(customFontSchema).max(20).optional(),
  })
  .passthrough();
const headingStylesSettingsSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(80),
        name: z.string().trim().min(1).max(80),
        content: z.record(z.string(), z.unknown()),
      })
      .passthrough()
  )
  .max(60);
const calloutCardStylesSettingsSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(80),
        name: z.string().trim().min(1).max(80),
        content: z.record(z.string(), z.unknown()),
      })
      .passthrough()
  )
  .max(60);
const quickVariableValueSchema = z
  .object({
    value: z.string().max(500),
    enabled: z.boolean().optional(),
    sensitive: z.boolean().optional(),
    reveal_at: z.string().max(120).nullable().optional(),
    expires_at: z.string().max(120).nullable().optional(),
  })
  .passthrough();
const quickVariableCustomDefinitionSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9_]{1,47}$/),
    label: z.string().trim().min(1).max(80),
    type: z.enum(QUICK_VARIABLE_TYPES),
    sensitive: z.boolean(),
    order_index: z.number().int().min(0).max(999),
    enabled: z.boolean(),
  })
  .passthrough();
const quickVariablesSettingsSchema = z
  .object({
    schema_version: z.literal(1).optional(),
    values: z.record(z.string(), quickVariableValueSchema).optional(),
    custom: z.array(quickVariableCustomDefinitionSchema).max(20).optional(),
    updated_at: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    draft: z
      .object({
        values: z.record(z.string(), quickVariableValueSchema).optional(),
        custom: z.array(quickVariableCustomDefinitionSchema).max(20).optional(),
        updated_at: z.string().nullable().optional(),
        updated_by: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
    live: z
      .object({
        values: z.record(z.string(), quickVariableValueSchema).optional(),
        custom: z.array(quickVariableCustomDefinitionSchema).max(20).optional(),
        pushed_at: z.string().nullable().optional(),
        pushed_by: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
const updateGuidebookHexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);
const updateGuidebookGradientSchema = z
  .object({
    from: updateGuidebookHexColor,
    to: updateGuidebookHexColor,
    angle: z.number().min(0).max(360),
  })
  .nullable();

export const updateGuidebookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens"
    )
    .optional(),
  templateId: z.string().optional(),
  propertyId: z.string().uuid().nullable().optional(),
  branding: z
    .object({
      logo_url: z.string().url().nullable().optional(),
      primary_color: updateGuidebookHexColor.optional(),
      secondary_color: updateGuidebookHexColor.optional(),
      accent_color: updateGuidebookHexColor.optional(),
      brand_gradient: updateGuidebookGradientSchema.optional(),
      background_color: updateGuidebookHexColor.optional(),
      background_gradient: updateGuidebookGradientSchema.optional(),
      background_pattern: z
        .enum(["none", "dots", "grid", "diagonal", "noise"])
        .optional(),
      background_pattern_strength: z.number().min(0).max(1).optional(),
      font_family: z.string().max(80).optional(),
      heading_font: z.string().max(80).optional(),
      body_font: z.string().max(80).optional(),
      heading_scale: z.number().min(0.3).max(4).optional(),
      body_scale: z.number().min(0.3).max(4).optional(),
      heading_weight: z.number().int().min(100).max(900).optional(),
      body_weight: z.number().int().min(100).max(900).optional(),
      heading_letter_spacing: z.number().min(-0.2).max(0.3).optional(),
      body_letter_spacing: z.number().min(-0.2).max(0.3).optional(),
      heading_line_height: z.number().min(0.7).max(2.5).optional(),
      body_line_height: z.number().min(0.7).max(3).optional(),
      icon_scale_feature: z.number().min(0.2).max(4).optional(),
      icon_scale_nav: z.number().min(0.2).max(4).optional(),
      show_guestnix_branding: z.boolean().optional(),
    })
    .optional(),
  heroData: heroDataPatchSchema.optional(),
  settings: z
    .object({
      custom_domain: z.string().nullable().optional(),
      custom_subdomain: z.string().nullable().optional(),
      demo_enabled: z.boolean().optional(),
      pwa_enabled: z.boolean().optional(),
      ai_chat_enabled: z.boolean().optional(),
      password_protected: z.boolean().optional(),
      password: z.string().nullable().optional(),
      password_hash: z.string().nullable().optional(),
      content_units: contentUnitsSchema.optional(),
      favicon: faviconSettingsSchema.optional(),
      topbar: topbarSettingsSchema.optional(),
      bottom_nav_design: bottomNavDesignSettingsSchema.optional(),
      section_cover_design: sectionCoverDesignSchema.optional(),
      section_header: sectionHeaderSettingsSchema.optional(),
      section_index: sectionIndexSettingsSchema.optional(),
      nearby: nearbySettingsSchema.optional(),
      store: guidebookStoreSettingsSchema.optional(),
      chat_widget: chatWidgetSettingsSchema.optional(),
      loading_screen: guidebookLoaderSettingsSchema.optional(),
      heading_styles: headingStylesSettingsSchema.optional(),
      heading_style_default_id: z.string().min(1).max(80).nullable().optional(),
      callout_card_styles: calloutCardStylesSettingsSchema.optional(),
      callout_card_style_default_id: z
        .string()
        .min(1)
        .max(80)
        .nullable()
        .optional(),
      quick_variables: quickVariablesSettingsSchema.optional(),
    })
    .optional(),
});

export const inviteGuidebookEditorSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(320),
});

export const createOwnershipTransferSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(320),
  keepPreviousOwnerAsEditor: z.boolean().default(true),
});

// ─── Sections ────────────────────────────────────────
export const createSectionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(100).default("New Section"),
  icon: z.string().default(""),
  orderIndex: z.number().int().min(0).optional(),
});

export const updateSectionSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  icon: z.string().optional(),
  isVisible: z.boolean().optional(),
});

export const reorderSectionsSchema = z.object({
  sections: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int().min(0),
    })
  ),
});

// ─── Blocks ──────────────────────────────────────────
const blockTypeValues = Object.values(BLOCK_TYPES) as [BlockType, ...BlockType[]];
const blockTypeEnum = z.enum(blockTypeValues);

export const createBlockSchema = z.object({
  id: z.string().uuid().optional(),
  sectionId: z.string().uuid(),
  guidebookId: z.string().uuid(),
  type: blockTypeEnum,
  content: z.record(z.string(), z.unknown()).default({}),
  orderIndex: z.number().int().min(0).optional(),
});

export const updateBlockSchema = z.object({
  content: z.record(z.string(), z.unknown()).optional(),
  isVisible: z.boolean().optional(),
});

export const reorderBlocksSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int().min(0),
    })
  ),
});

// --- Assets Hub --------------------------------------
export const hostAssetTypeEnum = z.enum([
  "content_block",
  "media",
  "brand_kit",
  "host_profile",
  "property_asset",
  "property_host_profile",
  "local_recommendation",
  "section_template",
]);

export const createHostAssetSchema = z.object({
  assetType: hostAssetTypeEnum,
  name: z.string().trim().min(1, "Name is required").max(160),
  description: z.string().trim().max(1200).optional().nullable(),
  content: z.record(z.string(), z.unknown()).default({}),
  fileUrl: z.string().url().max(2048).optional().nullable(),
  fileName: z.string().trim().max(255).optional().nullable(),
  mimeType: z.string().trim().max(120).optional().nullable(),
  fileSize: z.number().int().min(0).max(50_000_000).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(60)).max(24).default([]),
});

export const updateHostAssetSchema = createHostAssetSchema.partial();

// --- Places ------------------------------------------
const placeCategoryEnum = z.enum(PLACE_CATEGORIES);

export const createPlaceSchema = z.object({
  name: z.string().min(1).max(150),
  category: placeCategoryEnum.default("other"),
  description: z.string().max(2000).optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  email: z.string().email().max(320).optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
  tags: z.record(z.string(), z.unknown()).optional(),
  openingHours: z.string().max(200).optional().nullable(),
});

export const updatePlaceSchema = createPlaceSchema.partial();

// ─── Analytics ───────────────────────────────────────
export const analyticsEventTypeEnum = z.enum([
  "page_view",
  "section_click",
  "share",
  "chat_open",
  "chat_message",
  "place_click",
  "outbound_link",
  "featured_page_viewed",
  "store_viewed",
  "store_item_selected",
  "store_request_submitted",
  "store_request_opened",
  "store_message_sent",
  "store_payment_proof_submitted",
]);

export const trackAnalyticsSchema = z.object({
  guidebookId: z.string().uuid(),
  eventType: analyticsEventTypeEnum,
  visitorId: z.string().min(1).max(64).optional(),
  deviceType: z.enum(["mobile", "tablet", "desktop"]).optional(),
  referrer: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ─── Bottom Nav ──────────────────────────────────────
const bottomNavBaseFields = {
  label: z.string().min(1).max(40),
  icon: z.string().max(20000),
};

export const bottomNavSlotSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("home"), ...bottomNavBaseFields }),
  z.object({ type: z.literal("guide"), ...bottomNavBaseFields }),
  z.object({ type: z.literal("nearby"), ...bottomNavBaseFields }),
  z.object({ type: z.literal("host"), ...bottomNavBaseFields }),
  z.object({ type: z.literal("store"), ...bottomNavBaseFields }),
  z.object({
    type: z.literal("section"),
    sectionId: z.string().uuid(),
    ...bottomNavBaseFields,
  }),
  z.object({
    type: z.literal("link"),
    url: z.string().url(),
    ...bottomNavBaseFields,
  }),
]);

export const bottomNavSchema = z
  .array(bottomNavSlotSchema)
  .min(BOTTOM_NAV_MIN)
  .max(BOTTOM_NAV_MAX)
  .refine((slots) => !hasDuplicateBuiltinSlots(slots), {
    message: "Each built-in bottom nav destination can only appear once.",
  });

// ─── Guidebook settings + branding (for auto-save) ──
const hexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);
const gradientSchema = z
  .object({
    from: hexColor,
    to: hexColor,
    angle: z.number().min(0).max(360),
  })
  .nullable();

export const brandingSchema = z.object({
  logo_url: z.string().url().nullable().optional(),

  // Colors
  primary_color: hexColor.optional(),
  secondary_color: hexColor.optional(),
  accent_color: hexColor.optional(),
  brand_gradient: gradientSchema.optional(),

  // Background
  background_color: hexColor.optional(),
  background_gradient: gradientSchema.optional(),
  background_pattern: z
    .enum(["none", "dots", "grid", "diagonal", "noise"])
    .optional(),
  background_pattern_strength: z.number().min(0).max(1).optional(),
  topbar_background_inherit: z.boolean().optional(),
  topbar_background_color: hexColor.optional(),
  topbar_background_gradient: gradientSchema.optional(),
  topbar_background_pattern: z
    .enum(["none", "dots", "grid", "diagonal", "noise"])
    .optional(),
  topbar_background_pattern_strength: z.number().min(0).max(1).optional(),
  section_background_inherit: z.boolean().optional(),
  section_background_color: hexColor.optional(),
  section_background_gradient: gradientSchema.optional(),
  section_background_pattern: z
    .enum(["none", "dots", "grid", "diagonal", "noise"])
    .optional(),
  section_background_pattern_strength: z.number().min(0).max(1).optional(),

  // Typography
  font_family: z.string().max(80).optional(), // legacy
  heading_font: z.string().max(80).optional(),
  body_font: z.string().max(80).optional(),
  heading_scale: z.number().min(0.3).max(4).optional(),
  body_scale: z.number().min(0.3).max(4).optional(),
  heading_weight: z.number().int().min(100).max(900).optional(),
  body_weight: z.number().int().min(100).max(900).optional(),
  heading_letter_spacing: z.number().min(-0.2).max(0.3).optional(),
  body_letter_spacing: z.number().min(-0.2).max(0.3).optional(),
  heading_line_height: z.number().min(0.7).max(2.5).optional(),
  body_line_height: z.number().min(0.7).max(3).optional(),

  // Sizing
  icon_scale_feature: z.number().min(0.2).max(4).optional(),
  icon_scale_nav: z.number().min(0.2).max(4).optional(),

  // Misc
  show_guestnix_branding: z.boolean().optional(),

  // Custom fonts — host-added Google fonts (beyond the catalog) plus
  // uploaded font files. Each entry's `family` becomes a CSS font-family
  // that hosts can then pick for heading/body in TypographyTab.
  custom_fonts: z.array(customFontSchema).max(20).optional(),
});

export const guidebookSettingsSchema = z.object({
  pwa_enabled: z.boolean().optional(),
  demo_enabled: z.boolean().optional(),
  ai_chat_enabled: z.boolean().optional(),
  password_protected: z.boolean().optional(),
  password: z.string().max(100).nullable().optional(),
  password_hash: z.string().max(255).nullable().optional(),
  custom_subdomain: z.string().max(63).nullable().optional(),
  custom_domain: z.string().max(253).nullable().optional(),
  content_units: contentUnitsSchema.optional(),
  favicon: faviconSettingsSchema.optional(),
  topbar: topbarSettingsSchema.optional(),
  bottom_nav_design: bottomNavDesignSettingsSchema.optional(),
  section_cover_design: sectionCoverDesignSchema.optional(),
  section_header: sectionHeaderSettingsSchema.optional(),
  section_index: sectionIndexSettingsSchema.optional(),
  nearby: nearbySettingsSchema.optional(),
  store: guidebookStoreSettingsSchema.optional(),
  chat_widget: chatWidgetSettingsSchema.optional(),
  loading_screen: guidebookLoaderSettingsSchema.optional(),
  heading_styles: headingStylesSettingsSchema.optional(),
  heading_style_default_id: z.string().min(1).max(80).nullable().optional(),
  callout_card_styles: calloutCardStylesSettingsSchema.optional(),
  callout_card_style_default_id: z
    .string()
    .min(1)
    .max(80)
    .nullable()
    .optional(),
  quick_variables: quickVariablesSettingsSchema.optional(),
  languages: z
    .object({
      enabled: z.boolean(),
      base_language: z.string().min(2).max(10),
      available: z.array(z.string().min(2).max(10)).max(50),
    })
    .optional(),
});

// ─── Chat ────────────────────────────────────────────
export const createChatSessionSchema = z.object({
  guidebookSlug: z.string().min(1).max(80),
  guestName: z.string().max(80).optional().nullable(),
});

export const contactHostSchema = z.object({
  guestName: z.string().trim().min(1, "Name is required").max(80),
  guestEmail: z.string().trim().email("Enter a valid email").max(320),
  content: z.string().trim().min(1, "Message is required").max(4000),
});

export const sendGuestMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export const hostReplySchema = z.object({
  content: z.string().min(1).max(4000),
  aiEnabled: z.boolean().optional(),
  sendResumeLinkEmail: z.boolean().optional(),
});

export const updateThreadSchema = z.object({
  aiEnabled: z.boolean().optional(),
  markRead: z.boolean().optional(),
  archive: z.enum(["host", "ai"]).optional(),
});

export const aiSettingsSchema = z.object({
  /** null = unlimited; otherwise a positive integer cap. */
  aiMessageCap: z
    .number()
    .int()
    .min(1, "Cap must be at least 1")
    .max(1_000_000, "Cap is unreasonably large")
    .nullable(),
});

export const profileSettingsSchema = z.object({
  fullName: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().max(100, "Full name must be 100 characters or fewer").nullable()
  ),
  avatarUrl: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().url("Avatar must be a valid URL").max(2048).nullable()
  ),
});

export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type ContactHostInput = z.infer<typeof contactHostSchema>;
export type SendGuestMessageInput = z.infer<typeof sendGuestMessageSchema>;
export type HostReplyInput = z.infer<typeof hostReplySchema>;
export type UpdateThreadInput = z.infer<typeof updateThreadSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;
export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;

// ─── Billing ─────────────────────────────────────────
const planKeyEnum = z.enum(["solo", "plus", "pro", "scale"]);
const billingIntervalEnum = z.enum(["month", "year"]);

export const startTrialSchema = z.object({
  plan: planKeyEnum,
  interval: billingIntervalEnum.default("month"),
});

export const checkoutSchema = z.object({
  plan: planKeyEnum,
  interval: billingIntervalEnum.default("month"),
  couponCode: z.string().trim().min(1).max(64).optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1).max(64),
});

export type StartTrialInput = z.infer<typeof startTrialSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

// ─── Types ───────────────────────────────────────────
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreateGuidebookInput = z.infer<typeof createGuidebookSchema>;
export type UpdateGuidebookInput = z.infer<typeof updateGuidebookSchema>;
export type InviteGuidebookEditorInput = z.infer<
  typeof inviteGuidebookEditorSchema
>;
export type CreateOwnershipTransferInput = z.infer<
  typeof createOwnershipTransferSchema
>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
export type HostAssetType = z.infer<typeof hostAssetTypeEnum>;
export type CreateHostAssetInput = z.infer<typeof createHostAssetSchema>;
export type UpdateHostAssetInput = z.infer<typeof updateHostAssetSchema>;
export type CreatePlaceInput = z.infer<typeof createPlaceSchema>;
export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;
export type AnalyticsEventType = z.infer<typeof analyticsEventTypeEnum>;
export type TrackAnalyticsInput = z.infer<typeof trackAnalyticsSchema>;
export type BottomNavSlotInput = z.infer<typeof bottomNavSlotSchema>;
export type BottomNavInput = z.infer<typeof bottomNavSchema>;
export type BrandingInput = z.infer<typeof brandingSchema>;
export type GuidebookSettingsInput = z.infer<typeof guidebookSettingsSchema>;
