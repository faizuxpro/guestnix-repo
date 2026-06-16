"use client";

import { useId, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type Mark = { value: number; label?: React.ReactNode };

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Displayed value formatter (e.g. "55%") */
  format?: (value: number) => string;
  marks?: Mark[];
  label?: string;
  hint?: string;
  ariaLabel?: string;
  /** Accent color CSS — defaults to primary */
  accent?: "primary" | "accent";
  /**
   * Show every mark's label under the track. Default false: only the first
   * and last labels are rendered, which is enough for size/spacing/height
   * sliders. Turn on for sliders where intermediate marks carry meaning
   * (e.g. focal-point L/C/R).
   */
  showAllMarkLabels?: boolean;
  className?: string;
};

export function PremiumSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  marks,
  label,
  hint,
  ariaLabel,
  accent = "primary",
  showAllMarkLabels = false,
  className,
}: Props) {
  const id = useId();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;
  const fillColor =
    accent === "primary" ? "bg-primary" : "bg-[oklch(0.88_0.17_86)]";
  const thumbRing =
    accent === "primary"
      ? "ring-primary/30 group-hover:ring-primary/40 group-active:ring-primary/50"
      : "ring-amber-300/40 group-hover:ring-amber-300/55 group-active:ring-amber-300/70";

  useEffect(() => {
    if (!isDragging) return;
    const onUp = () => setIsDragging(false);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [isDragging]);

  const displayValue = format ? format(value) : String(value);

  return (
    <div className={cn("space-y-1", className)}>
      {(label || hint) && (
        <div className="flex items-baseline justify-between gap-2">
          {label ? (
            <label
              htmlFor={id}
              className="text-[12px] font-medium leading-tight text-foreground"
            >
              {label}
            </label>
          ) : (
            <span />
          )}
          <span
            className={cn(
              "tabular-nums text-[11px] font-semibold transition-colors",
              isDragging ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {displayValue}
          </span>
        </div>
      )}

      <div className="group relative px-2 py-1.5">
        {/* Track */}
        <div
          ref={trackRef}
          className="relative h-1.5 w-full rounded-full bg-muted/70 ring-1 ring-inset ring-border/40"
        >
          {/* Fill */}
          <div
            className={cn(
              "absolute left-0 top-0 h-full rounded-full transition-[width] duration-100",
              fillColor
            )}
            style={{ width: `${pct}%` }}
          />
          {/* Marks */}
          {marks?.map((mark) => {
            const mPct = ((mark.value - min) / (max - min)) * 100;
            const isPassed = mark.value <= value;
            return (
              <span
                key={mark.value}
                className={cn(
                  "absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors",
                  isPassed ? "bg-background/80" : "bg-border/80"
                )}
                style={{ left: `${mPct}%` }}
                aria-hidden
              />
            );
          })}
          {/* Thumb */}
          <div
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform",
              isDragging ? "scale-110" : "group-hover:scale-105"
            )}
            style={{ left: `${pct}%` }}
            aria-hidden
          >
            <div
              className={cn(
                "h-4 w-4 rounded-full border-2 border-background bg-foreground shadow-md ring-4 transition-shadow",
                thumbRing
              )}
            />
            {isDragging ? (
              <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-background shadow-lg">
                {displayValue}
                <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-foreground" />
              </div>
            ) : null}
          </div>
        </div>

        {/* Native range — invisible but absorbs interaction & keyboard */}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchEnd={() => setIsDragging(false)}
          aria-label={ariaLabel ?? label}
          className="absolute inset-y-0 left-2 z-10 h-full w-[calc(100%-1rem)] cursor-pointer appearance-none bg-transparent opacity-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4"
        />

        {/* Mark labels under track */}
        {(() => {
          const labeled = marks?.filter((m) => m.label !== undefined) ?? [];
          if (labeled.length === 0) return null;
          const visible = showAllMarkLabels
            ? labeled
            : labeled.length <= 2
            ? labeled
            : [labeled[0], labeled[labeled.length - 1]];
          return (
            <div className="relative mt-0.5 h-3 w-full">
              {visible.map((mark) => (
                <button
                  key={`l-${mark.value}`}
                  type="button"
                  onClick={() => onChange(mark.value)}
                  className={cn(
                    "absolute -translate-x-1/2 text-[9.5px] tabular-nums transition-colors",
                    value === mark.value
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground/70 hover:text-foreground"
                  )}
                  style={{
                    left: `${((mark.value - min) / (max - min)) * 100}%`,
                  }}
                >
                  {mark.label}
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {hint ? (
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
