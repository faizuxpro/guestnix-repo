"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HeroBackgroundPattern } from "@/lib/hero-data";

type Option = {
  value: HeroBackgroundPattern;
  label: string;
};

const OPTIONS: Option[] = [
  { value: "none", label: "None" },
  { value: "dots", label: "Dots" },
  { value: "grid", label: "Grid" },
  { value: "diagonal", label: "Diagonal" },
  { value: "noise", label: "Noise" },
];

/**
 * CSS for each pattern. `tint` is the rgba string used for the lines/dots,
 * so the same picker reads correctly on dark (white tint) and light
 * (primary-tinted) backgrounds.
 */
function patternStyle(
  pattern: HeroBackgroundPattern,
  tint: string
): React.CSSProperties {
  switch (pattern) {
    case "dots":
      return {
        backgroundImage: `radial-gradient(${tint} 1.2px, transparent 1.2px)`,
        backgroundSize: "8px 8px",
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(to right, ${tint} 1px, transparent 1px), linear-gradient(to bottom, ${tint} 1px, transparent 1px)`,
        backgroundSize: "10px 10px",
      };
    case "diagonal":
      return {
        backgroundImage: `repeating-linear-gradient(45deg, ${tint} 0, ${tint} 1.5px, transparent 1.5px, transparent 7px)`,
      };
    case "noise":
      return {
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><filter id='n'><feTurbulence baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        backgroundSize: "70px 70px",
      };
    default:
      return {};
  }
}

type Props = {
  value: HeroBackgroundPattern;
  onChange: (next: HeroBackgroundPattern) => void;
  /**
   * "hero" — dark teal swatch with white pattern (splash backdrop preview).
   * "canvas" — host's actual chosen bg color/gradient with primary-tinted
   * pattern, so the preview matches the real canvas.
   */
  variant?: "hero" | "canvas";
  /** Used only in "canvas" mode — the actual bg paint behind the pattern. */
  previewBackground?: string;
  /** Used only in "canvas" mode — the actual pattern tint (rgba). */
  previewTint?: string;
};

export function PatternPicker({
  value,
  onChange,
  variant = "hero",
  previewBackground,
  previewTint,
}: Props) {
  const isCanvas = variant === "canvas";
  const tint = isCanvas
    ? previewTint ?? "rgba(10, 35, 33, 0.16)"
    : "rgba(255, 255, 255, 0.55)";
  const bgPaint =
    isCanvas
      ? previewBackground ?? "#faf6ef"
      : "linear-gradient(135deg, #0a4a47, #136b66)";
  const noneLabelColor = isCanvas ? "text-foreground/55" : "text-white/55";
  const labelStrip = isCanvas
    ? "bg-gradient-to-t from-black/15 to-transparent text-foreground"
    : "bg-gradient-to-t from-black/55 to-transparent text-white";

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-label={opt.label}
            title={opt.label}
            className={cn(
              "group relative flex aspect-square flex-col items-stretch justify-end overflow-hidden rounded-md border text-[9px] font-medium transition-all",
              selected
                ? "border-primary/55 ring-2 ring-primary/30"
                : "border-border/70 hover:scale-[1.04] hover:border-foreground/40"
            )}
          >
            <span
              className="absolute inset-0"
              style={{ background: bgPaint }}
              aria-hidden
            />
            {opt.value !== "none" ? (
              <span
                className={cn(
                  "absolute inset-0 opacity-95",
                  isCanvas ? null : "mix-blend-overlay"
                )}
                style={patternStyle(opt.value, tint)}
                aria-hidden
              />
            ) : (
              <span
                className={cn(
                  "absolute inset-0 grid place-items-center text-[9px] font-semibold",
                  noneLabelColor
                )}
                aria-hidden
              >
                None
              </span>
            )}
            <span className={cn("relative z-10 px-1 pb-0.5 pt-3", labelStrip)}>
              {opt.label}
            </span>
            {selected ? (
              <span className="absolute right-1 top-1 z-10 grid h-3.5 w-3.5 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Check className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
