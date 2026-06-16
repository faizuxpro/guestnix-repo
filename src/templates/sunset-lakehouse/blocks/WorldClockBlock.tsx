"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Clock } from "lucide-react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars } from "@/lib/block-colors";
import type {
  WidgetAnimation,
  WidgetColorRole,
  WorldClockContent,
  WorldClockLayout,
  WorldClockStyle,
  WorldClockTimeFormat,
} from "../types";

const WORLD_CLOCK_STYLES: WorldClockStyle[] = [
  "clean_cards",
  "timezone_board",
  "compact_list",
  "dark_panel",
  "ticket",
  "glass",
  "brutalist",
];

const COLOR_ROLES: WidgetColorRole[] = ["primary", "secondary", "accent"];
const LAYOUTS: WorldClockLayout[] = ["grid", "list", "compact"];
const TIME_FORMATS: WorldClockTimeFormat[] = ["12h", "24h"];
const ANIMATIONS: WidgetAnimation[] = [
  "style_default",
  "none",
  "lift",
  "glow",
  "pulse",
];

function coerce<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function safeFormat(
  timezone: string,
  timeFormat: WorldClockTimeFormat,
  locale = "en-US"
): { time: string; date: string; isNight: boolean } | null {
  try {
    const now = new Date();
    const time = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: timeFormat === "12h",
      timeZone: timezone,
    }).format(now);
    const date = new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: timezone,
    }).format(now);
    const hourStr = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).format(now);
    const hour = Number(hourStr);
    const isNight = !Number.isNaN(hour) && (hour < 6 || hour >= 19);
    return { time, date, isNight };
  } catch {
    return null;
  }
}

export function WorldClockBlock({
  content,
}: {
  content: Partial<WorldClockContent>;
}) {
  const [, setTick] = useState(0);
  const title = content.title?.trim() || "World clocks";
  const subtitle = content.subtitle?.trim() || "";
  const icon = content.icon?.trim() || "ph:clock-fill";
  const style = coerce(content.style, WORLD_CLOCK_STYLES, "clean_cards");
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = coerce(config?.accent_role, COLOR_ROLES, "secondary");
  const layout = coerce(config?.layout, LAYOUTS, "grid");
  const timeFormat = coerce(config?.time_format, TIME_FORMATS, "12h");
  const animation = coerce(config?.animation, ANIMATIONS, "style_default");
  const showDate = typeof config?.show_date === "boolean" ? config.show_date : true;
  const showTimezone =
    typeof config?.show_timezone === "boolean" ? config.show_timezone : true;
  const clocks = Array.isArray(content.clocks)
    ? content.clocks.filter((clock) => clock.label || clock.timezone || clock.note)
    : [];

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="sl-world-clock"
      data-style={style}
      data-color-role={accentRole}
      data-layout={layout}
      data-animation={animation}
      style={
        blockColorOverrideVars([
          {
            value: config?.accent_color,
            colorVar: "--sl-world-clock-color",
            rgbVar: "--sl-world-clock-color-rgb",
            contrastVar: "--sl-world-clock-contrast",
          },
        ]) as CSSProperties
      }
    >
      <header className="sl-world-clock-head">
        <span className="sl-world-clock-head-icon" aria-hidden>
          <HostIcon value={icon} />
        </span>
        <span className="sl-world-clock-head-copy">
          <span className="sl-world-clock-eyebrow">Time zones</span>
          <span className="sl-world-clock-title">{title}</span>
          {subtitle ? <span className="sl-world-clock-subtitle">{subtitle}</span> : null}
        </span>
      </header>

      {clocks.length === 0 ? (
        <p className="sl-world-clock-empty">Add a city and timezone to preview clocks.</p>
      ) : (
        <div className="sl-world-clock-grid">
          {clocks.map((clk, i) => {
            const timezone = clk.timezone || "UTC";
            const formatted = safeFormat(timezone, timeFormat);
            return (
              <article
                key={`${clk.label || timezone}-${i}`}
                className="sl-world-clock-card"
                data-night={formatted?.isNight ? "true" : "false"}
              >
                <span className="sl-world-clock-card-icon" aria-hidden>
                  <Clock className="h-4 w-4" />
                </span>
                <span className="sl-world-clock-card-copy">
                  <span className="sl-world-clock-label">
                    {clk.label || timezone}
                  </span>
                  <span className="sl-world-clock-time">
                    {formatted?.time ?? "--:--"}
                  </span>
                  {showDate || showTimezone || clk.note ? (
                    <span className="sl-world-clock-meta">
                      {[
                        showDate ? formatted?.date : "",
                        showTimezone ? timezone.replace(/_/g, " ") : "",
                        clk.note,
                      ]
                        .filter(Boolean)
                        .join(" - ")}
                    </span>
                  ) : null}
                </span>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
