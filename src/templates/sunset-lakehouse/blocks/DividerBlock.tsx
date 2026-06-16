"use client";

import type { DividerColorRole, DividerContent, DividerStyle } from "../types";
import { blockColorOverrideVars } from "@/lib/block-colors";

type DividerSpacing = NonNullable<DividerContent["spacing"]>;

const DIVIDER_STYLES: DividerStyle[] = [
  "line",
  "space",
  "dots",
  "wave",
  "flourish",
  "laurel",
  "medallion",
  "scallop",
  "starburst",
  "keyline",
];

const DIVIDER_SPACINGS: DividerSpacing[] = ["small", "medium", "large"];

const DIVIDER_COLOR_ROLES: DividerColorRole[] = [
  "primary",
  "secondary",
  "accent",
  "ink",
  "muted",
  "border",
];

function readDividerStyle(value: unknown): DividerStyle {
  return DIVIDER_STYLES.includes(value as DividerStyle)
    ? (value as DividerStyle)
    : "line";
}

function readDividerSpacing(value: unknown): DividerSpacing {
  if (DIVIDER_SPACINGS.includes(value as DividerSpacing)) {
    return value as DividerSpacing;
  }
  if (value === "sm") return "small";
  if (value === "md") return "medium";
  if (value === "lg") return "large";
  return "medium";
}

function readDividerColorRole(
  value: unknown,
  fallback: DividerColorRole
): DividerColorRole {
  return DIVIDER_COLOR_ROLES.includes(value as DividerColorRole)
    ? (value as DividerColorRole)
    : fallback;
}

function spaceHeight(spacing: DividerSpacing) {
  if (spacing === "small") return "0.75rem";
  if (spacing === "large") return "2.5rem";
  return "1.5rem";
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

function DividerGraphic({ style }: { style: DividerStyle }) {
  if (style === "line" || style === "dots" || style === "space") {
    return null;
  }

  return (
    <svg
      className="sl-divider-svg"
      viewBox={dividerViewBox(style)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {style === "laurel" ? (
        <>
          <path
            d="M14 16H62M98 16H146"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.4"
          />
          <path
            d="M64 16C58 10 48 10 44 15C50 20 59 21 64 16ZM96 16C102 10 112 10 116 15C110 20 101 21 96 16Z"
            fill="var(--sl-divider-color-2)"
          />
          <path
            d="M72 16C68 8 68 5 72 2C78 7 78 13 72 16ZM88 16C92 8 92 5 88 2C82 7 82 13 88 16Z"
            fill="currentColor"
            opacity="0.9"
          />
          <circle cx="80" cy="16" r="3.2" fill="var(--sl-divider-color-2)" />
        </>
      ) : null}

      {style === "medallion" ? (
        <>
          <path
            d="M10 17H70M110 17H170"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.3"
          />
          <path
            d="M90 5C95 10 98 13 98 17C98 21 95 24 90 29C85 24 82 21 82 17C82 13 85 10 90 5Z"
            fill="var(--sl-divider-color-2)"
          />
          <circle cx="90" cy="17" r="9" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="90" cy="17" r="3" fill="currentColor" />
        </>
      ) : null}

      {style === "scallop" ? (
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
              fill={cx === 90 ? "var(--sl-divider-color-2)" : "currentColor"}
            />
          ))}
        </>
      ) : null}

      {style === "starburst" ? (
        <>
          <path
            d="M10 16C32 16 44 16 62 16M98 16C116 16 128 16 150 16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
          <path
            d="M80 4L84 12L94 16L84 20L80 28L76 20L66 16L76 12L80 4Z"
            fill="var(--sl-divider-color-2)"
          />
          <circle cx="58" cy="16" r="2" fill="currentColor" />
          <circle cx="102" cy="16" r="2" fill="currentColor" />
        </>
      ) : null}

      {style === "keyline" ? (
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
          <path d="M90 9L96 13L90 17L84 13L90 9Z" fill="var(--sl-divider-color-2)" />
        </>
      ) : null}

      {style === "wave" ? (
        <path
          d="M4 10C18 2 32 2 46 10C60 18 74 18 88 10C102 2 116 2 130 10C140 15 148 15 156 10"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      ) : null}

      {style === "flourish" ? (
        <>
          <path
            d="M6 15C24 5 39 5 52 15C65 25 76 25 86 15C96 5 115 5 128 15C141 25 154 23 174 15"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.25"
          />
          <path
            d="M90 6C84 11 84 19 90 24C96 19 96 11 90 6Z"
            fill="var(--sl-divider-color-2)"
          />
          <circle cx="90" cy="15" r="2.6" fill="currentColor" />
        </>
      ) : null}
    </svg>
  );
}

export function DividerBlock({
  content,
}: {
  content: Partial<DividerContent>;
}) {
  const style = readDividerStyle(content.style);
  const spacing = readDividerSpacing(content.spacing);
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = readDividerColorRole(config?.accent_role, "secondary");

  if (style === "space") {
    return <div aria-hidden style={{ height: spaceHeight(spacing) }} />;
  }

  return (
    <div
      aria-hidden
      className="sl-divider"
      data-sp={spacing}
      data-st={style}
      data-color-role={accentRole}
      style={blockColorOverrideVars([
        {
          value: config?.accent_color,
          colorVar: "--sl-divider-color",
        },
      ])}
    >
      <DividerGraphic style={style} />
    </div>
  );
}
