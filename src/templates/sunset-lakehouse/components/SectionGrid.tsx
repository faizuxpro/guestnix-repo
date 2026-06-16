"use client";

import type { CSSProperties, ReactNode } from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { HostIcon } from "@/components/icons/HostIcon";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import { editorInspectAttributes } from "@/lib/editor-inspect";
import {
  DEFAULT_SECTION_INDEX_SETTINGS,
  type SectionIndexSettings,
} from "@/lib/section-settings";
import type { TemplateSection } from "../types";

type Props = {
  sections: TemplateSection[];
  settings?: SectionIndexSettings;
  onOpen: (sectionId: string) => void;
  footerSlot?: ReactNode;
};

function shadowFor(level: number, layout: SectionIndexSettings["layout"]) {
  if (level <= 0) return "none";
  if (layout === "list" && level === 1) {
    return "0 8px 22px -18px rgba(var(--primary-rgb), 0.24)";
  }
  const shadows = [
    "none",
    "0 2px 8px rgba(0, 0, 0, 0.04)",
    "0 10px 24px -18px rgba(var(--primary-rgb), 0.28)",
    "0 18px 38px -24px rgba(var(--primary-rgb), 0.36)",
    "0 28px 54px -30px rgba(var(--primary-rgb), 0.44)",
  ];
  return shadows[Math.min(4, Math.max(0, Math.round(level)))] ?? shadows[1];
}

function hoverShadowFor(level: number) {
  if (level <= 0) return "none";
  const shadows = [
    "none",
    "0 12px 28px -16px rgba(var(--primary-rgb), 0.3)",
    "0 16px 34px -18px rgba(var(--primary-rgb), 0.34)",
    "0 22px 46px -22px rgba(var(--primary-rgb), 0.4)",
    "0 30px 64px -28px rgba(var(--primary-rgb), 0.48)",
  ];
  return shadows[Math.min(4, Math.max(0, Math.round(level)))] ?? shadows[1];
}

function classToken(value: string) {
  return value.replace(/_/g, "-");
}

function layoutIconPlacement(settings: SectionIndexSettings) {
  if (settings.layout === "list") return settings.list.icon_placement;
  if (settings.layout === "bento") return settings.bento.icon_placement;
  return settings.grid.icon_placement;
}

function layoutCardSize(settings: SectionIndexSettings) {
  if (settings.layout === "bento") {
    return {
      minWidth: settings.bento.card_min_width,
      minHeight: settings.bento.card_min_height,
    };
  }
  if (settings.layout === "list") {
    return {
      minWidth: settings.grid.card_min_width,
      minHeight: settings.list.row_height,
    };
  }
  return {
    minWidth: settings.grid.card_min_width,
    minHeight: settings.grid.card_min_height,
  };
}

export function SectionGrid({
  sections,
  settings = DEFAULT_SECTION_INDEX_SETTINGS,
  onOpen,
  footerSlot,
}: Props) {
  const visible = sections.filter((s) => s.isVisible);
  const { layout, intro, card, spacing } = settings;
  const iconPlacement = layoutIconPlacement(settings);
  const cardSize = layoutCardSize(settings);
  const eyebrow = intro.eyebrow.trim();
  const title = intro.title.trim();
  const subtitle = intro.subtitle.trim();
  const showIntro = intro.enabled && Boolean(eyebrow || title || subtitle);
  const showArrow = layout === "list" && settings.list.show_arrow;
  const layoutVars = {
    "--sl-index-gap": `${spacing.gap}px`,
    "--sl-index-page-x": `${spacing.page_x}px`,
    "--sl-index-page-top": `${spacing.page_top}px`,
    "--sl-index-page-bottom": `${spacing.page_bottom}px`,
    "--sl-index-max-width": `${spacing.max_width}px`,
    "--sl-index-card-radius": `${card.radius}px`,
    "--sl-index-card-padding": `${card.padding}px`,
    "--sl-index-card-min-width": `${cardSize.minWidth}px`,
    "--sl-index-card-min-height": `${cardSize.minHeight}px`,
    "--sl-index-card-shadow": shadowFor(card.shadow, layout),
    "--sl-index-card-hover-shadow": hoverShadowFor(card.shadow),
  } as CSSProperties;
  const layoutClassName = [
    "sl-section-index-layout",
    `is-${layout}`,
    `is-style-${classToken(card.style)}`,
    `is-solid-${card.solid_color_role}`,
    `is-icon-${iconPlacement}`,
    layout === "bento" ? `is-pattern-${settings.bento.pattern}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="sl-tab sl-section-index"
      {...editorInspectAttributes(
        { kind: "section_index", focus: "layout" },
        "Edit section layout"
      )}
    >
      {showIntro ? (
        <header
          className="sl-tab-heading"
          {...editorInspectAttributes(
            { kind: "section_index", focus: "intro" },
            "Edit guide intro"
          )}
        >
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          {title ? <h2>{title}</h2> : null}
          {subtitle ? <p>{subtitle}</p> : null}
        </header>
      ) : null}

      {visible.length === 0 ? (
        <div className="sl-placeholder">
          <BookOpen aria-hidden />
          <div>No sections yet - add one in the editor.</div>
        </div>
      ) : (
        <div
          className={layoutClassName}
          style={layoutVars}
          {...editorInspectAttributes(
            { kind: "section_index", focus: "cards" },
            "Edit section cards"
          )}
        >
          {visible.map((section, i) => {
            const sectionTitle = section.title || "Untitled";

            return (
              <button
                key={section.id}
                type="button"
                className="sl-section-card"
                onClick={() => onOpen(section.id)}
                aria-label={`Open ${sectionTitle}`}
                {...editorInspectAttributes(
                  { kind: "section_index", focus: "cards" },
                  "Edit section cards"
                )}
                style={{
                  animationDelay: `${
                    layout === "list"
                      ? Math.min(i * 55, 550)
                      : Math.min(i * 60, 600)
                  }ms`,
                }}
              >
                {iconPlacement === "hidden" ? null : (
                  <span
                    className="sl-section-card-icon"
                    aria-hidden
                    {...editorInspectAttributes(
                      {
                        kind: "section",
                        sectionId: section.id,
                        focus: "card_icon",
                      },
                      "Edit section icon"
                    )}
                  >
                    <HostIcon
                      value={section.icon || DEFAULT_ICONS.SECTION_DEFAULT}
                    />
                  </span>
                )}
                <span
                  className="sl-section-card-title"
                  {...editorInspectAttributes(
                    { kind: "section", sectionId: section.id, focus: "title" },
                    "Edit section title"
                  )}
                >
                  {sectionTitle}
                </span>
                {showArrow ? (
                  <ChevronRight className="sl-section-card-arrow" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
      {footerSlot}
    </div>
  );
}
