"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { normalizeHexColor } from "@/lib/block-colors";
import type { EditorBlock } from "@/stores/editor-store";
import { useEditorStore } from "@/stores/editor-store";
import type {
  AddPlacesLayout,
  AddPlacesStyle,
  WidgetAnimation,
  WidgetColorRole,
} from "@/types/blocks";
import { ToggleRow } from "../settings-ui";
import { PromptedInput } from "../shared/PromptedField";
import { BlockColorControls } from "./BlockColorControls";
import { useSavedPlaces } from "../featured/places/useSavedPlaces";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type AddPlacesConfig = {
  accentRole: WidgetColorRole;
  accentColor: string;
  layout: AddPlacesLayout;
  showImages: boolean;
  showCategory: boolean;
  showDescription: boolean;
  showAddress: boolean;
  showActions: boolean;
  fullDetails: boolean;
  animation: WidgetAnimation;
};

const ASSETS_HUB_DISCOVER_HREF = "/dashboard/assets-hub#local-places-discover";

const STYLES: Array<{ value: AddPlacesStyle; label: string }> = [
  { value: "clean_grid", label: "Clean Grid" },
  { value: "photo_cards", label: "Photo Cards" },
  { value: "compact_list", label: "Compact List" },
  { value: "magazine", label: "Magazine" },
];

const LAYOUTS: Array<{ value: AddPlacesLayout; label: string }> = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
  { value: "compact", label: "Compact" },
];

const COLOR_ROLES: Array<{ value: WidgetColorRole; label: string }> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const ANIMATIONS: Array<{ value: WidgetAnimation; label: string }> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "glow", label: "Glow" },
  { value: "pulse", label: "Pulse" },
];

const STYLE_VALUES = STYLES.map((item) => item.value);
const LAYOUT_VALUES = LAYOUTS.map((item) => item.value);
const COLOR_ROLE_VALUES = COLOR_ROLES.map((item) => item.value);
const ANIMATION_VALUES = ANIMATIONS.map((item) => item.value);

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readSelectionMode(content: Record<string, unknown>) {
  return content.selection_mode === "custom" ? "custom" : "all";
}

function readPlaceIds(content: Record<string, unknown>) {
  return Array.isArray(content.place_ids)
    ? content.place_ids.filter((id): id is string => typeof id === "string")
    : [];
}

function coerceStyle(value: unknown): AddPlacesStyle {
  return STYLE_VALUES.includes(value as AddPlacesStyle)
    ? (value as AddPlacesStyle)
    : "clean_grid";
}

function coerceLayout(value: unknown): AddPlacesLayout {
  return LAYOUT_VALUES.includes(value as AddPlacesLayout)
    ? (value as AddPlacesLayout)
    : "grid";
}

function coerceColorRole(value: unknown): WidgetColorRole {
  return COLOR_ROLE_VALUES.includes(value as WidgetColorRole)
    ? (value as WidgetColorRole)
    : "secondary";
}

function coerceAnimation(value: unknown): WidgetAnimation {
  return ANIMATION_VALUES.includes(value as WidgetAnimation)
    ? (value as WidgetAnimation)
    : "style_default";
}

function readConfig(content: Record<string, unknown>): AddPlacesConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};

  return {
    accentRole: coerceColorRole(raw.accent_role),
    accentColor: normalizeHexColor(raw.accent_color),
    layout: coerceLayout(raw.layout),
    showImages: typeof raw.show_images === "boolean" ? raw.show_images : true,
    showCategory:
      typeof raw.show_category === "boolean" ? raw.show_category : true,
    showDescription:
      typeof raw.show_description === "boolean"
        ? raw.show_description
        : true,
    showAddress:
      typeof raw.show_address === "boolean" ? raw.show_address : true,
    showActions:
      typeof raw.show_actions === "boolean" ? raw.show_actions : true,
    fullDetails:
      typeof raw.full_details === "boolean" ? raw.full_details : false,
    animation: coerceAnimation(raw.animation),
  };
}

export function AddPlacesBlockEditor({ block, onChange }: Props) {
  const [placeQuery, setPlaceQuery] = useState("");
  const guidebookId = useEditorStore((s) => s.guidebookId);
  const { places, isLoading } = useSavedPlaces(guidebookId, true);
  const title = readString(block.content, "title");
  const subtitle = readString(block.content, "subtitle");
  const selectionMode = readSelectionMode(block.content);
  const selectedPlaceIds = readPlaceIds(block.content);
  const selectedPlaceIdSet = useMemo(
    () => new Set(selectedPlaceIds),
    [selectedPlaceIds]
  );
  const style = coerceStyle(block.content.style);
  const config = readConfig(block.content);
  const filteredPlaces = useMemo(() => {
    const q = placeQuery.trim().toLowerCase();
    const ordered = places.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return ordered;
    return ordered.filter((place) => {
      return (
        place.name.toLowerCase().includes(q) ||
        place.category.toLowerCase().includes(q) ||
        (place.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [places, placeQuery]);

  const patch = (next: Record<string, unknown>) =>
    onChange({ ...block.content, ...next });

  const patchConfig = (next: Partial<AddPlacesConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        layout: merged.layout,
        show_images: merged.showImages,
        show_category: merged.showCategory,
        show_description: merged.showDescription,
        show_address: merged.showAddress,
        show_actions: merged.showActions,
        full_details: merged.fullDetails,
        animation: merged.animation,
      },
    });
  };

  const togglePlace = (placeId: string, checked: boolean) => {
    const next = checked
      ? [...selectedPlaceIds, placeId]
      : selectedPlaceIds.filter((id) => id !== placeId);
    patch({
      selection_mode: "custom",
      place_ids: [...new Set(next)],
    });
  };

  return (
    <div className="editor-section">
      {!isLoading && places.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
          <p>
            This block uses saved Local Places. Add or discover places first,
            then the cards will appear automatically.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            render={<Link href={ASSETS_HUB_DISCOVER_HREF} />}
          >
            Open Local Places discover
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <PromptedInput
          label="Title"
          value={title}
          onChange={(value) => patch({ title: value })}
          placeholder="Places nearby"
        />
        <PromptedInput
          label="Subtitle"
          value={subtitle}
          onChange={(value) => patch({ subtitle: value })}
          placeholder="Saved host recommendations"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Card style</Label>
          <Select
            value={style}
            onValueChange={(value) => patch({ style: coerceStyle(value) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STYLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Layout</Label>
          <Select
            value={config.layout}
            onValueChange={(value) =>
              patchConfig({ layout: coerceLayout(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAYOUTS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="grid gap-1.5">
          <Label>Places to show</Label>
          <Select
            value={selectionMode}
            onValueChange={(value) =>
              patch({
                selection_mode: value === "custom" ? "custom" : "all",
                place_ids:
                  value === "custom" && selectedPlaceIds.length === 0
                    ? places.map((place) => place.id)
                    : selectedPlaceIds,
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All saved places</SelectItem>
              <SelectItem value="custom">Choose saved places</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectionMode === "custom" && places.length > 0 ? (
          <div className="rounded-md border border-border/60 bg-background p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={placeQuery}
                onChange={(event) => setPlaceQuery(event.target.value)}
                placeholder="Search saved places..."
                className="h-8 pl-7 text-xs"
              />
            </div>
            <div className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
              {filteredPlaces.length === 0 ? (
                <div className="rounded-md border border-dashed bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground">
                  No saved places match this search.
                </div>
              ) : (
                filteredPlaces.map((place) => {
                  const checked = selectedPlaceIdSet.has(place.id);
                  return (
                    <label
                      key={place.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          togglePlace(place.id, Boolean(value))
                        }
                        aria-label={`Show ${place.name}`}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {place.name}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>{selectedPlaceIds.length} selected</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() =>
                    patch({
                      selection_mode: "custom",
                      place_ids: places.map((place) => place.id),
                    })
                  }
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="font-medium text-muted-foreground hover:text-primary hover:underline"
                  onClick={() =>
                    patch({
                      selection_mode: "custom",
                      place_ids: [],
                    })
                  }
                >
                  Deselect all
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <BlockColorControls
        label="Accent Color"
        role={config.accentRole}
        customColor={config.accentColor}
        options={COLOR_ROLES}
        onChange={({ role, customColor }) =>
          patchConfig({ accentRole: role, accentColor: customColor })
        }
      />

      <div className="grid gap-1.5">
        <Label>Animation</Label>
        <Select
          value={config.animation}
          onValueChange={(value) =>
            patchConfig({ animation: coerceAnimation(value) })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANIMATIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border/60 px-3 py-1">
        <ToggleRow
          label="Show images"
          checked={config.showImages}
          onCheckedChange={(checked) => patchConfig({ showImages: checked })}
        />
        <ToggleRow
          label="Show category"
          checked={config.showCategory}
          onCheckedChange={(checked) => patchConfig({ showCategory: checked })}
        />
        <ToggleRow
          label="Show description"
          checked={config.showDescription}
          onCheckedChange={(checked) =>
            patchConfig({ showDescription: checked })
          }
        />
        <ToggleRow
          label="Show address"
          checked={config.showAddress}
          onCheckedChange={(checked) => patchConfig({ showAddress: checked })}
        />
        <ToggleRow
          label="Show action buttons"
          checked={config.showActions}
          onCheckedChange={(checked) => patchConfig({ showActions: checked })}
        />
        <ToggleRow
          label="Full card details"
          checked={config.fullDetails}
          onCheckedChange={(checked) => patchConfig({ fullDetails: checked })}
        />
      </div>
    </div>
  );
}
