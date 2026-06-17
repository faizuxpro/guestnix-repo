"use client";

import type { CSSProperties } from "react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars } from "@/lib/block-colors";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import type {
  IconGridAnimation,
  IconGridColorRole,
  IconGridContent,
  IconGridStyle,
} from "../types";

type IconGridItem = {
  icon: string;
  title: string;
  description: string;
};

type IconGridBlockStyle = CSSProperties & {
  "--sl-icon-grid-icon-scale"?: number;
  "--sl-icon-grid-icon-container-scale"?: number;
};

const ICON_GRID_STYLES: IconGridStyle[] = [
  "classic",
  "numbered_minimal",
  "inverse",
  "brutalist",
  "neon",
  "radial",
  "pulse",
  "gradient_overlap",
];

const ICON_GRID_COLOR_ROLES: IconGridColorRole[] = [
  "primary",
  "secondary",
  "accent",
];

const ICON_GRID_ANIMATIONS: IconGridAnimation[] = [
  "style_default",
  "none",
  "float",
  "tick",
  "glitch",
  "glow",
  "morph",
  "pulse",
];

function readItems(content: Partial<IconGridContent>): IconGridItem[] {
  const source = Array.isArray(content.items) ? content.items : [];
  return source
    .map((item) => ({
      icon: typeof item?.icon === "string" ? item.icon.trim() : "",
      title: typeof item?.title === "string" ? item.title.trim() : "",
      description:
        typeof item?.description === "string" ? item.description.trim() : "",
    }))
    .filter((item) => item.title || item.description || item.icon);
}

function readIconGridStyle(value: unknown): IconGridStyle {
  return ICON_GRID_STYLES.includes(value as IconGridStyle)
    ? (value as IconGridStyle)
    : "classic";
}

function readIconGridColorRole(
  value: unknown,
  fallback: IconGridColorRole
): IconGridColorRole {
  return ICON_GRID_COLOR_ROLES.includes(value as IconGridColorRole)
    ? (value as IconGridColorRole)
    : fallback;
}

function readIconGridAnimation(value: unknown): IconGridAnimation {
  return ICON_GRID_ANIMATIONS.includes(value as IconGridAnimation)
    ? (value as IconGridAnimation)
    : "style_default";
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function IconGridBlock({ content }: { content: Partial<IconGridContent> }) {
  const items = readItems(content);
  if (items.length === 0) return null;
  const style = readIconGridStyle(content.style);
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = readIconGridColorRole(config?.accent_role, "primary");
  const animation = readIconGridAnimation(config?.animation);
  const iconSize = readNumber(config?.icon_size, 100, 60, 180);
  const iconContainerSize = readNumber(
    config?.icon_container_size,
    100,
    70,
    180
  );
  const blockStyle: IconGridBlockStyle = {
    "--sl-icon-grid-icon-scale": iconSize / 100,
    "--sl-icon-grid-icon-container-scale": iconContainerSize / 100,
    ...blockColorOverrideVars([
      {
        value: config?.accent_color,
        colorVar: "--sl-icon-grid-color",
        rgbVar: "--sl-icon-grid-color-rgb",
        contrastVar: "--sl-icon-grid-contrast",
      },
    ]),
  };

  return (
    <div
      className="sl-block-icon-grid"
      data-icon-grid-style={style}
      data-color-role={accentRole}
      data-animation={animation}
      style={blockStyle}
    >
      {items.map((item, index) => (
        <article
          key={`icon-grid-${index}-${item.title}`}
          className="sl-block-icon-grid-card"
        >
          <span className="sl-block-icon-grid-number" aria-hidden>
            {index + 1}
          </span>
          <span className="sl-block-icon-grid-blob" aria-hidden />
          <span className="sl-block-icon-grid-ring" aria-hidden>
            <span className="sl-block-icon-grid-icon">
              <HostIcon value={item.icon || DEFAULT_ICONS.BLOCK_STACK_ITEM} />
            </span>
          </span>
          <div className="sl-block-icon-grid-copy">
            {item.title ? (
              <div className="sl-block-icon-grid-title">{item.title}</div>
            ) : null}
            {item.description ? (
              <div className="sl-block-icon-grid-desc">{item.description}</div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
