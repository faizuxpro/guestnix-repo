"use client";

import type { CSSProperties } from "react";
import { normalizeHexColor } from "@/lib/block-colors";
import type {
  HeadingAdvancedStyle,
  HeadingColorRole,
  HeadingContent,
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
} from "../types";

const HEADING_STYLE_SETTINGS_KEY = "heading_styles";
const HEADING_STYLE_DEFAULT_KEY = "heading_style_default_id";
const DEFAULT_EYEBROW_TEXT = "Quick note";
const DEFAULT_SUBTITLE_TEXT = "Add a short supporting sentence here.";

const ADVANCED_STYLES: HeadingAdvancedStyle[] = [
  "tapered_end",
  "node",
  "crossbar",
  "wavy",
  "frame",
  "marker",
  "orbits",
  "crosshairs",
  "grid",
  "sidebar",
  "zebra",
];

const COLOR_ROLES: HeadingColorRole[] = [
  "primary",
  "secondary",
  "accent",
  "ink",
  "muted",
  "border",
];
const POSITIONS: HeadingDecorPosition[] = ["left", "center", "right"];
const WIDTHS: HeadingDecorWidth[] = ["compact", "fit", "wide", "full"];
const WEIGHTS: HeadingDecorWeight[] = ["fine", "normal", "bold"];
const OFFSETS: HeadingDecorOffset[] = ["tight", "normal", "loose"];
const TAPER_MODES: HeadingTaperMode[] = ["center", "left", "right"];
const NODE_SHAPES: HeadingNodeShape[] = [
  "diamond",
  "circle",
  "square",
  "hexagon",
  "slash",
  "dot",
];
const MARKER_VARIANTS: HeadingMarkerVariant[] = [
  "marker",
  "ripped",
  "highlight",
  "strike",
];
const MARKER_HEIGHTS: HeadingMarkerHeight[] = ["short", "medium", "tall"];
const ORBIT_SHAPES: HeadingOrbitShape[] = [
  "circle",
  "dot",
  "ring",
  "dash",
  "diamond",
  "spark",
  "brackets",
];
const CROSSHAIR_CORNERS: HeadingCrosshairCorners[] = ["two", "four"];
const CROSSHAIR_DIRECTIONS: HeadingCrosshairDirection[] = ["tl-br", "tr-bl"];
const SIDEBAR_VARIANTS: HeadingSidebarVariant[] = ["rule", "fade"];
const SIDEBAR_HEIGHTS: HeadingSidebarHeight[] = ["text", "full", "tall"];
const SIDEBAR_WIDTHS: HeadingSidebarWidth[] = ["thin", "medium", "thick"];

type HeadingStyleVars = CSSProperties & Record<`--${string}`, string>;

type HeadingStylePreset = {
  id: string;
  name: string;
  content: Partial<HeadingContent>;
};

function readLevel(content: Partial<HeadingContent>): 1 | 2 | 3 {
  const value = content.level;
  if (value === 1 || value === 2 || value === 3) return value;
  if (typeof value === "string") {
    if (value === "h1" || value === "1") return 1;
    if (value === "h2" || value === "2") return 2;
    if (value === "h3" || value === "3") return 3;
  }
  return 2;
}

function readAlignment(content: Partial<HeadingContent>): "left" | "center" | "right" {
  const value = (content as Partial<HeadingContent> & { align?: unknown }).align;
  const alignment = content.alignment ?? value;
  if (alignment === "center" || alignment === "right") return alignment;
  return "left";
}

function readTone(content: Partial<HeadingContent>): "default" | "accent" | "muted" {
  const tone = content.tone;
  if (tone === "accent" || tone === "muted") return tone;
  return "default";
}

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readVisibility(value: unknown, textValue: string): boolean {
  if (typeof value === "boolean") return value;
  return textValue.length > 0;
}

function readAdvancedStyle(value: unknown): HeadingAdvancedStyle {
  if (ADVANCED_STYLES.includes(value as HeadingAdvancedStyle)) {
    return value as HeadingAdvancedStyle;
  }
  return "tapered_end";
}

function readColorRole(
  value: unknown,
  fallback: HeadingColorRole
): HeadingColorRole {
  if (COLOR_ROLES.includes(value as HeadingColorRole)) {
    return value as HeadingColorRole;
  }
  return fallback;
}

function readDecorPosition(value: unknown): HeadingDecorPosition {
  if (POSITIONS.includes(value as HeadingDecorPosition)) {
    return value as HeadingDecorPosition;
  }
  return "center";
}

function readDecorWidth(value: unknown): HeadingDecorWidth {
  if (WIDTHS.includes(value as HeadingDecorWidth)) {
    return value as HeadingDecorWidth;
  }
  return "fit";
}

function readDecorWeight(value: unknown): HeadingDecorWeight {
  if (WEIGHTS.includes(value as HeadingDecorWeight)) {
    return value as HeadingDecorWeight;
  }
  return "normal";
}

function readDecorOffset(value: unknown): HeadingDecorOffset {
  if (OFFSETS.includes(value as HeadingDecorOffset)) {
    return value as HeadingDecorOffset;
  }
  return "normal";
}

function readDecorAngle(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(-8, Math.min(8, value));
  }
  return -2;
}

function readTaperMode(value: unknown): HeadingTaperMode {
  if (TAPER_MODES.includes(value as HeadingTaperMode)) {
    return value as HeadingTaperMode;
  }
  return "center";
}

function readNodeShape(value: unknown): HeadingNodeShape {
  if (NODE_SHAPES.includes(value as HeadingNodeShape)) {
    return value as HeadingNodeShape;
  }
  return "diamond";
}

function readMarkerVariant(value: unknown): HeadingMarkerVariant {
  if (MARKER_VARIANTS.includes(value as HeadingMarkerVariant)) {
    return value as HeadingMarkerVariant;
  }
  return "marker";
}

function readMarkerHeight(value: unknown): HeadingMarkerHeight {
  if (MARKER_HEIGHTS.includes(value as HeadingMarkerHeight)) {
    return value as HeadingMarkerHeight;
  }
  return "medium";
}

function readOrbitShape(value: unknown): HeadingOrbitShape {
  if (ORBIT_SHAPES.includes(value as HeadingOrbitShape)) {
    return value as HeadingOrbitShape;
  }
  return "circle";
}

function readOrbitCount(value: unknown): HeadingOrbitCount {
  if (value === 1 || value === 2 || value === 3 || value === 4) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) {
      return parsed;
    }
  }
  return 1;
}

function readCrosshairCorners(value: unknown): HeadingCrosshairCorners {
  if (CROSSHAIR_CORNERS.includes(value as HeadingCrosshairCorners)) {
    return value as HeadingCrosshairCorners;
  }
  return "two";
}

function readCrosshairDirection(value: unknown): HeadingCrosshairDirection {
  if (CROSSHAIR_DIRECTIONS.includes(value as HeadingCrosshairDirection)) {
    return value as HeadingCrosshairDirection;
  }
  return "tl-br";
}

function readSidebarVariant(value: unknown): HeadingSidebarVariant {
  if (SIDEBAR_VARIANTS.includes(value as HeadingSidebarVariant)) {
    return value as HeadingSidebarVariant;
  }
  return "rule";
}

function readSidebarHeight(value: unknown): HeadingSidebarHeight {
  if (SIDEBAR_HEIGHTS.includes(value as HeadingSidebarHeight)) {
    return value as HeadingSidebarHeight;
  }
  return "text";
}

function readSidebarWidth(value: unknown): HeadingSidebarWidth {
  if (SIDEBAR_WIDTHS.includes(value as HeadingSidebarWidth)) {
    return value as HeadingSidebarWidth;
  }
  return "medium";
}

function colorRoleVar(role: HeadingColorRole) {
  switch (role) {
    case "primary":
      return "var(--primary)";
    case "accent":
      return "var(--accent)";
    case "ink":
      return "var(--ink)";
    case "muted":
      return "var(--muted)";
    case "border":
      return "var(--divider)";
    case "secondary":
    default:
      return "var(--secondary)";
  }
}

function decorWidthVar(width: HeadingDecorWidth) {
  switch (width) {
    case "compact":
      return "68%";
    case "wide":
      return "124%";
    case "full":
    case "fit":
    default:
      return "100%";
  }
}

function decorWeightVar(weight: HeadingDecorWeight) {
  switch (weight) {
    case "fine":
      return "2px";
    case "bold":
      return "8px";
    case "normal":
    default:
      return "4px";
  }
}

function decorOffsetVar(offset: HeadingDecorOffset) {
  switch (offset) {
    case "tight":
      return "0.22em";
    case "loose":
      return "0.68em";
    case "normal":
    default:
      return "0.42em";
  }
}

function markerHeightVar(height: HeadingMarkerHeight) {
  switch (height) {
    case "short":
      return "34%";
    case "tall":
      return "76%";
    case "medium":
    default:
      return "52%";
  }
}

function sidebarHeightVar(height: HeadingSidebarHeight) {
  switch (height) {
    case "full":
      return "100%";
    case "tall":
      return "calc(100% + 0.48em)";
    case "text":
    default:
      return "1em";
  }
}

function sidebarWidthVar(width: HeadingSidebarWidth) {
  switch (width) {
    case "thin":
      return "2px";
    case "thick":
      return "7px";
    case "medium":
    default:
      return "4px";
  }
}

function positionVars(position: HeadingDecorPosition) {
  switch (position) {
    case "left":
      return { anchor: "0%", shift: "0%" };
    case "right":
      return { anchor: "100%", shift: "-100%" };
    case "center":
    default:
      return { anchor: "50%", shift: "-50%" };
  }
}

function defaultStyleContent(style: HeadingAdvancedStyle): Partial<HeadingContent> {
  const base: Partial<HeadingContent> = {
    style: "display",
    show_divider: false,
    advanced_enabled: true,
    advanced_style: style,
    accent_role: "secondary",
    decor_position: "center",
    decor_width: "fit",
    decor_weight: "normal",
    decor_offset: "normal",
    decor_motion: true,
    decor_angle: -2,
    taper_mode: "center",
    node_shape: "diamond",
    marker_variant: "marker",
    marker_height: "medium",
    orbit_shape: "circle",
    orbit_count: 1,
    orbit_taper: false,
    crosshair_corners: "two",
    crosshair_direction: "tl-br",
    sidebar_variant: "rule",
    sidebar_height: "text",
    sidebar_width: "medium",
  };

  switch (style) {
    case "tapered_end":
      return {
        ...base,
        decor_width: "wide",
      };
    case "node":
      return {
        ...base,
        decor_width: "wide",
        decor_weight: "fine",
        decor_offset: "loose",
      };
    case "crossbar":
      return {
        ...base,
        accent_role: "accent",
        decor_position: "left",
        decor_width: "fit",
      };
    case "frame":
      return {
        ...base,
        accent_role: "primary",
        decor_weight: "fine",
      };
    case "marker":
      return {
        ...base,
        accent_role: "accent",
        decor_width: "wide",
      };
    case "crosshairs":
      return {
        ...base,
        accent_role: "accent",
        decor_weight: "fine",
      };
    case "grid":
      return {
        ...base,
        accent_role: "muted",
        decor_position: "left",
      };
    case "sidebar":
      return {
        ...base,
        decor_position: "left",
        decor_weight: "bold",
      };
    case "zebra":
      return {
        ...base,
        accent_role: "secondary",
      };
    case "wavy":
    case "orbits":
    default:
      return base;
  }
}

function sanitizeStyleContent(content: Partial<HeadingContent>): Partial<HeadingContent> {
  const merged = content;
  const advancedStyle = readAdvancedStyle(merged.advanced_style);
  const defaults = defaultStyleContent(advancedStyle);
  return {
    ...defaults,
    level: readLevel(merged),
    alignment: readAlignment(merged),
    tone: readTone(merged),
    eyebrow_enabled: merged.eyebrow_enabled === true,
    subtitle_enabled: merged.subtitle_enabled === true,
    advanced_enabled: merged.advanced_enabled !== false,
    accent_role: readColorRole(
      merged.accent_role,
      defaults.accent_role ?? "secondary"
    ),
    accent_color: normalizeHexColor(merged.accent_color),
    decor_position: readDecorPosition(
      merged.decor_position ?? defaults.decor_position
    ),
    decor_width: readDecorWidth(merged.decor_width ?? defaults.decor_width),
    decor_weight: readDecorWeight(
      merged.decor_weight ?? defaults.decor_weight
    ),
    decor_offset: readDecorOffset(
      merged.decor_offset ?? defaults.decor_offset
    ),
    decor_motion:
      typeof merged.decor_motion === "boolean"
        ? merged.decor_motion
        : defaults.decor_motion,
    decor_angle: readDecorAngle(merged.decor_angle ?? defaults.decor_angle),
    taper_mode: readTaperMode(merged.taper_mode ?? defaults.taper_mode),
    node_shape: readNodeShape(merged.node_shape ?? defaults.node_shape),
    marker_variant: readMarkerVariant(
      merged.marker_variant ?? defaults.marker_variant
    ),
    marker_height: readMarkerHeight(
      merged.marker_height ?? defaults.marker_height
    ),
    orbit_shape: readOrbitShape(merged.orbit_shape ?? defaults.orbit_shape),
    orbit_count: readOrbitCount(merged.orbit_count ?? defaults.orbit_count),
    orbit_taper:
      typeof merged.orbit_taper === "boolean"
        ? merged.orbit_taper
        : defaults.orbit_taper,
    crosshair_corners: readCrosshairCorners(
      merged.crosshair_corners ?? defaults.crosshair_corners
    ),
    crosshair_direction: readCrosshairDirection(
      merged.crosshair_direction ?? defaults.crosshair_direction
    ),
    sidebar_variant: readSidebarVariant(
      merged.sidebar_variant ?? defaults.sidebar_variant
    ),
    sidebar_height: readSidebarHeight(
      merged.sidebar_height ?? defaults.sidebar_height
    ),
    sidebar_width: readSidebarWidth(
      merged.sidebar_width ?? defaults.sidebar_width
    ),
  };
}

function readPresets(settings?: Record<string, unknown>): HeadingStylePreset[] {
  const value = settings?.[HEADING_STYLE_SETTINGS_KEY];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const name = typeof record.name === "string" ? record.name : "";
    const content =
      record.content && typeof record.content === "object"
        ? (record.content as Partial<HeadingContent>)
        : null;
    if (!id || !name || !content) return [];
    return [{ id, name, content }];
  });
}

function resolveEffectiveContent(
  content: Partial<HeadingContent>,
  guidebookSettings?: Record<string, unknown>
): Partial<HeadingContent> {
  if (content.heading_style_customized === true) return content;
  const presets = readPresets(guidebookSettings);
  const defaultStyleId =
    typeof guidebookSettings?.[HEADING_STYLE_DEFAULT_KEY] === "string"
      ? guidebookSettings[HEADING_STYLE_DEFAULT_KEY]
      : "";
  const blockPresetId =
    typeof content.heading_style_id === "string" ? content.heading_style_id : "";
  const preset = blockPresetId
    ? presets.find((item) => item.id === blockPresetId)
    : presets.find((item) => item.id === defaultStyleId);

  if (!preset) return content;

  const styleContent = sanitizeStyleContent(preset.content);
  return {
    ...content,
    ...styleContent,
    text: content.text,
    eyebrow: content.eyebrow,
    subtitle: content.subtitle,
    heading_style_id: content.heading_style_id,
    heading_style_customized: content.heading_style_customized,
  };
}

function advancedStyleVars(content: Partial<HeadingContent>): HeadingStyleVars {
  const advancedStyle = readAdvancedStyle(content.advanced_style);
  const taperMode = readTaperMode(content.taper_mode);
  const position =
    advancedStyle === "tapered_end"
      ? taperMode
      : readDecorPosition(content.decor_position);
  const { anchor, shift } = positionVars(position);
  const accent =
    normalizeHexColor(content.accent_color) ||
    colorRoleVar(readColorRole(content.accent_role, "secondary"));
  return {
    "--sl-heading-accent": accent,
    "--sl-heading-accent-2": accent,
    "--sl-heading-decor-anchor": anchor,
    "--sl-heading-decor-shift": shift,
    "--sl-heading-decor-width": decorWidthVar(
      readDecorWidth(content.decor_width)
    ),
    "--sl-heading-decor-thickness": decorWeightVar(
      readDecorWeight(content.decor_weight)
    ),
    "--sl-heading-decor-offset": decorOffsetVar(
      readDecorOffset(content.decor_offset)
    ),
    "--sl-heading-decor-angle": `${readDecorAngle(content.decor_angle)}deg`,
    "--sl-heading-marker-height": markerHeightVar(
      readMarkerHeight(content.marker_height)
    ),
    "--sl-heading-sidebar-height": sidebarHeightVar(
      readSidebarHeight(content.sidebar_height)
    ),
    "--sl-heading-sidebar-width": sidebarWidthVar(
      readSidebarWidth(content.sidebar_width)
    ),
  };
}

function orbitScale(
  side: "left" | "right",
  index: number,
  count: HeadingOrbitCount,
  taper: boolean
) {
  if (!taper || count <= 1) return "1";
  const distanceFromText = side === "left" ? count - 1 - index : index;
  return Math.max(0.52, 1 - distanceFromText * 0.16).toFixed(2);
}

function OrbitMarks({
  side,
  shape,
  count,
  taper,
}: {
  side: "left" | "right";
  shape: HeadingOrbitShape;
  count: HeadingOrbitCount;
  taper: boolean;
}) {
  const items = Array.from({ length: count }, (_, index) => index);
  return (
    <span className="sl-heading-orbit-group" data-side={side} aria-hidden>
      {items.map((index) => (
        <span
          key={`${side}-${index}`}
          className="sl-heading-orbit-mark"
          data-shape={shape}
          style={
            {
              "--sl-heading-orbit-scale": orbitScale(side, index, count, taper),
            } as HeadingStyleVars
          }
        >
          {shape === "brackets" ? (side === "left" ? "[" : "]") : null}
        </span>
      ))}
    </span>
  );
}

function CrosshairCorners({
  corners,
  direction,
}: {
  corners: HeadingCrosshairCorners;
  direction: HeadingCrosshairDirection;
}) {
  const items =
    corners === "four"
      ? ["tl", "tr", "bl", "br"]
      : direction === "tr-bl"
        ? ["tr", "bl"]
        : ["tl", "br"];
  return (
    <>
      {items.map((corner) => (
        <span
          key={corner}
          className="sl-heading-corner"
          data-corner={corner}
          aria-hidden
        />
      ))}
    </>
  );
}

export function HeadingBlock({
  content,
  guidebookSettings,
}: {
  content: Partial<HeadingContent>;
  guidebookSettings?: Record<string, unknown>;
}) {
  const effectiveContent = resolveEffectiveContent(content, guidebookSettings);
  const text = effectiveContent.text?.trim();
  if (!text) return null;
  const level = readLevel(effectiveContent);
  const alignment = readAlignment(effectiveContent);
  const tone = readTone(effectiveContent);
  const rawEyebrow = readOptionalString(effectiveContent.eyebrow);
  const rawSubtitle = readOptionalString(effectiveContent.subtitle);
  const eyebrowEnabled = readVisibility(
    effectiveContent.eyebrow_enabled,
    rawEyebrow
  );
  const subtitleEnabled = readVisibility(
    effectiveContent.subtitle_enabled,
    rawSubtitle
  );
  const eyebrow =
    eyebrowEnabled && !rawEyebrow ? DEFAULT_EYEBROW_TEXT : rawEyebrow;
  const subtitle =
    subtitleEnabled && !rawSubtitle ? DEFAULT_SUBTITLE_TEXT : rawSubtitle;
  const decorationEnabled = effectiveContent.advanced_enabled === true;
  const advancedStyle = readAdvancedStyle(effectiveContent.advanced_style);
  const taperMode = readTaperMode(effectiveContent.taper_mode);
  const decorPosition =
    advancedStyle === "tapered_end"
      ? taperMode
      : readDecorPosition(effectiveContent.decor_position);
  const decorWidth = readDecorWidth(effectiveContent.decor_width);
  const decorMotion = effectiveContent.decor_motion !== false;
  const nodeShape = readNodeShape(effectiveContent.node_shape);
  const markerVariant = readMarkerVariant(effectiveContent.marker_variant);
  const markerHeight = readMarkerHeight(effectiveContent.marker_height);
  const orbitShape = readOrbitShape(effectiveContent.orbit_shape);
  const orbitCount = readOrbitCount(effectiveContent.orbit_count);
  const orbitTaper = effectiveContent.orbit_taper === true;
  const crosshairCorners = readCrosshairCorners(
    effectiveContent.crosshair_corners
  );
  const crosshairDirection = readCrosshairDirection(
    effectiveContent.crosshair_direction
  );
  const sidebarVariant = readSidebarVariant(effectiveContent.sidebar_variant);
  const sidebarHeight = readSidebarHeight(effectiveContent.sidebar_height);
  const sidebarWidth = readSidebarWidth(effectiveContent.sidebar_width);
  const Tag = (`h${level}` as unknown) as "h1" | "h2" | "h3";
  const styleVars = {
    textAlign: alignment,
    ...advancedStyleVars(effectiveContent),
  };
  const renderOrbits = decorationEnabled && advancedStyle === "orbits";
  const renderCrosshairs = decorationEnabled && advancedStyle === "crosshairs";
  const renderWave = decorationEnabled && advancedStyle === "wavy";

  return (
    <div
      className="sl-heading-group"
      data-tone={tone}
      data-style="display"
      data-advanced={decorationEnabled ? "true" : "false"}
      data-advanced-style={decorationEnabled ? advancedStyle : undefined}
      data-decor-position={decorPosition}
      data-decor-width={decorWidth}
      data-taper-mode={taperMode}
      data-node-shape={nodeShape}
      data-marker-variant={markerVariant}
      data-marker-height={markerHeight}
      data-orbit-shape={orbitShape}
      data-orbit-count={orbitCount}
      data-orbit-taper={orbitTaper ? "on" : "off"}
      data-crosshair-corners={crosshairCorners}
      data-crosshair-direction={crosshairDirection}
      data-sidebar-variant={sidebarVariant}
      data-sidebar-height={sidebarHeight}
      data-sidebar-width={sidebarWidth}
      data-motion={decorMotion ? "on" : "off"}
      style={styleVars}
    >
      {eyebrowEnabled && eyebrow ? (
        <div className="sl-heading-eyebrow">{eyebrow}</div>
      ) : null}
      <span className="sl-heading-shell">
        <Tag className="sl-heading" data-level={level}>
          {renderOrbits ? (
            <OrbitMarks
              side="left"
              shape={orbitShape}
              count={orbitCount}
              taper={orbitTaper}
            />
          ) : null}
          <span className="sl-heading-text">{text}</span>
          {renderWave ? (
            <svg
              className="sl-heading-wave-line"
              viewBox="0 0 800 24"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M-80 12 Q-60 2 -40 12 T0 12 T40 12 T80 12 T120 12 T160 12 T200 12 T240 12 T280 12 T320 12 T360 12 T400 12 T440 12 T480 12 T520 12 T560 12 T600 12 T640 12 T680 12 T720 12 T760 12 T800 12 T840 12 T880 12"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          ) : null}
          {renderCrosshairs ? (
            <CrosshairCorners
              corners={crosshairCorners}
              direction={crosshairDirection}
            />
          ) : null}
          {renderOrbits ? (
            <OrbitMarks
              side="right"
              shape={orbitShape}
              count={orbitCount}
              taper={orbitTaper}
            />
          ) : null}
        </Tag>
      </span>
      {subtitleEnabled && subtitle ? (
        <p className="sl-heading-subtitle">{subtitle}</p>
      ) : null}
    </div>
  );
}
