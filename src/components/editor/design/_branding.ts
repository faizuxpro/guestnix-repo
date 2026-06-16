"use client";

import { useCallback } from "react";
import { useEditorStore } from "@/stores/editor-store";
import type { CustomFont } from "@/lib/fonts/catalog";

export type BrandGradient = {
  from: string;
  to: string;
  angle: number;
} | null;

export type BackgroundPattern =
  | "none"
  | "dots"
  | "grid"
  | "diagonal"
  | "noise";

export type BrandingShape = {
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  brand_gradient?: BrandGradient;
  background_color?: string;
  background_gradient?: BrandGradient;
  background_pattern?: BackgroundPattern;
  background_pattern_strength?: number;
  topbar_background_inherit?: boolean;
  topbar_background_color?: string;
  topbar_background_gradient?: BrandGradient;
  topbar_background_pattern?: BackgroundPattern;
  topbar_background_pattern_strength?: number;
  section_background_inherit?: boolean;
  section_background_color?: string;
  section_background_gradient?: BrandGradient;
  section_background_pattern?: BackgroundPattern;
  section_background_pattern_strength?: number;
  heading_font?: string;
  body_font?: string;
  font_family?: string; // legacy
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

export const DEFAULTS = {
  primary_color: "#002927",
  secondary_color: "#d4a23a",
  accent_color: "#e8c36a",
  brand_gradient: { from: "#002927", to: "#0a4a47", angle: 135 },
  background_color: "#faf6ef",
  background_gradient: { from: "#faf6ef", to: "#f3ede0", angle: 180 },
  background_pattern: "none" as BackgroundPattern,
  background_pattern_strength: 0.12,
  topbar_background_inherit: true,
  topbar_background_color: "#faf6ef",
  topbar_background_gradient: null as BrandGradient,
  topbar_background_pattern: "none" as BackgroundPattern,
  topbar_background_pattern_strength: 0.12,
  section_background_inherit: true,
  section_background_color: "#faf6ef",
  section_background_gradient: null as BrandGradient,
  section_background_pattern: "none" as BackgroundPattern,
  section_background_pattern_strength: 0.12,
  heading_font: "Fraunces",
  body_font: "Montserrat",
  heading_scale: 1,
  body_scale: 1,
  heading_weight: 500,
  body_weight: 400,
  heading_letter_spacing: -0.015,
  body_letter_spacing: 0,
  heading_line_height: 1.15,
  body_line_height: 1.62,
  icon_scale_feature: 1,
  icon_scale_nav: 1,
} as const;

// Canvas backgrounds — Tailwind 100/200 tints. Pure & near-pure whites
// (slate-50, gray-50, stone-50, amber-50…) are intentionally excluded:
// every swatch has visible warmth or coolness so the page never feels
// glaring behind text.
export const BG_PRESETS: Array<{ value: string; name: string }> = [
  // Cool neutrals & tints
  { value: "#F1F5F9", name: "Slate 100" },
  { value: "#E2E8F0", name: "Slate 200" },
  { value: "#CBD5E1", name: "Slate 300" },
  { value: "#E5E7EB", name: "Gray 200" },
  { value: "#D1D5DB", name: "Gray 300" },
  { value: "#DBEAFE", name: "Blue 100" },
  { value: "#E0F2FE", name: "Sky 100" },
  { value: "#CCFBF1", name: "Teal 100" },
  { value: "#DCFCE7", name: "Green 100" },
  { value: "#ECFCCB", name: "Lime 100" },
  { value: "#EDE9FE", name: "Violet 100" },
  { value: "#F3E8FF", name: "Purple 100" },
  { value: "#FAE8FF", name: "Fuchsia 100" },
  // Warm neutrals & tints
  { value: "#F5F5F4", name: "Stone 100" },
  { value: "#E7E5E4", name: "Stone 200" },
  { value: "#F4F4F5", name: "Zinc 100" },
  { value: "#E4E4E7", name: "Zinc 200" },
  { value: "#FEF3C7", name: "Amber 100" },
  { value: "#FDE68A", name: "Amber 200" },
  { value: "#FCE7F3", name: "Pink 100" },
  { value: "#FFE4E6", name: "Rose 100" },
];

// Canvas gradients — subtle 100/200 paper-to-paper transitions. Every
// stop is a tinted Tailwind pastel; no pure whites.
export const BG_GRADIENT_PRESETS = [
  // Warm gradients
  { id: "cream", name: "Cream", from: "#FEF3C7", to: "#FDE68A", angle: 180 },
  { id: "apricot", name: "Apricot", from: "#FEF3C7", to: "#FFE4E6", angle: 180 },
  { id: "blush", name: "Blush", from: "#FCE7F3", to: "#FFE4E6", angle: 180 },
  { id: "petal", name: "Petal", from: "#FAE8FF", to: "#FCE7F3", angle: 180 },
  { id: "linen", name: "Linen", from: "#F4F4F5", to: "#E4E4E7", angle: 180 },
  { id: "stone", name: "Stone", from: "#F5F5F4", to: "#E7E5E4", angle: 180 },
  // Cool gradients
  { id: "pearl", name: "Pearl", from: "#F1F5F9", to: "#E2E8F0", angle: 180 },
  { id: "cloud", name: "Cloud", from: "#E5E7EB", to: "#CBD5E1", angle: 180 },
  { id: "powder", name: "Powder", from: "#DBEAFE", to: "#E0F2FE", angle: 180 },
  { id: "sky", name: "Sky", from: "#E0F2FE", to: "#DBEAFE", angle: 180 },
  { id: "mint", name: "Mint", from: "#CCFBF1", to: "#DCFCE7", angle: 180 },
  { id: "sage", name: "Sage", from: "#DCFCE7", to: "#ECFCCB", angle: 180 },
  { id: "lavender", name: "Lavender", from: "#EDE9FE", to: "#F3E8FF", angle: 180 },
  { id: "lilac", name: "Lilac", from: "#F3E8FF", to: "#FAE8FF", angle: 180 },
  // Cross-family soft transitions
  { id: "sunset", name: "Sunset", from: "#FDE68A", to: "#FFE4E6", angle: 180 },
  { id: "warm-cool", name: "Day to dusk", from: "#FEF3C7", to: "#EDE9FE", angle: 180 },
  { id: "cool-warm", name: "Dawn to day", from: "#DBEAFE", to: "#FCE7F3", angle: 180 },
];

export const WEIGHT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 300, label: "Light" },
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semi" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Black" },
];

export function asString(v: unknown, fallback: string): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}
export function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function hexToRgbString(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

/**
 * Shared hook for every design tab — reads the branding JSONB out of the
 * editor store and returns a `set()` patcher plus the property logo
 * (which lives on heroData, not branding, but BrandTab edits it as part
 * of "Identity").
 */
export function useBranding() {
  const branding = useEditorStore((s) => s.branding) as BrandingShape;
  const updateBranding = useEditorStore((s) => s.updateBranding);
  const updateHeroData = useEditorStore((s) => s.updateHeroData);
  const propertyLogoUrl = useEditorStore(
    (s) => s.guidebook?.heroData?.property?.logo_url ?? null
  );

  const set = useCallback(
    (patch: Partial<BrandingShape>) => updateBranding(patch),
    [updateBranding]
  );

  const setLogo = useCallback(
    (url: string | null) => updateHeroData({ property: { logo_url: url } }),
    [updateHeroData]
  );

  return { branding, set, propertyLogoUrl, setLogo };
}
