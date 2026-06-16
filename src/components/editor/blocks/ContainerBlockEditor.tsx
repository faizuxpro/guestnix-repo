"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeHexColor } from "@/lib/block-colors";
import { cn, randomUUID } from "@/lib/utils";
import type { EditorBlock } from "@/stores/editor-store";
import type {
  ContainerChildBlock,
  ContainerChildSpacing,
  ContainerChildSurface,
  ContainerLayout,
  ContainerPadding,
  ContainerRadius,
  ContainerStyle,
  ContainerWidth,
  WidgetAnimation,
  WidgetColorRole,
} from "@/types/blocks";
import {
  BLOCK_OPTIONS,
  type BlockOption,
} from "../AddBlockMenu";
import { BlockPickerCommand, groupBlockOptions } from "../BlockOptionPicker";
import { ToggleRow } from "../settings-ui";
import { PromptedInput } from "../shared/PromptedField";
import { BlockColorControls } from "./BlockColorControls";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
  renderChildEditor: (
    block: EditorBlock,
    onChange: (content: Record<string, unknown>) => void
  ) => import("react").ReactNode;
};

type ContainerConfig = {
  accentRole: WidgetColorRole;
  accentColor: string;
  layout: ContainerLayout;
  width: ContainerWidth;
  padding: ContainerPadding;
  radius: ContainerRadius;
  childSpacing: ContainerChildSpacing;
  childSurface: ContainerChildSurface;
  inheritAccent: boolean;
  inheritTypography: boolean;
  showHeader: boolean;
  animation: WidgetAnimation;
};

const CONTAINER_STYLES: Array<{ value: ContainerStyle; label: string }> = [
  { value: "clean_panel", label: "Clean Panel" },
  { value: "section_card", label: "Section Card" },
  { value: "soft_band", label: "Soft Band" },
  { value: "glass_panel", label: "Glass Panel" },
  { value: "dark_panel", label: "Dark Panel" },
  { value: "outline", label: "Outline" },
  { value: "ticket", label: "Ticket" },
  { value: "brutalist", label: "Bold Block" },
];

const COLOR_ROLES: Array<{ value: WidgetColorRole; label: string }> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const LAYOUTS: Array<{ value: ContainerLayout; label: string }> = [
  { value: "stacked", label: "Stacked" },
  { value: "grid", label: "Grid" },
  { value: "two_column", label: "Two Column" },
  { value: "compact", label: "Compact" },
];

const WIDTHS: Array<{ value: ContainerWidth; label: string }> = [
  { value: "full", label: "Full" },
  { value: "contained", label: "Contained" },
  { value: "narrow", label: "Narrow" },
];

const PADDING: Array<{ value: ContainerPadding; label: string }> = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const RADII: Array<{ value: ContainerRadius; label: string }> = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const CHILD_SPACING: Array<{ value: ContainerChildSpacing; label: string }> = [
  { value: "tight", label: "Tight" },
  { value: "normal", label: "Normal" },
  { value: "loose", label: "Loose" },
];

const CHILD_SURFACES: Array<{ value: ContainerChildSurface; label: string }> = [
  { value: "original", label: "Original" },
  { value: "blend", label: "Blend" },
  { value: "cards", label: "Cards" },
];

const ANIMATIONS: Array<{ value: WidgetAnimation; label: string }> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "glow", label: "Glow" },
  { value: "pulse", label: "Pulse" },
];

const STYLE_VALUES = CONTAINER_STYLES.map((item) => item.value);
const COLOR_ROLE_VALUES = COLOR_ROLES.map((item) => item.value);
const LAYOUT_VALUES = LAYOUTS.map((item) => item.value);
const WIDTH_VALUES = WIDTHS.map((item) => item.value);
const PADDING_VALUES = PADDING.map((item) => item.value);
const RADIUS_VALUES = RADII.map((item) => item.value);
const CHILD_SPACING_VALUES = CHILD_SPACING.map((item) => item.value);
const CHILD_SURFACE_VALUES = CHILD_SURFACES.map((item) => item.value);
const ANIMATION_VALUES = ANIMATIONS.map((item) => item.value);

function coerce<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readChildren(content: Record<string, unknown>): ContainerChildBlock[] {
  const raw = content.children;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index): ContainerChildBlock | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const type = typeof row.type === "string" ? row.type : "";
      if (!type || type === "container") return null;
      return {
        id: typeof row.id === "string" ? row.id : randomUUID(),
        type,
        content:
          typeof row.content === "object" && row.content !== null
            ? (row.content as Record<string, unknown>)
            : {},
        orderIndex:
          typeof row.orderIndex === "number" ? row.orderIndex : index,
        isVisible:
          typeof row.isVisible === "boolean" ? row.isVisible : true,
      };
    })
    .filter((item): item is ContainerChildBlock => Boolean(item))
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item, index) => ({ ...item, orderIndex: index }));
}

function readConfig(content: Record<string, unknown>): ContainerConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};
  return {
    accentRole: coerce(raw.accent_role, COLOR_ROLE_VALUES, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
    layout: coerce(raw.layout, LAYOUT_VALUES, "stacked"),
    width: coerce(raw.width, WIDTH_VALUES, "full"),
    padding: coerce(raw.padding, PADDING_VALUES, "medium"),
    radius: coerce(raw.radius, RADIUS_VALUES, "medium"),
    childSpacing: coerce(raw.child_spacing, CHILD_SPACING_VALUES, "normal"),
    childSurface: coerce(raw.child_surface, CHILD_SURFACE_VALUES, "blend"),
    inheritAccent:
      typeof raw.inherit_accent === "boolean" ? raw.inherit_accent : true,
    inheritTypography:
      typeof raw.inherit_typography === "boolean"
        ? raw.inherit_typography
        : false,
    showHeader: typeof raw.show_header === "boolean" ? raw.show_header : true,
    animation: coerce(raw.animation, ANIMATION_VALUES, "style_default"),
  };
}

function childLabel(child: ContainerChildBlock) {
  const option = BLOCK_OPTIONS.find((item) => item.type === child.type);
  if (child.type === "text") {
    const variant = child.content.variant;
    if (variant === "checklist") return "List";
    if (variant === "callout") return "Info Card";
    if (variant === "facts") return "Facts Grid";
    if (variant === "contacts") return "Contact Rows";
    if (variant === "alert") return "Alert Banner";
  }
  return option?.label ?? child.type.split("_").join(" ");
}

export function ContainerBlockEditor({
  block,
  onChange,
  renderChildEditor,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const title = readString(block.content, "title");
  const subtitle = readString(block.content, "subtitle");
  const icon = readString(block.content, "icon");
  const style = coerce(block.content.style, STYLE_VALUES, "section_card");
  const config = readConfig(block.content);
  const children = readChildren(block.content);

  const childOptions = useMemo(() => {
    const options = BLOCK_OPTIONS.filter(
      (option) => option.type !== "container"
    );
    return groupBlockOptions(options);
  }, []);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchConfig = (next: Partial<ContainerConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        layout: merged.layout,
        width: merged.width,
        padding: merged.padding,
        radius: merged.radius,
        child_spacing: merged.childSpacing,
        child_surface: merged.childSurface,
        inherit_accent: merged.inheritAccent,
        inherit_typography: merged.inheritTypography,
        show_header: merged.showHeader,
        animation: merged.animation,
      },
    });
  };

  const patchChildren = (nextChildren: ContainerChildBlock[]) => {
    patch({
      children: nextChildren.map((child, index) => ({
        ...child,
        orderIndex: index,
      })),
    });
  };

  const addChild = (option: BlockOption) => {
    patchChildren([
      ...children,
      {
        id: randomUUID(),
        type: option.type,
        content: structuredClone(option.defaultContent) as Record<string, unknown>,
        orderIndex: children.length,
        isVisible: true,
      },
    ]);
    setPickerOpen(false);
  };

  const moveChild = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= children.length) return;
    const next = [...children];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    patchChildren(next);
  };

  return (
    <div className="editor-section">
      <div className="grid gap-2 sm:grid-cols-2">
        <PromptedInput
          label="Title"
          value={title}
          onChange={(value) => patch({ title: value })}
          placeholder="Arrival and departure"
        />
        <PromptedInput
          label="Subtitle"
          value={subtitle}
          onChange={(value) => patch({ subtitle: value })}
          placeholder="Grouped guest instructions"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Container style</Label>
          <Select
            value={style}
            onValueChange={(value) =>
              patch({ style: coerce(value, STYLE_VALUES, "section_card") })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTAINER_STYLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Header icon</Label>
          <IconifyPicker
            value={icon}
            onChange={(value) => patch({ icon: value })}
            ariaLabel="Select container icon"
            triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
            iconClassName="text-base"
          />
        </div>
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

      <div className="grid gap-2 sm:grid-cols-3">
        <SelectField
          label="Layout"
          value={config.layout}
          options={LAYOUTS}
          onChange={(value) =>
            patchConfig({ layout: coerce(value, LAYOUT_VALUES, "stacked") })
          }
        />
        <SelectField
          label="Width"
          value={config.width}
          options={WIDTHS}
          onChange={(value) =>
            patchConfig({ width: coerce(value, WIDTH_VALUES, "full") })
          }
        />
        <SelectField
          label="Animation"
          value={config.animation}
          options={ANIMATIONS}
          onChange={(value) =>
            patchConfig({
              animation: coerce(value, ANIMATION_VALUES, "style_default"),
            })
          }
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <SelectField
          label="Padding"
          value={config.padding}
          options={PADDING}
          onChange={(value) =>
            patchConfig({ padding: coerce(value, PADDING_VALUES, "medium") })
          }
        />
        <SelectField
          label="Corner radius"
          value={config.radius}
          options={RADII}
          onChange={(value) =>
            patchConfig({ radius: coerce(value, RADIUS_VALUES, "medium") })
          }
        />
        <SelectField
          label="Child spacing"
          value={config.childSpacing}
          options={CHILD_SPACING}
          onChange={(value) =>
            patchConfig({
              childSpacing: coerce(value, CHILD_SPACING_VALUES, "normal"),
            })
          }
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField
          label="Child surfaces"
          value={config.childSurface}
          options={CHILD_SURFACES}
          onChange={(value) =>
            patchConfig({
              childSurface: coerce(value, CHILD_SURFACE_VALUES, "blend"),
            })
          }
        />
        <div className="rounded-md border border-border/60 px-3 py-1">
          <ToggleRow
            label="Show container header"
            checked={config.showHeader}
            onCheckedChange={(checked) => patchConfig({ showHeader: checked })}
          />
          <ToggleRow
            label="Pass accent color to child blocks"
            checked={config.inheritAccent}
            onCheckedChange={(checked) =>
              patchConfig({ inheritAccent: checked })
            }
          />
          <ToggleRow
            label="Use unified child typography"
            checked={config.inheritTypography}
            onCheckedChange={(checked) =>
              patchConfig({ inheritTypography: checked })
            }
          />
        </div>
      </div>

      <div className="editor-section-header">
        <Label>Blocks inside container</Label>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger render={<Button size="sm" className="editor-cta" />}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add inner block
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(30rem,calc(100vw-2rem))] p-1.5"
            align="start"
            sideOffset={8}
          >
            <BlockPickerCommand
              options={childOptions}
              onAdd={addChild}
              listClassName="max-h-[min(24rem,calc(100vh-14rem))]"
            />
          </PopoverContent>
        </Popover>
      </div>

      {children.length === 0 ? (
        <div className="editor-empty">
          Add standard blocks or widgets inside this container.
        </div>
      ) : (
        <div className="editor-list">
          {children.map((child, index) => (
            <div
              key={child.id}
              className={cn(
                "editor-list-item",
                !child.isVisible && "opacity-60"
              )}
            >
              <div className="editor-item-toolbar editor-item-toolbar--split">
                <div className="flex min-w-0 items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate text-xs font-semibold">
                    {childLabel(child)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      const next = [...children];
                      next[index] = {
                        ...child,
                        isVisible: !child.isVisible,
                      };
                      patchChildren(next);
                    }}
                    aria-label={child.isVisible ? "Hide child block" : "Show child block"}
                  >
                    {child.isVisible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveChild(index, -1)}
                    disabled={index === 0}
                    aria-label="Move child block up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveChild(index, 1)}
                    disabled={index === children.length - 1}
                    aria-label="Move child block down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      patchChildren(children.filter((_, childIndex) => childIndex !== index))
                    }
                    aria-label="Remove child block"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-border/45 bg-background/70 p-2">
                {renderChildEditor(
                  {
                    id: child.id,
                    type: child.type,
                    content: child.content,
                    orderIndex: child.orderIndex,
                    isVisible: child.isVisible,
                  },
                  (content) => {
                    const next = [...children];
                    next[index] = { ...child, content };
                    patchChildren(next);
                  }
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onChange(nextValue);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
