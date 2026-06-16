"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "@/components/editor/featured/ImageUploadField";
import { ColorPicker } from "@/components/editor/featured/controls/ColorPicker";
import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import { GuidebookLoadingScreen } from "@/components/guidebook/GuidebookLoadingScreen";
import {
  GUIDEBOOK_LOADER_SETTINGS_KEY,
  normalizeGuidebookLoaderSettings,
  type GuidebookLoaderSettings,
  type GuidebookLoaderVariant,
} from "@/lib/guidebook-loader-settings";
import { useEditorStore } from "@/stores/editor-store";
import {
  EditorPanelShell,
  EditorSection,
  SelectRow,
  SettingGroup,
  SettingRow,
  ToggleRow,
} from "@/components/editor/settings-ui";

const VARIANT_OPTIONS: Array<{ value: GuidebookLoaderVariant; label: string }> = [
  { value: "sunset", label: "Book 1" },
  { value: "spinner", label: "Spinner" },
  { value: "dots", label: "Dots" },
  { value: "custom", label: "GIF / SVG file" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function LoaderPanel() {
  const settings = useEditorStore((s) => s.guidebookSettings);
  const branding = useEditorStore((s) => s.branding);
  const guidebook = useEditorStore((s) => s.guidebook);
  const updateGuidebookSettings = useEditorStore((s) => s.updateGuidebookSettings);
  const rawLoader = isRecord(settings?.[GUIDEBOOK_LOADER_SETTINGS_KEY])
    ? (settings[GUIDEBOOK_LOADER_SETTINGS_KEY] as Record<string, unknown>)
    : {};

  const propertyTitle =
    guidebook?.heroData.property.name?.trim() ||
    guidebook?.title ||
    "Welcome";
  const propertyLogoUrl = guidebook?.heroData.property.logo_url ?? null;
  const current = normalizeGuidebookLoaderSettings(settings, branding, {
    title: propertyTitle,
    subtitle: "Preparing your guidebook",
    logoUrl: propertyLogoUrl,
  });
  const showLoaderColor =
    current.variant === "sunset" ||
    current.variant === "spinner" ||
    current.variant === "dots";

  const updateLoader = (patch: Partial<GuidebookLoaderSettings>) => {
    updateGuidebookSettings({
      [GUIDEBOOK_LOADER_SETTINGS_KEY]: {
        ...rawLoader,
        ...patch,
      },
    });
  };

  const resetToBrand = () => {
    updateGuidebookSettings({
      [GUIDEBOOK_LOADER_SETTINGS_KEY]: {},
    });
  };

  const setBackgroundOverride = (enabled: boolean) => {
    updateLoader({
      background_color_override: enabled,
      ...(enabled ? { background_color: current.background_color } : {}),
    });
  };

  const setForegroundOverride = (enabled: boolean) => {
    updateLoader({
      foreground_color_override: enabled,
      ...(enabled ? { foreground_color: current.foreground_color } : {}),
    });
  };

  const setAccentOverride = (enabled: boolean) => {
    updateLoader({
      accent_color_override: enabled,
      ...(enabled ? { accent_color: current.accent_color } : {}),
    });
  };

  return (
    <EditorPanelShell
      title="Loader"
      description="Published guidebooks show this page while the guidebook data is loading."
      contentClassName="space-y-4"
      actions={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetToBrand}
          className="h-8 gap-1.5 px-2 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      }
    >
      <EditorSection title="Behavior" collapsible={false}>
        <SettingGroup>
          <ToggleRow
            id="guidebook-loader-enabled"
            label="Show loading page"
            description="When off, guests go straight from the browser loading state to the guidebook."
            checked={current.enabled}
            onCheckedChange={(enabled) => updateLoader({ enabled })}
          />
          <SelectRow<GuidebookLoaderVariant>
            label="Loader"
            inline
            value={current.variant}
            onChange={(variant) => updateLoader({ variant })}
            options={VARIANT_OPTIONS}
            disabled={!current.enabled}
          />
        </SettingGroup>
      </EditorSection>

      {current.enabled ? (
        <>
          {current.variant === "custom" ? (
            <EditorSection
              title="Custom animation"
              description="Upload a GIF, SVG, PNG, WebP, or JPEG."
              collapsible={false}
            >
              <ImageUploadField
                label="Loader file"
                value={current.custom_asset_url}
                onChange={(custom_asset_url) => updateLoader({ custom_asset_url })}
                variant="avatar"
                emptyText="Drop a GIF or SVG here"
                hint="Animated GIFs and SVG animations will play on the public loading page."
              />
            </EditorSection>
          ) : null}

          <EditorSection title="Page copy" collapsible={false}>
            <SettingGroup>
              <SettingRow label="Title (optional)">
                <Input
                  value={current.title}
                  onChange={(event) =>
                    updateLoader({ title: event.currentTarget.value })
                  }
                  maxLength={120}
                  className="h-9 text-xs"
                />
              </SettingRow>
              <SettingRow label="Subtitle (optional)">
                <Input
                  value={current.subtitle}
                  onChange={(event) =>
                    updateLoader({ subtitle: event.currentTarget.value })
                  }
                  maxLength={180}
                  className="h-9 text-xs"
                />
              </SettingRow>
            </SettingGroup>
          </EditorSection>

          <EditorSection title="Page style" collapsible={false}>
            <SettingGroup>
              <SettingRow label="Background">
                <LoaderColorControl
                  id="guidebook-loader-background-override"
                  value={current.background_color}
                  modeLabel={
                    current.background_color_override
                      ? "Custom color"
                      : "Theme primary"
                  }
                  overrideEnabled={current.background_color_override}
                  onOverrideChange={setBackgroundOverride}
                  onColorChange={(background_color) =>
                    updateLoader({ background_color })
                  }
                />
              </SettingRow>
              <SettingRow label="Text">
                <LoaderColorControl
                  id="guidebook-loader-text-override"
                  value={current.foreground_color}
                  modeLabel={
                    current.foreground_color_override
                      ? "Custom color"
                      : "Auto contrast"
                  }
                  overrideEnabled={current.foreground_color_override}
                  onOverrideChange={setForegroundOverride}
                  onColorChange={(foreground_color) =>
                    updateLoader({ foreground_color })
                  }
                />
              </SettingRow>
              {showLoaderColor ? (
                <SettingRow label="Loader color">
                  <LoaderColorControl
                    id="guidebook-loader-accent-override"
                    value={current.accent_color}
                    modeLabel={
                      current.accent_color_override
                        ? "Custom color"
                        : "Theme accent"
                    }
                    overrideEnabled={current.accent_color_override}
                    onOverrideChange={setAccentOverride}
                    onColorChange={(accent_color) => updateLoader({ accent_color })}
                  />
                </SettingRow>
              ) : null}
              <PremiumSlider
                label="Loader size"
                value={current.animation_size}
                min={48}
                max={240}
                step={4}
                format={(value) => `${value}px`}
                marks={[
                  { value: 48, label: "48" },
                  { value: 112, label: "112" },
                  { value: 240, label: "240" },
                ]}
                onChange={(animation_size) => updateLoader({ animation_size })}
                ariaLabel="Loader animation size"
              />
              <PremiumSlider
                label="Glow"
                value={current.glow_opacity}
                min={0}
                max={100}
                step={5}
                format={(value) => `${value}%`}
                marks={[
                  { value: 0, label: "Off" },
                  { value: 50, label: "50%" },
                  { value: 100, label: "100%" },
                ]}
                onChange={(glow_opacity) => updateLoader({ glow_opacity })}
                ariaLabel="Loader background glow opacity"
              />
              <ToggleRow
                id="guidebook-loader-logo"
                label="Show logo"
                description={
                  current.logo_url
                    ? "Uses the current brand logo."
                    : "Add a logo in Brand settings to show it here."
                }
                checked={current.show_logo}
                onCheckedChange={(show_logo) => updateLoader({ show_logo })}
                disabled={!current.logo_url}
              />
            </SettingGroup>
          </EditorSection>

          <EditorSection title="Preview" collapsible={false}>
            <GuidebookLoadingScreen settings={current} preview />
          </EditorSection>
        </>
      ) : null}
    </EditorPanelShell>
  );
}

function LoaderColorControl({
  id,
  value,
  modeLabel,
  overrideEnabled,
  onOverrideChange,
  onColorChange,
}: {
  id: string;
  value: string;
  modeLabel: string;
  overrideEnabled: boolean;
  onOverrideChange: (enabled: boolean) => void;
  onColorChange: (color: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border/60 bg-background/75 px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2">
        {overrideEnabled ? (
          <ColorPicker value={value} onChange={onColorChange} compact />
        ) : (
          <span
            aria-hidden
            className="h-7 w-7 shrink-0 rounded-md border border-border/80 shadow-sm"
            style={{
              backgroundColor: value,
              backgroundImage:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.10) 100%)",
            }}
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold leading-tight text-foreground">
            {modeLabel}
          </p>
          <p className="mt-0.5 truncate font-mono text-[10.5px] uppercase leading-tight text-muted-foreground">
            {value}
          </p>
        </div>
      </div>
      <label
        htmlFor={id}
        className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] font-medium text-muted-foreground"
      >
        Override
        <Switch
          id={id}
          checked={overrideEnabled}
          onCheckedChange={onOverrideChange}
          size="sm"
        />
      </label>
    </div>
  );
}
