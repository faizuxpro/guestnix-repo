"use client";

import { useMemo } from "react";
import { Shuffle, Check } from "lucide-react";
import { RuntimeFontLoader } from "@/components/fonts/RuntimeFontLoader";
import { EditorPanelShell } from "@/components/editor/settings-ui";
import { useBranding } from "./_branding";
import { DESIGN_PRESETS, findActivePreset, type DesignPreset } from "./presets";

export function LuckyTab() {
  const { branding, set } = useBranding();

  const active = findActivePreset(branding);

  const previewFamilies = useMemo(() => {
    const families = new Set<string>();
    for (const preset of DESIGN_PRESETS) {
      families.add(preset.branding.heading_font);
      families.add(preset.branding.body_font);
    }
    return Array.from(families);
  }, []);

  const apply = (preset: DesignPreset) => {
    set(preset.branding);
  };

  const shuffle = () => {
    const pool = active
      ? DESIGN_PRESETS.filter((p) => p.id !== active.id)
      : DESIGN_PRESETS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) apply(pick);
  };

  return (
    <EditorPanelShell contentClassName="space-y-3">
      <RuntimeFontLoader fontFamilies={previewFamilies} id="lucky-tab" />

      <button
        type="button"
        onClick={shuffle}
        className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-md border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-3 py-2.5 text-xs font-semibold text-primary transition-all hover:border-primary/50 hover:from-primary/15"
      >
        <Shuffle className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
        <span>Feeling lucky — shuffle</span>
      </button>

      <p className="px-0.5 text-[11px] leading-snug text-muted-foreground">
        {DESIGN_PRESETS.length} curated combinations of colors, fonts, and
        sizing. Pick one to start — tweak anything afterwards in Brand,
        Typography, or Sizing.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {DESIGN_PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isActive={active?.id === preset.id}
            onApply={() => apply(preset)}
          />
        ))}
      </div>
    </EditorPanelShell>
  );
}

function PresetCard({
  preset,
  isActive,
  onApply,
}: {
  preset: DesignPreset;
  isActive: boolean;
  onApply: () => void;
}) {
  const b = preset.branding;
  return (
    <button
      type="button"
      onClick={onApply}
      aria-pressed={isActive}
      title={`${preset.name} — ${preset.tagline}`}
      className={[
        "group relative flex flex-col overflow-hidden rounded-md border bg-background text-left transition-all",
        isActive
          ? "border-primary/55 shadow-[0_0_0_2px_rgba(0,41,39,0.08)]"
          : "border-border/70 hover:border-foreground/30 hover:shadow-md",
      ].join(" ")}
    >
      <MiniHero preset={preset} />

      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11.5px] font-semibold leading-tight text-foreground">
            {preset.name}
          </p>
          <p className="truncate text-[9.5px] leading-tight text-muted-foreground">
            {preset.tagline}
          </p>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <Swatch color={b.primary_color} />
          <Swatch color={b.secondary_color} />
          <Swatch color={b.accent_color} />
        </div>
      </div>

      {isActive && (
        <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
          Active
        </span>
      )}
    </button>
  );
}

function MiniHero({ preset }: { preset: DesignPreset }) {
  const b = preset.branding;
  const patternBg = patternForPreview(
    b.background_pattern,
    b.primary_color,
    b.background_pattern_strength
  );

  return (
    <div
      className="relative aspect-[1.45/1] w-full overflow-hidden"
      style={{ backgroundColor: b.background_color }}
    >
      {/* pattern overlay */}
      {patternBg && (
        <div
          className="absolute inset-0"
          style={patternBg}
          aria-hidden
        />
      )}

      {/* top primary band — faux nav/header */}
      <div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-2"
        style={{
          backgroundColor: b.primary_color,
          height: "12%",
        }}
      >
        <span
          className="h-1 w-4 rounded-full"
          style={{ backgroundColor: b.accent_color }}
        />
        <div className="flex gap-0.5">
          <span
            className="h-0.5 w-0.5 rounded-full"
            style={{ backgroundColor: b.accent_color, opacity: 0.7 }}
          />
          <span
            className="h-0.5 w-0.5 rounded-full"
            style={{ backgroundColor: b.accent_color, opacity: 0.7 }}
          />
          <span
            className="h-0.5 w-0.5 rounded-full"
            style={{ backgroundColor: b.accent_color, opacity: 0.7 }}
          />
        </div>
      </div>

      {/* content area */}
      <div
        className="absolute inset-x-0 flex flex-col items-start justify-center px-2.5"
        style={{ top: "16%", bottom: "20%" }}
      >
        <span
          style={{
            fontFamily: `"${b.heading_font}", serif`,
            fontWeight: b.heading_weight,
            fontSize: `${0.78 * b.heading_scale}rem`,
            lineHeight: b.heading_line_height,
            letterSpacing: `${b.heading_letter_spacing}em`,
            color: b.primary_color,
          }}
        >
          Welcome
        </span>
        <span
          className="mt-0.5"
          style={{
            fontFamily: `"${b.body_font}", sans-serif`,
            fontWeight: b.body_weight,
            fontSize: `${0.5 * b.body_scale}rem`,
            lineHeight: b.body_line_height,
            letterSpacing: `${b.body_letter_spacing}em`,
            color: b.primary_color,
            opacity: 0.65,
          }}
        >
          Your stay starts here
        </span>
      </div>

      {/* secondary thin underline */}
      <div
        className="absolute h-px"
        style={{
          left: "10%",
          right: "55%",
          bottom: "23%",
          backgroundColor: b.secondary_color,
          opacity: 0.55,
        }}
      />

      {/* bottom faux nav — icon dots scaled by icon_scale_nav */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-around"
        style={{
          height: "16%",
          backgroundColor: b.primary_color,
          opacity: 0.96,
        }}
      >
        {[0, 1, 2, 3].map((i) => {
          const isActiveDot = i === 0;
          const size = Math.max(2, 3.5 * b.icon_scale_nav);
          return (
            <span
              key={i}
              className="rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: isActiveDot
                  ? b.accent_color
                  : b.background_color,
                opacity: isActiveDot ? 1 : 0.7,
              }}
            />
          );
        })}
      </div>

      {/* accent feature badge — scaled by icon_scale_feature */}
      <span
        className="absolute rounded-full"
        style={{
          right: "8%",
          top: "30%",
          width: `${5 * b.icon_scale_feature}px`,
          height: `${5 * b.icon_scale_feature}px`,
          backgroundColor: b.accent_color,
          boxShadow: `0 0 0 2px ${b.background_color}`,
        }}
        aria-hidden
      />
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="block h-3 w-3 rounded-full border border-border/40"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Light-weight pattern stand-ins for the preview. Real patterns live in the
 * template; here we only need enough fidelity to communicate "this preset
 * uses a texture."
 */
function patternForPreview(
  pattern: string,
  tintHex: string,
  strength: number
): React.CSSProperties | null {
  if (pattern === "none") return null;
  const tint = hexToRgbaString(tintHex, Math.min(strength * 1.4, 0.35));
  if (pattern === "dots") {
    return {
      backgroundImage: `radial-gradient(${tint} 1px, transparent 1px)`,
      backgroundSize: "6px 6px",
    };
  }
  if (pattern === "grid") {
    return {
      backgroundImage: `linear-gradient(${tint} 1px, transparent 1px), linear-gradient(90deg, ${tint} 1px, transparent 1px)`,
      backgroundSize: "8px 8px",
    };
  }
  if (pattern === "diagonal") {
    return {
      backgroundImage: `repeating-linear-gradient(45deg, ${tint} 0 1px, transparent 1px 6px)`,
    };
  }
  if (pattern === "noise") {
    return {
      backgroundImage: `radial-gradient(${tint} 0.5px, transparent 0.5px), radial-gradient(${tint} 0.5px, transparent 0.5px)`,
      backgroundSize: "3px 3px, 5px 5px",
      backgroundPosition: "0 0, 1.5px 1.5px",
    };
  }
  return null;
}

function hexToRgbaString(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/^([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return `rgba(10,35,33,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
