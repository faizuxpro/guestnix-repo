"use client";

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
  BookingLinkLayout,
  BookingLinkStyle,
  WidgetAnimation,
  WidgetColorRole,
} from "@/types/blocks";
import { ToggleRow } from "../settings-ui";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type Platform = "airbnb" | "vrbo" | "booking" | "direct" | "other";
type BookingAccentRole = WidgetColorRole | "platform";

type BookingLinkConfig = {
  accentRole: BookingAccentRole;
  accentColor: string;
  layout: BookingLinkLayout;
  showPlatform: boolean;
  showIcon: boolean;
  animation: WidgetAnimation;
};

const BOOKING_LINK_STYLES: Array<{ value: BookingLinkStyle; label: string }> = [
  { value: "clean_card", label: "Clean Card" },
  { value: "brand_banner", label: "Brand Banner" },
  { value: "split_panel", label: "Split Panel" },
  { value: "minimal_row", label: "Minimal Row" },
  { value: "ticket", label: "Ticket" },
  { value: "glass", label: "Glass" },
  { value: "brutalist", label: "Bold Block" },
];

const BOOKING_LINK_STYLE_VALUES = BOOKING_LINK_STYLES.map(
  (style) => style.value
);

const BOOKING_ACCENT_ROLES: Array<{
  value: BookingAccentRole;
  label: string;
}> = [
  { value: "platform", label: "Platform color" },
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const BOOKING_ACCENT_ROLE_VALUES = BOOKING_ACCENT_ROLES.map(
  (role) => role.value
);

const BOOKING_LINK_LAYOUTS: Array<{
  value: BookingLinkLayout;
  label: string;
}> = [
  { value: "horizontal", label: "Horizontal" },
  { value: "stacked", label: "Stacked" },
  { value: "compact", label: "Compact" },
];

const BOOKING_LINK_LAYOUT_VALUES = BOOKING_LINK_LAYOUTS.map(
  (layout) => layout.value
);

const BOOKING_LINK_ANIMATIONS: Array<{
  value: WidgetAnimation;
  label: string;
}> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "glow", label: "Glow" },
  { value: "pulse", label: "Pulse" },
];

const BOOKING_LINK_ANIMATION_VALUES = BOOKING_LINK_ANIMATIONS.map(
  (animation) => animation.value
);

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readPlatform(content: Record<string, unknown>): Platform {
  const value = content.platform;
  if (
    value === "airbnb" ||
    value === "vrbo" ||
    value === "booking" ||
    value === "direct" ||
    value === "other"
  ) {
    return value;
  }
  return "direct";
}

function coerceBookingLinkStyle(value: unknown): BookingLinkStyle {
  if (BOOKING_LINK_STYLE_VALUES.includes(value as BookingLinkStyle)) {
    return value as BookingLinkStyle;
  }
  return "clean_card";
}

function coerceBookingAccentRole(value: unknown): BookingAccentRole {
  if (BOOKING_ACCENT_ROLE_VALUES.includes(value as BookingAccentRole)) {
    return value as BookingAccentRole;
  }
  return "platform";
}

function coerceBookingLayout(value: unknown): BookingLinkLayout {
  if (BOOKING_LINK_LAYOUT_VALUES.includes(value as BookingLinkLayout)) {
    return value as BookingLinkLayout;
  }
  return "horizontal";
}

function coerceBookingAnimation(value: unknown): WidgetAnimation {
  if (BOOKING_LINK_ANIMATION_VALUES.includes(value as WidgetAnimation)) {
    return value as WidgetAnimation;
  }
  return "style_default";
}

function readConfig(content: Record<string, unknown>): BookingLinkConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};

  return {
    accentRole: coerceBookingAccentRole(raw.accent_role),
    accentColor: normalizeHexColor(raw.accent_color),
    layout: coerceBookingLayout(raw.layout),
    showPlatform:
      typeof raw.show_platform === "boolean" ? raw.show_platform : true,
    showIcon: typeof raw.show_icon === "boolean" ? raw.show_icon : true,
    animation: coerceBookingAnimation(raw.animation),
  };
}

export function BookingLinkBlockEditor({ block, onChange }: Props) {
  const label = readString(block.content, "label");
  const url = readString(block.content, "url");
  const platform = readPlatform(block.content);
  const subtitle = readString(block.content, "subtitle");
  const style = coerceBookingLinkStyle(block.content.style);
  const icon = readString(block.content, "icon");
  const config = readConfig(block.content);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchConfig = (next: Partial<BookingLinkConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        layout: merged.layout,
        show_platform: merged.showPlatform,
        show_icon: merged.showIcon,
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
        placeholder="Book your next stay"
      />

      <PromptedInput
        label="URL"
        value={url}
        onChange={(v) => patch({ url: v })}
        placeholder="https://airbnb.com/rooms/12345"
        type="url"
        inputMode="url"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Platform</Label>
          <Select
            value={platform}
            onValueChange={(v) =>
              patch({
                platform:
                  v === "airbnb" ||
                  v === "vrbo" ||
                  v === "booking" ||
                  v === "other"
                    ? v
                    : "direct",
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="airbnb">Airbnb</SelectItem>
              <SelectItem value="vrbo">Vrbo</SelectItem>
              <SelectItem value="booking">Booking.com</SelectItem>
              <SelectItem value="direct">Direct (your site)</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Card Style</Label>
          <Select
            value={style}
            onValueChange={(value) =>
              patch({ style: coerceBookingLinkStyle(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOKING_LINK_STYLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PromptedInput
        label="Subtitle"
        value={subtitle}
        onChange={(v) => patch({ subtitle: v })}
        placeholder="Loved your stay? Come back soon."
      />

      <div className="grid gap-1.5">
        <Label>Icon</Label>
        <IconifyPicker
          value={icon}
          onChange={(v) => patch({ icon: v })}
          ariaLabel="Select booking link icon"
          triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
          iconClassName="text-base"
        />
      </div>

      <BlockColorControls
        label="Accent Color"
        role={config.accentRole}
        customColor={config.accentColor}
        options={BOOKING_ACCENT_ROLES}
        onChange={({ role, customColor }) =>
          patchConfig({ accentRole: role, accentColor: customColor })
        }
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Layout</Label>
          <Select
            value={config.layout}
            onValueChange={(value) =>
              patchConfig({ layout: coerceBookingLayout(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOKING_LINK_LAYOUTS.map((option) => (
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
              patchConfig({ animation: coerceBookingAnimation(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOKING_LINK_ANIMATIONS.map((option) => (
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
          label="Show platform label"
          checked={config.showPlatform}
          onCheckedChange={(checked) => patchConfig({ showPlatform: checked })}
        />
        <ToggleRow
          label="Show icon"
          checked={config.showIcon}
          onCheckedChange={(checked) => patchConfig({ showIcon: checked })}
        />
      </div>
    </div>
  );
}
