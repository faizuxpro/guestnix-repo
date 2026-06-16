"use client";

import { useCallback, useEffect, useState } from "react";
import { Infinity as InfinityIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import type { AiSettingsData } from "./types";

type Preset = { label: string; value: number | null };

const PRESETS: Preset[] = [
  { label: "Unlimited", value: null },
  { label: "50 / mo", value: 50 },
  { label: "100 / mo", value: 100 },
  { label: "500 / mo", value: 500 },
  { label: "1000 / mo", value: 1000 },
];

export function AiSettingsTab({
  initialSettings,
}: {
  initialSettings: AiSettingsData;
}) {
  const [data, setData] = useState<AiSettingsData | null>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unlimited, setUnlimited] = useState(initialSettings.cap === null);
  const [value, setValue] = useState(
    initialSettings.cap === null ? "" : String(initialSettings.cap)
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<AiSettingsData>(
      "/api/dashboard/settings/ai",
      {
        cache: "no-store",
      }
    );
    setLoading(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load AI settings",
        // eslint-disable-next-line react-hooks/immutability
        onRetry: () => void refresh(),
      });
      return;
    }

    setData(result.data);
    setUnlimited(result.data.cap === null);
    setValue(result.data.cap === null ? "" : String(result.data.cap));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh]);

  const save = async (cap: number | null) => {
    setSaving(true);
    const result = await apiFetch<AiSettingsData>(
      "/api/dashboard/settings/ai",
      {
        method: "PATCH",
        body: { aiMessageCap: cap },
      }
    );
    setSaving(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't save AI settings",
        onRetry: () => void save(cap),
      });
      return;
    }

    setData(result.data);
    setUnlimited(result.data.cap === null);
    setValue(result.data.cap === null ? "" : String(result.data.cap));
    toast.success(
      cap === null ? "AI concierge set to unlimited" : `Cap set to ${cap} / mo`
    );
  };

  const applyPreset = (v: number | null) => {
    setUnlimited(v === null);
    setValue(v === null ? "" : String(v));
    void save(v);
  };

  const handleSave = () => {
    if (unlimited) {
      void save(null);
      return;
    }

    const n = parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) {
      toast.error("Enter a positive number, or turn on Unlimited");
      return;
    }

    void save(n);
  };

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const used = data.used;
  const cap = data.cap;
  const pct = cap === null ? 0 : Math.min(100, (used / cap) * 100);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              This month&apos;s usage
            </CardTitle>
            <CardDescription>
              Resets on the first of each calendar month.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">
                {used}
              </span>
              <span className="text-sm text-muted-foreground">
                /{" "}
                {cap === null ? (
                  <span className="inline-flex items-center gap-1">
                    <InfinityIcon className="h-4 w-4" /> unlimited
                  </span>
                ) : (
                  `${cap} replies`
                )}
              </span>
            </div>
            {cap !== null && (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly cap</CardTitle>
            <CardDescription>
              When the cap is reached, guests get a friendly message saying the
              AI is paused for the month, but they can still message you
              directly and you can still reply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="unlimited" className="font-medium">
                  Unlimited AI replies
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  No monthly ceiling. Recommended for active rentals.
                </p>
              </div>
              <Switch
                id="unlimited"
                checked={unlimited}
                onCheckedChange={(checked) => {
                  setUnlimited(checked);
                  if (checked) setValue("");
                }}
                disabled={saving}
              />
            </div>

            {!unlimited && (
              <div className="space-y-1.5">
                <Label htmlFor="cap">Custom monthly cap</Label>
                <Input
                  id="cap"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="e.g. 200"
                  disabled={saving}
                  className="max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a whole number. AI stops replying once this limit is
                  reached; your guests can still message you.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {PRESETS.map((preset) => {
                const selected =
                  (preset.value === null && unlimited) ||
                  (preset.value !== null &&
                    !unlimited &&
                    value === String(preset.value));

                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={saving}
                    onClick={() => applyPreset(preset.value)}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition-colors " +
                      (selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted")
                    }
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What counts?</CardTitle>
          <CardDescription>
            Only AI-generated guest replies use the monthly cap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Host replies and guest messages do not count against this number.
            If the cap is reached, conversations can still continue manually in
            Messages.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
