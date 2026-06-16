"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import { normalizeHexColor } from "@/lib/block-colors";
import type { EditorBlock } from "@/stores/editor-store";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

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

const TILE_SET_STYLES: Array<{ value: TileSetStyle; label: string }> = [
  { value: "basic", label: "Basic Grid" },
  { value: "soft_cards", label: "01. Soft Cards" },
  { value: "solid_icon", label: "02. Solid Icon" },
  { value: "outline_grid", label: "03. Outline Grid" },
  { value: "pill_cloud", label: "04. Pill Cloud" },
  { value: "bento", label: "05. Bento Mix" },
  { value: "numbered", label: "06. Numbered Tiles" },
  { value: "ticket", label: "07. Ticket Stubs" },
  { value: "glass", label: "08. Frosted Glass" },
  { value: "brutalist", label: "09. Brutalist Press" },
];

const TILE_SET_STYLE_VALUES = TILE_SET_STYLES.map((style) => style.value);

const TILE_SET_COLOR_ROLES: Array<{
  value: TileSetColorRole;
  label: string;
}> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
  { value: "ink", label: "Guide text" },
  { value: "muted", label: "Guide muted" },
  { value: "border", label: "Guide border" },
];

const TILE_SET_COLOR_ROLE_VALUES = TILE_SET_COLOR_ROLES.map(
  (role) => role.value
);

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function coerceTileSetStyle(value: unknown): TileSetStyle {
  if (TILE_SET_STYLE_VALUES.includes(value as TileSetStyle)) {
    return value as TileSetStyle;
  }
  return "basic";
}

function coerceTileSetColorRole(
  value: unknown,
  fallback: TileSetColorRole
): TileSetColorRole {
  if (TILE_SET_COLOR_ROLE_VALUES.includes(value as TileSetColorRole)) {
    return value as TileSetColorRole;
  }
  return fallback;
}

function coerceTileIconSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.7, numeric));
}

function readConfig(content: Record<string, unknown>): TileSetConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};
  return {
    iconSize: coerceTileIconSize(raw.icon_size),
    accentRole: coerceTileSetColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function readTiles(content: Record<string, unknown>): TileItem[] {
  const value = content.tiles;
  if (!Array.isArray(value)) return [];
  return value
    .map((item): TileItem | null => {
      if (!item || typeof item !== "object") return null;
      const tile = item as Record<string, unknown>;
      return {
        icon: typeof tile.icon === "string" ? tile.icon : "",
        label: typeof tile.label === "string" ? tile.label : "",
      };
    })
    .filter((item): item is TileItem => Boolean(item));
}

export function TileSetBlockEditor({ block, onChange }: Props) {
  const title = readString(block.content, "title");
  const style = coerceTileSetStyle(block.content.style);
  const config = readConfig(block.content);
  const tiles = readTiles(block.content);

  const patch = (next: {
    title?: string;
    style?: TileSetStyle;
    config?: TileSetConfig;
    tiles?: TileItem[];
  }) => {
    const nextConfig = next.config ?? config;
    onChange({
      title: next.title ?? title,
      style: next.style ?? style,
      config: {
        icon_size: nextConfig.iconSize,
        accent_role: nextConfig.accentRole,
        accent_color: nextConfig.accentColor || undefined,
      },
      tiles: next.tiles ?? tiles,
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= tiles.length) return;
    const next = [...tiles];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    patch({ tiles: next });
  };

  return (
    <div className="space-y-3">
      <PromptedInput
        label="Title"
        value={title}
        onChange={(value) => patch({ title: value })}
        placeholder="What's Included"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Tile Style</Label>
          <Select
            value={style}
            onValueChange={(value) => patch({ style: coerceTileSetStyle(value) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TILE_SET_STYLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <PremiumSlider
          label="Icon Size"
          value={config.iconSize}
          min={0.7}
          max={2}
          step={0.05}
          onChange={(value) =>
            patch({
              config: {
                ...config,
                iconSize: coerceTileIconSize(value),
              },
            })
          }
          format={(value) => `${Math.round(value * 100)}%`}
          marks={[
            { value: 0.7, label: "Small" },
            { value: 1, label: "Default" },
            { value: 2, label: "Large" },
          ]}
        />
      </div>

      <div className="grid gap-2">
        <BlockColorControls
          label="Element Color"
          role={config.accentRole}
          customColor={config.accentColor}
          options={TILE_SET_COLOR_ROLES}
          onChange={({ role, customColor }) =>
            patch({
              config: {
                ...config,
                accentRole: role,
                accentColor: customColor,
              },
            })
          }
        />
      </div>

      <div className="editor-section">
        <div className="editor-section-header">
          <Label>Tiles</Label>
          <Button
            type="button"
            size="sm"
            className="editor-cta"
            onClick={() =>
              patch({
                tiles: [...tiles, { icon: "", label: "New tile" }],
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add tile
          </Button>
        </div>

        {tiles.length === 0 ? (
          <div className="editor-empty">
            Add icon and label tiles.
          </div>
        ) : (
          <div className="editor-list">
            {tiles.map((tile, index) => (
              <div key={`${block.id}-tile-${index}`} className="editor-list-item">
                <div className="editor-item-toolbar editor-item-toolbar--split">
                  <IconifyPicker
                    value={tile.icon}
                    onChange={(icon) => {
                      const next = [...tiles];
                      next[index] = { ...tile, icon };
                      patch({ tiles: next });
                    }}
                    ariaLabel="Select tile icon"
                    triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
                    iconClassName="text-base"
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move tile up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => move(index, 1)}
                      disabled={index === tiles.length - 1}
                      aria-label="Move tile down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        patch({
                          tiles: tiles.filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
                      aria-label="Remove tile"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <PromptedInput
                  label="Label"
                  value={tile.label}
                  onChange={(value) => {
                    const next = [...tiles];
                    next[index] = { ...tile, label: value };
                    patch({ tiles: next });
                  }}
                  placeholder="Coffee"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
