"use client";

import { useRef, useState } from "react";
import { Check, Pipette } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Preset = { value: string; name: string };

/**
 * Role-specific palettes. Each picker (primary / secondary / accent) gets
 * its own preset list so users can't accidentally pick a dark slate for
 * the accent role or a pastel cream for the primary. All values are from
 * the Tailwind scale and pair together by design.
 *
 * 3 rows × 10 swatches per role, ordered by hue family.
 */

// PRIMARY — dark anchors (slate/stone darks, water-family darks, sunset-darks).
export const PRIMARY_PRESETS: Preset[] = [
  // Row 1 — Slates, grays & near-blacks
  { value: "#0F172A", name: "Slate 900" },
  { value: "#111827", name: "Gray 900" },
  { value: "#1E293B", name: "Slate 800" },
  { value: "#334155", name: "Slate 700" },
  { value: "#475569", name: "Slate 600" },
  { value: "#3F3F46", name: "Zinc 700" },
  { value: "#292524", name: "Stone 800" },
  { value: "#3B2F2F", name: "Espresso" },
  { value: "#0A2540", name: "Naval" },
  { value: "#172554", name: "Blue 950" },
  // Row 2 — Blues, teals, cyans, greens (water-family darks)
  { value: "#1D4ED8", name: "Blue 700" },
  { value: "#2563EB", name: "Blue 600" },
  { value: "#1E40AF", name: "Blue 800" },
  { value: "#0C4A6E", name: "Sky 900" },
  { value: "#083344", name: "Cyan 900" },
  { value: "#0F766E", name: "Teal 700" },
  { value: "#115E59", name: "Teal 800" },
  { value: "#134E4A", name: "Teal 900" },
  { value: "#065F46", name: "Emerald 800" },
  { value: "#365314", name: "Lime 800" },
  // Row 3 — Indigos, violets, warms (sunset/twilight darks)
  { value: "#4338CA", name: "Indigo 700" },
  { value: "#5B21B6", name: "Violet 800" },
  { value: "#312E81", name: "Indigo 900" },
  { value: "#4C1D95", name: "Violet 900" },
  { value: "#881337", name: "Rose 900" },
  { value: "#7F1D1D", name: "Red 900" },
  { value: "#7C2D12", name: "Orange 900" },
  { value: "#9A3412", name: "Orange 800" },
  { value: "#92400E", name: "Amber 800" },
  { value: "#854D0E", name: "Yellow 800" },
];

// SECONDARY — vibrant mid-tones that pop against any primary anchor.
export const SECONDARY_PRESETS: Preset[] = [
  // Row 1 — Blues, teals, cyans, greens (water-family mediums)
  { value: "#06B6D4", name: "Cyan 500" },
  { value: "#0891B2", name: "Cyan 600" },
  { value: "#0EA5E9", name: "Sky 500" },
  { value: "#38BDF8", name: "Sky 400" },
  { value: "#3B82F6", name: "Blue 500" },
  { value: "#60A5FA", name: "Blue 400" },
  { value: "#14B8A6", name: "Teal 500" },
  { value: "#2DD4BF", name: "Teal 400" },
  { value: "#5EEAD4", name: "Teal 300" },
  { value: "#10B981", name: "Emerald 500" },
  // Row 2 — Greens, yellows, oranges (sun-family mediums)
  { value: "#22C55E", name: "Green 500" },
  { value: "#4ADE80", name: "Green 400" },
  { value: "#84CC16", name: "Lime 500" },
  { value: "#EAB308", name: "Yellow 500" },
  { value: "#FCD34D", name: "Amber 300" },
  { value: "#F59E0B", name: "Amber 500" },
  { value: "#F97316", name: "Orange 500" },
  { value: "#FB923C", name: "Orange 400" },
  { value: "#FDBA74", name: "Orange 300" },
  { value: "#EF4444", name: "Red 500" },
  // Row 3 — Pinks, purples, indigos (twilight mediums)
  { value: "#F43F5E", name: "Rose 500" },
  { value: "#FB7185", name: "Rose 400" },
  { value: "#EC4899", name: "Pink 500" },
  { value: "#D946EF", name: "Fuchsia 500" },
  { value: "#E879F9", name: "Fuchsia 400" },
  { value: "#A855F7", name: "Purple 500" },
  { value: "#C084FC", name: "Purple 400" },
  { value: "#8B5CF6", name: "Violet 500" },
  { value: "#6366F1", name: "Indigo 500" },
  { value: "#818CF8", name: "Indigo 400" },
];

// ACCENT — light pastels & neutrals for highlights and pops.
export const ACCENT_PRESETS: Preset[] = [
  // Row 1 — Cool neutrals & cool tints
  { value: "#F8FAFC", name: "Slate 50" },
  { value: "#F1F5F9", name: "Slate 100" },
  { value: "#E2E8F0", name: "Slate 200" },
  { value: "#CBD5E1", name: "Slate 300" },
  { value: "#F9FAFB", name: "Gray 50" },
  { value: "#E5E7EB", name: "Gray 200" },
  { value: "#D1D5DB", name: "Gray 300" },
  { value: "#EEF2FF", name: "Indigo 50" },
  { value: "#DBEAFE", name: "Blue 100" },
  { value: "#E0F2FE", name: "Sky 100" },
  // Row 2 — Cool/jewel pastels
  { value: "#ECFEFF", name: "Cyan 50" },
  { value: "#CCFBF1", name: "Teal 100" },
  { value: "#DCFCE7", name: "Green 100" },
  { value: "#ECFCCB", name: "Lime 100" },
  { value: "#EDE9FE", name: "Violet 100" },
  { value: "#FAF5FF", name: "Purple 50" },
  { value: "#F3E8FF", name: "Purple 100" },
  { value: "#FAE8FF", name: "Fuchsia 100" },
  { value: "#FCE7F3", name: "Pink 100" },
  { value: "#FFE4E6", name: "Rose 100" },
  // Row 3 — Warm neutrals & warm tints
  { value: "#FAFAF9", name: "Stone 50" },
  { value: "#F5F5F4", name: "Stone 100" },
  { value: "#E7E5E4", name: "Stone 200" },
  { value: "#F4F4F5", name: "Zinc 100" },
  { value: "#E4E4E7", name: "Zinc 200" },
  { value: "#FFF7ED", name: "Orange 50" },
  { value: "#FFFBEB", name: "Amber 50" },
  { value: "#FEF3C7", name: "Amber 100" },
  { value: "#FDE68A", name: "Amber 200" },
  { value: "#FEF2F2", name: "Red 50" },
];

/**
 * Combined fallback palette for places where the ColorPicker is used
 * outside a role context (e.g. gradient stops, splash background color).
 * Covers the full range; users can still pick anything if they need to.
 */
const DEFAULT_PRESETS: Preset[] = [
  ...PRIMARY_PRESETS,
  ...SECONDARY_PRESETS,
  ...ACCENT_PRESETS,
];

type Props = {
  value: string;
  onChange: (color: string) => void;
  presets?: Preset[];
  label?: string;
  /** Render compact (24px swatch). */
  compact?: boolean;
  className?: string;
};

export function ColorPicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  label,
  compact = false,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [lastSyncedValue, setLastSyncedValue] = useState(value);
  const nativeInputRef = useRef<HTMLInputElement | null>(null);

  // Sync draft when the parent-controlled `value` changes (e.g. preset click).
  if (value !== lastSyncedValue) {
    setLastSyncedValue(value);
    setDraft(value);
  }

  const commitHex = (next: string) => {
    setDraft(next);
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(next)) {
      onChange(next);
    }
  };

  const sizeCls = compact ? "h-7 w-7" : "h-9 w-9";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label ? (
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label="Pick a color"
              className={cn(
                "relative shrink-0 overflow-hidden rounded-md border border-border/80 shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40",
                sizeCls
              )}
              style={{
                backgroundColor: value,
                backgroundImage:
                  "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.10) 100%)",
              }}
            />
          }
        />
        <PopoverContent
          align="start"
          className="w-80 space-y-3 p-3"
          sideOffset={6}
        >
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Presets
            </p>
            <div className="grid grid-cols-10 gap-1">
              {presets.map((p) => {
                const selected = p.value.toLowerCase() === value.toLowerCase();
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onChange(p.value)}
                    aria-label={p.name}
                    title={p.name}
                    className={cn(
                      "group relative aspect-square rounded-sm border transition-all",
                      selected
                        ? "border-primary/55 ring-2 ring-primary/30"
                        : "border-border/60 hover:scale-110 hover:border-foreground/40"
                    )}
                    style={{ backgroundColor: p.value }}
                  >
                    {selected ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check
                          className="h-2.5 w-2.5 drop-shadow-md"
                          style={{
                            color: pickContrast(p.value),
                          }}
                        />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Custom
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => nativeInputRef.current?.click()}
                className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/80 shadow-sm transition-all hover:shadow-md"
                style={{ backgroundColor: draft }}
                aria-label="Open native color picker"
              >
                <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/15">
                  <Pipette
                    className="h-3.5 w-3.5 opacity-0 transition-opacity hover:opacity-100"
                    style={{ color: pickContrast(draft) }}
                  />
                </span>
                <input
                  ref={nativeInputRef}
                  type="color"
                  value={normalizeHex(draft)}
                  onChange={(e) => commitHex(e.target.value)}
                  className="pointer-events-none absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </button>
              <Input
                value={draft}
                onChange={(e) => commitHex(e.target.value.trim())}
                placeholder="#002927"
                className="h-9 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function normalizeHex(input: string): string {
  if (/^#[0-9a-f]{6}$/i.test(input)) return input;
  if (/^#[0-9a-f]{3}$/i.test(input)) {
    const r = input[1];
    const g = input[2];
    const b = input[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#000000";
}

/** Return "#ffffff" or "#000000" for foreground contrast on a given hex. */
function pickContrast(hex: string): string {
  const normalized = normalizeHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  // Perceived brightness (ITU-R BT.601)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#0f172a" : "#ffffff";
}
