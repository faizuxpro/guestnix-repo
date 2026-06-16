"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeroOverlayPreset } from "@/lib/hero-data";

type Preset = {
  id: HeroOverlayPreset;
  name: string;
  description: string;
};

/**
 * Map the stored preset ids to user-facing visual styles:
 *  - card    → "Glass"   (transparent panel + blur — modern look)
 *  - classic → "Solid"   (full-bleed photo + strong dark overlay)
 *  - minimal → "Minimal" (clean type, light overlay, no chrome)
 *
 * The id stays the same so existing guidebook data still renders correctly.
 */
const PRESETS: Preset[] = [
  {
    id: "card",
    name: "Glass",
    description: "Transparent panel — image shows through.",
  },
  {
    id: "classic",
    name: "Solid",
    description: "Dark overlay for maximum contrast.",
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Light overlay, clean type, no chrome.",
  },
];

type Props = {
  value: HeroOverlayPreset;
  onChange: (next: HeroOverlayPreset) => void;
  /** Cover image to use in the live previews. Falls back to a teal gradient. */
  coverImage: string | null;
};

const FALLBACK_BG =
  "linear-gradient(135deg, #002927 0%, #0a4a47 55%, #136b66 100%)";

export function OverlayPresetPicker({ value, onChange, coverImage }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PRESETS.map((preset) => {
        const selected = value === preset.id;
        const bgStyle: React.CSSProperties = coverImage
          ? {
              backgroundImage: `url("${coverImage}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : { backgroundImage: FALLBACK_BG };

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            aria-label={preset.name}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all",
              selected
                ? "border-primary/55 ring-2 ring-primary/35 shadow-md"
                : "border-border/80 hover:-translate-y-px hover:border-foreground/30 hover:shadow-md"
            )}
          >
            {/* Live preview */}
            <span
              className="relative block aspect-[4/5] w-full overflow-hidden"
              style={bgStyle}
              aria-hidden
            >
              <PresetPreview id={preset.id} />
            </span>

            {/* Caption */}
            <span className="flex items-start justify-between gap-1.5 bg-background px-2 py-1.5">
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold leading-tight">
                  {preset.name}
                </span>
                <span className="block text-[10px] leading-tight text-muted-foreground">
                  {preset.description}
                </span>
              </span>
              {selected ? (
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check className="h-2.5 w-2.5" />
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PresetPreview({ id }: { id: HeroOverlayPreset }) {
  if (id === "card") {
    return (
      <>
        {/* Glass: nearly transparent base veil so image shines through,
            with a frosted-glass panel containing the text. */}
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-black/8 to-black/25" />
        <span
          className="absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-md border border-white/35 bg-white/10 px-2 py-2.5 text-center shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] [backdrop-filter:blur(8px)_saturate(180%)] [-webkit-backdrop-filter:blur(8px)_saturate(180%)] [transition:backdrop-filter_0.5s_ease,background-color_0.5s_ease] group-hover:bg-white/16 group-hover:[backdrop-filter:blur(12px)_saturate(200%)] group-hover:[-webkit-backdrop-filter:blur(12px)_saturate(200%)] animate-[fadeIn_0.7s_ease-out]"
        >
          <span className="block h-1 w-3/4 mx-auto rounded-full bg-white/95" />
          <span className="mt-1.5 block h-0.5 w-1/2 mx-auto rounded-full bg-white/65" />
          <span className="mt-2 block h-1 w-2/3 mx-auto rounded-full bg-white/55" />
        </span>
      </>
    );
  }

  if (id === "classic") {
    return (
      <>
        {/* Solid: dark overlay + fully opaque branded panel on top. */}
        <span className="absolute inset-0 bg-gradient-to-b from-black/55 via-[oklch(0.25_0.06_176/0.7)] to-black/85" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-[60%] w-[70%] flex-col items-center justify-center gap-1 rounded-md border border-white/15 bg-[oklch(0.25_0.06_176)] px-2 shadow-[0_6px_12px_-6px_rgba(0,0,0,0.6)]">
          <span className="block h-1 w-3/4 rounded-full bg-white/95" />
          <span className="block h-0.5 w-1/2 rounded-full bg-white/70" />
          <span className="mt-0.5 block h-1 w-2/3 rounded-full bg-white/60" />
        </span>
      </>
    );
  }

  // minimal
  return (
    <>
      {/* Minimal: very light overlay, centered type only. */}
      <span className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/12 to-black/35" />
      <span className="absolute inset-x-3 top-1/2 -translate-y-1/2 text-center">
        <span className="block h-1 w-1/2 mx-auto rounded-full bg-white/95" />
        <span className="mt-1.5 block h-0.5 w-1/3 mx-auto rounded-full bg-white/75" />
      </span>
    </>
  );
}
