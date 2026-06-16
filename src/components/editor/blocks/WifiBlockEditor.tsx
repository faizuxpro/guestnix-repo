"use client";

import { Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
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
  WidgetQrSize,
  WifiLayout,
  WifiPasswordDisplay,
  WifiStyle,
} from "@/types/blocks";
import { ToggleRow } from "../settings-ui";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput, PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type WifiConfig = {
  accentRole: WidgetColorRole;
  accentColor: string;
  qrSize: WidgetQrSize;
  layout: WifiLayout;
  passwordDisplay: WifiPasswordDisplay;
  animation: WidgetAnimation;
};

const WIFI_STYLES: Array<{ value: WifiStyle; label: string }> = [
  { value: "brand_card", label: "Brand Card" },
  { value: "light_card", label: "Light Card" },
  { value: "split_qr", label: "Split QR" },
  { value: "ticket", label: "Ticket" },
  { value: "minimal", label: "Minimal" },
  { value: "terminal", label: "Terminal" },
  { value: "glass", label: "Glass" },
  { value: "brutalist", label: "Bold Block" },
];

const WIFI_STYLE_VALUES = WIFI_STYLES.map((style) => style.value);

const WIFI_COLOR_ROLES: Array<{ value: WidgetColorRole; label: string }> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const WIFI_COLOR_ROLE_VALUES = WIFI_COLOR_ROLES.map((role) => role.value);

const WIFI_QR_SIZES: Array<{ value: WidgetQrSize; label: string }> = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const WIFI_QR_SIZE_VALUES = WIFI_QR_SIZES.map((size) => size.value);

const WIFI_LAYOUTS: Array<{ value: WifiLayout; label: string }> = [
  { value: "stacked", label: "Stacked" },
  { value: "split", label: "Split" },
  { value: "compact", label: "Compact" },
];

const WIFI_LAYOUT_VALUES = WIFI_LAYOUTS.map((layout) => layout.value);

const WIFI_PASSWORD_DISPLAYS: Array<{
  value: WifiPasswordDisplay;
  label: string;
}> = [
  { value: "plain", label: "Plain text" },
  { value: "code", label: "Code style" },
  { value: "hidden", label: "Hidden until copied" },
];

const WIFI_PASSWORD_DISPLAY_VALUES = WIFI_PASSWORD_DISPLAYS.map(
  (display) => display.value
);

const WIFI_ANIMATIONS: Array<{ value: WidgetAnimation; label: string }> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "glow", label: "Glow" },
  { value: "pulse", label: "Pulse" },
];

const WIFI_ANIMATION_VALUES = WIFI_ANIMATIONS.map(
  (animation) => animation.value
);

function readString(
  content: Record<string, unknown>,
  key: string,
  fallbackKey?: string
) {
  const value = content[key];
  if (typeof value === "string") return value;
  if (fallbackKey) {
    const fallback = content[fallbackKey];
    if (typeof fallback === "string") return fallback;
  }
  return "";
}

function readShowQr(content: Record<string, unknown>) {
  const canonical = content.show_qr;
  if (typeof canonical === "boolean") return canonical;
  const legacy = content.showQr;
  if (typeof legacy === "boolean") return legacy;
  return true;
}

function coerceWifiStyle(value: unknown): WifiStyle {
  if (WIFI_STYLE_VALUES.includes(value as WifiStyle)) {
    return value as WifiStyle;
  }
  return "brand_card";
}

function coerceWifiColorRole(value: unknown): WidgetColorRole {
  if (WIFI_COLOR_ROLE_VALUES.includes(value as WidgetColorRole)) {
    return value as WidgetColorRole;
  }
  return "accent";
}

function coerceQrSize(value: unknown): WidgetQrSize {
  if (WIFI_QR_SIZE_VALUES.includes(value as WidgetQrSize)) {
    return value as WidgetQrSize;
  }
  return "medium";
}

function coerceWifiLayout(value: unknown): WifiLayout {
  if (WIFI_LAYOUT_VALUES.includes(value as WifiLayout)) {
    return value as WifiLayout;
  }
  return "stacked";
}

function coercePasswordDisplay(value: unknown): WifiPasswordDisplay {
  if (WIFI_PASSWORD_DISPLAY_VALUES.includes(value as WifiPasswordDisplay)) {
    return value as WifiPasswordDisplay;
  }
  return "code";
}

function coerceWifiAnimation(value: unknown): WidgetAnimation {
  if (WIFI_ANIMATION_VALUES.includes(value as WidgetAnimation)) {
    return value as WidgetAnimation;
  }
  return "style_default";
}

function readConfig(content: Record<string, unknown>): WifiConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};

  return {
    accentRole: coerceWifiColorRole(raw.accent_role),
    accentColor: normalizeHexColor(raw.accent_color),
    qrSize: coerceQrSize(raw.qr_size),
    layout: coerceWifiLayout(raw.layout),
    passwordDisplay: coercePasswordDisplay(raw.password_display),
    animation: coerceWifiAnimation(raw.animation),
  };
}

function wifiQrValue(ssid: string, password: string) {
  return `WIFI:T:WPA;S:${ssid};P:${password};;`;
}

const QR_PREVIEW_SIZE: Record<WidgetQrSize, number> = {
  small: 112,
  medium: 140,
  large: 168,
};

export function WifiBlockEditor({ block, onChange }: Props) {
  const networkName = readString(block.content, "network_name", "networkName");
  const password = readString(block.content, "password");
  const notes = readString(block.content, "notes", "note");
  const showQr = readShowQr(block.content);
  const title = readString(block.content, "title") || "Stay connected";
  const eyebrow = readString(block.content, "eyebrow") || "Wi-Fi Access";
  const icon = readString(block.content, "icon");
  const style = coerceWifiStyle(block.content.style);
  const config = readConfig(block.content);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchConfig = (next: Partial<WifiConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        qr_size: merged.qrSize,
        layout: merged.layout,
        password_display: merged.passwordDisplay,
        animation: merged.animation,
      },
    });
  };

  return (
    <div className="editor-section">
      <div className="grid gap-2 sm:grid-cols-2">
        <PromptedInput
          label="Eyebrow"
          value={eyebrow}
          onChange={(v) => patch({ eyebrow: v })}
          placeholder="Wi-Fi Access"
        />
        <PromptedInput
          label="Title"
          value={title}
          onChange={(v) => patch({ title: v })}
          placeholder="Stay connected"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Card Style</Label>
          <Select
            value={style}
            onValueChange={(value) => patch({ style: coerceWifiStyle(value) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WIFI_STYLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Icon</Label>
          <IconifyPicker
            value={icon}
            onChange={(v) => patch({ icon: v })}
            ariaLabel="Select Wi-Fi icon"
            triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
            iconClassName="text-base"
          />
        </div>
      </div>

      <BlockColorControls
        label="Accent Color"
        role={config.accentRole}
        customColor={config.accentColor}
        options={WIFI_COLOR_ROLES}
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
              patchConfig({ layout: coerceWifiLayout(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WIFI_LAYOUTS.map((option) => (
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
              patchConfig({ animation: coerceWifiAnimation(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WIFI_ANIMATIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PromptedInput
        label="Network name"
        value={networkName}
        onChange={(v) => patch({ network_name: v })}
        placeholder="e.g. Guest WiFi"
      />

      <PromptedInput
        label="Password"
        value={password}
        onChange={(v) => patch({ password: v })}
        placeholder="WiFi password"
        trailing={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Copy password"
            onClick={async () => {
              if (!password) {
                toast.error("No password to copy");
                return;
              }
              try {
                await navigator.clipboard.writeText(password);
                toast.success("Password copied");
              } catch {
                toast.error("Copy failed");
              }
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Password display</Label>
          <Select
            value={config.passwordDisplay}
            onValueChange={(value) =>
              patchConfig({ passwordDisplay: coercePasswordDisplay(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WIFI_PASSWORD_DISPLAYS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>QR size</Label>
          <Select
            value={config.qrSize}
            onValueChange={(value) =>
              patchConfig({ qrSize: coerceQrSize(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WIFI_QR_SIZES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PromptedTextarea
        label="Notes"
        value={notes}
        onChange={(v) => patch({ notes: v })}
        placeholder="Optional connection notes for guests"
      />

      <ToggleRow
        label="Show QR code"
        checked={showQr}
        onCheckedChange={(checked) => patch({ show_qr: checked })}
      />

      {showQr && networkName && password ? (
        <div className="block-editor-preview p-3">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <QrCode className="h-4 w-4" />
            Guests can scan this QR code to connect
          </div>
          <div className="inline-flex rounded-md bg-white p-2">
            <QRCodeSVG
              value={wifiQrValue(networkName, password)}
              size={QR_PREVIEW_SIZE[config.qrSize]}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
