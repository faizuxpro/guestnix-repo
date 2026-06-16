"use client";

import type { CSSProperties } from "react";
import { toast } from "sonner";
import { HostIcon } from "@/components/icons/HostIcon";
import { editorInspectAttributes } from "@/lib/editor-inspect";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import { normalizeSectionHeaderSettings } from "@/lib/section-header";
import {
  PUBLIC_GUIDEBOOK_BASE_PATH,
  type GuidebookPublicBasePath,
} from "@/lib/guidebook-public-url";
import type { TemplateSection } from "../types";

type Props = {
  section: TemplateSection;
  onClose: () => void;
  slug?: string;
  publicBasePath?: GuidebookPublicBasePath;
  closeLabel: string;
  guidebookSettings?: Record<string, unknown> | null;
  editorFocused?: boolean;
  editorFocusNonce?: number;
};

export function SectionHeader({
  section,
  onClose,
  slug,
  publicBasePath = PUBLIC_GUIDEBOOK_BASE_PATH,
  closeLabel,
  guidebookSettings,
  editorFocused = false,
  editorFocusNonce,
}: Props) {
  const settings = normalizeSectionHeaderSettings(guidebookSettings);
  const className = [
    "sl-section-header",
    `sl-section-header--align-${settings.align}`,
    `sl-section-header--density-${settings.density}`,
    `sl-section-header--bg-${settings.background}`,
    `sl-section-header--icon-${settings.icon_style}`,
    settings.sticky ? "sl-section-header--sticky" : "sl-section-header--static",
    editorFocused ? "sl-editor-active-region" : "",
  ].join(" ");
  const headerStyle = {
    "--sl-section-back-icon-size": `${settings.back_icon_size}px`,
    "--sl-section-link-icon-size": `${settings.link_icon_size}px`,
  } as CSSProperties;
  const previewTarget = `section-title-${section.id}`;
  const headerInspectAttributes = editorInspectAttributes(
    { kind: "section", sectionId: section.id, focus: "header" },
    "Edit section header"
  );
  const titleInspectAttributes = editorInspectAttributes(
    { kind: "section", sectionId: section.id, focus: "title" },
    "Edit section title"
  );
  const backInspectAttributes = editorInspectAttributes(
    { kind: "section", sectionId: section.id, focus: "header_back" },
    "Edit back icon"
  );
  const shareInspectAttributes = editorInspectAttributes(
    { kind: "section", sectionId: section.id, focus: "header_share" },
    "Edit section share"
  );
  const focusFlash = editorFocused ? (
    <span
      key={`section-title-focus-${editorFocusNonce ?? 0}`}
      className="sl-editor-focus-flash"
      aria-hidden="true"
    />
  ) : null;

  const backButton = (
    <button
      type="button"
      className="sl-popup-back sl-section-header-back"
      onClick={onClose}
      aria-label={closeLabel}
      {...backInspectAttributes}
    >
      <HostIcon
        value={settings.back_icon}
        fallbackIconifyId="lucide:arrow-left"
      />
    </button>
  );

  if (!settings.enabled) {
    return (
      <div
        className={`sl-section-header-float sl-section-header--icon-${settings.icon_style}${
          editorFocused ? " sl-editor-active-region" : ""
        }`}
        style={headerStyle}
        data-editor-preview-target={previewTarget}
        {...headerInspectAttributes}
      >
        {backButton}
        {focusFlash}
      </div>
    );
  }

  return (
    <header
      className={`sl-popup-header ${className}`}
      style={headerStyle}
      data-editor-preview-target={previewTarget}
      {...headerInspectAttributes}
    >
      {backButton}
      <div className="sl-section-header-content">
        {settings.show_icon ? (
          <HostIcon
            value={section.icon || DEFAULT_ICONS.SECTION_DEFAULT}
            className="sl-popup-icon"
          />
        ) : null}
        {settings.show_title ? (
          <h2 className="sl-popup-title" {...titleInspectAttributes}>
            {section.title}
          </h2>
        ) : null}
      </div>
      {slug && settings.show_link ? (
        <button
          type="button"
          className="sl-popup-share sl-section-header-share"
          onClick={async () => {
            const url = `${window.location.origin}${publicBasePath}/${encodeURIComponent(
              slug
            )}#section-${section.id}`;
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Link copied");
            } catch {
              toast.error("Copy failed");
            }
          }}
          aria-label="Copy section link"
          {...shareInspectAttributes}
        >
          <HostIcon
            value={settings.link_icon}
            fallbackIconifyId="lucide:link"
          />
        </button>
      ) : (
        <span className="sl-section-header-action-spacer" aria-hidden />
      )}
      {focusFlash}
    </header>
  );
}
