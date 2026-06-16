"use client";

import { useMemo } from "react";
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
  WidgetAnimation,
  WidgetColorRole,
  WorldClockLayout,
  WorldClockStyle,
  WorldClockTimeFormat,
} from "@/types/blocks";
import { ToggleRow } from "../settings-ui";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type Clock = { label: string; timezone: string; note: string };

type WorldClockConfig = {
  accentRole: WidgetColorRole;
  accentColor: string;
  layout: WorldClockLayout;
  timeFormat: WorldClockTimeFormat;
  showDate: boolean;
  showTimezone: boolean;
  animation: WidgetAnimation;
};

const COMMON_ZONES: string[] = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Istanbul",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const WORLD_CLOCK_STYLES: Array<{ value: WorldClockStyle; label: string }> = [
  { value: "clean_cards", label: "Clean Cards" },
  { value: "timezone_board", label: "Timezone Board" },
  { value: "compact_list", label: "Compact List" },
  { value: "dark_panel", label: "Dark Panel" },
  { value: "ticket", label: "Ticket" },
  { value: "glass", label: "Glass" },
  { value: "brutalist", label: "Bold Block" },
];

const COLOR_ROLES: Array<{ value: WidgetColorRole; label: string }> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const LAYOUTS: Array<{ value: WorldClockLayout; label: string }> = [
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
  { value: "compact", label: "Compact" },
];

const TIME_FORMATS: Array<{ value: WorldClockTimeFormat; label: string }> = [
  { value: "12h", label: "12-hour" },
  { value: "24h", label: "24-hour" },
];

const ANIMATIONS: Array<{ value: WidgetAnimation; label: string }> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "glow", label: "Glow" },
  { value: "pulse", label: "Pulse" },
];

const STYLE_VALUES = WORLD_CLOCK_STYLES.map((item) => item.value);
const COLOR_ROLE_VALUES = COLOR_ROLES.map((item) => item.value);
const LAYOUT_VALUES = LAYOUTS.map((item) => item.value);
const TIME_FORMAT_VALUES = TIME_FORMATS.map((item) => item.value);
const ANIMATION_VALUES = ANIMATIONS.map((item) => item.value);

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function coerceStyle(value: unknown): WorldClockStyle {
  return STYLE_VALUES.includes(value as WorldClockStyle)
    ? (value as WorldClockStyle)
    : "clean_cards";
}

function coerceColorRole(value: unknown): WidgetColorRole {
  return COLOR_ROLE_VALUES.includes(value as WidgetColorRole)
    ? (value as WidgetColorRole)
    : "secondary";
}

function coerceLayout(value: unknown): WorldClockLayout {
  return LAYOUT_VALUES.includes(value as WorldClockLayout)
    ? (value as WorldClockLayout)
    : "grid";
}

function coerceTimeFormat(value: unknown): WorldClockTimeFormat {
  return TIME_FORMAT_VALUES.includes(value as WorldClockTimeFormat)
    ? (value as WorldClockTimeFormat)
    : "12h";
}

function coerceAnimation(value: unknown): WidgetAnimation {
  return ANIMATION_VALUES.includes(value as WidgetAnimation)
    ? (value as WidgetAnimation)
    : "style_default";
}

function readClocks(content: Record<string, unknown>): Clock[] {
  const value = content.clocks;
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return {
      label: typeof obj.label === "string" ? obj.label : "",
      timezone: typeof obj.timezone === "string" ? obj.timezone : "UTC",
      note: typeof obj.note === "string" ? obj.note : "",
    };
  });
}

function readConfig(content: Record<string, unknown>): WorldClockConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};
  return {
    accentRole: coerceColorRole(raw.accent_role),
    accentColor: normalizeHexColor(raw.accent_color),
    layout: coerceLayout(raw.layout),
    timeFormat: coerceTimeFormat(raw.time_format),
    showDate: typeof raw.show_date === "boolean" ? raw.show_date : true,
    showTimezone:
      typeof raw.show_timezone === "boolean" ? raw.show_timezone : true,
    animation: coerceAnimation(raw.animation),
  };
}

export function WorldClockBlockEditor({ block, onChange }: Props) {
  const title = readString(block.content, "title") || "World clocks";
  const subtitle = readString(block.content, "subtitle");
  const icon = readString(block.content, "icon");
  const style = coerceStyle(block.content.style);
  const config = readConfig(block.content);
  const clocks = readClocks(block.content);

  const patch = (next: Record<string, unknown>) =>
    onChange({ ...block.content, ...next });
  const patchClocks = (next: Clock[]) => patch({ clocks: next });
  const patchConfig = (next: Partial<WorldClockConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        layout: merged.layout,
        time_format: merged.timeFormat,
        show_date: merged.showDate,
        show_timezone: merged.showTimezone,
        animation: merged.animation,
      },
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= clocks.length) return;
    const next = [...clocks];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    patchClocks(next);
  };

  const tzOptions = useMemo(
    () => COMMON_ZONES.map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") })),
    []
  );

  return (
    <div className="editor-section">
      <div className="grid gap-2 sm:grid-cols-2">
        <PromptedInput
          label="Title"
          value={title}
          onChange={(v) => patch({ title: v })}
          placeholder="World clocks"
        />
        <PromptedInput
          label="Subtitle"
          value={subtitle}
          onChange={(v) => patch({ subtitle: v })}
          placeholder="Helpful times for international guests"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Clock style</Label>
          <Select value={style} onValueChange={(value) => patch({ style: coerceStyle(value) })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORLD_CLOCK_STYLES.map((option) => (
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
            ariaLabel="Select world clock icon"
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
          <Select value={config.layout} onValueChange={(value) => patchConfig({ layout: coerceLayout(value) })}>
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
          <Label>Time format</Label>
          <Select value={config.timeFormat} onValueChange={(value) => patchConfig({ timeFormat: coerceTimeFormat(value) })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_FORMATS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Animation</Label>
          <Select value={config.animation} onValueChange={(value) => patchConfig({ animation: coerceAnimation(value) })}>
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
          label="Show date"
          checked={config.showDate}
          onCheckedChange={(checked) => patchConfig({ showDate: checked })}
        />
        <ToggleRow
          label="Show timezone"
          checked={config.showTimezone}
          onCheckedChange={(checked) => patchConfig({ showTimezone: checked })}
        />
      </div>

      <div className="editor-section-header">
        <Label>Clocks</Label>
        <Button
          type="button"
          size="sm"
          className="editor-cta"
          onClick={() =>
            patchClocks([...clocks, { label: "Local", timezone: "UTC", note: "" }])
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add clock
        </Button>
      </div>

      {clocks.length === 0 ? (
        <div className="editor-empty">Add a city and timezone to start.</div>
      ) : (
        <div className="editor-list">
          {clocks.map((clock, index) => (
            <div key={`${block.id}-clk-${index}`} className="editor-list-item">
              <div className="editor-item-toolbar">
                <Button type="button" variant="ghost" size="icon-xs" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move clock up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon-xs" onClick={() => move(index, 1)} disabled={index === clocks.length - 1} aria-label="Move clock down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon-xs" onClick={() => patchClocks(clocks.filter((_, i) => i !== index))} aria-label="Remove clock" className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <PromptedInput
                  label="Label"
                  value={clock.label}
                  onChange={(v) => {
                    const next = [...clocks];
                    next[index] = { ...clock, label: v };
                    patchClocks(next);
                  }}
                  placeholder="London"
                />
                <div className="grid gap-1.5">
                  <Label>Quick timezone</Label>
                  <Select
                    value={COMMON_ZONES.includes(clock.timezone) ? clock.timezone : ""}
                    onValueChange={(v) => {
                      if (!v) return;
                      const next = [...clocks];
                      next[index] = { ...clock, timezone: v };
                      patchClocks(next);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pick common timezone" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {tzOptions.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <PromptedInput
                  label="Timezone"
                  value={clock.timezone}
                  onChange={(v) => {
                    const next = [...clocks];
                    next[index] = { ...clock, timezone: v };
                    patchClocks(next);
                  }}
                  placeholder="Asia/Karachi"
                />
                <PromptedInput
                  label="Note"
                  value={clock.note}
                  onChange={(v) => {
                    const next = [...clocks];
                    next[index] = { ...clock, note: v };
                    patchClocks(next);
                  }}
                  placeholder="Host time"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
