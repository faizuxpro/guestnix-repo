"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EditorBlock } from "@/stores/editor-store";
import { PromptedInput } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

function readString(content: Record<string, unknown>, key: string) {
  const v = content[key];
  return typeof v === "string" ? v : "";
}

function readNumber(content: Record<string, unknown>, key: string, fallback: number) {
  const v = content[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function readUnits(content: Record<string, unknown>): "celsius" | "fahrenheit" {
  return content.units === "fahrenheit" ? "fahrenheit" : "celsius";
}

function readForecastDays(content: Record<string, unknown>): 1 | 3 | 5 {
  const v = content.forecast_days;
  if (v === 1 || v === 5) return v;
  return 3;
}

export function WeatherBlockEditor({ block, onChange }: Props) {
  const locationLabel = readString(block.content, "location_label");
  const lat = readNumber(block.content, "lat", 0);
  const lng = readNumber(block.content, "lng", 0);
  const units = readUnits(block.content);
  const forecastDays = readForecastDays(block.content);

  const patch = (next: {
    location_label?: string;
    lat?: number;
    lng?: number;
    units?: "celsius" | "fahrenheit";
    forecast_days?: 1 | 3 | 5;
  }) => {
    onChange({
      location_label: next.location_label ?? locationLabel,
      lat: next.lat ?? lat,
      lng: next.lng ?? lng,
      units: next.units ?? units,
      forecast_days: next.forecast_days ?? forecastDays,
    });
  };

  return (
    <div className="space-y-3">
      <PromptedInput
        label="Location label"
        value={locationLabel}
        onChange={(v) => patch({ location_label: v })}
        placeholder="Asheville, NC"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`weather-lat-${block.id}`}>Latitude</Label>
          <input
            id={`weather-lat-${block.id}`}
            type="number"
            step="any"
            value={lat}
            onChange={(e) => {
              const n = Number(e.target.value);
              patch({ lat: Number.isFinite(n) ? n : 0 });
            }}
            className="h-10 w-full rounded-md border border-border/60 bg-muted/70 px-3 text-[14px] font-medium outline-none transition-colors hover:border-foreground/40 hover:bg-background focus-visible:border-primary focus-visible:bg-background"
            placeholder="35.5951"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`weather-lng-${block.id}`}>Longitude</Label>
          <input
            id={`weather-lng-${block.id}`}
            type="number"
            step="any"
            value={lng}
            onChange={(e) => {
              const n = Number(e.target.value);
              patch({ lng: Number.isFinite(n) ? n : 0 });
            }}
            className="h-10 w-full rounded-md border border-border/60 bg-muted/70 px-3 text-[14px] font-medium outline-none transition-colors hover:border-foreground/40 hover:bg-background focus-visible:border-primary focus-visible:bg-background"
            placeholder="-82.5515"
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Units</Label>
          <Select
            value={units}
            onValueChange={(v) =>
              patch({ units: v === "fahrenheit" ? "fahrenheit" : "celsius" })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="celsius">Celsius (°C)</SelectItem>
              <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Forecast length</Label>
          <Select
            value={String(forecastDays)}
            onValueChange={(v) => {
              const n = Number(v);
              patch({ forecast_days: n === 1 || n === 5 ? (n as 1 | 5) : 3 });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Today only</SelectItem>
              <SelectItem value="3">3-day forecast</SelectItem>
              <SelectItem value="5">5-day forecast</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
