"use client";

import {
  Circle,
  Crop,
  Expand,
  RectangleHorizontal,
  Square,
  Squircle,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import {
  HERO_LOGO_SIZE_MAX,
  HERO_LOGO_SIZE_MIN,
  type HeroImageFit,
  type HeroLogoShape,
} from "@/lib/hero-data";
import { ImageUploadField } from "./ImageUploadField";
import { PremiumSlider } from "./controls/PremiumSlider";
import {
  Disclosure,
  SegmentedControl,
  SettingsField,
  SettingsSection,
} from "./controls/SettingsField";

export function PropertyLogoSettings() {
  const heroData = useEditorStore((s) => s.guidebook?.heroData);
  const updateHeroData = useEditorStore((s) => s.updateHeroData);

  if (!heroData) return null;

  const property = heroData.property;
  const config = heroData.home;

  return (
    <SettingsSection title="Property logo">
      <ImageUploadField
        label="Image"
        value={property.logo_url}
        onChange={(url) => updateHeroData({ property: { logo_url: url } })}
        variant="avatar"
        emptyText="Drop a logo here"
        assetsHubLabel="Use Assets Hub logo"
      />
      <SettingsField label="Shape" inline>
        <SegmentedControl<HeroLogoShape>
          value={config.logo.shape}
          onChange={(v) => updateHeroData({ home: { logo: { shape: v } } })}
          options={[
            {
              value: "natural",
              label: "Natural",
              icon: <RectangleHorizontal className="h-3.5 w-3.5" />,
            },
            {
              value: "rounded",
              label: "Rounded",
              icon: <Squircle className="h-3.5 w-3.5" />,
            },
            {
              value: "circle",
              label: "Circle",
              icon: <Circle className="h-3.5 w-3.5" />,
            },
          ]}
          ariaLabel="Logo shape"
        />
      </SettingsField>

      <Disclosure label="Adjust">
        <PremiumSlider
          label="Size"
          value={config.logo.size}
          min={HERO_LOGO_SIZE_MIN}
          max={HERO_LOGO_SIZE_MAX}
          step={2}
          format={(v) => `${Math.round(v)}px`}
          marks={[
            { value: 56, label: "S" },
            { value: 80, label: "M" },
            { value: 112, label: "L" },
            { value: 160, label: "XL" },
          ]}
          showAllMarkLabels
          onChange={(v) => updateHeroData({ home: { logo: { size: v } } })}
          ariaLabel="Logo size"
        />
        {config.logo.shape === "rounded" ? (
          <PremiumSlider
            label="Corner radius"
            value={config.logo.corner_radius}
            min={0}
            max={50}
            step={1}
            format={(v) => `${Math.round(v)}%`}
            marks={[
              { value: 0, label: <Square className="inline h-2.5 w-2.5" /> },
              { value: 25, label: "25" },
              { value: 50, label: "50" },
            ]}
            showAllMarkLabels
            onChange={(v) =>
              updateHeroData({ home: { logo: { corner_radius: v } } })
            }
          />
        ) : null}
        {config.logo.shape !== "natural" ? (
          <SettingsField label="Fit" inline>
            <SegmentedControl<HeroImageFit>
              value={config.logo.fit}
              onChange={(v) => updateHeroData({ home: { logo: { fit: v } } })}
              options={[
                {
                  value: "cover",
                  label: "Fill",
                  icon: <Expand className="h-3.5 w-3.5" />,
                },
                {
                  value: "contain",
                  label: "Fit",
                  icon: <Crop className="h-3.5 w-3.5" />,
                },
              ]}
              ariaLabel="Logo fit"
            />
          </SettingsField>
        ) : null}
      </Disclosure>
    </SettingsSection>
  );
}
