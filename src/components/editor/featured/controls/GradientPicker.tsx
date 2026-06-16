"use client";

import { Check } from "lucide-react";
import { ColorPicker } from "./ColorPicker";
import { PremiumSlider } from "./PremiumSlider";
import { cn } from "@/lib/utils";

export type GradientPreset = {
  id: string;
  name: string;
  from: string;
  to: string;
  angle: number;
};

const DEFAULT_PRESETS: GradientPreset[] = [
  // Brand / water-family (dark primary → mid secondary)
  { id: "teal", name: "Teal", from: "#134E4A", to: "#0F766E", angle: 135 },
  { id: "pine", name: "Pine", from: "#134E4A", to: "#365314", angle: 135 },
  { id: "forest", name: "Forest", from: "#065F46", to: "#84CC16", angle: 135 },
  { id: "atlantic", name: "Atlantic", from: "#083344", to: "#0EA5E9", angle: 135 },
  { id: "ocean", name: "Ocean", from: "#0C4A6E", to: "#06B6D4", angle: 135 },
  { id: "lake-dusk", name: "Lake dusk", from: "#0A2540", to: "#0F766E", angle: 135 },
  { id: "tropical", name: "Tropical", from: "#14B8A6", to: "#84CC16", angle: 135 },
  // Blues
  { id: "cobalt", name: "Cobalt", from: "#1D4ED8", to: "#3B82F6", angle: 135 },
  { id: "coastal", name: "Coastal", from: "#1E40AF", to: "#60A5FA", angle: 135 },
  // Indigos / violets
  { id: "indigo", name: "Indigo", from: "#312E81", to: "#6366F1", angle: 135 },
  { id: "violet", name: "Violet", from: "#4C1D95", to: "#8B5CF6", angle: 135 },
  { id: "aurora", name: "Aurora", from: "#0F766E", to: "#8B5CF6", angle: 135 },
  { id: "plum", name: "Plum", from: "#4C1D95", to: "#D946EF", angle: 135 },
  // Warm sunset family
  { id: "sunset", name: "Sunset", from: "#7C2D12", to: "#F59E0B", angle: 150 },
  { id: "ember", name: "Ember", from: "#7F1D1D", to: "#F97316", angle: 135 },
  { id: "dawn", name: "Dawn", from: "#881337", to: "#F43F5E", angle: 135 },
  { id: "honey", name: "Honey", from: "#854D0E", to: "#FCD34D", angle: 135 },
  { id: "bordeaux", name: "Bordeaux", from: "#7F1D1D", to: "#881337", angle: 135 },
  // Neutrals
  { id: "midnight", name: "Midnight", from: "#0F172A", to: "#475569", angle: 180 },
  { id: "pearl", name: "Pearl", from: "#475569", to: "#CBD5E1", angle: 180 },
];

type Props = {
  from: string;
  to: string;
  angle: number;
  onChange: (next: Partial<{ from: string; to: string; angle: number }>) => void;
  /** Optional custom preset list. Pass a lighter palette for backgrounds. */
  presets?: GradientPreset[];
};

export function GradientPicker({
  from,
  to,
  angle,
  onChange,
  presets = DEFAULT_PRESETS,
}: Props) {
  const gradientCss = `linear-gradient(${angle}deg, ${from}, ${to})`;

  return (
    <div className="space-y-3">
      {/* The gradient bar IS the preview. The two stops sit on it as
          clickable color swatches — clicking either opens its ColorPicker
          popover. */}
      <div
        className="relative h-12 w-full overflow-hidden rounded-lg ring-1 ring-inset ring-border/50 shadow-inner"
        style={{ backgroundImage: gradientCss }}
      >
        <div className="absolute inset-y-0 left-1.5 flex items-center">
          <ColorPicker
            value={from}
            onChange={(v) => onChange({ from: v })}
          />
        </div>
        <div className="absolute inset-y-0 right-1.5 flex items-center">
          <ColorPicker
            value={to}
            onChange={(v) => onChange({ to: v })}
          />
        </div>
      </div>

      {/* Preset gradients */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Presets
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {presets.map((preset) => {
            const selected =
              preset.from.toLowerCase() === from.toLowerCase() &&
              preset.to.toLowerCase() === to.toLowerCase() &&
              preset.angle === angle;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onChange({
                    from: preset.from,
                    to: preset.to,
                    angle: preset.angle,
                  })
                }
                aria-label={preset.name}
                title={preset.name}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-md border transition-all",
                  selected
                    ? "border-primary/55 ring-2 ring-primary/30"
                    : "border-border/70 hover:scale-110 hover:border-foreground/40"
                )}
                style={{
                  backgroundImage: `linear-gradient(${preset.angle}deg, ${preset.from}, ${preset.to})`,
                }}
              >
                {selected ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-white drop-shadow-md" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <PremiumSlider
        label="Angle"
        value={angle}
        min={0}
        max={360}
        step={1}
        format={(n) => `${Math.round(n)}°`}
        marks={[
          { value: 0, label: "0°" },
          { value: 90, label: "90°" },
          { value: 180, label: "180°" },
          { value: 270, label: "270°" },
          { value: 360 },
        ]}
        showAllMarkLabels
        onChange={(v) => onChange({ angle: v })}
      />
    </div>
  );
}
