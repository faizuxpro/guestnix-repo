"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ImageIcon,
  LayoutGrid,
  List,
  Paintbrush,
  PanelsTopLeft,
  Rows3,
  Settings2,
  Type,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEditorStore } from "@/stores/editor-store";
import { cn } from "@/lib/utils";
import {
  SECTION_COVER_DESIGN_SETTINGS_KEY,
  SECTION_COVER_TITLE_SHADOW_BLUR_MAX,
  SECTION_COVER_TITLE_SHADOW_OFFSET_MAX,
  SECTION_COVER_TITLE_SHADOW_OFFSET_MIN,
  normalizeSectionCoverSettings,
  type SectionCoverDesignSettings,
  type SectionCoverHeight,
  type SectionCoverSettings,
  type SectionCoverTitleShadow,
  type SectionCoverTitleAlign,
  type SectionCoverTitleCornerStyle,
  type SectionCoverTitlePosition,
  type SectionCoverTitleStyle,
} from "@/lib/section-cover";
import {
  SECTION_INDEX_SETTINGS_KEY,
  normalizeSectionIndexSettings,
  type SectionIndexBrandRole,
  type SectionIndexBentoPattern,
  type SectionIndexBentoSettings,
  type SectionIndexCardSettings,
  type SectionIndexCardStyle,
  type SectionIndexGridSettings,
  type SectionIndexIconPlacement,
  type SectionIndexIntroSettings,
  type SectionIndexLayout,
  type SectionIndexListIconPlacement,
  type SectionIndexListSettings,
  type SectionIndexSpacingSettings,
} from "@/lib/section-settings";
import { FeaturedDetailHeader } from "./featured/controls/PanelHeader";
import {
  Disclosure,
  SegmentedControl,
  SelectRow,
  SettingsField,
  SettingsSection,
} from "./featured/controls/SettingsField";
import { ToggleRow } from "./settings-ui";
import { PremiumSlider } from "./featured/controls/PremiumSlider";
import { ColorPicker } from "./featured/controls/ColorPicker";
import { SectionHeaderSettingsEditor } from "./SectionHeaderSettingsEditor";

type Props = {
  onBack: () => void;
  focusTarget?: SectionWideSettingsFocusTarget | null;
  previewSectionId?: string | null;
};

export type SectionWideSettingsFocusTarget =
  | "section-cover"
  | "section-header"
  | "section-index-intro"
  | "section-index-layout"
  | "section-index-cards";

type DisplayModeValue = "popup" | "full_page" | "mixed";

type CoverPreset = {
  id: string;
  label: string;
  patch: Partial<SectionCoverDesignSettings>;
};

const COVER_PRESETS: CoverPreset[] = [
  {
    id: "solid-bottom",
    label: "Solid bottom",
    patch: {
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
    },
  },
  {
    id: "glass-center",
    label: "Glass center",
    patch: {
      height: "medium",
      overlay_opacity: 0,
      title_position: "center",
      title_align: "center",
      title_style: "glass",
      title_bg_color: "#f2f4f4",
      title_color: "#1f2937",
      title_font_size: 30,
      title_bg_width: 80,
      title_box_width: 100,
      title_radius: 5,
      title_corner_style: "rounded",
    },
  },
  {
    id: "top-band",
    label: "Top band",
    patch: {
      height: "medium",
      overlay_opacity: 0.12,
      title_position: "top",
      title_align: "center",
      title_style: "solid",
      title_bg_color: "#002927",
      title_color: "#ffffff",
      title_font_size: 24,
      title_bg_width: 70,
      title_box_width: 100,
      title_radius: 18,
      title_corner_style: "bottom",
    },
  },
  {
    id: "minimal-bottom",
    label: "Minimal bottom",
    patch: {
      height: "compact",
      overlay_opacity: 0.34,
      title_position: "bottom",
      title_align: "left",
      title_style: "minimal",
      title_bg_color: "#ffffff",
      title_color: "#ffffff",
      title_font_size: 25,
      title_bg_width: 0,
      title_box_width: 78,
      title_radius: 0,
      title_corner_style: "sharp",
    },
  },
  {
    id: "outline-right",
    label: "Outline right",
    patch: {
      height: "compact",
      overlay_opacity: 0.45,
      title_position: "center",
      title_align: "center",
      title_style: "outline",
      title_bg_color: "#ffffff",
      title_color: "#ffffff",
      title_font_size: 31,
      title_bg_width: 75,
      title_box_width: 94,
      title_radius: 0,
      title_corner_style: "sharp",
    },
  },
];

const COVER_HEIGHT_OPTIONS: Array<{ value: SectionCoverHeight; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "medium", label: "Medium" },
  { value: "tall", label: "Tall" },
];

const COVER_TITLE_POSITION_OPTIONS: Array<{
  value: SectionCoverTitlePosition;
  label: string;
}> = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

const COVER_TITLE_ALIGN_OPTIONS: Array<{
  value: SectionCoverTitleAlign;
  label: string;
}> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const COVER_TITLE_STYLE_OPTIONS: Array<{
  value: SectionCoverTitleStyle;
  label: string;
}> = [
  { value: "solid", label: "Solid" },
  { value: "glass", label: "Glass" },
  { value: "minimal", label: "Minimal" },
  { value: "outline", label: "Outline" },
];

const COVER_TITLE_CORNER_OPTIONS: Array<{
  value: SectionCoverTitleCornerStyle;
  label: string;
}> = [
  { value: "sharp", label: "Sharp" },
  { value: "top", label: "Top only" },
  { value: "bottom", label: "Bottom only" },
  { value: "rounded", label: "All corners" },
];

const CARD_STYLE_OPTIONS: Array<{
  value: SectionIndexCardStyle;
  label: string;
}> = [
  { value: "surface", label: "Surface" },
  { value: "outline", label: "Outline" },
  { value: "elevated", label: "Elevated" },
  { value: "solid_brand", label: "Solid brand" },
];

const BRAND_ROLE_OPTIONS: Array<{
  value: SectionIndexBrandRole;
  label: string;
}> = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "accent", label: "Accent" },
];

const ICON_PLACEMENT_OPTIONS: Array<{
  value: SectionIndexIconPlacement;
  label: string;
}> = [
  { value: "top", label: "Top" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "hidden", label: "Hidden" },
];

const LIST_ICON_PLACEMENT_OPTIONS: Array<{
  value: SectionIndexListIconPlacement;
  label: string;
}> = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "hidden", label: "Hidden" },
];

const BENTO_PATTERN_OPTIONS: Array<{
  value: SectionIndexBentoPattern;
  label: string;
}> = [
  { value: "compact", label: "Compact" },
  { value: "balanced", label: "Balanced" },
  { value: "showcase", label: "Showcase" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function writeCoverDesignSettings(
  cover: SectionCoverSettings,
  patch: Partial<SectionCoverDesignSettings>
) {
  const next = { ...cover, ...patch };

  return {
    [SECTION_COVER_DESIGN_SETTINGS_KEY]: {
      enabled: next.enabled,
      height: next.height,
      overlay_opacity: next.overlay_opacity,
      title_enabled: next.title_enabled,
      title_position: next.title_position,
      title_align: next.title_align,
      title_style: next.title_style,
      title_bg_color: next.title_bg_color,
      title_color: next.title_color,
      title_font_size: next.title_font_size,
      title_bg_width: next.title_bg_width,
      title_box_width: next.title_box_width,
      title_radius: next.title_radius,
      title_corner_style: next.title_corner_style,
      title_shadow: next.title_shadow,
    },
  };
}

function writeSectionIndexSettings(
  guidebookSettings: Record<string, unknown>,
  patch: {
    layout?: SectionIndexLayout;
    intro?: Partial<SectionIndexIntroSettings>;
    card?: Partial<SectionIndexCardSettings>;
    spacing?: Partial<SectionIndexSpacingSettings>;
    grid?: Partial<SectionIndexGridSettings>;
    list?: Partial<SectionIndexListSettings>;
    bento?: Partial<SectionIndexBentoSettings>;
  }
) {
  const current = isRecord(guidebookSettings[SECTION_INDEX_SETTINGS_KEY])
    ? (guidebookSettings[SECTION_INDEX_SETTINGS_KEY] as Record<string, unknown>)
    : {};
  const currentIntro = isRecord(current.intro)
    ? (current.intro as Record<string, unknown>)
    : {};
  const patchIntro = isRecord(patch.intro)
    ? (patch.intro as Record<string, unknown>)
    : null;
  const currentCard = isRecord(current.card)
    ? (current.card as Record<string, unknown>)
    : {};
  const patchCard = isRecord(patch.card)
    ? (patch.card as Record<string, unknown>)
    : null;
  const currentSpacing = isRecord(current.spacing)
    ? (current.spacing as Record<string, unknown>)
    : {};
  const patchSpacing = isRecord(patch.spacing)
    ? (patch.spacing as Record<string, unknown>)
    : null;
  const currentGrid = isRecord(current.grid)
    ? (current.grid as Record<string, unknown>)
    : {};
  const patchGrid = isRecord(patch.grid)
    ? (patch.grid as Record<string, unknown>)
    : null;
  const currentList = isRecord(current.list)
    ? (current.list as Record<string, unknown>)
    : {};
  const patchList = isRecord(patch.list)
    ? (patch.list as Record<string, unknown>)
    : null;
  const currentBento = isRecord(current.bento)
    ? (current.bento as Record<string, unknown>)
    : isRecord(current.masonry)
    ? (current.masonry as Record<string, unknown>)
    : {};
  const patchBento = isRecord(patch.bento)
    ? (patch.bento as Record<string, unknown>)
    : null;

  return {
    [SECTION_INDEX_SETTINGS_KEY]: {
      ...current,
      ...(patch.layout ? { layout: patch.layout } : {}),
      ...(patchIntro
        ? {
            intro: {
              ...currentIntro,
              ...patchIntro,
            },
          }
        : {}),
      ...(patchCard
        ? {
            card: {
              ...currentCard,
              ...patchCard,
            },
          }
        : {}),
      ...(patchSpacing
        ? {
            spacing: {
              ...currentSpacing,
              ...patchSpacing,
            },
          }
        : {}),
      ...(patchGrid
        ? {
            grid: {
              ...currentGrid,
              ...patchGrid,
            },
          }
        : {}),
      ...(patchList
        ? {
            list: {
              ...currentList,
              ...patchList,
            },
          }
        : {}),
      ...(patchBento
        ? {
            bento: {
              ...currentBento,
              ...patchBento,
            },
          }
        : {}),
    },
  };
}

export function SectionWideSettingsPanel({
  onBack,
  focusTarget,
  previewSectionId,
}: Props) {
  const sections = useEditorStore((s) => s.sections);
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const setAllSectionsDisplayMode = useEditorStore(
    (s) => s.setAllSectionsDisplayMode
  );
  const updateGuidebookSettings = useEditorStore((s) => s.updateGuidebookSettings);
  const resetSectionWideSettings = useEditorStore(
    (s) => s.resetSectionWideSettings
  );
  const setActiveSection = useEditorStore((s) => s.setActiveSection);
  const setActiveFeaturedView = useEditorStore((s) => s.setActiveFeaturedView);
  const [selectedCoverPreset, setSelectedCoverPreset] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const introSettingsRef = useRef<HTMLDivElement>(null);
  const layoutSettingsRef = useRef<HTMLDivElement>(null);
  const cardSettingsRef = useRef<HTMLDivElement>(null);
  const headerSettingsRef = useRef<HTMLDivElement>(null);
  const coverSettingsRef = useRef<HTMLDivElement>(null);

  const allFullLength =
    sections.length > 0 &&
    sections.every((section) => section.displayMode === "full_page");
  const allPopup = sections.every((section) => section.displayMode !== "full_page");
  const displayModeValue: DisplayModeValue = allFullLength
    ? "full_page"
    : allPopup
    ? "popup"
    : "mixed";
  const sectionIndex = normalizeSectionIndexSettings(guidebookSettings);
  const cover = normalizeSectionCoverSettings(null, guidebookSettings);
  const coverTitleHasFrame = cover.title_style !== "minimal";
  const coverTitleColorLabel =
    cover.title_style === "outline" ? "Border color" : "Title bg";

  const patchDesign = (patch: Partial<SectionCoverDesignSettings>) => {
    updateGuidebookSettings(writeCoverDesignSettings(cover, patch));
  };

  const patchCoverTitleShadow = (patch: Partial<SectionCoverTitleShadow>) => {
    patchDesign({ title_shadow: { ...cover.title_shadow, ...patch } });
  };

  const patchIndexSettings = (patch: {
    layout?: SectionIndexLayout;
    intro?: Partial<SectionIndexIntroSettings>;
    card?: Partial<SectionIndexCardSettings>;
    spacing?: Partial<SectionIndexSpacingSettings>;
    grid?: Partial<SectionIndexGridSettings>;
    list?: Partial<SectionIndexListSettings>;
    bento?: Partial<SectionIndexBentoSettings>;
  }) => {
    updateGuidebookSettings(writeSectionIndexSettings(guidebookSettings, patch));
  };

  const patchIndexLayout = (layout: SectionIndexLayout) => {
    patchIndexSettings({ layout });
  };

  const patchIndexIntro = (patch: Partial<SectionIndexIntroSettings>) => {
    patchIndexSettings({ intro: patch });
  };

  const patchIndexCard = (patch: Partial<SectionIndexCardSettings>) => {
    patchIndexSettings({ card: patch });
  };

  const patchIndexSpacing = (patch: Partial<SectionIndexSpacingSettings>) => {
    patchIndexSettings({ spacing: patch });
  };

  const patchIndexGrid = (patch: Partial<SectionIndexGridSettings>) => {
    patchIndexSettings({ grid: patch });
  };

  const patchIndexList = (patch: Partial<SectionIndexListSettings>) => {
    patchIndexSettings({ list: patch });
  };

  const patchIndexBento = (patch: Partial<SectionIndexBentoSettings>) => {
    patchIndexSettings({ bento: patch });
  };

  const activateSharedSectionPreview = useCallback(() => {
    const orderedSections = sections
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const preferredSection = previewSectionId
      ? orderedSections.find((section) => section.id === previewSectionId)
      : null;
    const fallbackSection =
      orderedSections.find((section) => section.kind === "guide" && section.isVisible) ??
      orderedSections.find((section) => section.kind === "guide") ??
      orderedSections[0];
    const targetSectionId = preferredSection?.id ?? fallbackSection?.id ?? null;

    if (targetSectionId) {
      setActiveSection(targetSectionId);
    }
  }, [previewSectionId, sections, setActiveSection]);

  const activateSectionsIndexPreview = useCallback(() => {
    setActiveSection(null);
    setActiveFeaturedView(null);
  }, [setActiveFeaturedView, setActiveSection]);

  const handleResetSectionWideSettings = () => {
    setSelectedCoverPreset("");
    resetSectionWideSettings();
    activateSectionsIndexPreview();
  };

  useEffect(() => {
    if (!focusTarget) return;

    const frame = window.requestAnimationFrame(() => {
      const targetRef =
        focusTarget === "section-cover"
          ? coverSettingsRef
          : focusTarget === "section-header"
          ? headerSettingsRef
          : focusTarget === "section-index-intro"
          ? introSettingsRef
          : focusTarget === "section-index-layout"
          ? layoutSettingsRef
          : cardSettingsRef;

      if (
        focusTarget === "section-index-intro" ||
        focusTarget === "section-index-layout" ||
        focusTarget === "section-index-cards"
      ) {
        activateSectionsIndexPreview();
      } else {
        activateSharedSectionPreview();
      }

      const scrollContainer = scrollContainerRef.current;
      const targetElement = targetRef.current;
      if (!scrollContainer || !targetElement) return;

      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();
      const targetTop =
        scrollContainer.scrollTop + targetRect.top - containerRect.top;

      targetElement.focus({ preventScroll: true });
      scrollContainer.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activateSectionsIndexPreview, activateSharedSectionPreview, focusTarget]);

  const displayModeOptions: Array<{
    value: DisplayModeValue;
    label: string;
    disabled?: boolean;
  }> = [
    { value: "popup", label: "Popup" },
    { value: "full_page", label: "Full length page" },
    ...(displayModeValue === "mixed"
      ? [{ value: "mixed" as const, label: "Mixed", disabled: true }]
      : []),
  ];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <FeaturedDetailHeader
        icon={<Settings2 className="h-4 w-4" />}
        title="Section-wide settings"
        accent="amber"
        onBack={onBack}
        onReset={handleResetSectionWideSettings}
        resetLabel="Reset"
      />

      <div
        ref={scrollContainerRef}
        className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-4"
      >
        <div className="min-w-0 space-y-4">
          <div
            ref={introSettingsRef}
            tabIndex={-1}
            className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <SettingsSection
              key={
                focusTarget === "section-index-intro"
                  ? `page-intro-${focusTarget}`
                  : "page-intro"
              }
              icon={<Type />}
              title="Page intro"
              defaultExpanded={focusTarget === "section-index-intro"}
            >
              <ToggleRow
                label="Show intro text"
                description="Controls the copy above the sections."
                checked={sectionIndex.intro.enabled}
                onCheckedChange={(checked) =>
                  patchIndexIntro({ enabled: checked })
                }
              />

              {sectionIndex.intro.enabled ? (
                <div className="space-y-2.5">
                  <SettingsField label="Eyebrow">
                    <Input
                      value={sectionIndex.intro.eyebrow}
                      maxLength={80}
                      onChange={(event) =>
                        patchIndexIntro({ eyebrow: event.target.value })
                      }
                      className="h-9 text-xs"
                      aria-label="Sections intro eyebrow"
                    />
                  </SettingsField>
                  <SettingsField label="Title">
                    <Input
                      value={sectionIndex.intro.title}
                      maxLength={120}
                      onChange={(event) =>
                        patchIndexIntro({ title: event.target.value })
                      }
                      className="h-9 text-xs"
                      aria-label="Sections intro title"
                    />
                  </SettingsField>
                  <SettingsField label="Subtitle">
                    <Input
                      value={sectionIndex.intro.subtitle}
                      maxLength={240}
                      onChange={(event) =>
                        patchIndexIntro({ subtitle: event.target.value })
                      }
                      className="h-9 text-xs"
                      aria-label="Sections intro subtitle"
                    />
                  </SettingsField>
                </div>
              ) : null}
            </SettingsSection>
          </div>

          <div
            ref={layoutSettingsRef}
            tabIndex={-1}
            className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <SettingsSection
              key={
                focusTarget === "section-index-layout"
                  ? `section-display-${focusTarget}`
                  : "section-display"
              }
              icon={<LayoutGrid />}
              title="Section display"
              defaultExpanded={focusTarget === "section-index-layout"}
            >
              <SelectRow<DisplayModeValue>
                label="Open guide sections as"
                inline
                value={displayModeValue}
                onChange={(value) => {
                  if (value !== "mixed") {
                    setAllSectionsDisplayMode(value);
                  }
                }}
                options={displayModeOptions}
                disabled={sections.length === 0}
              />

              <div
                onFocusCapture={activateSectionsIndexPreview}
                onPointerDownCapture={activateSectionsIndexPreview}
              >
                <SettingsField label="Sections view" inline>
                  <SegmentedControl<SectionIndexLayout>
                    value={sectionIndex.layout}
                    onChange={(layout) => {
                      activateSectionsIndexPreview();
                      patchIndexLayout(layout);
                    }}
                    ariaLabel="Sections view in template"
                    presentation="segmented"
                    options={[
                      {
                        value: "grid",
                        label: "Grid",
                        icon: <LayoutGrid className="h-3 w-3" />,
                      },
                      {
                        value: "list",
                        label: "List",
                        icon: <List className="h-3 w-3" />,
                      },
                      {
                        value: "bento",
                        label: "Bento",
                        icon: <PanelsTopLeft className="h-3 w-3" />,
                      },
                    ]}
                  />
                </SettingsField>
              </div>
            </SettingsSection>
          </div>

          <div
            ref={cardSettingsRef}
            tabIndex={-1}
            onFocusCapture={activateSectionsIndexPreview}
            onPointerDownCapture={activateSectionsIndexPreview}
            className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <SettingsSection
              key={
                focusTarget === "section-index-cards"
                  ? `card-appearance-${focusTarget}`
                  : "card-appearance"
              }
              icon={<Paintbrush />}
              title="Card appearance"
              description="Shared styling for guide section cards."
              defaultExpanded={focusTarget === "section-index-cards"}
            >
              <SelectRow<SectionIndexCardStyle>
                label="Style"
                inline
                value={sectionIndex.card.style}
                onChange={(style) => patchIndexCard({ style })}
                options={CARD_STYLE_OPTIONS}
              />

              {sectionIndex.card.style === "solid_brand" ? (
                <SelectRow<SectionIndexBrandRole>
                  label="Solid color"
                  inline
                  value={sectionIndex.card.solid_color_role}
                  onChange={(solid_color_role) =>
                    patchIndexCard({ solid_color_role })
                  }
                  options={BRAND_ROLE_OPTIONS}
                />
              ) : null}

              <PremiumSlider
                value={sectionIndex.card.radius}
                min={0}
                max={36}
                step={1}
                label="Roundedness"
                format={(value) => `${value}px`}
                onChange={(radius) => patchIndexCard({ radius })}
              />
              <PremiumSlider
                value={sectionIndex.card.shadow}
                min={0}
                max={4}
                step={1}
                label="Shadow"
                format={(value) =>
                  ["Off", "Soft", "Medium", "High", "Dramatic"][value] ??
                  String(value)
                }
                onChange={(shadow) => patchIndexCard({ shadow })}
              />
              <PremiumSlider
                value={sectionIndex.card.padding}
                min={8}
                max={32}
                step={1}
                label="Inner padding"
                format={(value) => `${value}px`}
                onChange={(padding) => patchIndexCard({ padding })}
              />
            </SettingsSection>

            <SettingsSection
              icon={<Rows3 />}
              title="Card spacing"
              description="Controls the section card canvas."
            >
              <PremiumSlider
                value={sectionIndex.spacing.gap}
                min={4}
                max={36}
                step={1}
                label="Card spacing"
                format={(value) => `${value}px`}
                onChange={(gap) => patchIndexSpacing({ gap })}
              />
              <PremiumSlider
                value={sectionIndex.spacing.page_x}
                min={0}
                max={48}
                step={1}
                label="Side spacing"
                format={(value) => `${value}px`}
                onChange={(page_x) => patchIndexSpacing({ page_x })}
              />
              <PremiumSlider
                value={sectionIndex.spacing.page_top}
                min={0}
                max={72}
                step={1}
                label="Top spacing"
                format={(value) => `${value}px`}
                onChange={(page_top) => patchIndexSpacing({ page_top })}
              />
              <PremiumSlider
                value={sectionIndex.spacing.page_bottom}
                min={0}
                max={96}
                step={1}
                label="Bottom spacing"
                format={(value) => `${value}px`}
                onChange={(page_bottom) => patchIndexSpacing({ page_bottom })}
              />
              <PremiumSlider
                value={sectionIndex.spacing.max_width}
                min={320}
                max={1200}
                step={10}
                label="Content width"
                format={(value) => `${value}px`}
                onChange={(max_width) => patchIndexSpacing({ max_width })}
              />
            </SettingsSection>

            {sectionIndex.layout === "list" ? (
              <SettingsSection
                icon={<List />}
                title="List cards"
                description="Options for the list view."
              >
                <SelectRow<SectionIndexListIconPlacement>
                  label="Icon placement"
                  inline
                  value={sectionIndex.list.icon_placement}
                  onChange={(icon_placement) =>
                    patchIndexList({ icon_placement })
                  }
                  options={LIST_ICON_PLACEMENT_OPTIONS}
                />
                <PremiumSlider
                  value={sectionIndex.list.row_height}
                  min={48}
                  max={128}
                  step={1}
                  label="Row height"
                  format={(value) => `${value}px`}
                  onChange={(row_height) => patchIndexList({ row_height })}
                />
                <ToggleRow
                  label="Show arrow"
                  description="Displays the open-section arrow at the end of each row."
                  checked={sectionIndex.list.show_arrow}
                  onCheckedChange={(show_arrow) =>
                    patchIndexList({ show_arrow })
                  }
                />
              </SettingsSection>
            ) : sectionIndex.layout === "bento" ? (
              <SettingsSection
                icon={<PanelsTopLeft />}
                title="Bento cards"
                description="Options for the bento tile view."
              >
                <SelectRow<SectionIndexIconPlacement>
                  label="Icon placement"
                  inline
                  value={sectionIndex.bento.icon_placement}
                  onChange={(icon_placement) =>
                    patchIndexBento({ icon_placement })
                  }
                  options={ICON_PLACEMENT_OPTIONS}
                />
                <SelectRow<SectionIndexBentoPattern>
                  label="Pattern"
                  inline
                  value={sectionIndex.bento.pattern}
                  onChange={(pattern) => patchIndexBento({ pattern })}
                  options={BENTO_PATTERN_OPTIONS}
                />
                <PremiumSlider
                  value={sectionIndex.bento.card_min_width}
                  min={112}
                  max={320}
                  step={1}
                  label="Tile width"
                  format={(value) => `${value}px`}
                  onChange={(card_min_width) =>
                    patchIndexBento({ card_min_width })
                  }
                />
                <PremiumSlider
                  value={sectionIndex.bento.card_min_height}
                  min={72}
                  max={240}
                  step={1}
                  label="Tile height"
                  format={(value) => `${value}px`}
                  onChange={(card_min_height) =>
                    patchIndexBento({ card_min_height })
                  }
                />
              </SettingsSection>
            ) : (
              <SettingsSection
                icon={<LayoutGrid />}
                title="Grid cards"
                description="Options for the grid view."
              >
                <SelectRow<SectionIndexIconPlacement>
                  label="Icon placement"
                  inline
                  value={sectionIndex.grid.icon_placement}
                  onChange={(icon_placement) =>
                    patchIndexGrid({ icon_placement })
                  }
                  options={ICON_PLACEMENT_OPTIONS}
                />
                <PremiumSlider
                  value={sectionIndex.grid.card_min_width}
                  min={112}
                  max={320}
                  step={1}
                  label="Card width"
                  format={(value) => `${value}px`}
                  onChange={(card_min_width) =>
                    patchIndexGrid({ card_min_width })
                  }
                />
                <PremiumSlider
                  value={sectionIndex.grid.card_min_height}
                  min={72}
                  max={220}
                  step={1}
                  label="Card height"
                  format={(value) => `${value}px`}
                  onChange={(card_min_height) =>
                    patchIndexGrid({ card_min_height })
                  }
                />
              </SettingsSection>
            )}
          </div>

          <div
            ref={headerSettingsRef}
            tabIndex={-1}
            onFocusCapture={activateSharedSectionPreview}
            onPointerDownCapture={activateSharedSectionPreview}
            className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <SectionHeaderSettingsEditor
              guidebookSettings={guidebookSettings}
              onChange={updateGuidebookSettings}
              defaultExpanded
            />
          </div>

          <div
            ref={coverSettingsRef}
            id="section-cover-settings"
            tabIndex={-1}
            onFocusCapture={activateSharedSectionPreview}
            onPointerDownCapture={activateSharedSectionPreview}
            className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <SettingsSection
              icon={<ImageIcon />}
              title="Section cover"
              description="Shared cover block styling."
              defaultExpanded={focusTarget === "section-cover"}
            >
              <ToggleRow
                label="Show section covers"
                description="Adds a cover image block to each guide section."
                checked={cover.enabled}
                onCheckedChange={(checked) =>
                  patchDesign({ enabled: checked === true })
                }
              />

              <div className={cn("space-y-3", !cover.enabled && "opacity-60")}>
                <SelectRow
                  label="Apply template"
                  inline
                  value={selectedCoverPreset}
                  placeholder="Choose a template"
                  onChange={(presetId) => {
                    setSelectedCoverPreset(presetId);
                    const preset = COVER_PRESETS.find(
                      (item) => item.id === presetId
                    );
                    if (preset) {
                      patchDesign({
                        enabled: true,
                        title_enabled: true,
                        ...preset.patch,
                      });
                    }
                  }}
                  options={COVER_PRESETS.map((preset) => ({
                    value: preset.id,
                    label: preset.label,
                  }))}
                />

                <SelectRow<SectionCoverHeight>
                  label="Height"
                  inline
                  value={cover.height}
                  onChange={(height) => patchDesign({ height })}
                  options={COVER_HEIGHT_OPTIONS}
                />

                <PremiumSlider
                  value={Math.round(cover.overlay_opacity * 100)}
                  min={0}
                  max={75}
                  step={1}
                  label="Overlay"
                  format={(value) => `${value}%`}
                  onChange={(value) =>
                    patchDesign({ overlay_opacity: value / 100 })
                  }
                />

                <div className="h-px bg-border/55" />

                <ToggleRow
                  label="Show cover title"
                  description="Displays the section headline on top of the cover image."
                  checked={cover.title_enabled}
                  onCheckedChange={(checked) =>
                    patchDesign({ title_enabled: checked === true })
                  }
                />

                {cover.title_enabled ? (
                  <>
                    <SelectRow<SectionCoverTitlePosition>
                      label="Title position"
                      inline
                      value={cover.title_position}
                      onChange={(title_position) =>
                        patchDesign({ title_position })
                      }
                      options={COVER_TITLE_POSITION_OPTIONS}
                    />

                    <SelectRow<SectionCoverTitleAlign>
                      label="Title align"
                      inline
                      value={cover.title_align}
                      onChange={(title_align) =>
                        patchDesign({ title_align })
                      }
                      options={COVER_TITLE_ALIGN_OPTIONS}
                    />

                    <SelectRow<SectionCoverTitleStyle>
                      label="Title style"
                      inline
                      value={cover.title_style}
                      onChange={(title_style) =>
                        patchDesign({ title_style })
                      }
                      options={COVER_TITLE_STYLE_OPTIONS}
                    />

                    {coverTitleHasFrame ? (
                      <SelectRow<SectionCoverTitleCornerStyle>
                        label="Background corners"
                        inline
                        value={cover.title_corner_style}
                        onChange={(title_corner_style) =>
                          patchDesign({ title_corner_style })
                        }
                        options={COVER_TITLE_CORNER_OPTIONS}
                      />
                    ) : null}

                    <div
                      className={cn(
                        "grid gap-3",
                        coverTitleHasFrame ? "grid-cols-2" : "grid-cols-1"
                      )}
                    >
                      <SettingsField label="Text color">
                        <ColorPicker
                          value={cover.title_color}
                          onChange={(title_color) =>
                            patchDesign({ title_color })
                          }
                          compact
                        />
                      </SettingsField>
                      {coverTitleHasFrame ? (
                        <SettingsField label={coverTitleColorLabel}>
                          <ColorPicker
                            value={cover.title_bg_color}
                            onChange={(title_bg_color) =>
                              patchDesign({ title_bg_color })
                            }
                            compact
                          />
                        </SettingsField>
                      ) : null}
                    </div>

                    <PremiumSlider
                      value={cover.title_font_size}
                      min={14}
                      max={52}
                      step={1}
                      label="Text size"
                      format={(value) => `${value}px`}
                      onChange={(title_font_size) =>
                        patchDesign({ title_font_size })
                      }
                    />
                    {coverTitleHasFrame ? (
                      <PremiumSlider
                        value={cover.title_bg_width}
                        min={0}
                        max={100}
                        step={1}
                        label="Bg min width"
                        format={(value) => `${value}%`}
                        onChange={(title_bg_width) =>
                          patchDesign({ title_bg_width })
                        }
                      />
                    ) : null}
                    <PremiumSlider
                      value={cover.title_box_width}
                      min={35}
                      max={100}
                      step={1}
                      label="Text box max"
                      format={(value) => `${value}%`}
                      onChange={(title_box_width) =>
                        patchDesign({
                          title_box_width,
                          title_bg_width: Math.min(
                            cover.title_bg_width,
                            title_box_width
                          ),
                        })
                      }
                    />
                    {coverTitleHasFrame &&
                    cover.title_corner_style !== "sharp" ? (
                      <PremiumSlider
                        value={cover.title_radius}
                        min={0}
                        max={32}
                        step={1}
                        label="Corner radius"
                        format={(value) => `${value}px`}
                        onChange={(title_radius) =>
                          patchDesign({ title_radius })
                        }
                      />
                    ) : null}

                    <CoverTitleShadowControls
                      shadow={cover.title_shadow}
                      titleStyle={cover.title_style}
                      onChange={patchCoverTitleShadow}
                    />
                  </>
                ) : null}
              </div>
            </SettingsSection>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoverTitleShadowControls({
  shadow,
  titleStyle,
  onChange,
}: {
  shadow: SectionCoverTitleShadow;
  titleStyle: SectionCoverTitleStyle;
  onChange: (patch: Partial<SectionCoverTitleShadow>) => void;
}) {
  const description =
    titleStyle === "minimal"
      ? "Adds depth to the headline text."
      : "Adds depth to the headline text and its background.";

  return (
    <div className="space-y-3 rounded-md border border-border/60 bg-background/50 p-2.5">
      <ToggleRow
        label="Headline shadow"
        description={description}
        checked={shadow.enabled}
        onCheckedChange={(enabled) => onChange({ enabled })}
        className="border-b-0 py-0"
      />

      {shadow.enabled ? (
        <Disclosure label="Customize shadow" defaultExpanded>
          <SettingsField label="Color" inline>
            <div className="flex items-center gap-2">
              <ColorPicker
                value={shadow.color}
                onChange={(color) => onChange({ color })}
                compact
              />
              <Input
                value={shadow.color}
                onChange={(event) =>
                  onChange({ color: event.target.value.trim() })
                }
                placeholder="#0F172A"
                className="h-9 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          </SettingsField>

          <div className="grid gap-3 sm:grid-cols-2">
            <PremiumSlider
              label="Opacity"
              value={shadow.opacity}
              min={0}
              max={1}
              step={0.05}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(opacity) => onChange({ opacity })}
            />
            <PremiumSlider
              label="Blur"
              value={shadow.blur}
              min={0}
              max={SECTION_COVER_TITLE_SHADOW_BLUR_MAX}
              step={1}
              format={(value) => `${Math.round(value)}px`}
              onChange={(blur) => onChange({ blur })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <PremiumSlider
              label="Offset X"
              value={shadow.offset_x}
              min={SECTION_COVER_TITLE_SHADOW_OFFSET_MIN}
              max={SECTION_COVER_TITLE_SHADOW_OFFSET_MAX}
              step={1}
              format={(value) => `${Math.round(value)}px`}
              onChange={(offset_x) => onChange({ offset_x })}
            />
            <PremiumSlider
              label="Offset Y"
              value={shadow.offset_y}
              min={SECTION_COVER_TITLE_SHADOW_OFFSET_MIN}
              max={SECTION_COVER_TITLE_SHADOW_OFFSET_MAX}
              step={1}
              format={(value) => `${Math.round(value)}px`}
              onChange={(offset_y) => onChange({ offset_y })}
            />
          </div>
        </Disclosure>
      ) : null}
    </div>
  );
}
