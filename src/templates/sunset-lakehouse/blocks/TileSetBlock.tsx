"use client";

import type { CSSProperties } from "react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars, normalizeHexColor } from "@/lib/block-colors";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import type { TileSetContent } from "../types";

type TileItem = {
  icon: string;
  label: string;
};

type TileSetStyle =
  | "basic"
  | "soft_cards"
  | "solid_icon"
  | "outline_grid"
  | "pill_cloud"
  | "bento"
  | "numbered"
  | "ticket"
  | "glass"
  | "brutalist";

type TileSetColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "ink"
  | "muted"
  | "border";

type TileSetConfig = {
  iconSize: number;
  accentRole: TileSetColorRole;
  accentColor: string;
};

const TILE_SET_STYLES: TileSetStyle[] = [
  "basic",
  "soft_cards",
  "solid_icon",
  "outline_grid",
  "pill_cloud",
  "bento",
  "numbered",
  "ticket",
  "glass",
  "brutalist",
];

const TILE_SET_COLOR_ROLES: TileSetColorRole[] = [
  "primary",
  "secondary",
  "accent",
  "ink",
  "muted",
  "border",
];

function readStyle(value: unknown): TileSetStyle {
  if (TILE_SET_STYLES.includes(value as TileSetStyle)) {
    return value as TileSetStyle;
  }
  return "basic";
}

function readColorRole(
  value: unknown,
  fallback: TileSetColorRole
): TileSetColorRole {
  if (TILE_SET_COLOR_ROLES.includes(value as TileSetColorRole)) {
    return value as TileSetColorRole;
  }
  return fallback;
}

function readIconSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.7, numeric));
}

function readConfig(content: Partial<TileSetContent>): TileSetConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};
  return {
    iconSize: readIconSize(raw.icon_size),
    accentRole: readColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function readTiles(content: Partial<TileSetContent>): TileItem[] {
  const source = Array.isArray(content.tiles) ? content.tiles : [];
  return source
    .map((tile) => ({
      icon: typeof tile?.icon === "string" ? tile.icon.trim() : "",
      label: typeof tile?.label === "string" ? tile.label.trim() : "",
    }))
    .filter((tile) => tile.icon || tile.label);
}

export function TileSetBlock({ content }: { content: Partial<TileSetContent> }) {
  const title = typeof content.title === "string" ? content.title.trim() : "";
  const style = readStyle(content.style);
  const config = readConfig(content);
  const tiles = readTiles(content);
  if (!title && tiles.length === 0) return null;

  return (
    <div
      className="sl-tile-set"
      data-tile-style={style}
      data-color-role={config.accentRole}
      style={
        {
          "--sl-tile-icon-scale": config.iconSize,
          ...blockColorOverrideVars([
            {
              value: config.accentColor,
              colorVar: "--sl-tile-color",
              contrastVar: "--sl-tile-contrast",
            },
          ]),
        } as CSSProperties
      }
    >
      {title ? <h3 className="sl-tile-set-title">{title}</h3> : null}
      {tiles.length > 0 ? (
        <div className="sl-tile-set-grid">
          {tiles.map((tile, index) => (
            <div key={`tile-${index}-${tile.label}`} className="sl-tile-set-item">
              <span className="sl-tile-set-icon" aria-hidden>
                <HostIcon value={tile.icon || DEFAULT_ICONS.BLOCK_STACK_ITEM} />
              </span>
              {tile.label ? <span>{tile.label}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
