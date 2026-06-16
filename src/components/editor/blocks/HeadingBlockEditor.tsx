"use client";

import { useMemo, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Ban,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  CircleDot,
  RotateCcw,
  Crosshair,
  Diamond,
  Grid3X3,
  Highlighter,
  Minus,
  Orbit,
  PanelLeft,
  Save,
  Sparkles,
  Square,
  Trash2,
  Waves,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import { normalizeHexColor } from "@/lib/block-colors";
import { randomUUID } from "@/lib/utils";
import { useEditorStore, type EditorBlock } from "@/stores/editor-store";
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
} from "@/types/blocks";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput, PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type HeadingLevel = 1 | 2 | 3;
type HeadingAlign = "left" | "center" | "right";
type HeadingTone = "default" | "accent" | "muted";
type HeadingDecorationChoice = HeadingAdvancedStyle | "none";

type AdvancedStyleConfig = {
  color?: boolean;
  position?: "line" | "side";
  widths?: HeadingDecorWidth[];
  weight?: boolean;
  offset?: boolean;
  angle?: boolean;
  motion?: boolean;
  taperMode?: boolean;
  nodeShape?: boolean;
  markerVariant?: boolean;
  markerHeight?: boolean;
  orbitShape?: boolean;
  orbitCount?: boolean;
  orbitTaper?: boolean;
  crosshairs?: boolean;
  sidebarVariant?: boolean;
  sidebarDimensions?: boolean;
};

type HeadingStylePresetContent = Pick<
  HeadingContent,
  | "level"
  | "alignment"
  | "tone"
  | "style"
  | "show_divider"
  | "eyebrow_enabled"
  | "subtitle_enabled"
  | "advanced_enabled"
  | "advanced_style"
  | "accent_role"
  | "accent_color"
  | "decor_position"
  | "decor_width"
  | "decor_weight"
  | "decor_offset"
  | "decor_motion"
  | "decor_angle"
  | "taper_mode"
  | "node_shape"
  | "marker_variant"
  | "marker_height"
  | "orbit_shape"
  | "orbit_count"
  | "orbit_taper"
  | "crosshair_corners"
  | "crosshair_direction"
  | "sidebar_variant"
  | "sidebar_height"
  | "sidebar_width"
>;

type HeadingStylePreset = {
  id: string;
  name: string;
  content: Partial<HeadingStylePresetContent>;
};

type DecorationDefaults = Pick<
  HeadingStylePresetContent,
  | "advanced_enabled"
  | "advanced_style"
  | "accent_role"
  | "accent_color"
  | "decor_position"
  | "decor_width"
  | "decor_weight"
  | "decor_offset"
  | "decor_motion"
  | "decor_angle"
  | "taper_mode"
  | "node_shape"
  | "marker_variant"
  | "marker_height"
  | "orbit_shape"
  | "orbit_count"
  | "orbit_taper"
  | "crosshair_corners"
  | "crosshair_direction"
  | "sidebar_variant"
  | "sidebar_height"
  | "sidebar_width"
>;

const HEADING_STYLE_SETTINGS_KEY = "heading_styles";
const HEADING_STYLE_DEFAULT_KEY = "heading_style_default_id";
const DEFAULT_EYEBROW_TEXT = "Quick note";
const DEFAULT_SUBTITLE_TEXT = "Add a short supporting sentence here.";

const ADVANCED_STYLES: Array<{
  value: HeadingAdvancedStyle;
  label: string;
  detail: string;
}> = [
  {
    value: "tapered_end",
    label: "Tapered end",
    detail: "A soft line that can fade from the center, left, or right.",
  },
  {
    value: "node",
    label: "Architectural node",
    detail: "A measured rule with a configurable center node.",
  },
  {
    value: "crossbar",
    label: "Asymmetric crossbar",
    detail: "A compact accent bar riding over a quiet baseline.",
  },
  {
    value: "wavy",
    label: "Wavy underline",
    detail: "A native wavy underline with optional motion.",
  },
  {
    value: "frame",
    label: "Minimal frame",
    detail: "Top and bottom rules that frame the heading.",
  },
  {
    value: "marker",
    label: "Marker tape",
    detail: "Tape, ripped paper, highlighter, and ribbon variations.",
  },
  {
    value: "orbits",
    label: "Side ornaments",
    detail: "Orbit-style marks, sparks, dashes, diamonds, or brackets.",
  },
  {
    value: "crosshairs",
    label: "Corner crosshair",
    detail: "Two or four precision corners around the heading.",
  },
  {
    value: "grid",
    label: "Dotted grid",
    detail: "An offset dotted backdrop behind the title.",
  },
  {
    value: "sidebar",
    label: "Editorial sidebar",
    detail: "A side rule with an optional fading background.",
  },
  {
    value: "zebra",
    label: "Zebra fill",
    detail: "Diagonal text striping using two guidebook colors.",
  },
];

const ADVANCED_STYLE_VALUES = ADVANCED_STYLES.map((style) => style.value);

const STYLE_ICONS: Record<HeadingDecorationChoice, LucideIcon> = {
  none: Ban,
  tapered_end: Minus,
  node: CircleDot,
  crossbar: Rows3,
  wavy: Waves,
  frame: Square,
  marker: Highlighter,
  orbits: Orbit,
  crosshairs: Crosshair,
  grid: Grid3X3,
  sidebar: PanelLeft,
  zebra: Sparkles,
};

const DECORATION_OPTIONS: Array<{
  value: HeadingDecorationChoice;
  label: string;
  detail: string;
}> = [
  {
    value: "none",
    label: "No decoration",
    detail: "Use the guidebook heading typography only.",
  },
  ...ADVANCED_STYLES,
];

const ADVANCED_STYLE_CONFIG: Record<HeadingAdvancedStyle, AdvancedStyleConfig> = {
  tapered_end: {
    color: true,
    taperMode: true,
    widths: ["compact", "fit", "wide", "full"],
    weight: true,
    offset: true,
  },
  node: {
    color: true,
    position: "line",
    widths: ["compact", "fit", "wide", "full"],
    weight: true,
    offset: true,
    motion: true,
    nodeShape: true,
  },
  crossbar: {
    color: true,
    position: "line",
    widths: ["compact", "fit"],
    weight: true,
    offset: true,
  },
  wavy: {
    color: true,
    weight: true,
    offset: true,
    motion: true,
  },
  frame: {
    color: true,
    widths: ["compact", "fit", "wide", "full"],
    weight: true,
  },
  marker: {
    color: true,
    widths: ["fit", "wide", "full"],
    angle: true,
    motion: true,
    markerVariant: true,
    markerHeight: true,
  },
  orbits: {
    color: true,
    weight: true,
    orbitShape: true,
    orbitCount: true,
    orbitTaper: true,
  },
  crosshairs: {
    color: true,
    weight: true,
    crosshairs: true,
  },
  grid: {
    color: true,
    position: "line",
    widths: ["compact", "fit", "wide", "full"],
  },
  sidebar: {
    color: true,
    position: "side",
    weight: true,
    sidebarVariant: true,
    sidebarDimensions: true,
  },
  zebra: {
    color: true,
  },
};

const COLOR_ROLES: Array<{ value: HeadingColorRole; label: string }> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
  { value: "ink", label: "Guide text" },
  { value: "muted", label: "Guide muted" },
  { value: "border", label: "Guide border" },
];
const COLOR_ROLE_VALUES = COLOR_ROLES.map((role) => role.value);

const DECOR_POSITIONS: Array<{ value: HeadingDecorPosition; label: string }> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];
const DECOR_POSITION_VALUES = DECOR_POSITIONS.map((position) => position.value);

const DECOR_WIDTHS: Array<{ value: HeadingDecorWidth; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "fit", label: "Fit text" },
  { value: "wide", label: "Wide" },
  { value: "full", label: "Full" },
];
const DECOR_WIDTH_VALUES = DECOR_WIDTHS.map((width) => width.value);

const DECOR_WEIGHTS: Array<{ value: HeadingDecorWeight; label: string }> = [
  { value: "fine", label: "Fine" },
  { value: "normal", label: "Normal" },
  { value: "bold", label: "Bold" },
];
const DECOR_WEIGHT_VALUES = DECOR_WEIGHTS.map((weight) => weight.value);

const DECOR_OFFSETS: Array<{ value: HeadingDecorOffset; label: string }> = [
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "loose", label: "Loose" },
];
const DECOR_OFFSET_VALUES = DECOR_OFFSETS.map((offset) => offset.value);

const TAPER_MODES: Array<{ value: HeadingTaperMode; label: string }> = [
  { value: "center", label: "Center" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];
const TAPER_MODE_VALUES = TAPER_MODES.map((mode) => mode.value);

const NODE_SHAPES: Array<{ value: HeadingNodeShape; label: string }> = [
  { value: "diamond", label: "Diamond" },
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "hexagon", label: "Hexagon" },
  { value: "slash", label: "Slash" },
  { value: "dot", label: "Dot" },
];
const NODE_SHAPE_VALUES = NODE_SHAPES.map((shape) => shape.value);

const MARKER_VARIANTS: Array<{ value: HeadingMarkerVariant; label: string }> = [
  { value: "marker", label: "Marker tape" },
  { value: "ripped", label: "Ripped tape" },
  { value: "highlight", label: "Skewed highlighter" },
  { value: "strike", label: "Ribbon strike" },
];
const MARKER_VARIANT_VALUES = MARKER_VARIANTS.map((variant) => variant.value);

const MARKER_HEIGHTS: Array<{ value: HeadingMarkerHeight; label: string }> = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "tall", label: "Tall" },
];
const MARKER_HEIGHT_VALUES = MARKER_HEIGHTS.map((height) => height.value);

const ORBIT_SHAPES: Array<{ value: HeadingOrbitShape; label: string }> = [
  { value: "circle", label: "Circle" },
  { value: "dot", label: "Dot" },
  { value: "ring", label: "Ring" },
  { value: "dash", label: "Dash" },
  { value: "diamond", label: "Diamond" },
  { value: "spark", label: "Spark" },
  { value: "brackets", label: "Typographic brackets" },
];
const ORBIT_SHAPE_VALUES = ORBIT_SHAPES.map((shape) => shape.value);

const ORBIT_COUNTS: Array<{ value: HeadingOrbitCount; label: string }> = [
  { value: 1, label: "1 per side" },
  { value: 2, label: "2 per side" },
  { value: 3, label: "3 per side" },
  { value: 4, label: "4 per side" },
];
const ORBIT_COUNT_VALUES = ORBIT_COUNTS.map((count) => count.value);

const CROSSHAIR_CORNERS: Array<{
  value: HeadingCrosshairCorners;
  label: string;
}> = [
  { value: "two", label: "Two corners" },
  { value: "four", label: "Four corners" },
];
const CROSSHAIR_CORNER_VALUES = CROSSHAIR_CORNERS.map((count) => count.value);

const CROSSHAIR_DIRECTIONS: Array<{
  value: HeadingCrosshairDirection;
  label: string;
}> = [
  { value: "tl-br", label: "Top left to bottom right" },
  { value: "tr-bl", label: "Top right to bottom left" },
];
const CROSSHAIR_DIRECTION_VALUES = CROSSHAIR_DIRECTIONS.map(
  (direction) => direction.value
);

const SIDEBAR_VARIANTS: Array<{ value: HeadingSidebarVariant; label: string }> = [
  { value: "rule", label: "Rule only" },
  { value: "fade", label: "Fading background" },
];
const SIDEBAR_VARIANT_VALUES = SIDEBAR_VARIANTS.map((variant) => variant.value);

const SIDEBAR_HEIGHTS: Array<{ value: HeadingSidebarHeight; label: string }> = [
  { value: "text", label: "Text height" },
  { value: "full", label: "Full height" },
  { value: "tall", label: "Tall" },
];
const SIDEBAR_HEIGHT_VALUES = SIDEBAR_HEIGHTS.map((height) => height.value);

const SIDEBAR_WIDTHS: Array<{ value: HeadingSidebarWidth; label: string }> = [
  { value: "thin", label: "Thin" },
  { value: "medium", label: "Medium" },
  { value: "thick", label: "Thick" },
];
const SIDEBAR_WIDTH_VALUES = SIDEBAR_WIDTHS.map((width) => width.value);

const ORBIT_SHAPE_ICONS: Record<HeadingOrbitShape, LucideIcon> = {
  circle: CircleDot,
  dot: CircleDot,
  ring: Orbit,
  dash: Minus,
  diamond: Diamond,
  spark: Sparkles,
  brackets: Rows3,
};

const DEFAULT_DECORATION_BY_STYLE: Record<HeadingAdvancedStyle, DecorationDefaults> = {
  tapered_end: {
    advanced_enabled: true,
    advanced_style: "tapered_end",
    accent_role: "secondary",
    decor_position: "center",
    decor_width: "wide",
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
  },
  node: {
    advanced_enabled: true,
    advanced_style: "node",
    accent_role: "secondary",
    decor_position: "center",
    decor_width: "wide",
    decor_weight: "fine",
    decor_offset: "loose",
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
  },
  crossbar: {
    advanced_enabled: true,
    advanced_style: "crossbar",
    accent_role: "accent",
    decor_position: "left",
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
  },
  wavy: {
    advanced_enabled: true,
    advanced_style: "wavy",
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
  },
  frame: {
    advanced_enabled: true,
    advanced_style: "frame",
    accent_role: "primary",
    decor_position: "center",
    decor_width: "fit",
    decor_weight: "fine",
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
  },
  marker: {
    advanced_enabled: true,
    advanced_style: "marker",
    accent_role: "accent",
    decor_position: "center",
    decor_width: "wide",
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
  },
  orbits: {
    advanced_enabled: true,
    advanced_style: "orbits",
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
  },
  crosshairs: {
    advanced_enabled: true,
    advanced_style: "crosshairs",
    accent_role: "accent",
    decor_position: "center",
    decor_width: "fit",
    decor_weight: "fine",
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
  },
  grid: {
    advanced_enabled: true,
    advanced_style: "grid",
    accent_role: "muted",
    decor_position: "left",
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
  },
  sidebar: {
    advanced_enabled: true,
    advanced_style: "sidebar",
    accent_role: "secondary",
    decor_position: "left",
    decor_width: "fit",
    decor_weight: "bold",
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
  },
  zebra: {
    advanced_enabled: true,
    advanced_style: "zebra",
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
  },
};

function readLevel(
  content: Record<string, unknown>,
  fallback: HeadingLevel = 2
): HeadingLevel {
  const value = content.level;
  if (typeof value === "number" && [1, 2, 3].includes(value)) {
    return value as HeadingLevel;
  }
  if (typeof value === "string") {
    if (value === "h1" || value === "1") return 1;
    if (value === "h2" || value === "2") return 2;
    if (value === "h3" || value === "3") return 3;
  }
  return fallback;
}

function readAlign(
  content: Record<string, unknown>,
  fallback: HeadingAlign = "left"
): HeadingAlign {
  const value = content.alignment ?? content.align;
  if (value === "center" || value === "right" || value === "left") return value;
  return fallback;
}

function readText(content: Record<string, unknown>) {
  return typeof content.text === "string" ? content.text : "";
}

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readVisibility(
  content: Record<string, unknown>,
  key: "eyebrow_enabled" | "subtitle_enabled",
  textValue: string
) {
  const value = content[key];
  if (typeof value === "boolean") return value;
  return textValue.trim().length > 0;
}

function readTone(
  content: Record<string, unknown>,
  fallback: HeadingTone = "default"
): HeadingTone {
  const value = content.tone;
  if (value === "accent" || value === "muted" || value === "default") {
    return value;
  }
  return fallback;
}

function coerceAdvancedStyle(value: unknown): HeadingAdvancedStyle {
  if (ADVANCED_STYLE_VALUES.includes(value as HeadingAdvancedStyle)) {
    return value as HeadingAdvancedStyle;
  }
  return "tapered_end";
}

function coerceColorRole(
  value: unknown,
  fallback: HeadingColorRole
): HeadingColorRole {
  if (COLOR_ROLE_VALUES.includes(value as HeadingColorRole)) {
    return value as HeadingColorRole;
  }
  return fallback;
}

function coerceDecorPosition(value: unknown): HeadingDecorPosition {
  if (DECOR_POSITION_VALUES.includes(value as HeadingDecorPosition)) {
    return value as HeadingDecorPosition;
  }
  return "center";
}

function coerceDecorWidth(value: unknown): HeadingDecorWidth {
  if (DECOR_WIDTH_VALUES.includes(value as HeadingDecorWidth)) {
    return value as HeadingDecorWidth;
  }
  return "fit";
}

function coerceDecorWeight(value: unknown): HeadingDecorWeight {
  if (DECOR_WEIGHT_VALUES.includes(value as HeadingDecorWeight)) {
    return value as HeadingDecorWeight;
  }
  return "normal";
}

function coerceDecorOffset(value: unknown): HeadingDecorOffset {
  if (DECOR_OFFSET_VALUES.includes(value as HeadingDecorOffset)) {
    return value as HeadingDecorOffset;
  }
  return "normal";
}

function coerceTaperMode(value: unknown): HeadingTaperMode {
  if (TAPER_MODE_VALUES.includes(value as HeadingTaperMode)) {
    return value as HeadingTaperMode;
  }
  return "center";
}

function coerceNodeShape(value: unknown): HeadingNodeShape {
  if (NODE_SHAPE_VALUES.includes(value as HeadingNodeShape)) {
    return value as HeadingNodeShape;
  }
  return "diamond";
}

function coerceMarkerVariant(value: unknown): HeadingMarkerVariant {
  if (MARKER_VARIANT_VALUES.includes(value as HeadingMarkerVariant)) {
    return value as HeadingMarkerVariant;
  }
  return "marker";
}

function coerceMarkerHeight(value: unknown): HeadingMarkerHeight {
  if (MARKER_HEIGHT_VALUES.includes(value as HeadingMarkerHeight)) {
    return value as HeadingMarkerHeight;
  }
  return "medium";
}

function coerceOrbitShape(value: unknown): HeadingOrbitShape {
  if (ORBIT_SHAPE_VALUES.includes(value as HeadingOrbitShape)) {
    return value as HeadingOrbitShape;
  }
  return "circle";
}

function coerceOrbitCount(value: unknown): HeadingOrbitCount {
  if (ORBIT_COUNT_VALUES.includes(value as HeadingOrbitCount)) {
    return value as HeadingOrbitCount;
  }
  if (typeof value === "number" && [1, 2, 3, 4].includes(value)) {
    return value as HeadingOrbitCount;
  }
  return 1;
}

function coerceCrosshairCorners(value: unknown): HeadingCrosshairCorners {
  if (CROSSHAIR_CORNER_VALUES.includes(value as HeadingCrosshairCorners)) {
    return value as HeadingCrosshairCorners;
  }
  return "two";
}

function coerceCrosshairDirection(value: unknown): HeadingCrosshairDirection {
  if (CROSSHAIR_DIRECTION_VALUES.includes(value as HeadingCrosshairDirection)) {
    return value as HeadingCrosshairDirection;
  }
  return "tl-br";
}

function coerceSidebarVariant(value: unknown): HeadingSidebarVariant {
  if (SIDEBAR_VARIANT_VALUES.includes(value as HeadingSidebarVariant)) {
    return value as HeadingSidebarVariant;
  }
  return "rule";
}

function coerceSidebarHeight(value: unknown): HeadingSidebarHeight {
  if (SIDEBAR_HEIGHT_VALUES.includes(value as HeadingSidebarHeight)) {
    return value as HeadingSidebarHeight;
  }
  return "text";
}

function coerceSidebarWidth(value: unknown): HeadingSidebarWidth {
  if (SIDEBAR_WIDTH_VALUES.includes(value as HeadingSidebarWidth)) {
    return value as HeadingSidebarWidth;
  }
  return "medium";
}

function readDecorAngle(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(-8, Math.min(8, value));
  }
  return -2;
}

function readSettingString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readHeadingStylePresets(value: unknown): HeadingStylePreset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const content =
      record.content && typeof record.content === "object"
        ? (record.content as Partial<HeadingStylePresetContent>)
        : null;
    if (!id || !name || !content) return [];
    return [{ id, name, content }];
  });
}

function styleDefaults(style: HeadingAdvancedStyle): Partial<HeadingContent> {
  return {
    style: "display",
    show_divider: false,
    ...DEFAULT_DECORATION_BY_STYLE[style],
  };
}

function sanitizeStyleContent(
  content: Partial<HeadingStylePresetContent>
): Partial<HeadingStylePresetContent> {
  const merged = content;
  const advancedStyle = coerceAdvancedStyle(merged.advanced_style);
  const defaults = DEFAULT_DECORATION_BY_STYLE[advancedStyle];
  return {
    level:
      merged.level === 1 || merged.level === 2 || merged.level === 3
        ? merged.level
        : 2,
    alignment:
      merged.alignment === "center" || merged.alignment === "right"
        ? merged.alignment
        : "left",
    tone:
      merged.tone === "accent" || merged.tone === "muted"
        ? merged.tone
        : "default",
    eyebrow_enabled: merged.eyebrow_enabled === true,
    subtitle_enabled: merged.subtitle_enabled === true,
    ...styleDefaults(advancedStyle),
    advanced_enabled: merged.advanced_enabled !== false,
    accent_role: coerceColorRole(
      merged.accent_role,
      defaults.accent_role ?? "secondary"
    ),
    accent_color: normalizeHexColor(merged.accent_color),
    decor_position: coerceDecorPosition(
      merged.decor_position ?? defaults.decor_position ?? "center"
    ),
    decor_width: coerceDecorWidth(merged.decor_width ?? defaults.decor_width ?? "fit"),
    decor_weight: coerceDecorWeight(
      merged.decor_weight ?? defaults.decor_weight ?? "normal"
    ),
    decor_offset: coerceDecorOffset(
      merged.decor_offset ?? defaults.decor_offset ?? "normal"
    ),
    decor_motion:
      typeof merged.decor_motion === "boolean"
        ? merged.decor_motion
        : defaults.decor_motion ?? true,
    decor_angle: readDecorAngle(merged.decor_angle ?? defaults.decor_angle ?? -2),
    taper_mode: coerceTaperMode(merged.taper_mode ?? defaults.taper_mode),
    node_shape: coerceNodeShape(merged.node_shape ?? defaults.node_shape),
    marker_variant: coerceMarkerVariant(
      merged.marker_variant ?? defaults.marker_variant
    ),
    marker_height: coerceMarkerHeight(
      merged.marker_height ?? defaults.marker_height
    ),
    orbit_shape: coerceOrbitShape(merged.orbit_shape ?? defaults.orbit_shape),
    orbit_count: coerceOrbitCount(merged.orbit_count ?? defaults.orbit_count),
    orbit_taper:
      typeof merged.orbit_taper === "boolean"
        ? merged.orbit_taper
        : defaults.orbit_taper ?? false,
    crosshair_corners: coerceCrosshairCorners(
      merged.crosshair_corners ?? defaults.crosshair_corners
    ),
    crosshair_direction: coerceCrosshairDirection(
      merged.crosshair_direction ?? defaults.crosshair_direction
    ),
    sidebar_variant: coerceSidebarVariant(
      merged.sidebar_variant ?? defaults.sidebar_variant
    ),
    sidebar_height: coerceSidebarHeight(
      merged.sidebar_height ?? defaults.sidebar_height
    ),
    sidebar_width: coerceSidebarWidth(
      merged.sidebar_width ?? defaults.sidebar_width
    ),
  };
}

function styleLabel(style: HeadingAdvancedStyle) {
  return ADVANCED_STYLES.find((item) => item.value === style)?.label ?? "Style";
}

export function HeadingBlockEditor({ block, onChange }: Props) {
  const rawHeadingStyles = useEditorStore(
    (state) => state.guidebookSettings[HEADING_STYLE_SETTINGS_KEY]
  );
  const rawDefaultStyleId = useEditorStore(
    (state) => state.guidebookSettings[HEADING_STYLE_DEFAULT_KEY]
  );
  const updateGuidebookSettings = useEditorStore(
    (state) => state.updateGuidebookSettings
  );

  const savedStyles = useMemo(
    () => readHeadingStylePresets(rawHeadingStyles),
    [rawHeadingStyles]
  );
  const defaultStyleId = readSettingString(rawDefaultStyleId);
  const defaultPreset = savedStyles.find((preset) => preset.id === defaultStyleId);
  const blockPresetId = readSettingString(block.content.heading_style_id);
  const styleCustomized = block.content.heading_style_customized === true;
  const linkedPreset = !styleCustomized
    ? savedStyles.find((preset) => preset.id === blockPresetId)
    : undefined;
  const activePreset = !styleCustomized
    ? linkedPreset ?? (!blockPresetId ? defaultPreset : undefined)
    : undefined;
  const usingGuideDefault = Boolean(
    defaultPreset && activePreset?.id === defaultPreset.id && !linkedPreset
  );

  const styleSourceContent = activePreset
    ? sanitizeStyleContent(activePreset.content)
    : sanitizeStyleContent(
        block.content as Partial<HeadingStylePresetContent>
      );

  const [presetName, setPresetName] = useState("");
  const [saveAsGuideDefault, setSaveAsGuideDefault] = useState(false);
  const [showStyleControls, setShowStyleControls] = useState(!usingGuideDefault);
  const [decorationPanelOpen, setDecorationPanelOpen] = useState(false);

  const text = readText(block.content);
  const styleSourceRecord = styleSourceContent as Record<string, unknown>;
  const shouldUsePresetLayout = Boolean(activePreset && !styleCustomized);
  const level = shouldUsePresetLayout
    ? readLevel(styleSourceRecord, 2)
    : readLevel(block.content, styleSourceContent.level ?? 2);
  const alignment = shouldUsePresetLayout
    ? readAlign(styleSourceRecord, "left")
    : readAlign(block.content, styleSourceContent.alignment ?? "left");
  const rawEyebrow = readString(block.content, "eyebrow");
  const rawSubtitle = readString(block.content, "subtitle");
  const eyebrowEnabled = shouldUsePresetLayout
    ? styleSourceContent.eyebrow_enabled === true
    : readVisibility(block.content, "eyebrow_enabled", rawEyebrow);
  const subtitleEnabled = shouldUsePresetLayout
    ? styleSourceContent.subtitle_enabled === true
    : readVisibility(block.content, "subtitle_enabled", rawSubtitle);
  const eyebrow =
    eyebrowEnabled && !rawEyebrow.trim() ? DEFAULT_EYEBROW_TEXT : rawEyebrow;
  const subtitle =
    subtitleEnabled && !rawSubtitle.trim()
      ? DEFAULT_SUBTITLE_TEXT
      : rawSubtitle;
  const tone = shouldUsePresetLayout
    ? readTone(styleSourceRecord, "default")
    : readTone(block.content, styleSourceContent.tone ?? "default");
  const decorationEnabled = styleSourceContent.advanced_enabled === true;
  const advancedStyle = coerceAdvancedStyle(styleSourceContent.advanced_style);
  const decorationChoice: HeadingDecorationChoice = decorationEnabled
    ? advancedStyle
    : "none";
  const ActiveStyleIcon = STYLE_ICONS[decorationChoice];
  const activeDecorationOption =
    DECORATION_OPTIONS.find((option) => option.value === decorationChoice) ??
    DECORATION_OPTIONS[0];
  const defaultsForStyle = DEFAULT_DECORATION_BY_STYLE[advancedStyle];
  const accentRole = coerceColorRole(
    styleSourceContent.accent_role,
    defaultsForStyle.accent_role ?? "secondary"
  );
  const accentColor = normalizeHexColor(styleSourceContent.accent_color);
  const decorPosition = coerceDecorPosition(
    styleSourceContent.decor_position ?? defaultsForStyle.decor_position
  );
  const decorWidth = coerceDecorWidth(
    styleSourceContent.decor_width ?? defaultsForStyle.decor_width
  );
  const decorWeight = coerceDecorWeight(
    styleSourceContent.decor_weight ?? defaultsForStyle.decor_weight
  );
  const decorOffset = coerceDecorOffset(
    styleSourceContent.decor_offset ?? defaultsForStyle.decor_offset
  );
  const decorMotion =
    typeof styleSourceContent.decor_motion === "boolean"
      ? styleSourceContent.decor_motion
      : defaultsForStyle.decor_motion;
  const decorAngle = readDecorAngle(
    styleSourceContent.decor_angle ?? defaultsForStyle.decor_angle
  );
  const taperMode = coerceTaperMode(
    styleSourceContent.taper_mode ?? defaultsForStyle.taper_mode
  );
  const nodeShape = coerceNodeShape(
    styleSourceContent.node_shape ?? defaultsForStyle.node_shape
  );
  const markerVariant = coerceMarkerVariant(
    styleSourceContent.marker_variant ?? defaultsForStyle.marker_variant
  );
  const markerHeight = coerceMarkerHeight(
    styleSourceContent.marker_height ?? defaultsForStyle.marker_height
  );
  const orbitShape = coerceOrbitShape(
    styleSourceContent.orbit_shape ?? defaultsForStyle.orbit_shape
  );
  const orbitCount = coerceOrbitCount(
    styleSourceContent.orbit_count ?? defaultsForStyle.orbit_count
  );
  const orbitTaper =
    typeof styleSourceContent.orbit_taper === "boolean"
      ? styleSourceContent.orbit_taper
      : defaultsForStyle.orbit_taper;
  const crosshairCorners = coerceCrosshairCorners(
    styleSourceContent.crosshair_corners ?? defaultsForStyle.crosshair_corners
  );
  const crosshairDirection = coerceCrosshairDirection(
    styleSourceContent.crosshair_direction ??
      defaultsForStyle.crosshair_direction
  );
  const sidebarVariant = coerceSidebarVariant(
    styleSourceContent.sidebar_variant ?? defaultsForStyle.sidebar_variant
  );
  const sidebarHeight = coerceSidebarHeight(
    styleSourceContent.sidebar_height ?? defaultsForStyle.sidebar_height
  );
  const sidebarWidth = coerceSidebarWidth(
    styleSourceContent.sidebar_width ?? defaultsForStyle.sidebar_width
  );
  const advancedConfig = ADVANCED_STYLE_CONFIG[advancedStyle];

  const currentStyleContent: Partial<HeadingStylePresetContent> = {
    level,
    alignment,
    tone,
    style: "display",
    show_divider: false,
    eyebrow_enabled: eyebrowEnabled,
    subtitle_enabled: subtitleEnabled,
    advanced_enabled: decorationEnabled,
    advanced_style: advancedStyle,
    accent_role: accentRole,
    accent_color: accentColor,
    decor_position: decorPosition,
    decor_width: decorWidth,
    decor_weight: decorWeight,
    decor_offset: decorOffset,
    decor_motion: decorMotion,
    decor_angle: decorAngle,
    taper_mode: taperMode,
    node_shape: nodeShape,
    marker_variant: markerVariant,
    marker_height: markerHeight,
    orbit_shape: orbitShape,
    orbit_count: orbitCount,
    orbit_taper: orbitTaper,
    crosshair_corners: crosshairCorners,
    crosshair_direction: crosshairDirection,
    sidebar_variant: sidebarVariant,
    sidebar_height: sidebarHeight,
    sidebar_width: sidebarWidth,
  };

  const textState = {
    text,
    level,
    alignment,
    eyebrow,
    subtitle,
    eyebrow_enabled: eyebrowEnabled,
    subtitle_enabled: subtitleEnabled,
    tone,
    style: "display" as const,
    show_divider: false as const,
  };

  const patch = (next: Partial<HeadingContent>) => {
    onChange({
      ...block.content,
      ...textState,
      ...next,
      style: "display",
      show_divider: false,
    });
  };

  const contentWithoutPresetLink = () => {
    const next = { ...block.content };
    delete next.heading_style_id;
    delete next.heading_style_customized;
    return next;
  };

  const patchStyle = (next: Partial<HeadingContent>) => {
    onChange({
      ...contentWithoutPresetLink(),
      ...textState,
      ...currentStyleContent,
      ...next,
      style: "display",
      show_divider: false,
      heading_style_customized: true,
    });
    setShowStyleControls(true);
  };

  const restoreGuideDefault = () => {
    onChange({
      ...contentWithoutPresetLink(),
      ...textState,
      heading_style_customized: false,
      style: "display",
      show_divider: false,
    });
    setShowStyleControls(false);
    toast.success("Using the guide default heading style.");
  };

  const saveCurrentStyle = () => {
    const name = presetName.trim();
    if (!name) {
      toast.error("Name this heading style first.");
      return;
    }
    const nextPreset: HeadingStylePreset = {
      id: randomUUID(),
      name,
      content: sanitizeStyleContent(currentStyleContent),
    };
    const nextStyles = [...savedStyles, nextPreset];
    updateGuidebookSettings({
      [HEADING_STYLE_SETTINGS_KEY]: nextStyles,
      ...(saveAsGuideDefault
        ? { [HEADING_STYLE_DEFAULT_KEY]: nextPreset.id }
        : {}),
    });
    setPresetName("");
    setSaveAsGuideDefault(false);
    toast.success(
      saveAsGuideDefault
        ? "Heading style saved and set as the guide default."
        : "Heading style saved."
    );
  };

  const applySavedStyle = (preset: HeadingStylePreset) => {
    onChange({
      ...block.content,
      ...textState,
      ...sanitizeStyleContent(preset.content),
      text,
      eyebrow,
      subtitle,
      heading_style_id: preset.id,
      heading_style_customized: false,
      style: "display",
      show_divider: false,
    });
    setShowStyleControls(preset.id !== defaultStyleId);
    toast.success(`Applied ${preset.name}.`);
  };

  const togglePresetDefault = (preset: HeadingStylePreset, checked: boolean) => {
    updateGuidebookSettings({
      [HEADING_STYLE_DEFAULT_KEY]: checked ? preset.id : null,
    });
    toast.success(
      checked
        ? `${preset.name} is now the guide default.`
        : "Guide default heading style cleared."
    );
  };

  const deleteSavedStyle = (preset: HeadingStylePreset) => {
    const settingsPatch: Record<string, unknown> = {
      [HEADING_STYLE_SETTINGS_KEY]: savedStyles.filter(
        (item) => item.id !== preset.id
      ),
    };
    if (defaultStyleId === preset.id) {
      settingsPatch[HEADING_STYLE_DEFAULT_KEY] = null;
    }
    updateGuidebookSettings(settingsPatch);
    toast.success(`${preset.name} deleted.`);
  };

  const choiceClass = (active: boolean) =>
    active
      ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:text-primary-foreground"
      : "bg-transparent text-foreground/75 hover:bg-background hover:text-foreground";

  const widthOptions = advancedConfig.widths
    ? DECOR_WIDTHS.filter((option) =>
        advancedConfig.widths?.includes(option.value)
      )
    : [];

  return (
    <div className="grid gap-2.5">
      <div className="grid gap-1.5">
        <Label htmlFor={`heading-text-${block.id}`}>Heading Text</Label>
        <Input
          id={`heading-text-${block.id}`}
          value={text}
          onChange={(e) => patch({ text: e.target.value })}
          placeholder="New Heading"
          className="h-9 text-sm font-medium leading-tight"
        />
      </div>

      <div className="rounded-md border border-border/65 bg-muted/15">
        <div className="flex items-center justify-between gap-3 px-2.5 py-2">
          <div className="min-w-0">
            <Label htmlFor={`heading-eyebrow-toggle-${block.id}`}>Eyebrow</Label>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Small label above the heading.
            </p>
          </div>
          <Switch
            id={`heading-eyebrow-toggle-${block.id}`}
            checked={eyebrowEnabled}
            onCheckedChange={(checked) =>
              patchStyle({
                eyebrow_enabled: checked,
                ...(checked && !eyebrow.trim()
                  ? { eyebrow: DEFAULT_EYEBROW_TEXT }
                  : {}),
              })
            }
            size="sm"
          />
        </div>
        {eyebrowEnabled ? (
          <div className="border-t border-border/55 px-2.5 py-2.5">
            <PromptedInput
              label="Eyebrow text"
              value={eyebrow}
              onChange={(value) => patch({ eyebrow: value })}
              placeholder="Quick label above heading"
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-border/65 bg-muted/15">
        <div className="flex items-center justify-between gap-3 px-2.5 py-2">
          <div className="min-w-0">
            <Label htmlFor={`heading-subtitle-toggle-${block.id}`}>
              Subtitle
            </Label>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Supporting sentence below the heading.
            </p>
          </div>
          <Switch
            id={`heading-subtitle-toggle-${block.id}`}
            checked={subtitleEnabled}
            onCheckedChange={(checked) =>
              patchStyle({
                subtitle_enabled: checked,
                ...(checked && !subtitle.trim()
                  ? { subtitle: DEFAULT_SUBTITLE_TEXT }
                  : {}),
              })
            }
            size="sm"
          />
        </div>
        {subtitleEnabled ? (
          <div className="border-t border-border/55 px-2.5 py-2.5">
            <PromptedTextarea
              label="Subtitle text"
              value={subtitle}
              onChange={(value) => patch({ subtitle: value })}
              placeholder="Short supporting sentence below heading"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-1">
          <Label>Level</Label>
          <div className="flex flex-wrap gap-1 rounded-md bg-muted/35 p-1">
            {[1, 2, 3].map((value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant="ghost"
                className={choiceClass(level === value)}
                onClick={() => patchStyle({ level: value as HeadingLevel })}
              >
                H{value}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-1">
          <Label>Alignment</Label>
          <div className="flex flex-wrap gap-1 rounded-md bg-muted/35 p-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={choiceClass(alignment === "left")}
              onClick={() => patchStyle({ alignment: "left" })}
              aria-label="Align left"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={choiceClass(alignment === "center")}
              onClick={() => patchStyle({ alignment: "center" })}
              aria-label="Align center"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className={choiceClass(alignment === "right")}
              onClick={() => patchStyle({ alignment: "right" })}
              aria-label="Align right"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Tone</Label>
        <Select
          value={tone}
          onValueChange={(value) =>
            patchStyle({
              tone: value === "accent" || value === "muted" ? value : "default",
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="accent">Accent</SelectItem>
            <SelectItem value="muted">Muted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {usingGuideDefault && !showStyleControls ? (
        <section className="rounded-md border border-border/70 bg-muted/15 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                <p className="text-[12px] font-medium leading-tight text-foreground">
                  Using guide default
                </p>
              </div>
              <p className="mt-1 truncate text-[11px] leading-snug text-muted-foreground">
                {activePreset?.name ?? "Saved heading style"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowStyleControls(true)}
            >
              Change styles
            </Button>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-md border border-border/70 bg-muted/15">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
            onClick={() => setDecorationPanelOpen((open) => !open)}
            aria-expanded={decorationPanelOpen}
          >
            <div className="flex min-w-0 items-center gap-2">
              <ActiveStyleIcon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-[12px] font-medium leading-tight text-foreground">
                  Decoration style
                </p>
                <p className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground">
                  {activeDecorationOption.label}
                </p>
              </div>
            </div>
            {decorationPanelOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>

          {decorationPanelOpen ? (
          <div className="grid gap-3 border-t border-border/60 px-3 py-3">
            {usingGuideDefault ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border/55 bg-background/70 px-2.5 py-2">
                <p className="min-w-0 truncate text-[11px] text-muted-foreground">
                  Editing a custom copy of {activePreset?.name ?? "the default"}.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={restoreGuideDefault}
                >
                  Use default
                </Button>
              </div>
            ) : activePreset ? (
              <div className="rounded-md border border-border/55 bg-background/70 px-2.5 py-2">
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Using saved style:{" "}
                  <span className="font-medium text-foreground">
                    {activePreset.name}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label>Style</Label>
              <Select
                value={decorationChoice}
                onValueChange={(value) => {
                  if (value === "none") {
                    patchStyle({
                      advanced_enabled: false,
                    });
                    return;
                  }
                  const nextStyle = coerceAdvancedStyle(value);
                  patchStyle(styleDefaults(nextStyle));
                }}
              >
                <SelectTrigger className="min-h-14 w-full border-primary/35 bg-background py-2 text-left shadow-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <ActiveStyleIcon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate text-sm font-medium">
                        {activeDecorationOption.label}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {activeDecorationOption.detail}
                      </span>
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {DECORATION_OPTIONS.map((option) => {
                    const OptionIcon = STYLE_ICONS[option.value];
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex min-w-0 items-center gap-2">
                          <OptionIcon className="h-4 w-4 shrink-0 text-primary" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{option.label}</span>
                            <span className="truncate text-[11px] text-muted-foreground">
                              {option.detail}
                            </span>
                          </span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {decorationEnabled ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => patchStyle(styleDefaults(advancedStyle))}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset {styleLabel(advancedStyle)}
                </Button>
              ) : null}
            </div>

            <div className="grid gap-2 rounded-md border border-border/55 bg-background/70 p-2.5">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="h-3.5 w-3.5 text-primary" aria-hidden />
                <p className="text-[12px] font-medium leading-tight text-foreground">
                  Saved heading styles
                </p>
              </div>

              <div className="grid gap-1.5">
                <Input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="Style name"
                  className="h-8 text-xs"
                />
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <label className="flex min-w-0 items-center gap-2 rounded-md bg-muted/25 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
                    <Switch
                      checked={saveAsGuideDefault}
                      onCheckedChange={setSaveAsGuideDefault}
                      size="sm"
                    />
                    <span className="min-w-0">Set as guide default when saved</span>
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={saveCurrentStyle}
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save style
                  </Button>
                </div>
              </div>

              {savedStyles.length > 0 ? (
                <div className="grid gap-1.5">
                  {savedStyles.map((preset) => {
                    const isDefault = preset.id === defaultStyleId;
                    const isActive = activePreset?.id === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className="grid gap-2 rounded-md border border-border/55 bg-background px-2.5 py-2"
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                          <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                            {preset.name}
                          </p>
                          {isActive ? (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              In use
                            </span>
                          ) : null}
                          {isDefault ? (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              Default
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-w-0 flex-1 sm:flex-none"
                            onClick={() => applySavedStyle(preset)}
                          >
                            Apply
                          </Button>
                          <Button
                            type="button"
                            variant={isDefault ? "secondary" : "ghost"}
                            size="sm"
                            className="min-w-0 flex-1 sm:flex-none"
                            onClick={() => togglePresetDefault(preset, !isDefault)}
                          >
                            {isDefault ? "Default" : "Make default"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0"
                            onClick={() => deleteSavedStyle(preset)}
                            aria-label={`Delete ${preset.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Save a look here, then reuse it in other sections.
                </p>
              )}
            </div>

            {decorationEnabled ? (
              <>
            {advancedConfig.color ? (
              <BlockColorControls
                label="Element color"
                role={accentRole}
                customColor={accentColor}
                options={COLOR_ROLES}
                onChange={({ role, customColor }) =>
                  patchStyle({
                    accent_role: role,
                    accent_color: customColor,
                  })
                }
              />
            ) : null}

            {advancedConfig.taperMode ? (
              <div className="grid gap-1">
                <Label>Taper position</Label>
                <div className="flex flex-wrap gap-1 rounded-md bg-background/70 p-1">
                  {TAPER_MODES.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={choiceClass(taperMode === option.value)}
                      onClick={() =>
                        patchStyle({
                          taper_mode: option.value,
                          decor_position: option.value,
                        })
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {advancedConfig.nodeShape ? (
              <div className="grid gap-1.5">
                <Label>Node shape</Label>
                <Select
                  value={nodeShape}
                  onValueChange={(value) =>
                    patchStyle({
                      node_shape: coerceNodeShape(value),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NODE_SHAPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {advancedConfig.markerVariant ? (
              <div className="grid gap-1.5">
                <Label>Marker variation</Label>
                <Select
                  value={markerVariant}
                  onValueChange={(value) =>
                    patchStyle({
                      marker_variant: coerceMarkerVariant(value),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MARKER_VARIANTS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              {advancedConfig.markerHeight ? (
                <div className="grid gap-1.5">
                  <Label>Marker height</Label>
                  <Select
                    value={markerHeight}
                    onValueChange={(value) =>
                      patchStyle({
                        marker_height: coerceMarkerHeight(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKER_HEIGHTS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {advancedConfig.widths ? (
                <div className="grid gap-1.5">
                  <Label>Element width</Label>
                  <Select
                    value={decorWidth}
                    onValueChange={(value) =>
                      patchStyle({
                        decor_width: coerceDecorWidth(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {widthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {advancedConfig.weight ? (
                <div className="grid gap-1.5">
                  <Label>Element weight</Label>
                  <Select
                    value={decorWeight}
                    onValueChange={(value) =>
                      patchStyle({
                        decor_weight: coerceDecorWeight(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DECOR_WEIGHTS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {advancedConfig.offset ? (
                <div className="grid gap-1.5">
                  <Label>Element spacing</Label>
                  <Select
                    value={decorOffset}
                    onValueChange={(value) =>
                      patchStyle({
                        decor_offset: coerceDecorOffset(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DECOR_OFFSETS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {advancedConfig.position ? (
              <div className="grid gap-1">
                <Label>
                  {advancedConfig.position === "side"
                    ? "Rule side"
                    : "Element position"}
                </Label>
                <div className="flex flex-wrap gap-1 rounded-md bg-background/70 p-1">
                  {DECOR_POSITIONS.filter((option) =>
                    advancedConfig.position === "side"
                      ? option.value !== "center"
                      : true
                  ).map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className={choiceClass(decorPosition === option.value)}
                      onClick={() =>
                        patchStyle({ decor_position: option.value })
                      }
                      aria-label={option.label}
                    >
                      {option.value === "left" ? (
                        <AlignLeft className="h-4 w-4" />
                      ) : option.value === "right" ? (
                        <AlignRight className="h-4 w-4" />
                      ) : (
                        <AlignCenter className="h-4 w-4" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {advancedConfig.orbitShape ? (
              <div className="grid gap-1.5">
                <Label>Object variation</Label>
                <Select
                  value={orbitShape}
                  onValueChange={(value) =>
                    patchStyle({
                      orbit_shape: coerceOrbitShape(value),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORBIT_SHAPES.map((option) => {
                      const OrbitIcon = ORBIT_SHAPE_ICONS[option.value];
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex min-w-0 items-center gap-2">
                            <OrbitIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="truncate">{option.label}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {advancedConfig.orbitCount ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Object count</Label>
                  <Select
                    value={String(orbitCount)}
                    onValueChange={(value) =>
                      patchStyle({
                        orbit_count: coerceOrbitCount(Number(value)),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORBIT_COUNTS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={String(option.value)}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {advancedConfig.orbitTaper ? (
                  <div className="grid gap-2 rounded-md border border-border/55 bg-background/70 px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium leading-tight text-foreground">
                        Taper objects
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        Reduce size as objects move away.
                      </p>
                    </div>
                    <Switch
                      className="justify-self-start sm:justify-self-end"
                      checked={orbitTaper}
                      onCheckedChange={(checked) =>
                        patchStyle({ orbit_taper: checked })
                      }
                      size="sm"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {advancedConfig.crosshairs ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Corner count</Label>
                  <Select
                    value={crosshairCorners}
                    onValueChange={(value) =>
                      patchStyle({
                        crosshair_corners: coerceCrosshairCorners(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CROSSHAIR_CORNERS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Diagonal direction</Label>
                  <Select
                    value={crosshairDirection}
                    onValueChange={(value) =>
                      patchStyle({
                        crosshair_direction: coerceCrosshairDirection(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CROSSHAIR_DIRECTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {advancedConfig.sidebarVariant ? (
              <div className="grid gap-1.5">
                <Label>Sidebar variation</Label>
                <Select
                  value={sidebarVariant}
                  onValueChange={(value) =>
                    patchStyle({
                      sidebar_variant: coerceSidebarVariant(value),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIDEBAR_VARIANTS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {advancedConfig.sidebarDimensions ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Sidebar height</Label>
                  <Select
                    value={sidebarHeight}
                    onValueChange={(value) =>
                      patchStyle({
                        sidebar_height: coerceSidebarHeight(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIDEBAR_HEIGHTS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Sidebar width</Label>
                  <Select
                    value={sidebarWidth}
                    onValueChange={(value) =>
                      patchStyle({
                        sidebar_width: coerceSidebarWidth(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIDEBAR_WIDTHS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {advancedConfig.angle ? (
              <PremiumSlider
                label="Element angle"
                min={-8}
                max={8}
                step={1}
                value={decorAngle}
                onChange={(value) => patchStyle({ decor_angle: value })}
                format={(value) => `${value}deg`}
                marks={[
                  { value: -8, label: "-8" },
                  { value: 0, label: "0" },
                  { value: 8, label: "8" },
                ]}
                showAllMarkLabels
              />
            ) : null}

            {advancedConfig.motion ? (
              <div className="grid gap-2 rounded-md border border-border/55 bg-background/70 px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium leading-tight text-foreground">
                    Motion
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    Enable the animation for this style.
                  </p>
                </div>
                <Switch
                  className="justify-self-start sm:justify-self-end"
                  checked={decorMotion}
                  onCheckedChange={(checked) =>
                    patchStyle({ decor_motion: checked })
                  }
                  size="sm"
                />
              </div>
            ) : null}
              </>
            ) : null}
          </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
