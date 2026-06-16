"use client";

import { useMemo } from "react";
import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import {
  DisclosureGroup,
  EditorPanelShell,
  EditorSection,
  SelectRow,
  SettingRow,
} from "@/components/editor/settings-ui";
import {
  getAvailableWeights,
  snapWeightToFont,
  type CustomFont,
} from "@/lib/fonts/catalog";
import { FontPicker } from "./FontPicker";
import {
  asNumber,
  asString,
  DEFAULTS,
  useBranding,
  WEIGHT_OPTIONS,
} from "./_branding";

export function TypographyTab() {
  const { branding, set } = useBranding();

  const customFonts = useMemo<CustomFont[]>(
    () => (Array.isArray(branding.custom_fonts) ? branding.custom_fonts : []),
    [branding.custom_fonts]
  );

  const headingFont = asString(
    branding.heading_font ?? branding.font_family,
    DEFAULTS.heading_font
  );
  const bodyFont = asString(
    branding.body_font ?? branding.font_family,
    DEFAULTS.body_font
  );

  const headingScale = asNumber(branding.heading_scale, DEFAULTS.heading_scale);
  const bodyScale = asNumber(branding.body_scale, DEFAULTS.body_scale);
  const headingWeight = asNumber(
    branding.heading_weight,
    DEFAULTS.heading_weight
  );
  const bodyWeight = asNumber(branding.body_weight, DEFAULTS.body_weight);
  const headingLetterSpacing = asNumber(
    branding.heading_letter_spacing,
    DEFAULTS.heading_letter_spacing
  );
  const bodyLetterSpacing = asNumber(
    branding.body_letter_spacing,
    DEFAULTS.body_letter_spacing
  );
  const headingLineHeight = asNumber(
    branding.heading_line_height,
    DEFAULTS.heading_line_height
  );
  const bodyLineHeight = asNumber(
    branding.body_line_height,
    DEFAULTS.body_line_height
  );

  const headingWeights = useMemo(
    () => getAvailableWeights(headingFont, customFonts),
    [headingFont, customFonts]
  );
  const bodyWeights = useMemo(
    () => getAvailableWeights(bodyFont, customFonts),
    [bodyFont, customFonts]
  );

  const handleHeadingFontChange = (family: string) => {
    const snapped = snapWeightToFont(headingWeight, family, customFonts);
    if (snapped !== headingWeight) {
      set({ heading_font: family, heading_weight: snapped });
    } else {
      set({ heading_font: family });
    }
  };

  const handleBodyFontChange = (family: string) => {
    const snapped = snapWeightToFont(bodyWeight, family, customFonts);
    if (snapped !== bodyWeight) {
      set({ body_font: family, body_weight: snapped });
    } else {
      set({ body_font: family });
    }
  };

  return (
    <EditorPanelShell contentClassName="space-y-4">
      <TypeSection
        role="heading"
        label="Heading"
        font={headingFont}
        weight={headingWeight}
        weights={headingWeights}
        scale={headingScale}
        letterSpacing={headingLetterSpacing}
        lineHeight={headingLineHeight}
        scaleConfig={{ min: 0.6, max: 2.5, step: 0.05 }}
        letterConfig={{ min: -0.05, max: 0.15, step: 0.005 }}
        lineConfig={{ min: 0.9, max: 1.6, step: 0.05 }}
        onFontChange={handleHeadingFontChange}
        onWeightChange={(v) => set({ heading_weight: v })}
        onScaleChange={(v) => set({ heading_scale: v })}
        onLetterChange={(v) => set({ heading_letter_spacing: v })}
        onLineChange={(v) => set({ heading_line_height: v })}
      />

      <TypeSection
        role="body"
        label="Body"
        font={bodyFont}
        weight={bodyWeight}
        weights={bodyWeights}
        scale={bodyScale}
        letterSpacing={bodyLetterSpacing}
        lineHeight={bodyLineHeight}
        scaleConfig={{ min: 0.7, max: 2, step: 0.05 }}
        letterConfig={{ min: -0.03, max: 0.1, step: 0.005 }}
        lineConfig={{ min: 1.2, max: 2.2, step: 0.05 }}
        onFontChange={handleBodyFontChange}
        onWeightChange={(v) => set({ body_weight: v })}
        onScaleChange={(v) => set({ body_scale: v })}
        onLetterChange={(v) => set({ body_letter_spacing: v })}
        onLineChange={(v) => set({ body_line_height: v })}
      />

      <EditorSection title="Preview" collapsible={false}>
        <div className="rounded-md border border-border/60 bg-muted/20 p-3" aria-hidden>
          <p
            className="text-foreground"
            style={{
              fontFamily: `"${headingFont}", serif`,
              fontSize: `${1.4 * headingScale}rem`,
              fontWeight: headingWeight,
              letterSpacing: `${headingLetterSpacing}em`,
              lineHeight: headingLineHeight,
            }}
          >
            Welcome to your stay
          </p>
          <p
            className="mt-1 text-muted-foreground"
            style={{
              fontFamily: `"${bodyFont}", sans-serif`,
              fontSize: `${0.85 * bodyScale}rem`,
              fontWeight: bodyWeight,
              letterSpacing: `${bodyLetterSpacing}em`,
              lineHeight: bodyLineHeight,
            }}
          >
            Everything you need to settle in: wifi, check-in, and the best
            brunch spot. The kettle is to the left of the sink.
          </p>
        </div>
      </EditorSection>
    </EditorPanelShell>
  );
}

type SliderConfig = { min: number; max: number; step: number };

type TypeSectionProps = {
  role: "heading" | "body";
  label: string;
  font: string;
  weight: number;
  weights: number[];
  scale: number;
  letterSpacing: number;
  lineHeight: number;
  scaleConfig: SliderConfig;
  letterConfig: SliderConfig;
  lineConfig: SliderConfig;
  onFontChange: (family: string) => void;
  onWeightChange: (v: number) => void;
  onScaleChange: (v: number) => void;
  onLetterChange: (v: number) => void;
  onLineChange: (v: number) => void;
};

function TypeSection({
  role,
  label,
  font,
  weight,
  weights,
  scale,
  letterSpacing,
  lineHeight,
  scaleConfig,
  letterConfig,
  lineConfig,
  onFontChange,
  onWeightChange,
  onScaleChange,
  onLetterChange,
  onLineChange,
}: TypeSectionProps) {
  return (
    <EditorSection title={label}>
      <SettingRow label="Font">
        <FontPicker role={role} value={font} onChange={onFontChange} />
      </SettingRow>

      {weights.length > 1 ? (
        <WeightSelect
          value={weight}
          weights={weights}
          onChange={onWeightChange}
        />
      ) : null}

      <DisclosureGroup label="Adjust">
        <PremiumSlider
          label="Size"
          value={scale}
          min={scaleConfig.min}
          max={scaleConfig.max}
          step={scaleConfig.step}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={onScaleChange}
          ariaLabel={`${label} size`}
        />
        <PremiumSlider
          label="Letter spacing"
          value={letterSpacing}
          min={letterConfig.min}
          max={letterConfig.max}
          step={letterConfig.step}
          format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}em`}
          onChange={onLetterChange}
          ariaLabel={`${label} letter spacing`}
        />
        <PremiumSlider
          label="Line height"
          value={lineHeight}
          min={lineConfig.min}
          max={lineConfig.max}
          step={lineConfig.step}
          format={(v) => v.toFixed(2)}
          onChange={onLineChange}
          ariaLabel={`${label} line height`}
        />
      </DisclosureGroup>
    </EditorSection>
  );
}

type WeightValue = `${number}`;

function WeightSelect({
  value,
  weights,
  onChange,
}: {
  value: number;
  weights: number[];
  onChange: (v: number) => void;
}) {
  const options = Array.from(new Set(weights))
    .sort((a, b) => a - b)
    .map((weightValue) => {
      const standard = WEIGHT_OPTIONS.find((opt) => opt.value === weightValue);
      return {
        value: String(weightValue) as WeightValue,
        label: standard?.label ?? String(weightValue),
      };
    });

  return (
    <SelectRow<WeightValue>
      label="Weight"
      inline
      value={String(value) as WeightValue}
      onChange={(next) => onChange(Number(next))}
      options={options}
    />
  );
}
