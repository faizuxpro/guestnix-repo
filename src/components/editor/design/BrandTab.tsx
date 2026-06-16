"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ACCENT_PRESETS,
  ColorPicker,
  PRIMARY_PRESETS,
  SECONDARY_PRESETS,
} from "@/components/editor/featured/controls/ColorPicker";
import {
  getBrandKitBrandingPatch,
  getBrandKitLogoUrl,
} from "@/lib/assets-hub";
import { AssetsHubPickerButton } from "@/components/editor/assets/AssetsHubPickerButton";
import { GradientPicker } from "@/components/editor/featured/controls/GradientPicker";
import { PatternPicker } from "@/components/editor/featured/controls/PatternPicker";
import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import {
  SegmentedControl,
  SettingsField,
  SettingsSection,
} from "@/components/editor/featured/controls/SettingsField";
import {
  EditorPanelShell,
  SettingGroup,
  ToggleRow,
} from "@/components/editor/settings-ui";
import { PropertyLogoSettings } from "@/components/editor/featured/PropertyLogoSettings";
import { useEditorStore } from "@/stores/editor-store";
import type { DesignInspectFocus } from "@/lib/editor-inspect";
import {
  asNumber,
  asString,
  BG_GRADIENT_PRESETS,
  BG_PRESETS,
  DEFAULTS,
  hexToRgbString,
  useBranding,
  type BrandGradient,
  type BackgroundPattern,
} from "./_branding";

export function BrandTab() {
  const { branding, set, setLogo } = useBranding();
  const editorNavigationRequest = useEditorStore(
    (s) => s.editorNavigationRequest
  );
  const handledNavigationNonceRef = useRef(0);
  const [focusRequest, setFocusRequest] = useState<{
    focus: DesignInspectFocus;
    nonce: number;
  } | null>(null);

  const primary = asString(branding.primary_color, DEFAULTS.primary_color);
  const secondary = asString(branding.secondary_color, DEFAULTS.secondary_color);
  const accent = asString(branding.accent_color, DEFAULTS.accent_color);

  const gradient = branding.brand_gradient ?? null;
  const gradientEnabled = gradient !== null;
  const gradientValues = gradient ?? DEFAULTS.brand_gradient;

  const backgroundColor = asString(
    branding.background_color,
    DEFAULTS.background_color
  );
  const bgGradient = branding.background_gradient ?? null;
  const bgGradientEnabled = bgGradient !== null;
  const bgGradientValues = bgGradient ?? DEFAULTS.background_gradient;
  const bgPattern: BackgroundPattern =
    (branding.background_pattern as BackgroundPattern | undefined) ??
    DEFAULTS.background_pattern;
  const bgPatternStrength = asNumber(
    branding.background_pattern_strength,
    DEFAULTS.background_pattern_strength
  );
  const topbarInheritsPage = branding.topbar_background_inherit !== false;
  const topbarBackgroundColor = asString(
    branding.topbar_background_color,
    backgroundColor
  );
  const topbarBgGradient = branding.topbar_background_gradient ?? null;
  const topbarBgGradientEnabled = topbarBgGradient !== null;
  const topbarBgGradientValues =
    topbarBgGradient ?? bgGradient ?? DEFAULTS.background_gradient;
  const topbarBgPattern: BackgroundPattern =
    (branding.topbar_background_pattern as BackgroundPattern | undefined) ??
    (topbarInheritsPage ? bgPattern : DEFAULTS.topbar_background_pattern);
  const topbarBgPatternStrength = asNumber(
    branding.topbar_background_pattern_strength,
    topbarInheritsPage
      ? bgPatternStrength
      : DEFAULTS.topbar_background_pattern_strength
  );
  const sectionInheritsPage = branding.section_background_inherit !== false;
  const sectionBackgroundColor = asString(
    branding.section_background_color,
    backgroundColor
  );
  const sectionBgGradient = branding.section_background_gradient ?? null;
  const sectionBgGradientEnabled = sectionBgGradient !== null;
  const sectionBgGradientValues =
    sectionBgGradient ?? bgGradient ?? DEFAULTS.background_gradient;
  const sectionBgPattern: BackgroundPattern =
    (branding.section_background_pattern as BackgroundPattern | undefined) ??
    (sectionInheritsPage ? bgPattern : DEFAULTS.section_background_pattern);
  const sectionBgPatternStrength = asNumber(
    branding.section_background_pattern_strength,
    sectionInheritsPage
      ? bgPatternStrength
      : DEFAULTS.section_background_pattern_strength
  );

  const bgPaintForPreview = useMemo(
    () =>
      bgGradientEnabled
        ? `linear-gradient(${bgGradientValues.angle}deg, ${bgGradientValues.from}, ${bgGradientValues.to})`
        : backgroundColor,
    [
      bgGradientEnabled,
      bgGradientValues.angle,
      bgGradientValues.from,
      bgGradientValues.to,
      backgroundColor,
    ]
  );

  const patternTintForPreview = useMemo(() => {
    const rgb = hexToRgbString(primary) ?? "10, 35, 33";
    return `rgba(${rgb}, ${Math.max(bgPatternStrength, 0.16)})`;
  }, [primary, bgPatternStrength]);

  const sectionBgPaintForPreview = useMemo(
    () =>
      sectionBgGradientEnabled
        ? `linear-gradient(${sectionBgGradientValues.angle}deg, ${sectionBgGradientValues.from}, ${sectionBgGradientValues.to})`
        : sectionBackgroundColor,
    [
      sectionBgGradientEnabled,
      sectionBgGradientValues.angle,
      sectionBgGradientValues.from,
      sectionBgGradientValues.to,
      sectionBackgroundColor,
    ]
  );

  const sectionPatternTintForPreview = useMemo(() => {
    const rgb = hexToRgbString(primary) ?? "10, 35, 33";
    return `rgba(${rgb}, ${Math.max(sectionBgPatternStrength, 0.16)})`;
  }, [primary, sectionBgPatternStrength]);

  const topbarBgPaintForPreview = useMemo(
    () =>
      topbarBgGradientEnabled
        ? `linear-gradient(${topbarBgGradientValues.angle}deg, ${topbarBgGradientValues.from}, ${topbarBgGradientValues.to})`
        : topbarBackgroundColor,
    [
      topbarBgGradientEnabled,
      topbarBgGradientValues.angle,
      topbarBgGradientValues.from,
      topbarBgGradientValues.to,
      topbarBackgroundColor,
    ]
  );

  const topbarPatternTintForPreview = useMemo(() => {
    const rgb = hexToRgbString(primary) ?? "10, 35, 33";
    return `rgba(${rgb}, ${Math.max(topbarBgPatternStrength, 0.16)})`;
  }, [primary, topbarBgPatternStrength]);

  const enableTopbarOverride = () => {
    set({
      topbar_background_inherit: false,
      topbar_background_color: topbarBackgroundColor,
      topbar_background_gradient: cloneGradient(topbarBgGradient ?? bgGradient),
      topbar_background_pattern: topbarBgPattern,
      topbar_background_pattern_strength: topbarBgPatternStrength,
    });
  };

  const enableSectionOverride = () => {
    set({
      section_background_inherit: false,
      section_background_color: sectionBackgroundColor,
      section_background_gradient: cloneGradient(sectionBgGradient ?? bgGradient),
      section_background_pattern: sectionBgPattern,
      section_background_pattern_strength: sectionBgPatternStrength,
    });
  };

  useEffect(() => {
    if (!editorNavigationRequest) return;
    if (handledNavigationNonceRef.current === editorNavigationRequest.nonce) {
      return;
    }
    const target = editorNavigationRequest.target;
    if (target.kind !== "design") return;

    handledNavigationNonceRef.current = editorNavigationRequest.nonce;
    const frame = window.requestAnimationFrame(() => {
      setFocusRequest({
        focus: target.focus,
        nonce: editorNavigationRequest.nonce,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorNavigationRequest]);

  useEffect(() => {
    if (!focusRequest) return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-editor-design-focus="${focusRequest.focus}"]`
      );
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
      const focusTarget = element?.querySelector<HTMLElement>(
        "button, input, [tabindex]"
      );
      (focusTarget ?? element)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest]);

  return (
    <EditorPanelShell contentClassName="space-y-4">
      <SettingGroup className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          Saved brand kit
        </span>
        <AssetsHubPickerButton
          assetType="brand_kit"
          label="Apply Assets Hub kit"
          onSelect={(asset) => {
            const patch = getBrandKitBrandingPatch(asset);
            const logoUrl = getBrandKitLogoUrl(asset);
            set(patch);
            if (logoUrl) setLogo(logoUrl);
            toast.success("Brand kit applied");
          }}
        />
      </SettingGroup>

      <PropertyLogoSettings />

      <SettingsSection title="Colors">
        <ColorRow
          label="Primary"
          value={primary}
          presets={PRIMARY_PRESETS}
          onChange={(c) => set({ primary_color: c })}
        />
        <ColorRow
          label="Secondary"
          value={secondary}
          presets={SECONDARY_PRESETS}
          onChange={(c) => set({ secondary_color: c })}
        />
        <ColorRow
          label="Accent"
          value={accent}
          presets={ACCENT_PRESETS}
          onChange={(c) => set({ accent_color: c })}
        />
      </SettingsSection>

      <SettingsSection title="Surface">
        <SettingsField label="Fill" inline>
          <SegmentedControl<"solid" | "gradient">
            value={gradientEnabled ? "gradient" : "solid"}
            onChange={(v) => {
              if (v === "solid") {
                set({ brand_gradient: null });
              } else {
                set({ brand_gradient: { ...gradientValues } });
              }
            }}
            options={[
              { value: "solid", label: "Solid" },
              { value: "gradient", label: "Gradient" },
            ]}
            ariaLabel="Brand surface fill"
          />
        </SettingsField>

        {gradientEnabled ? (
          <GradientPicker
            from={gradientValues.from}
            to={gradientValues.to}
            angle={gradientValues.angle}
            onChange={(next) =>
              set({
                brand_gradient: {
                  from: next.from ?? gradientValues.from,
                  to: next.to ?? gradientValues.to,
                  angle: next.angle ?? gradientValues.angle,
                },
              })
            }
          />
        ) : null}
      </SettingsSection>

      <div
        data-editor-design-focus="app_background"
        tabIndex={-1}
        className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
      <SettingsSection
        key={focusRequest ? `background-${focusRequest.nonce}` : "background"}
        title="Background"
        defaultExpanded={Boolean(focusRequest)}
      >
        <SettingsField label="Base fill" inline>
          <SegmentedControl<"solid" | "gradient">
            value={bgGradientEnabled ? "gradient" : "solid"}
            onChange={(v) => {
              if (v === "solid") {
                set({ background_gradient: null });
              } else {
                set({ background_gradient: { ...bgGradientValues } });
              }
            }}
            options={[
              { value: "solid", label: "Solid" },
              { value: "gradient", label: "Gradient" },
            ]}
            ariaLabel="Canvas background type"
          />
        </SettingsField>

        {!bgGradientEnabled ? (
          <ColorPicker
            value={backgroundColor}
            presets={BG_PRESETS}
            onChange={(c) => set({ background_color: c })}
          />
        ) : (
          <GradientPicker
            from={bgGradientValues.from}
            to={bgGradientValues.to}
            angle={bgGradientValues.angle}
            presets={BG_GRADIENT_PRESETS}
            onChange={(next) =>
              set({
                background_gradient: {
                  from: next.from ?? bgGradientValues.from,
                  to: next.to ?? bgGradientValues.to,
                  angle: next.angle ?? bgGradientValues.angle,
                },
              })
            }
          />
        )}

        <SettingsField label="Base pattern">
          <PatternPicker
            variant="canvas"
            value={bgPattern}
            previewBackground={bgPaintForPreview}
            previewTint={patternTintForPreview}
            onChange={(v) => set({ background_pattern: v })}
          />
        </SettingsField>

        {bgPattern !== "none" ? (
          <PremiumSlider
            label="Strength"
            value={bgPatternStrength}
            min={0.03}
            max={0.4}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => set({ background_pattern_strength: v })}
            ariaLabel="Background pattern strength"
          />
        ) : null}

        <div
          data-editor-design-focus="topbar_background"
          tabIndex={-1}
          className="space-y-2.5 rounded-md border-t border-border/55 pt-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ToggleRow
            id="topbar-bg-inherit"
            label="Top bar uses base background"
            description="Header inherits the base fill and pattern."
            checked={topbarInheritsPage}
            onCheckedChange={(checked) => {
              if (checked) {
                set({ topbar_background_inherit: true });
              } else {
                enableTopbarOverride();
              }
            }}
          />

          {!topbarInheritsPage ? (
            <>
              <SettingsField label="Top bar fill" inline>
                <SegmentedControl<"solid" | "gradient">
                  value={topbarBgGradientEnabled ? "gradient" : "solid"}
                  onChange={(v) => {
                    if (v === "solid") {
                      set({ topbar_background_gradient: null });
                    } else {
                      set({
                        topbar_background_gradient: {
                          ...topbarBgGradientValues,
                        },
                      });
                    }
                  }}
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "gradient", label: "Gradient" },
                  ]}
                  ariaLabel="Top bar background type"
                />
              </SettingsField>

              {!topbarBgGradientEnabled ? (
                <ColorPicker
                  value={topbarBackgroundColor}
                  presets={BG_PRESETS}
                  onChange={(c) => set({ topbar_background_color: c })}
                />
              ) : (
                <GradientPicker
                  from={topbarBgGradientValues.from}
                  to={topbarBgGradientValues.to}
                  angle={topbarBgGradientValues.angle}
                  presets={BG_GRADIENT_PRESETS}
                  onChange={(next) =>
                    set({
                      topbar_background_gradient: {
                        from: next.from ?? topbarBgGradientValues.from,
                        to: next.to ?? topbarBgGradientValues.to,
                        angle: next.angle ?? topbarBgGradientValues.angle,
                      },
                    })
                  }
                />
              )}

              <SettingsField label="Top bar pattern">
                <PatternPicker
                  variant="canvas"
                  value={topbarBgPattern}
                  previewBackground={topbarBgPaintForPreview}
                  previewTint={topbarPatternTintForPreview}
                  onChange={(v) => set({ topbar_background_pattern: v })}
                />
              </SettingsField>

              {topbarBgPattern !== "none" ? (
                <PremiumSlider
                  label="Top bar strength"
                  value={topbarBgPatternStrength}
                  min={0.03}
                  max={0.4}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) =>
                    set({ topbar_background_pattern_strength: v })
                  }
                  ariaLabel="Top bar pattern strength"
                />
              ) : null}
            </>
          ) : null}
        </div>

        <div
          data-editor-design-focus="section_background"
          tabIndex={-1}
          className="space-y-2.5 rounded-md border-t border-border/55 pt-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ToggleRow
            id="section-bg-inherit"
            label="Sections use base background"
            description="Section popups and full pages inherit the base fill and pattern."
            checked={sectionInheritsPage}
            onCheckedChange={(checked) => {
              if (checked) {
                set({ section_background_inherit: true });
              } else {
                enableSectionOverride();
              }
            }}
          />

          {!sectionInheritsPage ? (
            <>
              <SettingsField label="Section fill" inline>
                <SegmentedControl<"solid" | "gradient">
                  value={sectionBgGradientEnabled ? "gradient" : "solid"}
                  onChange={(v) => {
                    if (v === "solid") {
                      set({ section_background_gradient: null });
                    } else {
                      set({
                        section_background_gradient: {
                          ...sectionBgGradientValues,
                        },
                      });
                    }
                  }}
                  options={[
                    { value: "solid", label: "Solid" },
                    { value: "gradient", label: "Gradient" },
                  ]}
                  ariaLabel="Section background type"
                />
              </SettingsField>

              {!sectionBgGradientEnabled ? (
                <ColorPicker
                  value={sectionBackgroundColor}
                  presets={BG_PRESETS}
                  onChange={(c) => set({ section_background_color: c })}
                />
              ) : (
                <GradientPicker
                  from={sectionBgGradientValues.from}
                  to={sectionBgGradientValues.to}
                  angle={sectionBgGradientValues.angle}
                  presets={BG_GRADIENT_PRESETS}
                  onChange={(next) =>
                    set({
                      section_background_gradient: {
                        from: next.from ?? sectionBgGradientValues.from,
                        to: next.to ?? sectionBgGradientValues.to,
                        angle: next.angle ?? sectionBgGradientValues.angle,
                      },
                    })
                  }
                />
              )}

              <SettingsField label="Section pattern">
                <PatternPicker
                  variant="canvas"
                  value={sectionBgPattern}
                  previewBackground={sectionBgPaintForPreview}
                  previewTint={sectionPatternTintForPreview}
                  onChange={(v) => set({ section_background_pattern: v })}
                />
              </SettingsField>

              {sectionBgPattern !== "none" ? (
                <PremiumSlider
                  label="Section strength"
                  value={sectionBgPatternStrength}
                  min={0.03}
                  max={0.4}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) =>
                    set({ section_background_pattern_strength: v })
                  }
                  ariaLabel="Section pattern strength"
                />
              ) : null}
            </>
          ) : null}
        </div>
      </SettingsSection>
      </div>
    </EditorPanelShell>
  );
}

function ColorRow({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: string;
  presets: Array<{ value: string; name: string }>;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <ColorPicker value={value} presets={presets} onChange={onChange} />
    </div>
  );
}

function cloneGradient(gradient: BrandGradient): BrandGradient {
  return gradient ? { ...gradient } : null;
}
