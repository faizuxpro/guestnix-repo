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
import type {
  IconGridAnimation,
  IconGridColorRole,
  IconGridStyle,
} from "@/types/blocks";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput, PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type IconGridItem = {
  icon: string;
  title: string;
  description: string;
};

type IconGridConfig = {
  accentRole: IconGridColorRole;
  accentColor: string;
  animation: IconGridAnimation;
  iconSize: number;
  iconContainerSize: number;
};

const ICON_GRID_STYLES: Array<{ value: IconGridStyle; label: string }> = [
  { value: "classic", label: "Classic Cards" },
  { value: "numbered_minimal", label: "01. Numbered Minimal" },
  { value: "inverse", label: "02. Inverse Minimal" },
  { value: "brutalist", label: "03. Bold Block Grid" },
  { value: "neon", label: "04. Dark Glow" },
  { value: "radial", label: "05. Radial Ring" },
  { value: "pulse", label: "06. Pulse Cards" },
  { value: "gradient_overlap", label: "07. Gradient Overlap" },
];

const ICON_GRID_STYLE_VALUES = ICON_GRID_STYLES.map((style) => style.value);

const ICON_GRID_COLOR_ROLES: Array<{
  value: IconGridColorRole;
  label: string;
}> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const ICON_GRID_COLOR_ROLE_VALUES = ICON_GRID_COLOR_ROLES.map(
  (role) => role.value
);

const ICON_GRID_ANIMATIONS: Array<{
  value: IconGridAnimation;
  label: string;
}> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "float", label: "Smooth float" },
  { value: "tick", label: "Sharp tick" },
  { value: "glitch", label: "Glitch pop" },
  { value: "glow", label: "Neon glow" },
  { value: "morph", label: "Fluid morph" },
  { value: "pulse", label: "Pulse scale" },
];

const ICON_GRID_ANIMATION_VALUES = ICON_GRID_ANIMATIONS.map(
  (animation) => animation.value
);

function readItems(content: Record<string, unknown>): IconGridItem[] {
  const value = content.items;
  if (!Array.isArray(value)) return [];
  return value
    .map((item): IconGridItem | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        icon: typeof row.icon === "string" ? row.icon : "",
        title: typeof row.title === "string" ? row.title : "",
        description: typeof row.description === "string" ? row.description : "",
      };
    })
    .filter((item): item is IconGridItem => Boolean(item));
}

function coerceIconGridStyle(value: unknown): IconGridStyle {
  if (ICON_GRID_STYLE_VALUES.includes(value as IconGridStyle)) {
    return value as IconGridStyle;
  }
  return "classic";
}

function coerceIconGridColorRole(
  value: unknown,
  fallback: IconGridColorRole
): IconGridColorRole {
  if (ICON_GRID_COLOR_ROLE_VALUES.includes(value as IconGridColorRole)) {
    return value as IconGridColorRole;
  }
  return fallback;
}

function coerceIconGridAnimation(value: unknown): IconGridAnimation {
  if (ICON_GRID_ANIMATION_VALUES.includes(value as IconGridAnimation)) {
    return value as IconGridAnimation;
  }
  return "style_default";
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function readConfig(content: Record<string, unknown>): IconGridConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};
  return {
    accentRole: coerceIconGridColorRole(raw.accent_role, "primary"),
    accentColor: normalizeHexColor(raw.accent_color),
    animation: coerceIconGridAnimation(raw.animation),
    iconSize: clampNumber(raw.icon_size, 100, 60, 180),
    iconContainerSize: clampNumber(raw.icon_container_size, 100, 70, 180),
  };
}

export function IconGridBlockEditor({ block, onChange }: Props) {
  const items = readItems(block.content);
  const style = coerceIconGridStyle(block.content.style);
  const config = readConfig(block.content);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchItems = (next: IconGridItem[]) => patch({ items: next });

  const patchConfig = (next: Partial<IconGridConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        animation: merged.animation,
        icon_size: merged.iconSize,
        icon_container_size: merged.iconContainerSize,
      },
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    patchItems(next);
  };

  return (
    <div className="editor-section">
      <div className="grid gap-1.5">
        <Label>Grid Style</Label>
        <Select
          value={style}
          onValueChange={(value) =>
            patch({ style: coerceIconGridStyle(value) })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ICON_GRID_STYLES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <BlockColorControls
          label="Icon Color"
          role={config.accentRole}
          customColor={config.accentColor}
          options={ICON_GRID_COLOR_ROLES}
          onChange={({ role, customColor }) =>
            patchConfig({ accentRole: role, accentColor: customColor })
          }
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Animation</Label>
        <Select
          value={config.animation}
          onValueChange={(value) =>
            patchConfig({ animation: coerceIconGridAnimation(value) })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ICON_GRID_ANIMATIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PremiumSlider
          label="Icon size"
          value={config.iconSize}
          min={60}
          max={180}
          step={5}
          format={(value) => `${value}%`}
          onChange={(iconSize) => patchConfig({ iconSize })}
        />
        <PremiumSlider
          label="Icon background size"
          value={config.iconContainerSize}
          min={70}
          max={180}
          step={5}
          format={(value) => `${value}%`}
          onChange={(iconContainerSize) => patchConfig({ iconContainerSize })}
        />
      </div>

      <div className="editor-section-header">
        <Label>Cards</Label>
        <Button
          type="button"
          size="sm"
          className="editor-cta"
          onClick={() =>
            patchItems([
              ...items,
              {
                icon: "",
                title: "Feature",
                description: "Short supporting description.",
              },
            ])
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add card
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="editor-empty">
          Add icon cards for amenities, features, or benefits.
        </div>
      ) : (
        <div className="editor-list">
          {items.map((item, index) => (
            <div key={`${block.id}-icon-grid-${index}`} className="editor-list-item">
              <div className="editor-item-toolbar editor-item-toolbar--split">
                <IconifyPicker
                  value={item.icon}
                  onChange={(icon) => {
                    const next = [...items];
                    next[index] = { ...item, icon };
                    patchItems(next);
                  }}
                  ariaLabel="Select card icon"
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
                    aria-label="Move card up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move card down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      patchItems(
                        items.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    aria-label="Remove card"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <PromptedInput
                  label="Title"
                  value={item.title}
                  onChange={(value) => {
                    const next = [...items];
                    next[index] = { ...item, title: value };
                    patchItems(next);
                  }}
                  placeholder="Feature title"
                />
                <PromptedTextarea
                  label="Description"
                  value={item.description}
                  onChange={(value) => {
                    const next = [...items];
                    next[index] = { ...item, description: value };
                    patchItems(next);
                  }}
                  placeholder="Description for this feature"
                  rows={3}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
