"use client";

import {
  ACCENT_PRESETS,
  ColorPicker,
  PRIMARY_PRESETS,
  SECONDARY_PRESETS,
} from "@/components/editor/featured/controls/ColorPicker";
import {
  DEFAULTS,
  useBranding,
  type BrandingShape,
} from "@/components/editor/design/_branding";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  colorRoleFallbackHex,
  normalizeHexColor,
} from "@/lib/block-colors";

type ColorOption<Role extends string> = {
  value: Role;
  label: string;
};

type Props<Role extends string> = {
  label: string;
  role: Role;
  customColor?: string;
  options: Array<ColorOption<Role>>;
  onChange: (selection: { role: Role; customColor: string }) => void;
};

const CUSTOM_COLOR_VALUE = "__custom_color__";

export function BlockColorControls<Role extends string>({
  label,
  role,
  customColor,
  options,
  onChange,
}: Props<Role>) {
  const { branding } = useBranding();
  const normalizedCustom = normalizeHexColor(customColor);
  const roleColor = roleDisplayColor(role, branding);
  const selectValue = normalizedCustom ? CUSTOM_COLOR_VALUE : role;
  const pickerValue = normalizedCustom || roleColor;

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="grid gap-2">
        <Select
          value={selectValue}
          onValueChange={(value) => {
            if (value === CUSTOM_COLOR_VALUE) {
              onChange({ role, customColor: pickerValue });
              return;
            }
            onChange({ role: value as Role, customColor: "" });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full border border-border/70"
                    style={{ background: roleDisplayColor(option.value, branding) }}
                  />
                  <span className="truncate">{option.label}</span>
                </span>
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_COLOR_VALUE}>
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 rounded-full border border-border/70"
                  style={{ background: pickerValue }}
                />
                <span className="truncate">Custom color</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {normalizedCustom ? (
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-background/75 px-2.5 py-2">
            <div className="shrink-0">
              <ColorPicker
                value={pickerValue}
                onChange={(color) =>
                  onChange({ role, customColor: normalizeHexColor(color) })
                }
                presets={presetsForRole(role)}
                compact
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
                Custom color
              </p>
              <p className="mt-0.5 truncate font-mono text-[10.5px] uppercase leading-tight text-muted-foreground">
                {pickerValue}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function presetsForRole(role: string) {
  switch (role) {
    case "primary":
    case "ink":
      return PRIMARY_PRESETS;
    case "accent":
    case "border":
      return ACCENT_PRESETS;
    case "secondary":
    case "muted":
    default:
      return SECONDARY_PRESETS;
  }
}

function brandColor(
  branding: BrandingShape,
  key: "primary_color" | "secondary_color" | "accent_color",
  fallback: string
) {
  return normalizeHexColor(branding[key]) || fallback;
}

function roleDisplayColor(role: string, branding: BrandingShape) {
  switch (role) {
    case "primary":
      return brandColor(branding, "primary_color", DEFAULTS.primary_color);
    case "secondary":
      return brandColor(branding, "secondary_color", DEFAULTS.secondary_color);
    case "accent":
      return brandColor(branding, "accent_color", DEFAULTS.accent_color);
    case "ink":
      return "#0A2321";
    case "muted":
      return "#7D8A88";
    case "border":
      return colorRoleFallbackHex("border");
    default:
      return colorRoleFallbackHex(role);
  }
}
