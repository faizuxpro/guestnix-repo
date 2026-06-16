"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  TemplateGuidebook,
  TemplatePlace,
  TemplatePreviewFocus,
  TemplateSection,
} from "./types";
import { HeroSection } from "./components/HeroSection";
import { BottomNav, type NavTab } from "./components/BottomNav";
import { SectionGrid } from "./components/SectionGrid";
import { SectionPopup } from "./components/SectionPopup";
import { SectionPage } from "./components/SectionPage";
import { Topbar } from "./components/Topbar";
import { PlacesExplorer } from "./components/PlacesExplorer";
import { AboutHost } from "./components/AboutHost";
import { StorePage } from "./components/store/StorePage";
import { StoreUpdatesClient } from "./components/store/StoreUpdatesClient";
import { BlockRenderer } from "./blocks";
import { trackEvent } from "@/lib/analytics/track";
import { InstallAppCard } from "@/components/guidebook/pwa/InstallAppCard";
import { BOTTOM_NAV_DEFAULTS, type BottomNavSlot } from "@/types/bottom-nav";
import { filterInvalidSlots } from "@/lib/bottom-nav";
import { DEFAULT_NEARBY_SETTINGS, type NearbySettings } from "@/lib/nearby";
import { isStorefrontPubliclyAvailable } from "@/lib/store/public";
import type { SnapshotStorefront } from "@/lib/store/types";
import { formatFullAddress } from "@/lib/hero-data";
import { snapWeightToFont, type CustomFont } from "@/lib/fonts/catalog";
import { SECTION_COVER_FALLBACK_IMAGE } from "@/lib/section-cover";
import { normalizeSectionIndexSettings } from "@/lib/section-settings";
import {
  createBottomNavRootVars,
  normalizeBottomNavDesignSettings,
} from "@/lib/bottom-nav-settings";
import { absoluteAppUrl } from "@/lib/app-url";
import {
  PUBLIC_GUIDEBOOK_BASE_PATH,
  type GuidebookPublicBasePath,
} from "@/lib/guidebook-public-url";
import { normalizeTopbarSettings } from "@/lib/topbar-settings";
import { editorInspectAttributes } from "@/lib/editor-inspect";
import {
  buildGuidebookSearchItems,
  type GuidebookSearchResult,
} from "./search";
import {
  clearGuidebookSearchMarks,
  focusGuidebookSearchTarget,
} from "./search-dom";
import "./styles.css";

type Props = {
  guidebook: TemplateGuidebook;
  sections: TemplateSection[];
  places?: TemplatePlace[];
  bottomNav?: BottomNavSlot[];
  storefront?: SnapshotStorefront | null;
  nearbySettings?: NearbySettings;
  guidebookSettings?: Record<string, unknown>;
  /** When true, start with hero dismissed (used in editor preview) */
  skipIntro?: boolean;
  /** When true, suppress analytics and other live-only side effects. */
  isPreview?: boolean;
  /** Editor preview device; lets responsive styles follow the simulated frame. */
  previewDevice?: "mobile" | "tablet" | "desktop";
  /** Editor preview block currently being edited. */
  activePreviewBlockId?: string | null;
  /** Editor preview block that should flash from a new activation. */
  activePreviewFlashBlockId?: string | null;
  /** Changes only when the editor preview activation flash should replay. */
  activePreviewActivationKey?: number;
  /** Editor preview section chrome currently being edited. */
  activePreviewFocus?: TemplatePreviewFocus | null;
  /** Rendered as an overlay (floating button + panel). */
  chatWidget?: React.ReactNode;
  /** Optional: viewer host registers a callback that opens/closes a section by id. */
  registerOpenSection?: (fn: (sectionId: string | null) => void) => void;
  /** Optional: editor host registers a callback that switches the active featured view. */
  registerSetFeaturedView?: (
    fn: (view: "home" | "host" | "nearby" | "store" | null) => void
  ) => void;
  /** Show the language picker in topbar + splash. Driven by host settings. */
  showLanguagePicker?: boolean;
  /** Public route prefix used for guest-facing links. */
  publicBasePath?: GuidebookPublicBasePath;
  /** Rendered at the bottom of demo guidebook content pages. */
  demoCtaSlot?: React.ReactNode;
};

const TAB_LABELS: Record<NavTab, string> = {
  home: "Welcome",
  guide: "The Guide",
  nearby: "Nearby",
  host: "Meet Host",
  store: "Store",
};

type SearchHighlight =
  | { kind: "home"; query: string; nonce: number }
  | { kind: "host"; query: string; nonce: number }
  | { kind: "section"; id: string; query: string; nonce: number }
  | { kind: "block"; id: string; query: string; nonce: number }
  | { kind: "place"; id: string; query: string; nonce: number }
  | { kind: "store"; query: string; nonce: number }
  | { kind: "storeItem"; id: string; query: string; nonce: number };

function searchTargetSelector(target: SearchHighlight) {
  if (target.kind === "home") {
    return '[data-guidebook-search-target="home"]';
  }
  if (target.kind === "host") {
    return '[data-guidebook-search-target="host"]';
  }
  if (target.kind === "store") {
    return '[data-guidebook-search-target="store"]';
  }
  if (target.kind === "storeItem") {
    return `[data-guidebook-search-target="store-item-${target.id}"]`;
  }
  return `[data-guidebook-search-target="${target.kind}-${target.id}"]`;
}

function brandingToStyle(
  branding: TemplateGuidebook["branding"] | undefined
): React.CSSProperties {
  if (!branding) return {};
  const b = branding as {
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    brand_gradient?: { from?: string; to?: string; angle?: number } | null;
    background_color?: string;
    background_gradient?: { from?: string; to?: string; angle?: number } | null;
    background_pattern?: "none" | "dots" | "grid" | "diagonal" | "noise";
    background_pattern_strength?: number;
    topbar_background_inherit?: boolean;
    topbar_background_color?: string;
    topbar_background_gradient?: { from?: string; to?: string; angle?: number } | null;
    topbar_background_pattern?: "none" | "dots" | "grid" | "diagonal" | "noise";
    topbar_background_pattern_strength?: number;
    section_background_inherit?: boolean;
    section_background_color?: string;
    section_background_gradient?: { from?: string; to?: string; angle?: number } | null;
    section_background_pattern?: "none" | "dots" | "grid" | "diagonal" | "noise";
    section_background_pattern_strength?: number;
    heading_font?: string;
    body_font?: string;
    font_family?: string; // legacy fallback
    heading_scale?: number;
    body_scale?: number;
    heading_weight?: number;
    body_weight?: number;
    heading_letter_spacing?: number;
    body_letter_spacing?: number;
    heading_line_height?: number;
    body_line_height?: number;
    icon_scale_feature?: number;
    icon_scale_nav?: number;
    custom_fonts?: CustomFont[];
  };
  const style: Record<string, string> = {};

  if (b.primary_color) {
    style["--primary"] = b.primary_color;
    const contrast = contrastForHex(b.primary_color);
    if (contrast) style["--primary-contrast"] = contrast;
    const rgb = hexToRgb(b.primary_color);
    if (rgb) style["--primary-rgb"] = rgb;
    const dark = darkenHex(b.primary_color, 0.18);
    if (dark) style["--primary-dark"] = dark;
  }
  if (b.secondary_color) {
    style["--secondary"] = b.secondary_color;
    const contrast = contrastForHex(b.secondary_color);
    if (contrast) style["--secondary-contrast"] = contrast;
    const rgb = hexToRgb(b.secondary_color);
    if (rgb) style["--secondary-rgb"] = rgb;
  }
  if (b.accent_color) {
    style["--accent"] = b.accent_color;
    const contrast = contrastForHex(b.accent_color);
    if (contrast) style["--accent-contrast"] = contrast;
    const rgb = hexToRgb(b.accent_color);
    if (rgb) style["--accent-rgb"] = rgb;
  }

  if (
    b.brand_gradient &&
    b.brand_gradient.from &&
    b.brand_gradient.to &&
    typeof b.brand_gradient.angle === "number"
  ) {
    style["--brand-surface"] = `linear-gradient(${b.brand_gradient.angle}deg, ${b.brand_gradient.from}, ${b.brand_gradient.to})`;
  }

  // ─── Canvas background ────────────────────────────────────────────
  if (b.background_color) {
    style["--bg"] = b.background_color;
    // Paper (image frames, gallery cells, icon badges) auto-derives from the
    // bg so the elevated surface sits one step darker on a light page or
    // one step lighter on a dark page. No separate control needed.
    const paper = derivePaperFromBg(b.background_color);
    if (paper) style["--bg-paper"] = paper;
  }
  if (
    b.background_gradient &&
    b.background_gradient.from &&
    b.background_gradient.to &&
    typeof b.background_gradient.angle === "number"
  ) {
    style["--canvas-background"] = `linear-gradient(${b.background_gradient.angle}deg, ${b.background_gradient.from}, ${b.background_gradient.to})`;
  }
  if (b.background_pattern && b.background_pattern !== "none") {
    const tintRgb =
      (b.primary_color && hexToRgb(b.primary_color)) || "10, 35, 33";
    const strength =
      typeof b.background_pattern_strength === "number"
        ? b.background_pattern_strength
        : 0.12;
    const pattern = canvasPatternBackground(
      b.background_pattern,
      tintRgb,
      strength
    );
    if (pattern) {
      style["--canvas-pattern-image"] = pattern.image;
      style["--canvas-pattern-size"] = pattern.size;
      style["--canvas-pattern-opacity"] = pattern.opacity;
    }
  }

  if (b.topbar_background_inherit === false) {
    const topbarColor = b.topbar_background_color || b.background_color;
    if (
      b.topbar_background_gradient &&
      b.topbar_background_gradient.from &&
      b.topbar_background_gradient.to &&
      typeof b.topbar_background_gradient.angle === "number"
    ) {
      style["--topbar-background"] = `linear-gradient(${b.topbar_background_gradient.angle}deg, ${b.topbar_background_gradient.from}, ${b.topbar_background_gradient.to})`;
    } else if (topbarColor) {
      style["--topbar-background"] = topbarColor;
    }

    const topbarPattern = b.topbar_background_pattern ?? "none";
    if (topbarPattern === "none") {
      style["--topbar-pattern-image"] = "none";
      style["--topbar-pattern-size"] = "auto";
      style["--topbar-pattern-opacity"] = "1";
    } else {
      const tintRgb =
        (b.primary_color && hexToRgb(b.primary_color)) || "10, 35, 33";
      const strength =
        typeof b.topbar_background_pattern_strength === "number"
          ? b.topbar_background_pattern_strength
          : 0.12;
      const pattern = canvasPatternBackground(
        topbarPattern,
        tintRgb,
        strength
      );
      if (pattern) {
        style["--topbar-pattern-image"] = pattern.image;
        style["--topbar-pattern-size"] = pattern.size;
        style["--topbar-pattern-opacity"] = pattern.opacity;
      }
    }
  }

  if (b.section_background_inherit === false) {
    const sectionColor = b.section_background_color || b.background_color;
    if (
      b.section_background_gradient &&
      b.section_background_gradient.from &&
      b.section_background_gradient.to &&
      typeof b.section_background_gradient.angle === "number"
    ) {
      style["--section-background"] = `linear-gradient(${b.section_background_gradient.angle}deg, ${b.section_background_gradient.from}, ${b.section_background_gradient.to})`;
    } else if (sectionColor) {
      style["--section-background"] = sectionColor;
    }

    const sectionPattern = b.section_background_pattern ?? "none";
    if (sectionPattern === "none") {
      style["--section-pattern-image"] = "none";
      style["--section-pattern-size"] = "auto";
      style["--section-pattern-opacity"] = "1";
    } else {
      const tintRgb =
        (b.primary_color && hexToRgb(b.primary_color)) || "10, 35, 33";
      const strength =
        typeof b.section_background_pattern_strength === "number"
          ? b.section_background_pattern_strength
          : 0.12;
      const pattern = canvasPatternBackground(
        sectionPattern,
        tintRgb,
        strength
      );
      if (pattern) {
        style["--section-pattern-image"] = pattern.image;
        style["--section-pattern-size"] = pattern.size;
        style["--section-pattern-opacity"] = pattern.opacity;
      }
    }
  }

  const heading = b.heading_font || b.font_family;
  const body = b.body_font || b.font_family;
  if (heading) {
    style["--primary-font"] = quoteFontStack(heading, "serif");
  }
  if (body) {
    style["--secondary-font"] = quoteFontStack(body, "sans-serif");
  }

  if (typeof b.heading_scale === "number" && b.heading_scale > 0) {
    style["--primary-font-scale"] = String(b.heading_scale);
  }
  if (typeof b.body_scale === "number" && b.body_scale > 0) {
    style["--secondary-font-scale"] = String(b.body_scale);
  }
  if (typeof b.heading_weight === "number" && b.heading_weight > 0) {
    // Snap to a weight the chosen heading font actually ships, so we never
    // trigger the browser's faux-bold synthesis on single-weight families
    // (DM Serif Display, Bebas Neue, Anton, etc.).
    const snapped = heading
      ? snapWeightToFont(b.heading_weight, heading, b.custom_fonts)
      : b.heading_weight;
    style["--heading-weight"] = String(snapped);
    style["--heading-weight-strong"] = String(
      Math.max(700, Math.min(900, snapped + 200))
    );
  }
  if (typeof b.body_weight === "number" && b.body_weight > 0) {
    const snappedBody = body
      ? snapWeightToFont(b.body_weight, body, b.custom_fonts)
      : b.body_weight;
    style["--body-weight"] = String(snappedBody);
    // Derived "emphasis" and "strong" weights — keep the original 3-tier
    // hierarchy (body / names / labels) relative to the chosen base. Each
    // tier is then snapped to the body font's available weights too.
    const emphasisRaw = Math.min(900, snappedBody + 100);
    const strongRaw = Math.min(900, snappedBody + 200);
    const emphasis = body
      ? snapWeightToFont(emphasisRaw, body, b.custom_fonts)
      : emphasisRaw;
    const strong = body
      ? snapWeightToFont(strongRaw, body, b.custom_fonts)
      : strongRaw;
    style["--body-weight-emphasis"] = String(emphasis);
    style["--body-weight-strong"] = String(strong);
  }
  if (typeof b.heading_letter_spacing === "number") {
    style["--heading-letter-spacing"] = `${b.heading_letter_spacing}em`;
  }
  if (typeof b.body_letter_spacing === "number") {
    style["--body-letter-spacing"] = `${b.body_letter_spacing}em`;
  }
  if (typeof b.heading_line_height === "number" && b.heading_line_height > 0) {
    style["--heading-line-height"] = String(b.heading_line_height);
  }
  if (typeof b.body_line_height === "number" && b.body_line_height > 0) {
    style["--body-line-height"] = String(b.body_line_height);
  }
  if (typeof b.icon_scale_feature === "number" && b.icon_scale_feature > 0) {
    style["--icon-scale-feature"] = String(b.icon_scale_feature);
  }
  if (typeof b.icon_scale_nav === "number" && b.icon_scale_nav > 0) {
    style["--icon-scale-nav"] = String(b.icon_scale_nav);
  }

  return style as React.CSSProperties;
}

function hexToRgb(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function darkenHex(hex: string, amount: number): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function contrastForHex(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#0f172a" : "#ffffff";
}

/**
 * Compute the "paper" surface color from a base bg. Light bgs get a slight
 * step darker (so cards/image frames sit a touch lower than the page), dark
 * bgs get a slight step lighter. Amount kept small so the difference is
 * felt but never harsh.
 */
function derivePaperFromBg(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // Perceived brightness (ITU-R BT.601)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const shiftDown = yiq >= 140;
  const amount = 0.06;
  const apply = (v: number) =>
    shiftDown
      ? Math.max(0, Math.round(v * (1 - amount)))
      : Math.min(255, Math.round(v + (255 - v) * amount));
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(apply(r))}${toHex(apply(g))}${toHex(apply(b))}`;
}

function quoteFontStack(name: string, fallback: "serif" | "sans-serif"): string {
  const trimmed = name.trim();
  const head = /\s/.test(trimmed) ? `"${trimmed}"` : trimmed;
  return `${head}, ${fallback}`;
}

/**
 * Build the pattern background-image string for the canvas overlay. The
 * keyword maps to one of four CSS patterns whose tint comes from the
 * primary brand color. Returns null for unknown / "none".
 */
function canvasPatternBackground(
  pattern: "none" | "dots" | "grid" | "diagonal" | "noise",
  tintRgb: string,
  strength: number
): { image: string; size: string; opacity: string } | null {
  const tint = `rgba(${tintRgb}, ${strength})`;
  switch (pattern) {
    case "dots":
      return {
        image: `radial-gradient(${tint} 1.5px, transparent 1.5px)`,
        size: "16px 16px",
        opacity: "1",
      };
    case "grid":
      return {
        image: `linear-gradient(to right, ${tint} 1px, transparent 1px), linear-gradient(to bottom, ${tint} 1px, transparent 1px)`,
        size: "24px 24px",
        opacity: "1",
      };
    case "diagonal":
      return {
        image: `repeating-linear-gradient(45deg, ${tint} 0, ${tint} 1.5px, transparent 1.5px, transparent 12px)`,
        size: "auto",
        opacity: "1",
      };
    case "noise":
      return {
        image:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        size: "140px 140px",
        // Noise PNG is already low-alpha; bump the layer up to feel similar
        // to the line/grid strengths at the same slider value.
        opacity: String(Math.min(1, strength * 4)),
      };
    case "none":
    default:
      return null;
  }
}

export function SunsetLakehouseTemplate({
  guidebook,
  sections,
  places = [],
  bottomNav,
  storefront = null,
  nearbySettings = DEFAULT_NEARBY_SETTINGS,
  guidebookSettings = {},
  skipIntro = false,
  isPreview = false,
  previewDevice,
  activePreviewBlockId = null,
  activePreviewFlashBlockId = null,
  activePreviewActivationKey = 0,
  activePreviewFocus = null,
  chatWidget,
  registerOpenSection,
  registerSetFeaturedView,
  showLanguagePicker = false,
  publicBasePath = PUBLIC_GUIDEBOOK_BASE_PATH,
  demoCtaSlot,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [heroDismissed, setHeroDismissed] = useState(skipIntro);
  const [tab, setTab] = useState<NavTab>("guide");
  const [openPopupSectionId, setOpenPopupSectionId] = useState<string | null>(null);
  const [openPageSectionId, setOpenPageSectionId] = useState<string | null>(null);
  const [storeUnreadCount, setStoreUnreadCount] = useState(0);
  const [searchHighlight, setSearchHighlight] = useState<SearchHighlight | null>(
    null
  );

  useEffect(() => {
    setHeroDismissed(skipIntro);
  }, [skipIntro]);

  useEffect(() => {
    if (!searchHighlight) return;
    const timer = window.setTimeout(() => setSearchHighlight(null), 2400);
    return () => window.clearTimeout(timer);
  }, [searchHighlight]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    clearGuidebookSearchMarks(root);
    if (!searchHighlight) return;

    const selector = searchTargetSelector(searchHighlight);
    const timers: number[] = [];
    let cancelled = false;

    const focusTarget = (attempt: number) => {
      if (cancelled) return;

      const result = focusGuidebookSearchTarget(
        root,
        selector,
        searchHighlight.query
      );

      if (result?.mark || attempt >= 10) {
        if (result) {
          timers.push(
            window.setTimeout(() => {
              const scrollTarget = result.mark ?? result.target;
              scrollTarget.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest",
              });
            }, 420)
          );
        }
        return;
      }

      timers.push(window.setTimeout(() => focusTarget(attempt + 1), 120));
    };

    timers.push(window.setTimeout(() => focusTarget(0), 80));

    return () => {
      cancelled = true;
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
      clearGuidebookSearchMarks(root);
    };
  }, [searchHighlight]);

  const viewFiredRef = useRef(false);
  const lastFeaturedPageTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (isPreview || viewFiredRef.current) return;
    viewFiredRef.current = true;
    trackEvent({
      guidebookId: guidebook.id,
      eventType: "page_view",
      metadata: { templateId: guidebook.templateId },
    });
  }, [guidebook.id, guidebook.templateId, isPreview]);

  useEffect(() => {
    if (isPreview || !heroDismissed) return;
    if (tab !== "host" && tab !== "nearby") {
      lastFeaturedPageTrackedRef.current = null;
      return;
    }
    if (lastFeaturedPageTrackedRef.current === tab) return;
    lastFeaturedPageTrackedRef.current = tab;

    trackEvent({
      guidebookId: guidebook.id,
      eventType: "featured_page_viewed",
      metadata: {
        page: tab,
        pageLabel: tab === "host" ? "About host" : "Nearby",
      },
    });
  }, [guidebook.id, heroDismissed, isPreview, tab]);

  const heroData = guidebook.heroData;
  const propertyDisplayName =
    heroData.property.name.trim() || guidebook.title.trim() || "Your Stay";
  const nearbyLocationLabel =
    (typeof nearbySettings.location_name === "string" &&
    nearbySettings.location_name.trim().length > 0
      ? nearbySettings.location_name.trim()
      : formatFullAddress(heroData.property)) || undefined;
  const openPopupSection = useMemo(
    () => sections.find((s) => s.id === openPopupSectionId) ?? null,
    [sections, openPopupSectionId]
  );
  const openPageSection = useMemo(
    () => sections.find((s) => s.id === openPageSectionId) ?? null,
    [sections, openPageSectionId]
  );

  const themeStyle = useMemo(
    () => brandingToStyle(guidebook.branding),
    [guidebook.branding]
  );
  const bottomNavDesign = useMemo(
    () =>
      normalizeBottomNavDesignSettings(guidebookSettings, {
        legacyIconScale: (guidebook.branding as { icon_scale_nav?: unknown })
          .icon_scale_nav,
      }),
    [guidebook.branding, guidebookSettings]
  );
  const topbarSettings = useMemo(
    () => normalizeTopbarSettings(guidebookSettings),
    [guidebookSettings]
  );
  const previewShareUrl = useMemo(
    () =>
      isPreview && guidebook.slug
        ? absoluteAppUrl(
            `${publicBasePath}/${encodeURIComponent(guidebook.slug)}`
          )
        : undefined,
    [guidebook.slug, isPreview, publicBasePath]
  );
  const templateStyle = useMemo(
    () =>
      ({
        ...themeStyle,
        ...createBottomNavRootVars(bottomNavDesign),
      }) as React.CSSProperties,
    [bottomNavDesign, themeStyle]
  );
  const sectionIndexSettings = useMemo(
    () => normalizeSectionIndexSettings(guidebookSettings),
    [guidebookSettings]
  );

  const sectionIdSet = useMemo(() => new Set(sections.map((s) => s.id)), [sections]);
  const storeAvailable = isPreview
    ? Boolean(storefront)
    : isStorefrontPubliclyAvailable(storefront);
  const effectiveSlots = useMemo(() => {
    const raw = bottomNav && bottomNav.length > 0 ? bottomNav : BOTTOM_NAV_DEFAULTS;
    return filterInvalidSlots(raw, sectionIdSet).filter(
      (slot) => slot.type !== "store" || storeAvailable
    );
  }, [bottomNav, sectionIdSet, storeAvailable]);

  const searchItems = useMemo(
    () => buildGuidebookSearchItems({ guidebook, sections, places, storefront }),
    [guidebook, places, sections, storefront]
  );

  const handleHeroDismiss = () => {
    setHeroDismissed(true);
    setTab("guide");
  };

  const closeOpenSection = useCallback(() => {
    setOpenPopupSectionId(null);
    setOpenPageSectionId(null);
  }, []);

  const handleTabChange = (next: NavTab) => {
    if (next === "home") {
      setTab("home");
      setHeroDismissed(false);
      closeOpenSection();
      return;
    }
    setTab(next);
    closeOpenSection();
  };

  const openSection = useCallback(
    (sectionId: string, trackClick: boolean) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;

      setHeroDismissed(true);
      if (section.displayMode === "full_page") {
        setOpenPopupSectionId(null);
        setOpenPageSectionId(sectionId);
      } else {
        setOpenPageSectionId(null);
        setOpenPopupSectionId(sectionId);
      }

      if (isPreview || !trackClick) return;
      trackEvent({
        guidebookId: guidebook.id,
        eventType: "section_click",
        metadata: {
          sectionId,
          sectionTitle: section?.title,
        },
      });
    },
    [guidebook.id, isPreview, sections]
  );

  const handleSectionOpen = useCallback(
    (sectionId: string) => {
      openSection(sectionId, true);
    },
    [openSection]
  );

  const handleSearchResultSelect = useCallback(
    (result: GuidebookSearchResult, query: string) => {
      const nonce = Date.now();
      const trimmedQuery = query.trim();

      if (result.type === "home") {
        closeOpenSection();
        setTab("home");
        setHeroDismissed(false);
        setSearchHighlight({ kind: "home", query: trimmedQuery, nonce });
        return;
      }

      if (result.type === "host") {
        closeOpenSection();
        setHeroDismissed(true);
        setTab("host");
        setSearchHighlight({ kind: "host", query: trimmedQuery, nonce });
        return;
      }

      if (result.type === "place" && result.placeId) {
        closeOpenSection();
        setHeroDismissed(true);
        setTab("nearby");
        setSearchHighlight({
          kind: "place",
          id: result.placeId,
          query: trimmedQuery,
          nonce,
        });
        return;
      }

      if (result.type === "store" && storeAvailable) {
        closeOpenSection();
        setHeroDismissed(true);
        setTab("store");
        setSearchHighlight(
          result.storeItemId
            ? {
                kind: "storeItem",
                id: result.storeItemId,
                query: trimmedQuery,
                nonce,
              }
            : { kind: "store", query: trimmedQuery, nonce }
        );
        return;
      }

      if (result.sectionId) {
        setHeroDismissed(true);
        setTab("guide");
        openSection(result.sectionId, false);
        setSearchHighlight(
          result.type === "block" && result.blockId
            ? {
                kind: "block",
                id: result.blockId,
                query: trimmedQuery,
                nonce,
              }
            : {
                kind: "section",
                id: result.sectionId,
                query: trimmedQuery,
                nonce,
              }
        );
      }
    },
    [closeOpenSection, openSection, storeAvailable]
  );

  const handleShare = useCallback(
    (method: "native" | "copy") => {
      if (isPreview) return;
      trackEvent({
        guidebookId: guidebook.id,
        eventType: "share",
        metadata: { method },
      });
    },
    [guidebook.id, isPreview]
  );

  useEffect(() => {
    if (!registerOpenSection) return;
    registerOpenSection((id: string | null) => {
      if (!id) {
        closeOpenSection();
        return;
      }
      if (sectionIdSet.has(id)) {
        openSection(id, false);
      }
    });
  }, [closeOpenSection, openSection, registerOpenSection, sectionIdSet]);

  useEffect(() => {
    if (!registerSetFeaturedView) return;
    registerSetFeaturedView((view) => {
      closeOpenSection();
      if (view === "home") {
        setHeroDismissed(false);
        return;
      }
      setHeroDismissed(true);
      if (view === "host") {
        setTab("host");
      } else if (view === "nearby") {
        setTab("nearby");
      } else if (view === "store" && storeAvailable) {
        setTab("store");
      } else {
        setTab("guide");
      }
    });
  }, [closeOpenSection, registerSetFeaturedView, storeAvailable]);

  useEffect(() => {
    if (tab === "store" && !storeAvailable) {
      setTab("guide");
    }
  }, [storeAvailable, tab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const featuredHash = hash.toLowerCase();
    if (
      featuredHash === "#store" ||
      featuredHash === "#nearby" ||
      featuredHash === "#host" ||
      featuredHash === "#guide"
    ) {
      setHeroDismissed(true);
      if (featuredHash === "#store" && storeAvailable) {
        setTab("store");
      } else if (featuredHash === "#nearby") {
        setTab("nearby");
      } else if (featuredHash === "#host") {
        setTab("host");
      } else {
        setTab("guide");
      }
      return;
    }
    const match = /#section-([a-zA-Z0-9-]+)/.exec(hash);
    if (match && sectionIdSet.has(match[1])) {
      openSection(match[1], false);
    }
  }, [openSection, sectionIdSet, storeAvailable]);

  const highlightedBlockId =
    searchHighlight?.kind === "block" ? searchHighlight.id : null;
  const highlightedSectionId =
    searchHighlight?.kind === "section" ? searchHighlight.id : null;
  const highlightedPlaceId =
    searchHighlight?.kind === "place" ? searchHighlight.id : null;
  const highlightedStoreItemId =
    searchHighlight?.kind === "storeItem" ? searchHighlight.id : null;

  const renderSectionBlocks = useCallback(
    (section: TemplateSection | null) =>
      section?.blocks
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .filter((block) => block.isVisible)
        .map((block) => {
          const isEditorActive = activePreviewBlockId === block.id;
          const shouldFlash = activePreviewFlashBlockId === block.id;

          return (
            <div
              key={block.id}
              className={`sl-search-block-target${
                highlightedBlockId === block.id ? " sl-search-highlight" : ""
              }${isEditorActive ? " sl-editor-active-block" : ""}`}
              data-guidebook-search-target={`block-${block.id}`}
              {...editorInspectAttributes(
                {
                  kind: "block",
                  sectionId: section.id,
                  blockId: block.id,
                },
                "Edit block"
              )}
            >
              {shouldFlash ? (
                <span
                  key={activePreviewActivationKey}
                  className="sl-editor-active-block-flash"
                  aria-hidden
                />
              ) : null}
              <BlockRenderer
                block={block}
                places={places}
                guidebookSettings={guidebookSettings}
              />
            </div>
          );
        }),
    [
      activePreviewActivationKey,
      activePreviewBlockId,
      activePreviewFlashBlockId,
      guidebookSettings,
      highlightedBlockId,
      places,
    ]
  );

  const getSectionPreviewFocus = useCallback(
    (section: TemplateSection | null) =>
      section && activePreviewFocus?.sectionId === section.id
        ? activePreviewFocus
        : null,
    [activePreviewFocus]
  );

  const topbarLabel = openPageSection ? openPageSection.title : TAB_LABELS[tab];
  const activeSectionId = openPageSectionId ?? openPopupSectionId;
  const defaultSectionCoverImage =
    guidebook.heroData.property.cover_image_url || SECTION_COVER_FALLBACK_IMAGE;

  return (
    <div
      ref={rootRef}
      className={`tpl-sunset${previewDevice ? ` is-preview-${previewDevice}` : ""}`}
      data-preview-device={previewDevice}
      style={templateStyle}
    >
      <div
        className="sl-main"
        aria-hidden={!heroDismissed}
        {...editorInspectAttributes(
          { kind: "design", focus: "app_background" },
          "Edit app background"
        )}
      >
        <Topbar
          guidebook={guidebook}
          tabLabel={topbarLabel}
          settings={topbarSettings}
          searchItems={searchItems}
          onSearchResultSelect={handleSearchResultSelect}
          shareUrl={previewShareUrl}
          onShare={handleShare}
          showLanguagePicker={showLanguagePicker}
          onBrandClick={() => handleTabChange("home")}
        />

        {tab === "guide" && (
          <SectionGrid
            sections={sections}
            settings={sectionIndexSettings}
            onOpen={handleSectionOpen}
            footerSlot={demoCtaSlot}
          />
        )}

        {tab === "nearby" && (
          <PlacesExplorer
            places={places}
            propertyName={propertyDisplayName}
            locationLabel={nearbyLocationLabel}
            showMap={nearbySettings.show_map}
            centerLat={nearbySettings.center_lat}
            centerLng={nearbySettings.center_lng}
            zoom={nearbySettings.zoom}
            radiusMiles={nearbySettings.radius_miles}
            categories={nearbySettings.categories}
            intro={nearbySettings.intro}
            focusedPlaceId={highlightedPlaceId}
            highlightedPlaceId={highlightedPlaceId}
            footerSlot={demoCtaSlot}
          />
        )}

        {tab === "host" && (
          <AboutHost
            host={heroData.host}
            propertyAddress={formatFullAddress(heroData.property)}
            propertyLogoUrl={heroData.property.logo_url}
            photoSource={heroData.host_page.photo_source}
            photoFit={heroData.host_page.photo_fit}
            show={heroData.host_page.show}
            fallbackName="Your host"
            highlighted={searchHighlight?.kind === "host"}
            footerSlot={
              <InstallAppCard
                variant="inline"
                alwaysShow
                primaryColor={
                  (guidebook.branding as { primary_color?: string })
                    ?.primary_color
                }
              />
            }
            bottomSlot={demoCtaSlot}
          />
        )}

        {tab === "store" && storefront && (
          <StorePage
            guidebookId={guidebook.id}
            guidebookSlug={guidebook.slug}
            publicBasePath={publicBasePath}
            storefront={storefront}
            isPreview={isPreview}
            highlighted={searchHighlight?.kind === "store"}
            highlightedItemId={highlightedStoreItemId}
            footerSlot={demoCtaSlot}
          />
        )}

        <SectionPage
          section={openPageSection}
          onClose={() => setOpenPageSectionId(null)}
          slug={guidebook.slug}
          publicBasePath={publicBasePath}
          fallbackCoverImage={defaultSectionCoverImage}
          guidebookSettings={guidebookSettings}
          activePreviewFocus={getSectionPreviewFocus(openPageSection)}
          highlighted={
            Boolean(openPageSection) &&
            highlightedSectionId === openPageSection?.id
          }
        >
          {renderSectionBlocks(openPageSection)}
        </SectionPage>

      </div>

      <HeroSection
        property={heroData.property}
        host={heroData.host}
        config={heroData.home}
        branding={guidebook.branding as React.ComponentProps<typeof HeroSection>["branding"]}
        fallbackTitle={guidebook.title}
        dismissed={heroDismissed}
        onDismiss={handleHeroDismiss}
        showLanguagePicker={showLanguagePicker}
        highlighted={searchHighlight?.kind === "home"}
      />

      <BottomNav
        slots={effectiveSlots}
        design={bottomNavDesign}
        activeBuiltin={tab}
        activeSectionId={activeSectionId}
        storeUnreadCount={storeUnreadCount}
        onBuiltin={handleTabChange}
        onSection={handleSectionOpen}
        hidden={!heroDismissed && !bottomNavDesign.behavior.show_during_intro}
      />

      <StoreUpdatesClient
        guidebookSlug={guidebook.slug}
        disabled={isPreview || !storeAvailable}
        onUnreadChange={setStoreUnreadCount}
      />

      <SectionPopup
        section={openPopupSection}
        onClose={() => setOpenPopupSectionId(null)}
        slug={guidebook.slug}
        publicBasePath={publicBasePath}
        fallbackCoverImage={defaultSectionCoverImage}
        guidebookSettings={guidebookSettings}
        activePreviewFocus={getSectionPreviewFocus(openPopupSection)}
        highlighted={
          Boolean(openPopupSection) &&
          highlightedSectionId === openPopupSection?.id
        }
      >
        {renderSectionBlocks(openPopupSection)}
      </SectionPopup>

      {chatWidget}
    </div>
  );
}
