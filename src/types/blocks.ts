export type BlockType =
  // Content / Media / Layout
  | "text"
  | "heading"
  | "image"
  | "video"
  | "gallery"
  | "faq"
  | "icon_grid"
  | "image_cards"
  | "tile_set"
  | "custom_html"
  | "divider"
  // Widgets
  | "wifi"
  | "container"
  | "weather"
  | "add_places"
  | "world_clock"
  | "smart_lock"
  | "booking_link"
  | "currency"
  | "emergency_contacts"
  | "phrasebook"
  | "button"
  | "streaming";

export type HostSocialPlatform =
  | "website"
  | "airbnb"
  | "facebook"
  | "instagram"
  | "twitter"
  | "whatsapp"
  | "youtube"
  | "tiktok"
  | "linkedin"
  | "other";

export interface HostSocialLink {
  platform: HostSocialPlatform;
  url: string;
  label?: string;
}

export type CalloutCardStyle =
  | "simple"
  | "hover_elevation"
  | "watermark_scale"
  | "overlapping_badge"
  | "kinetic_border"
  | "split_pane"
  | "brutalist_press"
  | "serif_shift"
  | "radar_notification"
  | "minimalist_inline"
  | "icon_box";

export type CalloutColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "ink"
  | "muted"
  | "border";

export type CalloutIconPosition = "left" | "top" | "right";

export type ContactRowsStyle =
  | "clean_cards"
  | "compact_list"
  | "accent_rail"
  | "split_panel"
  | "directory_grid"
  | "ticket_cards"
  | "floating_chips"
  | "brutalist_stamp";

export type AlertBannerStyle =
  | "classic"
  | "soft_callout"
  | "solid"
  | "side_rail"
  | "top_tape"
  | "glass"
  | "ticker"
  | "brutalist"
  | "outline";

export type ChecklistStyle =
  | "interactive_checklist"
  | "floating_cards"
  | "watermark_numbers"
  | "soft_icon_bullets"
  | "pill_checklist"
  | "brutalist_index"
  | "blur_focus"
  | "morphing_icon"
  | "swipe_fill"
  | "bookmark_ribbon"
  | "node_timeline"
  | "background_icon";

export type ChecklistNumberFont = "playfair" | "theme";

export type FactsGridStyle =
  | "basic"
  | "cinematic_banner"
  | "spinning_gradient_border"
  | "folded_ribbon"
  | "neumorphic_soft"
  | "image_top_card"
  | "dark_frosted_glass"
  | "morphing_icon"
  | "split_pill"
  | "blueprint_grid"
  | "boarding_pass"
  | "polaroid_snapshot"
  | "flip_secret"
  | "light_frosted_glass"
  | "brutalist_press"
  | "split_ticket"
  | "origami_fold";

export interface TextContent {
  html?: string;
  variant?:
    | "prose"
    | "card"
    | "facts"
    | "stack"
    | "contacts"
    | "alert"
    | "checklist"
    | "callout";
  label?: string;
  facts_style?: FactsGridStyle;
  facts?: Array<{
    label: string;
    value: string;
    note?: string;
    icon?: string;
    image_url?: string;
    badge?: string;
  }>;
  facts_config?: {
    icon_size?: number;
    accent_role?: CalloutColorRole;
    accent_color?: string;
  };
  items?: Array<{
    icon?: string;
    title: string;
    description?: string;
  }>;
  contacts?: Array<{
    icon?: string;
    label: string;
    value: string;
    href?: string;
  }>;
  contacts_style?: ContactRowsStyle;
  contacts_config?: {
    icon_size?: number;
    accent_role?: CalloutColorRole;
    accent_color?: string;
  };
  alert?: {
    label?: string;
    value?: string;
    icon?: string;
    href?: string;
  };
  alert_style?: AlertBannerStyle;
  alert_config?: {
    icon_size?: number;
    accent_role?: CalloutColorRole;
    accent_color?: string;
  };
  checklist_items?: Array<{
    icon?: string;
    text: string;
    note?: string;
  }>;
  checklist?: {
    style?: ChecklistStyle;
    icon?: string;
    icon_size?: number;
    label_enabled?: boolean;
    heading_enabled?: boolean;
    heading?: string;
    accent_role?: CalloutColorRole;
    accent_color?: string;
    number_font?: ChecklistNumberFont;
  };
  callout?: {
    eyebrow?: string;
    icon?: string;
    title?: string;
    subtitle?: string;
    action_label?: string;
    action_href?: string;
    cta_enabled?: boolean;
    card_style?: CalloutCardStyle;
    body_enabled?: boolean;
    show_icon?: boolean;
    icon_position?: CalloutIconPosition;
    icon_size?: number;
    icon_container_size?: number;
    mobile_stack?: boolean;
    accent_role?: CalloutColorRole;
    accent_color?: string;
    icon_box_gradient_start?: string;
    icon_box_gradient_end?: string;
    style_id?: string;
    style_customized?: boolean;
  };
}

export type HeadingAdvancedStyle =
  | "tapered_end"
  | "node"
  | "crossbar"
  | "wavy"
  | "frame"
  | "marker"
  | "orbits"
  | "crosshairs"
  | "grid"
  | "sidebar"
  | "zebra";

export type HeadingColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "ink"
  | "muted"
  | "border";

export type HeadingDecorPosition = "left" | "center" | "right";
export type HeadingDecorWidth = "compact" | "fit" | "wide" | "full";
export type HeadingDecorWeight = "fine" | "normal" | "bold";
export type HeadingDecorOffset = "tight" | "normal" | "loose";
export type HeadingTaperMode = "center" | "left" | "right";
export type HeadingNodeShape =
  | "diamond"
  | "circle"
  | "square"
  | "hexagon"
  | "slash"
  | "dot";
export type HeadingMarkerVariant =
  | "marker"
  | "ripped"
  | "highlight"
  | "strike";
export type HeadingMarkerHeight = "short" | "medium" | "tall";
export type HeadingOrbitShape =
  | "circle"
  | "dot"
  | "ring"
  | "dash"
  | "diamond"
  | "spark"
  | "brackets";
export type HeadingOrbitCount = 1 | 2 | 3 | 4;
export type HeadingCrosshairCorners = "two" | "four";
export type HeadingCrosshairDirection = "tl-br" | "tr-bl";
export type HeadingSidebarVariant = "rule" | "fade";
export type HeadingSidebarHeight = "text" | "full" | "tall";
export type HeadingSidebarWidth = "thin" | "medium" | "thick";

export interface HeadingContent {
  text: string;
  level: 1 | 2 | 3;
  alignment: "left" | "center" | "right";
  style?: "display";
  eyebrow?: string;
  subtitle?: string;
  eyebrow_enabled?: boolean;
  subtitle_enabled?: boolean;
  tone?: "default" | "accent" | "muted";
  show_divider?: false;
  advanced_enabled?: boolean;
  advanced_style?: HeadingAdvancedStyle;
  accent_role?: HeadingColorRole;
  accent_color?: string;
  decor_position?: HeadingDecorPosition;
  decor_width?: HeadingDecorWidth;
  decor_weight?: HeadingDecorWeight;
  decor_offset?: HeadingDecorOffset;
  decor_motion?: boolean;
  decor_angle?: number;
  taper_mode?: HeadingTaperMode;
  node_shape?: HeadingNodeShape;
  marker_variant?: HeadingMarkerVariant;
  marker_height?: HeadingMarkerHeight;
  orbit_shape?: HeadingOrbitShape;
  orbit_count?: HeadingOrbitCount;
  orbit_taper?: boolean;
  crosshair_corners?: HeadingCrosshairCorners;
  crosshair_direction?: HeadingCrosshairDirection;
  sidebar_variant?: HeadingSidebarVariant;
  sidebar_height?: HeadingSidebarHeight;
  sidebar_width?: HeadingSidebarWidth;
  heading_style_id?: string;
  heading_style_customized?: boolean;
}

export interface ImageContent {
  url: string;
  alt: string;
  caption: string;
  fit: "cover" | "contain";
  frame?: "none" | "card" | "soft";
  ratio?: "auto" | "16/9" | "4/3" | "3/2" | "1/1";
}

export type DividerStyle =
  | "line"
  | "space"
  | "dots"
  | "wave"
  | "flourish"
  | "laurel"
  | "medallion"
  | "scallop"
  | "starburst"
  | "keyline";

export type DividerColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "ink"
  | "muted"
  | "border";

export interface DividerContent {
  style: DividerStyle;
  spacing: "small" | "medium" | "large";
  config?: {
    accent_role?: DividerColorRole;
    accent_color?: string;
  };
}

export interface VideoContent {
  url: string;
  /** @deprecated Provider is detected from the URL or pasted iframe src. */
  provider?:
    | "youtube"
    | "vimeo"
    | "dailymotion"
    | "tiktok"
    | "facebook"
    | "instagram"
    | "loom"
    | "direct"
    | "other";
  /** @deprecated Video blocks no longer show a separate title. */
  title?: string;
  source?: "service" | "upload";
}

export interface GalleryContent {
  images: Array<{ url: string; alt: string; caption: string }>;
  layout: "slider" | "grid" | "masonry";
}

export type FaqStyle =
  | "basic"
  | "elevated_minimalist"
  | "left_icon_grid"
  | "detached_card"
  | "side_split"
  | "layered_offset"
  | "popout_focus"
  | "connected_timeline"
  | "editorial_magazine"
  | "conversation_bubbles"
  | "folder_tab";

export type FaqColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "ink"
  | "muted"
  | "border";

export interface FaqContent {
  style?: FaqStyle;
  config?: {
    accent_role?: FaqColorRole;
    accent_color?: string;
  };
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export type IconGridStyle =
  | "classic"
  | "numbered_minimal"
  | "inverse"
  | "brutalist"
  | "neon"
  | "radial"
  | "pulse"
  | "gradient_overlap";

export type IconGridColorRole = "primary" | "secondary" | "accent";

export type IconGridAnimation =
  | "style_default"
  | "none"
  | "float"
  | "tick"
  | "glitch"
  | "glow"
  | "morph"
  | "pulse";

export interface IconGridContent {
  style?: IconGridStyle;
  config?: {
    accent_role?: IconGridColorRole;
    accent_color?: string;
    animation?: IconGridAnimation;
  };
  items: Array<{
    icon?: string;
    title: string;
    description?: string;
  }>;
}

export interface ImageCardsContent {
  style?: ImageCardsStyle;
  config?: {
    accent_role?: ImageCardsColorRole;
    accent_color?: string;
    animation?: ImageCardsAnimation;
    image_fit?: ImageCardsImageFit;
    image_position?: ImageCardsImagePosition;
  };
  cards: Array<{
    image_url: string;
    alt?: string;
    title: string;
    description?: string;
    icon?: string;
    cta_enabled?: boolean;
    cta_label?: string;
    cta_href?: string;
  }>;
}

export type ImageCardsStyle =
  | "classic"
  | "horizontal_list"
  | "cinematic_overlay"
  | "offset_float"
  | "inset_minimal"
  | "organic_icon_mask"
  | "diagonal_slant"
  | "wave_reveal"
  | "hex_intersect";

export type ImageCardsColorRole = "primary" | "secondary" | "accent";

export type ImageCardsImageFit = "cover" | "contain";

export type ImageCardsImagePosition =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right";

export type ImageCardsAnimation =
  | "style_default"
  | "none"
  | "lift"
  | "zoom"
  | "reveal"
  | "float"
  | "rotate"
  | "glow";

export type TileSetStyle =
  | "basic"
  | "soft_cards"
  | "solid_icon"
  | "outline_grid"
  | "pill_cloud"
  | "bento"
  | "numbered"
  | "ticket"
  | "glass"
  | "brutalist";

export interface TileSetContent {
  title?: string;
  style?: TileSetStyle;
  config?: {
    icon_size?: number;
    accent_role?: CalloutColorRole;
    accent_color?: string;
  };
  tiles: Array<{
    icon?: string;
    label: string;
  }>;
}

export interface CustomHtmlContent {
  html: string;
}

// ─── Widget content schemas ──────────────────────────────────────────

export interface WifiContent {
  network_name: string;
  password: string;
  show_qr: boolean;
  notes: string;
  style?: WifiStyle;
  title?: string;
  eyebrow?: string;
  icon?: string;
  config?: {
    accent_role?: WidgetColorRole;
    accent_color?: string;
    qr_size?: WidgetQrSize;
    layout?: WifiLayout;
    password_display?: WifiPasswordDisplay;
    animation?: WidgetAnimation;
  };
}

export type WidgetColorRole = "primary" | "secondary" | "accent";

export type WidgetAnimation =
  | "style_default"
  | "none"
  | "lift"
  | "glow"
  | "pulse";

export type WifiStyle =
  | "brand_card"
  | "light_card"
  | "split_qr"
  | "ticket"
  | "minimal"
  | "terminal"
  | "glass"
  | "brutalist";

export type WifiLayout = "stacked" | "split" | "compact";
export type WidgetQrSize = "small" | "medium" | "large";
export type WifiPasswordDisplay = "plain" | "code" | "hidden";

export interface ContainerContent {
  title?: string;
  subtitle?: string;
  icon?: string;
  style?: ContainerStyle;
  config?: {
    accent_role?: WidgetColorRole;
    accent_color?: string;
    layout?: ContainerLayout;
    width?: ContainerWidth;
    padding?: ContainerPadding;
    radius?: ContainerRadius;
    child_spacing?: ContainerChildSpacing;
    child_surface?: ContainerChildSurface;
    inherit_accent?: boolean;
    inherit_typography?: boolean;
    show_header?: boolean;
    animation?: WidgetAnimation;
  };
  children?: ContainerChildBlock[];
}

export type ContainerStyle =
  | "clean_panel"
  | "section_card"
  | "soft_band"
  | "glass_panel"
  | "dark_panel"
  | "outline"
  | "ticket"
  | "brutalist";

export type ContainerLayout = "stacked" | "grid" | "two_column" | "compact";
export type ContainerWidth = "full" | "contained" | "narrow";
export type ContainerPadding = "none" | "small" | "medium" | "large";
export type ContainerRadius = "none" | "small" | "medium" | "large";
export type ContainerChildSpacing = "tight" | "normal" | "loose";
export type ContainerChildSurface = "original" | "blend" | "cards";

export interface ContainerChildBlock {
  id: string;
  type: BlockType | string;
  content: Record<string, unknown>;
  orderIndex: number;
  isVisible: boolean;
}

export interface WeatherContent {
  location_label: string;
  lat: number;
  lng: number;
  units: "celsius" | "fahrenheit";
  forecast_days: 1 | 3 | 5;
}

export type AddPlacesStyle =
  | "clean_grid"
  | "photo_cards"
  | "compact_list"
  | "magazine";

export type AddPlacesLayout = "grid" | "list" | "compact";

export interface AddPlacesContent {
  title?: string;
  subtitle?: string;
  selection_mode?: "all" | "custom";
  place_ids?: string[];
  style?: AddPlacesStyle;
  config?: {
    accent_role?: WidgetColorRole;
    accent_color?: string;
    layout?: AddPlacesLayout;
    show_images?: boolean;
    show_category?: boolean;
    show_description?: boolean;
    show_address?: boolean;
    show_actions?: boolean;
    full_details?: boolean;
    animation?: WidgetAnimation;
  };
}

export interface WorldClockContent {
  title?: string;
  subtitle?: string;
  style?: WorldClockStyle;
  icon?: string;
  config?: {
    accent_role?: WidgetColorRole;
    accent_color?: string;
    layout?: WorldClockLayout;
    time_format?: WorldClockTimeFormat;
    show_date?: boolean;
    show_timezone?: boolean;
    animation?: WidgetAnimation;
  };
  clocks: Array<{
    label: string;
    timezone: string; // IANA, e.g. "Europe/London"
    note?: string;
  }>;
}

export type WorldClockStyle =
  | "clean_cards"
  | "timezone_board"
  | "compact_list"
  | "dark_panel"
  | "ticket"
  | "glass"
  | "brutalist";

export type WorldClockLayout = "grid" | "list" | "compact";
export type WorldClockTimeFormat = "12h" | "24h";

export interface SmartLockContent {
  title: string;
  subtitle?: string;
  code: string;
  reveal_at: string | null; // ISO datetime; null = always visible
  instructions: string;
  icon?: string;
  style?: SmartLockStyle;
  items?: SmartLockAccessItem[];
  config?: {
    accent_role?: WidgetColorRole;
    accent_color?: string;
    layout?: SmartLockLayout;
    code_display?: SmartLockCodeDisplay;
    show_copy?: boolean;
    animation?: WidgetAnimation;
  };
}

export type SmartLockAccessType =
  | "door"
  | "gate"
  | "garage"
  | "lockbox"
  | "alarm"
  | "wifi"
  | "other";

export interface SmartLockAccessItem {
  type?: SmartLockAccessType;
  label: string;
  code: string;
  reveal_at?: string | null;
  instructions?: string;
  icon?: string;
}

export type SmartLockStyle =
  | "secure_card"
  | "access_stack"
  | "split_panel"
  | "minimal"
  | "dark_panel"
  | "ticket"
  | "brutalist";

export type SmartLockLayout = "stacked" | "grid" | "compact";
export type SmartLockCodeDisplay = "large_code" | "masked" | "chips";

export interface BookingLinkContent {
  label: string;
  url: string;
  platform: "airbnb" | "vrbo" | "booking" | "direct" | "other";
  subtitle?: string;
  style?: BookingLinkStyle;
  icon?: string;
  config?: {
    accent_role?: WidgetColorRole | "platform";
    accent_color?: string;
    layout?: BookingLinkLayout;
    show_platform?: boolean;
    show_icon?: boolean;
    animation?: WidgetAnimation;
  };
}

export type BookingLinkStyle =
  | "clean_card"
  | "brand_banner"
  | "split_panel"
  | "minimal_row"
  | "ticket"
  | "glass"
  | "brutalist";

export type BookingLinkLayout = "horizontal" | "stacked" | "compact";

export interface CurrencyContent {
  base: string; // ISO 4217, e.g. "EUR"
  targets: string[]; // ISO 4217 codes
  default_amount: number;
}

export interface EmergencyContactsContent {
  country: string; // ISO 3166-1 alpha-2, e.g. "US"
  custom_contacts: Array<{
    icon?: string;
    label: string;
    phone: string;
  }>;
}

export interface PhrasebookContent {
  language: string; // BCP-47 / ISO 639-1, e.g. "es", "fr"
  title?: string;
  subtitle?: string;
  style?: PhrasebookStyle;
  icon?: string;
  custom_phrases?: PhrasebookCustomPhrase[];
  config?: {
    accent_role?: WidgetColorRole;
    accent_color?: string;
    layout?: PhrasebookLayout;
    show_pronunciation?: boolean;
    show_category_counts?: boolean;
    animation?: WidgetAnimation;
  };
  categories: Array<
    "greetings" | "dining" | "transport" | "emergency" | "shopping" | "directions"
  >;
}

export interface PhrasebookCustomPhrase {
  category?: string;
  en: string;
  local: string;
  pronunciation?: string;
}

export type PhrasebookStyle =
  | "accordion"
  | "phrase_cards"
  | "travel_deck"
  | "compact_table"
  | "dark_panel"
  | "glass"
  | "brutalist";

export type PhrasebookLayout = "accordion" | "grid" | "list";

export interface ButtonContent {
  label: string;
  action: "url" | "phone" | "email";
  value: string;
  style: ButtonStyle;
  icon?: string;
  config?: {
    accent_role?: WidgetColorRole;
    accent_color?: string;
    size?: ButtonSize;
    width?: ButtonWidth;
    align?: ButtonAlign;
    icon_position?: ButtonIconPosition;
    animation?: ButtonAnimation;
  };
}

export type ButtonStyle =
  | "primary"
  | "outline"
  | "ghost"
  | "soft"
  | "gradient"
  | "pill"
  | "split"
  | "underline"
  | "card"
  | "brutalist";

export type ButtonSize = "small" | "medium" | "large";
export type ButtonWidth = "auto" | "full";
export type ButtonAlign = "left" | "center" | "right";
export type ButtonIconPosition = "left" | "right";
export type ButtonAnimation =
  | "style_default"
  | "none"
  | "lift"
  | "pulse"
  | "glow"
  | "slide";

export interface StreamingContent {
  services: Array<{
    service:
      | "netflix"
      | "disney_plus"
      | "hulu"
      | "apple_tv"
      | "prime"
      | "hbo"
      | "spotify"
      | "youtube"
      | "other";
    login_mode: "account" | "pairing_code" | "open" | "wifi_only";
    instructions: string;
  }>;
}
