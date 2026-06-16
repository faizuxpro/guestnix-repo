"use client";

import type { CSSProperties } from "react";
import type { TopbarSettings } from "@/lib/topbar-settings";
import type { TemplateGuidebook } from "../types";
import type {
  GuidebookSearchItem,
  GuidebookSearchResult,
} from "../search";
import { ShareButton } from "./ShareButton";
import { LanguagePicker } from "./LanguagePicker";
import { GuidebookSearch } from "./GuidebookSearch";
import { editorInspectAttributes } from "@/lib/editor-inspect";

type Props = {
  guidebook: TemplateGuidebook;
  tabLabel: string;
  settings: TopbarSettings;
  searchItems?: GuidebookSearchItem[];
  onSearchResultSelect?: (
    result: GuidebookSearchResult,
    query: string
  ) => void;
  /** When true, hide the share button. */
  hideShare?: boolean;
  /** Optional URL to share instead of the current page URL. */
  shareUrl?: string;
  /** Fired when guest shares, used for analytics. */
  onShare?: (method: "native" | "copy") => void;
  /** Show the globe / language picker in the topbar. */
  showLanguagePicker?: boolean;
  /** Fired when the brand/logo area should return to the home splash. */
  onBrandClick?: () => void;
};

export function Topbar({
  guidebook,
  tabLabel,
  settings,
  searchItems = [],
  onSearchResultSelect,
  hideShare,
  shareUrl,
  onShare,
  showLanguagePicker,
  onBrandClick,
}: Props) {
  const defaultLogoUrl =
    guidebook.heroData?.property?.logo_url ??
    ((guidebook.branding ?? {}) as { logo_url?: string | null }).logo_url ??
    null;
  const logoUrl =
    settings.brand.logo_mode === "custom"
      ? settings.brand.logo_url
      : defaultLogoUrl;
  const showLogo = settings.brand.logo_mode !== "hidden";
  const showTitle = settings.brand.show_title;
  const showBrand = showLogo || showTitle;
  const topbarStyle = {
    "--topbar-height": `${settings.layout.height}px`,
    "--topbar-logo-size": `${settings.layout.logo_size}px`,
  } as CSSProperties;

  return (
    <header
      className="sl-topbar"
      style={topbarStyle}
      {...editorInspectAttributes(
        { kind: "design", focus: "topbar_background" },
        "Edit header background"
      )}
    >
      <button
        type="button"
        className={`sl-topbar-brand${showBrand ? "" : " is-empty"}`}
        onClick={onBrandClick}
        aria-label="Open home splash"
        {...editorInspectAttributes(
          { kind: "navigation", focus: "header_brand" },
          "Edit header brand"
        )}
      >
        {showLogo ? (
          logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" />
          ) : (
            <span
              aria-hidden
              style={{
                color: "var(--secondary)",
                fontFamily: "var(--primary-font)",
                fontSize: "var(--topbar-logo-size, 28px)",
              }}
            >
              *
            </span>
          )
        ) : null}
        {showTitle ? <span>{guidebook.title}</span> : null}
      </button>
      <div className="sl-topbar-center">
        {onSearchResultSelect && searchItems.length > 0 ? (
          <GuidebookSearch
            items={searchItems}
            onSelect={onSearchResultSelect}
            icon={settings.actions.search_icon}
            styleVariant={settings.search.style}
            expandBehavior={settings.search.expand_behavior}
            motion={settings.search.motion}
          />
        ) : null}
      </div>
      <div className="sl-topbar-end">
        {settings.page_name.visible ? (
          <span
            className="sl-topbar-eyebrow"
            {...editorInspectAttributes(
              { kind: "navigation", focus: "page_name" },
              "Edit page name"
            )}
          >
            {tabLabel}
          </span>
        ) : null}
        {showLanguagePicker && <LanguagePicker variant="topbar" />}
        {!hideShare && (
          <ShareButton
            title={guidebook.title}
            text={`Welcome guide: ${guidebook.title}`}
            shareUrl={shareUrl}
            icon={settings.actions.share_icon}
            onShared={onShare}
          />
        )}
      </div>
    </header>
  );
}
