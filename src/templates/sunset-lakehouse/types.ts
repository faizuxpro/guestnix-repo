import type {
  HostSocialLink,
  HostSocialPlatform,
  TextContent,
  HeadingContent,
  HeadingAdvancedStyle,
  HeadingColorRole,
  HeadingCrosshairCorners,
  HeadingCrosshairDirection,
  HeadingDecorOffset,
  HeadingDecorPosition,
  HeadingDecorWeight,
  HeadingDecorWidth,
  HeadingMarkerHeight,
  HeadingMarkerVariant,
  HeadingNodeShape,
  HeadingOrbitCount,
  HeadingOrbitShape,
  HeadingSidebarHeight,
  HeadingSidebarVariant,
  HeadingSidebarWidth,
  HeadingTaperMode,
  ImageContent,
  WifiContent,
  WifiLayout,
  WifiPasswordDisplay,
  WifiStyle,
  WidgetAnimation,
  WidgetColorRole,
  WidgetQrSize,
  ContainerChildBlock,
  ContainerChildSpacing,
  ContainerChildSurface,
  ContainerContent,
  ContainerLayout,
  ContainerPadding,
  ContainerRadius,
  ContainerStyle,
  ContainerWidth,
  FaqContent,
  DividerContent,
  DividerColorRole,
  DividerStyle,
  VideoContent,
  GalleryContent,
  IconGridContent,
  IconGridAnimation,
  IconGridColorRole,
  IconGridStyle,
  ImageCardsContent,
  ImageCardsAnimation,
  ImageCardsColorRole,
  ImageCardsImageFit,
  ImageCardsImagePlacement,
  ImageCardsImagePosition,
  ImageCardsStyle,
  TileSetContent,
  CustomHtmlContent,
  WeatherContent,
  AddPlacesContent,
  AddPlacesLayout,
  AddPlacesStyle,
  WorldClockContent,
  WorldClockLayout,
  WorldClockStyle,
  WorldClockTimeFormat,
  SmartLockContent,
  SmartLockAccessItem,
  SmartLockAccessType,
  SmartLockCodeDisplay,
  SmartLockLayout,
  SmartLockStyle,
  BookingLinkContent,
  BookingLinkLayout,
  BookingLinkStyle,
  CurrencyContent,
  EmergencyContactsContent,
  PhrasebookContent,
  PhrasebookCustomPhrase,
  PhrasebookLayout,
  PhrasebookStyle,
  ButtonContent,
  ButtonAlign,
  ButtonAnimation,
  ButtonIconPosition,
  ButtonSize,
  ButtonStyle,
  ButtonWidth,
  StreamingContent,
  BlockType,
} from "@/types/blocks";
import type { HeroData } from "@/lib/hero-data";

export type TemplateBlock = {
  id: string;
  type: BlockType | string;
  content: Record<string, unknown>;
  isVisible: boolean;
  orderIndex: number;
};

export type TemplateSectionKind = "guide" | "featured";
export type TemplateSectionDisplayMode =
  | "popup"
  | "full_page"
  | "inline"
  | "drawer";

export type TemplateSection = {
  id: string;
  title: string;
  icon: string;
  isVisible: boolean;
  orderIndex: number;
  kind: TemplateSectionKind;
  displayMode: TemplateSectionDisplayMode;
  itemSettings: Record<string, unknown>;
  blocks: TemplateBlock[];
};

export type TemplateGuidebook = {
  id: string;
  title: string;
  slug: string;
  templateId: string;
  branding?: Record<string, unknown>;
  heroData: HeroData;
};

export type TemplatePreviewFocus = {
  kind: "section_title";
  sectionId: string;
  nonce: number;
};

export type TemplatePlace = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  tags: Record<string, unknown> | null;
};

export type {
  HostSocialLink,
  HostSocialPlatform,
  TextContent,
  HeadingContent,
  HeadingAdvancedStyle,
  HeadingColorRole,
  HeadingCrosshairCorners,
  HeadingCrosshairDirection,
  HeadingDecorOffset,
  HeadingDecorPosition,
  HeadingDecorWeight,
  HeadingDecorWidth,
  HeadingMarkerHeight,
  HeadingMarkerVariant,
  HeadingNodeShape,
  HeadingOrbitCount,
  HeadingOrbitShape,
  HeadingSidebarHeight,
  HeadingSidebarVariant,
  HeadingSidebarWidth,
  HeadingTaperMode,
  ImageContent,
  WifiContent,
  WifiLayout,
  WifiPasswordDisplay,
  WifiStyle,
  WidgetAnimation,
  WidgetColorRole,
  WidgetQrSize,
  ContainerChildBlock,
  ContainerChildSpacing,
  ContainerChildSurface,
  ContainerContent,
  ContainerLayout,
  ContainerPadding,
  ContainerRadius,
  ContainerStyle,
  ContainerWidth,
  FaqContent,
  DividerContent,
  DividerColorRole,
  DividerStyle,
  VideoContent,
  GalleryContent,
  IconGridContent,
  IconGridAnimation,
  IconGridColorRole,
  IconGridStyle,
  ImageCardsContent,
  ImageCardsAnimation,
  ImageCardsColorRole,
  ImageCardsImageFit,
  ImageCardsImagePlacement,
  ImageCardsImagePosition,
  ImageCardsStyle,
  TileSetContent,
  CustomHtmlContent,
  WeatherContent,
  AddPlacesContent,
  AddPlacesLayout,
  AddPlacesStyle,
  WorldClockContent,
  WorldClockLayout,
  WorldClockStyle,
  WorldClockTimeFormat,
  SmartLockContent,
  SmartLockAccessItem,
  SmartLockAccessType,
  SmartLockCodeDisplay,
  SmartLockLayout,
  SmartLockStyle,
  BookingLinkContent,
  BookingLinkLayout,
  BookingLinkStyle,
  CurrencyContent,
  EmergencyContactsContent,
  PhrasebookContent,
  PhrasebookCustomPhrase,
  PhrasebookLayout,
  PhrasebookStyle,
  ButtonContent,
  ButtonAlign,
  ButtonAnimation,
  ButtonIconPosition,
  ButtonSize,
  ButtonStyle,
  ButtonWidth,
  StreamingContent,
};
export type { HeroData };
