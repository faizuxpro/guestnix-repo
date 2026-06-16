import type { CSSProperties } from "react";

export type BlockColorStyle = CSSProperties & Record<`--${string}`, string>;

export function normalizeHexColor(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (!match) return "";
  const hex = match[1];
  if (hex.length === 6) return `#${hex.toUpperCase()}`;
  return `#${hex
    .split("")
    .map((char) => `${char}${char}`)
    .join("")
    .toUpperCase()}`;
}

export function hexToRgbTriplet(value: unknown): string {
  const hex = normalizeHexColor(value);
  if (!hex) return "";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function contrastForHexColor(value: unknown): string {
  const hex = normalizeHexColor(value);
  if (!hex) return "";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "var(--primary)" : "var(--white)";
}

export function colorRoleFallbackHex(role: string): string {
  switch (role) {
    case "primary":
      return "#0F172A";
    case "secondary":
      return "#0EA5E9";
    case "accent":
      return "#F59E0B";
    case "ink":
      return "#111827";
    case "muted":
      return "#64748B";
    case "border":
      return "#CBD5E1";
    default:
      return "#0EA5E9";
  }
}

export function blockColorOverrideVars(
  colors: Array<{
    value: unknown;
    colorVar: `--${string}`;
    rgbVar?: `--${string}`;
    contrastVar?: `--${string}`;
  }>
): BlockColorStyle {
  const style: BlockColorStyle = {};
  for (const color of colors) {
    const hex = normalizeHexColor(color.value);
    if (!hex) continue;
    style[color.colorVar] = hex;
    if (color.rgbVar) {
      style[color.rgbVar] = hexToRgbTriplet(hex);
    }
    if (color.contrastVar) {
      style[color.contrastVar] = contrastForHexColor(hex);
    }
  }
  return style;
}
