"use client";

import type { ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Settings2,
} from "lucide-react";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import { cn } from "@/lib/utils";
import {
  SECTION_HEADER_ICON_SIZE_MAX,
  SECTION_HEADER_ICON_SIZE_MIN,
  normalizeSectionHeaderSettings,
  writeSectionHeaderSettings,
  type SectionHeaderAlign,
  type SectionHeaderBackground,
  type SectionHeaderDensity,
  type SectionHeaderIconStyle,
  type SectionHeaderSettings,
} from "@/lib/section-header";
import { PremiumSlider } from "./featured/controls/PremiumSlider";
import {
  Disclosure,
  SegmentedControl,
  SelectRow,
  SettingsField,
  SettingsSection,
} from "./featured/controls/SettingsField";
import { ToggleRow } from "./settings-ui";

type Props = {
  guidebookSettings: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
  defaultExpanded?: boolean;
  className?: string;
};

const ALIGN_OPTIONS: Array<{
  value: SectionHeaderAlign;
  label: string;
  icon: ReactNode;
}> = [
  { value: "left", label: "Left", icon: <AlignLeft className="h-3 w-3" /> },
  { value: "center", label: "Center", icon: <AlignCenter className="h-3 w-3" /> },
  { value: "right", label: "Right", icon: <AlignRight className="h-3 w-3" /> },
];

const DENSITY_OPTIONS: Array<{ value: SectionHeaderDensity; label: string }> = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

const BACKGROUND_OPTIONS: Array<{
  value: SectionHeaderBackground;
  label: string;
}> = [
  { value: "brand", label: "Brand" },
  { value: "solid", label: "Solid" },
  { value: "transparent", label: "Transparent" },
];

const ICON_STYLE_OPTIONS: Array<{
  value: SectionHeaderIconStyle;
  label: string;
}> = [
  { value: "plain", label: "Plain" },
  { value: "soft", label: "Soft" },
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "inverted", label: "Invert" },
];

export function SectionHeaderSettingsEditor({
  guidebookSettings,
  onChange,
  defaultExpanded = false,
  className,
}: Props) {
  const sectionHeader = normalizeSectionHeaderSettings(guidebookSettings);

  const patchSectionHeader = (patch: Partial<SectionHeaderSettings>) => {
    onChange(writeSectionHeaderSettings(sectionHeader, patch));
  };

  return (
    <SettingsSection
      icon={<Settings2 />}
      title="Section header"
      description="Shared popup and full-page header controls."
      defaultExpanded={defaultExpanded}
      className={className}
    >
      <ToggleRow
        label="Show header row"
        description="Hides the title, icon, and link strip. Back stays available."
        checked={sectionHeader.enabled}
        onCheckedChange={(enabled) => patchSectionHeader({ enabled })}
      />

      <div className={cn("space-y-3", !sectionHeader.enabled && "opacity-60")}>
        <div className="grid grid-cols-3 gap-2">
          <ToggleRow
            label="Icon"
            checked={sectionHeader.show_icon}
            onCheckedChange={(show_icon) => patchSectionHeader({ show_icon })}
            className="rounded-md border border-border/55 px-2"
          />
          <ToggleRow
            label="Title"
            checked={sectionHeader.show_title}
            onCheckedChange={(show_title) => patchSectionHeader({ show_title })}
            className="rounded-md border border-border/55 px-2"
          />
          <ToggleRow
            label="Link"
            checked={sectionHeader.show_link}
            onCheckedChange={(show_link) => patchSectionHeader({ show_link })}
            className="rounded-md border border-border/55 px-2"
          />
        </div>

        <SettingsField
          label="Content align"
          inline
          className="gap-2 [&>div:first-child]:flex-[0.72] [&>div:last-child]:flex-[1.75]"
        >
          <SegmentedControl<SectionHeaderAlign>
            value={sectionHeader.align}
            onChange={(align) => patchSectionHeader({ align })}
            ariaLabel="Section header content alignment"
            presentation="segmented"
            className="[&_[role=tab]]:min-w-0 [&_[role=tab]]:px-1.5"
            options={ALIGN_OPTIONS}
          />
        </SettingsField>

        <SelectRow<SectionHeaderDensity>
          label="Header size"
          inline
          value={sectionHeader.density}
          onChange={(density) => patchSectionHeader({ density })}
          options={DENSITY_OPTIONS}
        />

        <SelectRow<SectionHeaderBackground>
          label="Background"
          inline
          value={sectionHeader.background}
          onChange={(background) => patchSectionHeader({ background })}
          options={BACKGROUND_OPTIONS}
        />

        <ToggleRow
          label="Sticky header"
          description="Keeps section controls visible while scrolling."
          checked={sectionHeader.sticky}
          onCheckedChange={(sticky) => patchSectionHeader({ sticky })}
        />

        <Disclosure label="Icons" defaultExpanded>
          <div className="grid gap-2">
            <HeaderIconRow
              label="Back"
              value={sectionHeader.back_icon}
              size={sectionHeader.back_icon_size}
              onIconChange={(back_icon) => patchSectionHeader({ back_icon })}
              onSizeChange={(back_icon_size) =>
                patchSectionHeader({ back_icon_size })
              }
            />
            <HeaderIconRow
              label="Link"
              value={sectionHeader.link_icon}
              size={sectionHeader.link_icon_size}
              onIconChange={(link_icon) => patchSectionHeader({ link_icon })}
              onSizeChange={(link_icon_size) =>
                patchSectionHeader({ link_icon_size })
              }
            />
          </div>
          <SettingsField label="Icon style" inline>
            <SegmentedControl<SectionHeaderIconStyle>
              value={sectionHeader.icon_style}
              onChange={(icon_style) => patchSectionHeader({ icon_style })}
              options={ICON_STYLE_OPTIONS}
              ariaLabel="Section header icon style"
            />
          </SettingsField>
        </Disclosure>
      </div>
    </SettingsSection>
  );
}

function HeaderIconRow({
  label,
  value,
  size,
  onIconChange,
  onSizeChange,
}: {
  label: string;
  value: string;
  size: number;
  onIconChange: (value: string) => void;
  onSizeChange: (value: number) => void;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/50 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        <IconifyPicker
          value={value}
          onChange={onIconChange}
          ariaLabel={`Pick section ${label.toLowerCase()} icon`}
          triggerClassName="h-8 w-8 rounded-md border border-border/70 text-foreground"
          iconClassName="text-base"
        />
      </div>
      <PremiumSlider
        label="Size"
        value={size}
        min={SECTION_HEADER_ICON_SIZE_MIN}
        max={SECTION_HEADER_ICON_SIZE_MAX}
        step={1}
        format={(v) => `${Math.round(v)}px`}
        onChange={onSizeChange}
        marks={[
          { value: SECTION_HEADER_ICON_SIZE_MIN, label: `${SECTION_HEADER_ICON_SIZE_MIN}` },
          { value: 18, label: "18" },
          { value: 24, label: "24" },
          { value: SECTION_HEADER_ICON_SIZE_MAX, label: `${SECTION_HEADER_ICON_SIZE_MAX}` },
        ]}
        showAllMarkLabels
      />
    </div>
  );
}
