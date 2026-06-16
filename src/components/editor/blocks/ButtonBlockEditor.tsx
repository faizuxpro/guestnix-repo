"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import { normalizeHexColor } from "@/lib/block-colors";
import type { EditorBlock } from "@/stores/editor-store";
import type {
  ButtonAlign,
  ButtonAnimation,
  ButtonIconPosition,
  ButtonSize,
  ButtonStyle,
  ButtonWidth,
  WidgetColorRole,
} from "@/types/blocks";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type ButtonAction = "url" | "phone" | "email";

type ButtonConfig = {
  accentRole: WidgetColorRole;
  accentColor: string;
  size: ButtonSize;
  width: ButtonWidth;
  align: ButtonAlign;
  iconPosition: ButtonIconPosition;
  animation: ButtonAnimation;
};

const BUTTON_STYLES: Array<{ value: ButtonStyle; label: string }> = [
  { value: "primary", label: "Primary Filled" },
  { value: "outline", label: "Outline" },
  { value: "ghost", label: "Ghost" },
  { value: "soft", label: "Soft Fill" },
  { value: "gradient", label: "Gradient" },
  { value: "pill", label: "Pill" },
  { value: "split", label: "Split Icon" },
  { value: "underline", label: "Underline Link" },
  { value: "card", label: "Card CTA" },
  { value: "brutalist", label: "Bold Block" },
];

const BUTTON_STYLE_VALUES = BUTTON_STYLES.map((style) => style.value);

const BUTTON_COLOR_ROLES: Array<{ value: WidgetColorRole; label: string }> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const BUTTON_COLOR_ROLE_VALUES = BUTTON_COLOR_ROLES.map((role) => role.value);

const BUTTON_SIZES: Array<{ value: ButtonSize; label: string }> = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const BUTTON_WIDTHS: Array<{ value: ButtonWidth; label: string }> = [
  { value: "auto", label: "Fit label" },
  { value: "full", label: "Full width" },
];

const BUTTON_ALIGNS: Array<{ value: ButtonAlign; label: string }> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const BUTTON_ICON_POSITIONS: Array<{
  value: ButtonIconPosition;
  label: string;
}> = [
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const BUTTON_ANIMATIONS: Array<{ value: ButtonAnimation; label: string }> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "pulse", label: "Pulse" },
  { value: "glow", label: "Glow" },
  { value: "slide", label: "Slide" },
];

const BUTTON_SIZE_VALUES = BUTTON_SIZES.map((size) => size.value);
const BUTTON_WIDTH_VALUES = BUTTON_WIDTHS.map((width) => width.value);
const BUTTON_ALIGN_VALUES = BUTTON_ALIGNS.map((align) => align.value);
const BUTTON_ICON_POSITION_VALUES = BUTTON_ICON_POSITIONS.map(
  (position) => position.value
);
const BUTTON_ANIMATION_VALUES = BUTTON_ANIMATIONS.map(
  (animation) => animation.value
);

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readAction(content: Record<string, unknown>): ButtonAction {
  const value = content.action;
  if (value === "phone" || value === "email") return value;
  return "url";
}

function coerceButtonStyle(value: unknown): ButtonStyle {
  if (BUTTON_STYLE_VALUES.includes(value as ButtonStyle)) {
    return value as ButtonStyle;
  }
  return "primary";
}

function coerceButtonColorRole(value: unknown): WidgetColorRole {
  if (BUTTON_COLOR_ROLE_VALUES.includes(value as WidgetColorRole)) {
    return value as WidgetColorRole;
  }
  return "primary";
}

function coerceButtonSize(value: unknown): ButtonSize {
  if (BUTTON_SIZE_VALUES.includes(value as ButtonSize)) {
    return value as ButtonSize;
  }
  return "medium";
}

function coerceButtonWidth(value: unknown): ButtonWidth {
  if (BUTTON_WIDTH_VALUES.includes(value as ButtonWidth)) {
    return value as ButtonWidth;
  }
  return "auto";
}

function coerceButtonAlign(value: unknown): ButtonAlign {
  if (BUTTON_ALIGN_VALUES.includes(value as ButtonAlign)) {
    return value as ButtonAlign;
  }
  return "left";
}

function coerceButtonIconPosition(value: unknown): ButtonIconPosition {
  if (BUTTON_ICON_POSITION_VALUES.includes(value as ButtonIconPosition)) {
    return value as ButtonIconPosition;
  }
  return "left";
}

function coerceButtonAnimation(value: unknown): ButtonAnimation {
  if (BUTTON_ANIMATION_VALUES.includes(value as ButtonAnimation)) {
    return value as ButtonAnimation;
  }
  return "style_default";
}

function readConfig(content: Record<string, unknown>): ButtonConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};

  return {
    accentRole: coerceButtonColorRole(raw.accent_role),
    accentColor: normalizeHexColor(raw.accent_color),
    size: coerceButtonSize(raw.size),
    width: coerceButtonWidth(raw.width),
    align: coerceButtonAlign(raw.align),
    iconPosition: coerceButtonIconPosition(raw.icon_position),
    animation: coerceButtonAnimation(raw.animation),
  };
}

const ACTION_PLACEHOLDER: Record<ButtonAction, string> = {
  url: "https://example.com",
  phone: "+1 555 123 4567",
  email: "host@example.com",
};

export function ButtonBlockEditor({ block, onChange }: Props) {
  const label = readString(block.content, "label");
  const action = readAction(block.content);
  const value = readString(block.content, "value");
  const style = coerceButtonStyle(block.content.style);
  const icon = readString(block.content, "icon");
  const config = readConfig(block.content);

  const placeholder = useMemo(() => ACTION_PLACEHOLDER[action], [action]);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchConfig = (next: Partial<ButtonConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        size: merged.size,
        width: merged.width,
        align: merged.align,
        icon_position: merged.iconPosition,
        animation: merged.animation,
      },
    });
  };

  return (
    <div className="editor-section">
      <PromptedInput
        label="Button label"
        value={label}
        onChange={(v) => patch({ label: v })}
        placeholder="Tap me"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Action</Label>
          <Select
            value={action}
            onValueChange={(v) =>
              patch({
                action: v === "phone" || v === "email" ? v : "url",
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="url">Open URL</SelectItem>
              <SelectItem value="phone">Call phone</SelectItem>
              <SelectItem value="email">Send email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Button Style</Label>
          <Select
            value={style}
            onValueChange={(v) => patch({ style: coerceButtonStyle(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_STYLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PromptedInput
        label={
          action === "phone"
            ? "Phone number"
            : action === "email"
              ? "Email address"
              : "URL"
        }
        value={value}
        onChange={(v) => patch({ value: v })}
        placeholder={placeholder}
        type={action === "email" ? "email" : action === "phone" ? "tel" : "url"}
        inputMode={action === "url" ? "url" : undefined}
      />

      <div className="grid gap-1.5">
        <Label>Icon</Label>
        <IconifyPicker
          value={icon}
          onChange={(v) => patch({ icon: v })}
          ariaLabel="Select button icon"
          triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
          iconClassName="text-base"
        />
      </div>

      <BlockColorControls
        label="Button Color"
        role={config.accentRole}
        customColor={config.accentColor}
        options={BUTTON_COLOR_ROLES}
        onChange={({ role, customColor }) =>
          patchConfig({ accentRole: role, accentColor: customColor })
        }
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Size</Label>
          <Select
            value={config.size}
            onValueChange={(value) =>
              patchConfig({ size: coerceButtonSize(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_SIZES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Width</Label>
          <Select
            value={config.width}
            onValueChange={(value) =>
              patchConfig({ width: coerceButtonWidth(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_WIDTHS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>Align</Label>
          <Select
            value={config.align}
            onValueChange={(value) =>
              patchConfig({ align: coerceButtonAlign(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_ALIGNS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Icon side</Label>
          <Select
            value={config.iconPosition}
            onValueChange={(value) =>
              patchConfig({
                iconPosition: coerceButtonIconPosition(value),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_ICON_POSITIONS.map((option) => (
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
              patchConfig({ animation: coerceButtonAnimation(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_ANIMATIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
