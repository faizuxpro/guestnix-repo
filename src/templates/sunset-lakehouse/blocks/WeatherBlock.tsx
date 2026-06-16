"use client";

import { useEffect, useState } from "react";
import { CloudSun } from "lucide-react";
import type { WeatherContent } from "../types";

type ApiResp = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};
type WeatherState = {
  key: string;
  data: ApiResp | null;
  error: string | null;
};

// Open-Meteo WMO codes → short label + emoji glyph
const WMO_MAP: Record<number, { label: string; glyph: string }> = {
  0: { label: "Clear", glyph: "☀️" },
  1: { label: "Mostly clear", glyph: "🌤️" },
  2: { label: "Partly cloudy", glyph: "⛅" },
  3: { label: "Overcast", glyph: "☁️" },
  45: { label: "Fog", glyph: "🌫️" },
  48: { label: "Rime fog", glyph: "🌫️" },
  51: { label: "Light drizzle", glyph: "🌦️" },
  53: { label: "Drizzle", glyph: "🌦️" },
  55: { label: "Heavy drizzle", glyph: "🌧️" },
  61: { label: "Light rain", glyph: "🌧️" },
  63: { label: "Rain", glyph: "🌧️" },
  65: { label: "Heavy rain", glyph: "🌧️" },
  71: { label: "Light snow", glyph: "🌨️" },
  73: { label: "Snow", glyph: "❄️" },
  75: { label: "Heavy snow", glyph: "❄️" },
  77: { label: "Snow grains", glyph: "🌨️" },
  80: { label: "Showers", glyph: "🌦️" },
  81: { label: "Heavy showers", glyph: "🌧️" },
  82: { label: "Violent showers", glyph: "⛈️" },
  95: { label: "Thunderstorm", glyph: "⛈️" },
  96: { label: "Thunderstorm w/ hail", glyph: "⛈️" },
  99: { label: "Thunderstorm w/ heavy hail", glyph: "⛈️" },
};

function describe(code: number | undefined) {
  if (code === undefined) return { label: "—", glyph: "—" };
  return WMO_MAP[code] ?? { label: "—", glyph: "🌡️" };
}

function fmtTemp(value: number | undefined, unit: string) {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}°${unit === "fahrenheit" ? "F" : "C"}`;
}

function dayLabel(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(d);
  } catch {
    return iso;
  }
}

export function WeatherBlock({
  content,
}: {
  content: Partial<WeatherContent>;
}) {
  const lat = Number(content.lat);
  const lng = Number(content.lng);
  const units = content.units === "fahrenheit" ? "fahrenheit" : "celsius";
  const days = content.forecast_days === 1 || content.forecast_days === 5
    ? content.forecast_days
    : 3;
  const locationLabel = (content.location_label ?? "").trim();
  const hasLocation =
    Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
  const requestKey = `${lat}:${lng}:${units}:${days}`;

  const [weatherState, setWeatherState] = useState<WeatherState>({
    key: "",
    data: null,
    error: null,
  });

  useEffect(() => {
    if (!hasLocation) return;

    let cancelled = false;
    const tempUnit = units === "fahrenheit" ? "fahrenheit" : "celsius";
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=${tempUnit}` +
      `&forecast_days=${days}` +
      `&timezone=auto`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("failed"))))
      .then((json: ApiResp) => {
        if (cancelled) return;
        setWeatherState({
          key: requestKey,
          data: json,
          error: null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setWeatherState({
          key: requestKey,
          data: null,
          error: "Weather unavailable",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [days, hasLocation, lat, lng, requestKey, units]);

  if (!hasLocation) {
    return null;
  }

  const isCurrentResult = weatherState.key === requestKey;
  const data = isCurrentResult ? weatherState.data : null;
  const error = isCurrentResult ? weatherState.error : null;
  const loading = !isCurrentResult;
  const current = data?.current;
  const currentDesc = describe(current?.weather_code);
  const daily = data?.daily;
  const dailyCount = daily?.time?.length ?? 0;

  return (
    <div className="my-3 overflow-hidden rounded-2xl border bg-white">
      <header
        className="flex items-center gap-2 px-4 py-3 text-white"
        style={{ background: "var(--primary,#0a2321)" }}
      >
        <CloudSun className="h-4 w-4" />
        <p className="text-[13px] font-semibold">
          {locationLabel || "Weather"}
        </p>
      </header>

      <div className="p-4">
        {error ? (
          <p className="text-[13px] text-amber-700">{error}</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-[40px] leading-none" aria-hidden>
                {loading ? "…" : currentDesc.glyph}
              </span>
              <div>
                <p className="text-[28px] font-semibold leading-tight text-neutral-900">
                  {loading ? "—" : fmtTemp(current?.temperature_2m, units)}
                </p>
                <p className="text-[12px] text-neutral-600">{currentDesc.label}</p>
              </div>
            </div>

            {dailyCount > 0 ? (
              <div
                className={`mt-4 grid gap-2`}
                style={{
                  gridTemplateColumns: `repeat(${Math.min(dailyCount, 5)}, minmax(0, 1fr))`,
                }}
              >
                {(daily?.time ?? []).slice(0, days).map((iso, i) => {
                  const d = describe(daily?.weather_code?.[i]);
                  return (
                    <div
                      key={iso}
                      className="rounded-lg bg-neutral-50 px-2 py-2 text-center"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        {i === 0 ? "Today" : dayLabel(iso)}
                      </p>
                      <p className="text-[20px] leading-none" aria-hidden>
                        {d.glyph}
                      </p>
                      <p className="mt-1 text-[12px] font-medium tabular-nums text-neutral-900">
                        {fmtTemp(daily?.temperature_2m_max?.[i], units)}
                      </p>
                      <p className="text-[11px] tabular-nums text-neutral-500">
                        {fmtTemp(daily?.temperature_2m_min?.[i], units)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
        <p className="mt-3 text-right text-[10px] text-neutral-400">
          Forecast via open-meteo.com
        </p>
      </div>
    </div>
  );
}
