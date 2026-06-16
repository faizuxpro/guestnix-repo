"use client";

import type { CSSProperties } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeHexColor } from "@/lib/block-colors";
import type { EditorBlock } from "@/stores/editor-store";
import type { DividerColorRole, DividerStyle } from "@/types/blocks";
import { BlockColorControls } from "./BlockColorControls";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type DividerSpacing = "small" | "medium" | "large";

type DividerConfig = {
  accentRole: DividerColorRole;
  accentColor: string;
};

const DIVIDER_STYLES: Array<{ value: DividerStyle; label: string }> = [
  { value: "flourish", label: "01. Classic Flourish" },
  { value: "laurel", label: "02. Laurel Branch" },
  { value: "medallion", label: "03. Floral Medallion" },
  { value: "scallop", label: "04. Scalloped Lace" },
  { value: "starburst", label: "05. Starburst" },
  { value: "keyline", label: "06. Vintage Keyline" },
  { value: "wave", label: "Soft Wave" },
  { value: "dots", label: "Dot Trio" },
  { value: "line", label: "Simple Line" },
  { value: "space", label: "Blank Space" },
];

const DIVIDER_STYLE_VALUES = DIVIDER_STYLES.map((style) => style.value);

const DIVIDER_COLOR_ROLES: Array<{
  value: DividerColorRole;
  label: string;
}> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
  { value: "ink", label: "Guide text" },
  { value: "muted", label: "Guide muted" },
  { value: "border", label: "Guide border" },
];

const DIVIDER_COLOR_ROLE_VALUES = DIVIDER_COLOR_ROLES.map((role) => role.value);

function coerceDividerStyle(value: unknown): DividerStyle {
  if (DIVIDER_STYLE_VALUES.includes(value as DividerStyle)) {
    return value as DividerStyle;
  }
  return "line";
}

function coerceDividerColorRole(
  value: unknown,
  fallback: DividerColorRole
): DividerColorRole {
  if (DIVIDER_COLOR_ROLE_VALUES.includes(value as DividerColorRole)) {
    return value as DividerColorRole;
  }
  return fallback;
}

function readSpacing(content: Record<string, unknown>): DividerSpacing {
  const value = content.spacing;
  if (value === "small" || value === "medium" || value === "large") return value;
  if (value === "sm") return "small";
  if (value === "md") return "medium";
  if (value === "lg") return "large";
  return "medium";
}

function readConfig(content: Record<string, unknown>): DividerConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};

  return {
    accentRole: coerceDividerColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function spacingClass(spacing: DividerSpacing) {
  switch (spacing) {
    case "small":
      return "py-2";
    case "large":
      return "py-8";
    default:
      return "py-4";
  }
}

function roleColor(role: DividerColorRole) {
  switch (role) {
    case "primary":
      return "var(--primary)";
    case "secondary":
      return "#d4a23a";
    case "accent":
      return "var(--accent)";
    case "ink":
      return "var(--foreground)";
    case "muted":
      return "var(--muted-foreground)";
    case "border":
      return "var(--border)";
    default:
      return "var(--muted-foreground)";
  }
}

function DividerPreview({
  style,
  config,
}: {
  style: DividerStyle;
  config: DividerConfig;
}) {
  const previewColor = config.accentColor || roleColor(config.accentRole);
  const previewStyle = {
    "--divider-preview-color": previewColor,
    "--divider-preview-color-2": previewColor,
  } as CSSProperties;

  if (style === "space") {
    return (
      <div
        aria-hidden
        className="h-8 w-full rounded-md border border-dashed border-border/70 bg-muted/20"
      />
    );
  }

  if (style === "line") {
    return (
      <div
        aria-hidden
        className="h-px w-full"
        style={{
          ...previewStyle,
          background:
            "linear-gradient(90deg, transparent, var(--divider-preview-color), transparent)",
        }}
      />
    );
  }

  if (style === "dots") {
    return (
      <div
        aria-hidden
        className="flex h-8 items-center justify-center gap-2"
        style={previewStyle}
      >
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background:
                index === 1
                  ? "var(--divider-preview-color-2)"
                  : "var(--divider-preview-color)",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <svg
      aria-hidden
      className="mx-auto block h-auto w-full max-w-sm overflow-visible"
      style={{ ...previewStyle, color: "var(--divider-preview-color)" }}
      viewBox={dividerViewBox(style)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <DividerPreviewGraphic style={style} />
    </svg>
  );
}

function dividerViewBox(style: DividerStyle) {
  switch (style) {
    case "laurel":
    case "starburst":
      return "0 0 160 32";
    case "medallion":
      return "0 0 180 34";
    case "scallop":
      return "0 0 180 24";
    case "keyline":
      return "0 0 180 26";
    case "wave":
      return "0 0 160 20";
    default:
      return "0 0 180 30";
  }
}

function DividerPreviewGraphic({ style }: { style: DividerStyle }) {
  switch (style) {
    case "laurel":
      return (
        <>
          <path
            d="M14 16H62M98 16H146"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.4"
          />
          <path
            d="M64 16C58 10 48 10 44 15C50 20 59 21 64 16ZM96 16C102 10 112 10 116 15C110 20 101 21 96 16Z"
            fill="var(--divider-preview-color-2)"
          />
          <path
            d="M72 16C68 8 68 5 72 2C78 7 78 13 72 16ZM88 16C92 8 92 5 88 2C82 7 82 13 88 16Z"
            fill="currentColor"
            opacity="0.9"
          />
          <circle cx="80" cy="16" r="3.2" fill="var(--divider-preview-color-2)" />
        </>
      );
    case "medallion":
      return (
        <>
          <path
            d="M10 17H70M110 17H170"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.3"
          />
          <path
            d="M90 5C95 10 98 13 98 17C98 21 95 24 90 29C85 24 82 21 82 17C82 13 85 10 90 5Z"
            fill="var(--divider-preview-color-2)"
          />
          <circle cx="90" cy="17" r="9" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="90" cy="17" r="3" fill="currentColor" />
        </>
      );
    case "scallop":
      return (
        <>
          <path
            d="M0 4C0 17 20 17 20 4C20 17 40 17 40 4C40 17 60 17 60 4C60 17 80 17 80 4C80 17 100 17 100 4C100 17 120 17 120 4C120 17 140 17 140 4C140 17 160 17 160 4C160 17 180 17 180 4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.3"
          />
          {[10, 30, 50, 70, 90, 110, 130, 150, 170].map((cx) => (
            <circle
              key={cx}
              cx={cx}
              cy="16"
              r="1.9"
              fill={cx === 90 ? "var(--divider-preview-color-2)" : "currentColor"}
            />
          ))}
        </>
      );
    case "starburst":
      return (
        <>
          <path
            d="M10 16C32 16 44 16 62 16M98 16C116 16 128 16 150 16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
          <path
            d="M80 4L84 12L94 16L84 20L80 28L76 20L66 16L76 12L80 4Z"
            fill="var(--divider-preview-color-2)"
          />
          <circle cx="58" cy="16" r="2" fill="currentColor" />
          <circle cx="102" cy="16" r="2" fill="currentColor" />
        </>
      );
    case "keyline":
      return (
        <>
          <path
            d="M8 9H74M106 9H172M8 17H74M106 17H172"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.1"
          />
          <path
            d="M90 5L102 13L90 21L78 13L90 5Z"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path d="M90 9L96 13L90 17L84 13L90 9Z" fill="var(--divider-preview-color-2)" />
        </>
      );
    case "wave":
      return (
        <path
          d="M4 10C18 2 32 2 46 10C60 18 74 18 88 10C102 2 116 2 130 10C140 15 148 15 156 10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      );
    case "flourish":
    default:
      return (
        <>
          <path
            d="M6 15C24 5 39 5 52 15C65 25 76 25 86 15C96 5 115 5 128 15C141 25 154 23 174 15"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.25"
          />
          <path
            d="M90 6C84 11 84 19 90 24C96 19 96 11 90 6Z"
            fill="var(--divider-preview-color-2)"
          />
          <circle cx="90" cy="15" r="2.6" fill="currentColor" />
        </>
      );
  }
}

export function DividerBlockEditor({ block, onChange }: Props) {
  const style = coerceDividerStyle(block.content.style);
  const spacing = readSpacing(block.content);
  const config = readConfig(block.content);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchConfig = (next: Partial<DividerConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
      },
    });
  };

  return (
    <div className="editor-section">
      <div className="grid gap-1.5">
        <Label>Divider Style</Label>
        <Select
          value={style}
          onValueChange={(value) => patch({ style: coerceDividerStyle(value) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIVIDER_STYLES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <BlockColorControls
          label="Line Color"
          role={config.accentRole}
          customColor={config.accentColor}
          options={DIVIDER_COLOR_ROLES}
          onChange={({ role, customColor }) =>
            patchConfig({ accentRole: role, accentColor: customColor })
          }
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Spacing</Label>
        <Select
          value={spacing}
          onValueChange={(value) =>
            patch({
              spacing:
                value === "small" || value === "large" ? value : "medium",
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="block-editor-preview px-4">
        <div className={spacingClass(spacing)}>
          <DividerPreview style={style} config={config} />
        </div>
      </div>
    </div>
  );
}
