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
import { normalizeHexColor } from "@/lib/block-colors";
import type { EditorBlock } from "@/stores/editor-store";
import type {
  SmartLockAccessItem,
  SmartLockAccessType,
  SmartLockCodeDisplay,
  SmartLockLayout,
  SmartLockStyle,
  WidgetAnimation,
  WidgetColorRole,
} from "@/types/blocks";
import { ToggleRow } from "../settings-ui";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput, PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type SmartLockConfig = {
  accentRole: WidgetColorRole;
  accentColor: string;
  layout: SmartLockLayout;
  codeDisplay: SmartLockCodeDisplay;
  showCopy: boolean;
  animation: WidgetAnimation;
};

const SMART_LOCK_STYLES: Array<{ value: SmartLockStyle; label: string }> = [
  { value: "secure_card", label: "Secure Card" },
  { value: "access_stack", label: "Access Stack" },
  { value: "split_panel", label: "Split Panel" },
  { value: "minimal", label: "Minimal" },
  { value: "dark_panel", label: "Dark Panel" },
  { value: "ticket", label: "Ticket" },
  { value: "brutalist", label: "Bold Block" },
];

const ACCESS_TYPES: Array<{ value: SmartLockAccessType; label: string }> = [
  { value: "door", label: "Door" },
  { value: "gate", label: "Gate" },
  { value: "garage", label: "Garage" },
  { value: "lockbox", label: "Lockbox" },
  { value: "alarm", label: "Alarm" },
  { value: "wifi", label: "Wi-Fi" },
  { value: "other", label: "Other" },
];

const COLOR_ROLES: Array<{ value: WidgetColorRole; label: string }> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const LAYOUTS: Array<{ value: SmartLockLayout; label: string }> = [
  { value: "stacked", label: "Stacked" },
  { value: "grid", label: "Grid" },
  { value: "compact", label: "Compact" },
];

const CODE_DISPLAYS: Array<{ value: SmartLockCodeDisplay; label: string }> = [
  { value: "large_code", label: "Large code" },
  { value: "masked", label: "Masked" },
  { value: "chips", label: "Code chips" },
];

const ANIMATIONS: Array<{ value: WidgetAnimation; label: string }> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "glow", label: "Glow" },
  { value: "pulse", label: "Pulse" },
];

const STYLE_VALUES = SMART_LOCK_STYLES.map((item) => item.value);
const ACCESS_TYPE_VALUES = ACCESS_TYPES.map((item) => item.value);
const COLOR_ROLE_VALUES = COLOR_ROLES.map((item) => item.value);
const LAYOUT_VALUES = LAYOUTS.map((item) => item.value);
const CODE_DISPLAY_VALUES = CODE_DISPLAYS.map((item) => item.value);
const ANIMATION_VALUES = ANIMATIONS.map((item) => item.value);

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function coerceSmartLockStyle(value: unknown): SmartLockStyle {
  return STYLE_VALUES.includes(value as SmartLockStyle)
    ? (value as SmartLockStyle)
    : "secure_card";
}

function coerceAccessType(value: unknown): SmartLockAccessType {
  return ACCESS_TYPE_VALUES.includes(value as SmartLockAccessType)
    ? (value as SmartLockAccessType)
    : "door";
}

function coerceColorRole(value: unknown): WidgetColorRole {
  return COLOR_ROLE_VALUES.includes(value as WidgetColorRole)
    ? (value as WidgetColorRole)
    : "primary";
}

function coerceLayout(value: unknown): SmartLockLayout {
  return LAYOUT_VALUES.includes(value as SmartLockLayout)
    ? (value as SmartLockLayout)
    : "stacked";
}

function coerceCodeDisplay(value: unknown): SmartLockCodeDisplay {
  return CODE_DISPLAY_VALUES.includes(value as SmartLockCodeDisplay)
    ? (value as SmartLockCodeDisplay)
    : "large_code";
}

function coerceAnimation(value: unknown): WidgetAnimation {
  return ANIMATION_VALUES.includes(value as WidgetAnimation)
    ? (value as WidgetAnimation)
    : "style_default";
}

function readItems(content: Record<string, unknown>): SmartLockAccessItem[] {
  const raw = content.items;
  if (Array.isArray(raw)) {
    return raw
      .map((item): SmartLockAccessItem | null => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        return {
          type: coerceAccessType(row.type),
          label: typeof row.label === "string" ? row.label : "",
          code: typeof row.code === "string" ? row.code : "",
          reveal_at:
            typeof row.reveal_at === "string" ? row.reveal_at : null,
          instructions:
            typeof row.instructions === "string" ? row.instructions : "",
          icon: typeof row.icon === "string" ? row.icon : "",
        };
      })
      .filter((item): item is SmartLockAccessItem => Boolean(item));
  }

  const code = readString(content, "code");
  const label = readString(content, "title") || "Front door";
  const instructions = readString(content, "instructions");
  const revealAt =
    typeof content.reveal_at === "string" ? content.reveal_at : null;
  return code || instructions
    ? [{ type: "door", label, code, reveal_at: revealAt, instructions, icon: "" }]
    : [];
}

function readConfig(content: Record<string, unknown>): SmartLockConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};
  return {
    accentRole: coerceColorRole(raw.accent_role),
    accentColor: normalizeHexColor(raw.accent_color),
    layout: coerceLayout(raw.layout),
    codeDisplay: coerceCodeDisplay(raw.code_display),
    showCopy: typeof raw.show_copy === "boolean" ? raw.show_copy : true,
    animation: coerceAnimation(raw.animation),
  };
}

export function SmartLockBlockEditor({ block, onChange }: Props) {
  const title = readString(block.content, "title") || "Access details";
  const subtitle = readString(block.content, "subtitle");
  const icon = readString(block.content, "icon");
  const style = coerceSmartLockStyle(block.content.style);
  const config = readConfig(block.content);
  const items = readItems(block.content);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchItems = (next: SmartLockAccessItem[]) => {
    const primary = next[0];
    patch({
      items: next,
      code: primary?.code ?? "",
      reveal_at: primary?.reveal_at ?? null,
      instructions: primary?.instructions ?? "",
    });
  };

  const patchConfig = (next: Partial<SmartLockConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        layout: merged.layout,
        code_display: merged.codeDisplay,
        show_copy: merged.showCopy,
        animation: merged.animation,
      },
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    patchItems(next);
  };

  return (
    <div className="editor-section">
      <div className="grid gap-2 sm:grid-cols-2">
        <PromptedInput
          label="Title"
          value={title}
          onChange={(v) => patch({ title: v })}
          placeholder="Access details"
        />
        <PromptedInput
          label="Subtitle"
          value={subtitle}
          onChange={(v) => patch({ subtitle: v })}
          placeholder="Door, gate, lockbox, and alarm codes"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Block style</Label>
          <Select
            value={style}
            onValueChange={(value) =>
              patch({ style: coerceSmartLockStyle(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SMART_LOCK_STYLES.map((option) => (
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
            onChange={(v) => patch({ icon: v })}
            ariaLabel="Select smart lock icon"
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
        <div className="grid gap-1.5">
          <Label>Layout</Label>
          <Select
            value={config.layout}
            onValueChange={(value) => patchConfig({ layout: coerceLayout(value) })}
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
        <div className="grid gap-1.5">
          <Label>Code display</Label>
          <Select
            value={config.codeDisplay}
            onValueChange={(value) =>
              patchConfig({ codeDisplay: coerceCodeDisplay(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CODE_DISPLAYS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>

      <div className="rounded-md border border-border/60 px-3 py-1">
        <ToggleRow
          label="Show copy buttons"
          checked={config.showCopy}
          onCheckedChange={(checked) => patchConfig({ showCopy: checked })}
        />
      </div>

      <div className="editor-section-header">
        <Label>Access items</Label>
        <Button
          type="button"
          size="sm"
          className="editor-cta"
          onClick={() =>
            patchItems([
              ...items,
              {
                type: "door",
                label: "Access item",
                code: "",
                reveal_at: null,
                instructions: "",
                icon: "",
              },
            ])
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="editor-empty">
          Add door, gate, garage, alarm, or lockbox access details.
        </div>
      ) : (
        <div className="editor-list">
          {items.map((item, index) => (
            <div key={`${block.id}-access-${index}`} className="editor-list-item">
              <div className="editor-item-toolbar editor-item-toolbar--split">
                <IconifyPicker
                  value={item.icon ?? ""}
                  onChange={(iconValue) => {
                    const next = [...items];
                    next[index] = { ...item, icon: iconValue };
                    patchItems(next);
                  }}
                  ariaLabel="Select access item icon"
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
                    aria-label="Move item up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move item down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      patchItems(items.filter((_, itemIndex) => itemIndex !== index))
                    }
                    aria-label="Remove item"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Type</Label>
                  <Select
                    value={item.type ?? "door"}
                    onValueChange={(value) => {
                      const next = [...items];
                      next[index] = {
                        ...item,
                        type: coerceAccessType(value),
                      };
                      patchItems(next);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCESS_TYPES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <PromptedInput
                  label="Label"
                  value={item.label}
                  onChange={(value) => {
                    const next = [...items];
                    next[index] = { ...item, label: value };
                    patchItems(next);
                  }}
                  placeholder="Front door"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <PromptedInput
                  label="Code"
                  value={item.code}
                  onChange={(value) => {
                    const next = [...items];
                    next[index] = { ...item, code: value };
                    patchItems(next);
                  }}
                  placeholder="{{door_code}}"
                />
                <PromptedInput
                  label="Reveal at"
                  value={item.reveal_at ?? ""}
                  onChange={(value) => {
                    const next = [...items];
                    next[index] = { ...item, reveal_at: value || null };
                    patchItems(next);
                  }}
                  placeholder="{{access_reveal_time}}"
                />
              </div>

              <PromptedTextarea
                label="Instructions"
                value={item.instructions ?? ""}
                onChange={(value) => {
                  const next = [...items];
                  next[index] = { ...item, instructions: value };
                  patchItems(next);
                }}
                placeholder="Press the # key after the code to unlock."
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
