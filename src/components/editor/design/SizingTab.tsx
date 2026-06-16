"use client";

import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import { EditorPanelShell, EditorSection } from "@/components/editor/settings-ui";
import { asNumber, DEFAULTS, useBranding } from "./_branding";

export function SizingTab() {
  const { branding, set } = useBranding();

  const iconScaleFeature = asNumber(
    branding.icon_scale_feature,
    DEFAULTS.icon_scale_feature
  );

  return (
    <EditorPanelShell>
      <EditorSection title="Icon scale">
        <PremiumSlider
          label="Section icons"
          value={iconScaleFeature}
          min={0.4}
          max={2.5}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => set({ icon_scale_feature: v })}
          ariaLabel="Section icon scale"
        />
      </EditorSection>
    </EditorPanelShell>
  );
}
