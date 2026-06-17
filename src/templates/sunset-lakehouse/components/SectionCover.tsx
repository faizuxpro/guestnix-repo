"use client";

import type { CSSProperties } from "react";
import {
  SECTION_COVER_FALLBACK_IMAGE,
  normalizeSectionCoverSettings,
  type SectionCoverTitleShadow,
} from "@/lib/section-cover";
import { editorInspectAttributes } from "@/lib/editor-inspect";
import type { TemplateSection } from "../types";

type Props = {
  section: TemplateSection;
  fallbackImageUrl?: string | null;
  guidebookSettings?: Record<string, unknown> | null;
};

function cssUrl(value: string) {
  return `url("${value.replace(/"/g, "%22")}")`;
}

function hexToRgb(value: string) {
  const clean = value.replace("#", "").trim();
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : clean.slice(0, 6);
  const parsed = Number.parseInt(expanded, 16);
  if (!Number.isFinite(parsed)) return "15, 23, 42";
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `${r}, ${g}, ${b}`;
}

function titleShadowValue(shadow: SectionCoverTitleShadow) {
  return `${shadow.offset_x}px ${shadow.offset_y}px ${shadow.blur}px rgba(${hexToRgb(
    shadow.color
  )}, ${shadow.opacity})`;
}

export function SectionCover({
  section,
  fallbackImageUrl,
  guidebookSettings,
}: Props) {
  const settings = normalizeSectionCoverSettings(
    section.itemSettings,
    guidebookSettings
  );
  if (!settings.enabled) return null;

  const imageUrl =
    settings.image_url || fallbackImageUrl || SECTION_COVER_FALLBACK_IMAGE;
  const headline = settings.title_enabled
    ? settings.title_text.trim() || section.title || "Untitled section"
    : "";
  const style: CSSProperties & Record<string, string> = {
    "--sl-section-cover-image": cssUrl(imageUrl),
    "--sl-section-cover-x": `${settings.image_position.x}%`,
    "--sl-section-cover-y": `${settings.image_position.y}%`,
    "--sl-section-cover-overlay": String(settings.overlay_opacity),
    "--sl-section-cover-title-bg": settings.title_bg_color,
    "--sl-section-cover-title-color": settings.title_color,
    "--sl-section-cover-title-radius": `${settings.title_radius}px`,
    "--sl-section-cover-title-size": `${settings.title_font_size}px`,
    "--sl-section-cover-title-bg-width": `${settings.title_bg_width}%`,
    "--sl-section-cover-title-box-width": `${settings.title_box_width}%`,
    "--sl-section-cover-title-shadow": titleShadowValue(settings.title_shadow),
  };

  return (
    <div
      className={[
        "sl-section-cover",
        `sl-section-cover--height-${settings.height}`,
        `sl-section-cover--title-${settings.title_position}`,
        `sl-section-cover--align-${settings.title_align}`,
        `sl-section-cover--style-${settings.title_style}`,
        `sl-section-cover--corner-${settings.title_corner_style}`,
        settings.title_shadow.enabled ? "sl-section-cover--title-shadow" : "",
      ].join(" ")}
      style={style}
      aria-hidden="true"
      {...editorInspectAttributes(
        { kind: "section", sectionId: section.id, focus: "cover_image" },
        "Edit section cover"
      )}
    >
      {settings.title_enabled ? (
        <div
          className="sl-section-cover-title"
          {...editorInspectAttributes(
            { kind: "section", sectionId: section.id, focus: "cover_title" },
            "Edit cover title"
          )}
        >
          <span className="sl-section-cover-title-text">{headline}</span>
        </div>
      ) : null}
    </div>
  );
}
