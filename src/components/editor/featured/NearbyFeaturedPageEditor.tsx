"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, MapPin, Pencil, Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-fetch";
import {
  readNearbySettingsFromGuidebookSettings,
  type NearbyIntroSettings,
} from "@/lib/nearby";
import { toastApiError } from "@/lib/toast-error";
import { BOTTOM_NAV_MAX, type BottomNavSlot } from "@/types/bottom-nav";
import { useEditorStore } from "@/stores/editor-store";
import { EditorPanelShell, EditorSection, ToggleRow } from "../settings-ui";
import { FeaturedNavCard } from "./controls/PanelHeader";
import { SettingsField, SettingsSection } from "./controls/SettingsField";
import { PlacesCustomizerDialog } from "./places/PlacesCustomizerDialog";

type Props =
  | { mode: "card"; onSelect: () => void }
  | { mode: "detail" }
  | { mode?: undefined; variant?: "standalone" | "inline" };

export function NearbyFeaturedPageEditor(props: Props = { variant: "standalone" }) {
  const guidebookId = useEditorStore((s) => s.guidebookId);
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const bottomNav = useEditorStore((s) => s.bottomNav);
  const placesVersion = useEditorStore((s) => s.placesVersion);
  const setBottomNav = useEditorStore((s) => s.setBottomNav);
  const updateGuidebookSettings = useEditorStore(
    (s) => s.updateGuidebookSettings
  );

  const hasNearbyNav = bottomNav.some((slot) => slot.type === "nearby");
  const [open, setOpen] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const nearbyConfig = useMemo(
    () => readNearbySettingsFromGuidebookSettings(guidebookSettings),
    [guidebookSettings]
  );

  const patchNearbyIntro = (patch: Partial<NearbyIntroSettings>) => {
    updateGuidebookSettings({
      nearby: {
        ...nearbyConfig,
        intro: {
          ...nearbyConfig.intro,
          ...patch,
        },
      },
    });
  };

  function addNearbyToNav() {
    if (hasNearbyNav || bottomNav.length >= BOTTOM_NAV_MAX) return;
    const next: BottomNavSlot = { type: "nearby", label: "Nearby", icon: "" };
    setBottomNav([...bottomNav, next]);
  }

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!guidebookId) {
        setSavedCount(null);
        return;
      }
      setIsLoadingCount(true);
      const result = await apiFetch<Array<unknown>>(
        `/api/guidebooks/${guidebookId}/places`
      );
      if (cancelled) return;
      setIsLoadingCount(false);
      if (!result.ok) {
        setSavedCount(0);
        toastApiError(result.error, {
          title: "Couldn't load saved places",
          onRetry: () => void load(),
        });
        return;
      }
      setSavedCount(Array.isArray(result.data) ? result.data.length : 0);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [guidebookId, placesVersion]);

  const summary = isLoadingCount
    ? "Loading places…"
    : `${savedCount ?? 0} saved recommendation${savedCount === 1 ? "" : "s"}`;

  if (props.mode === "card") {
    return (
      <FeaturedNavCard
        icon={<MapPin className="h-4 w-4" />}
        title="Nearby"
        accent="indigo"
        onSelect={props.onSelect}
      />
    );
  }

  if (props.mode === "detail") {
    return (
      <EditorPanelShell contentClassName="space-y-4">
        <SettingsSection icon={<Type />} title="Page intro">
          <ToggleRow
            label="Show intro text"
            description="Controls the copy above nearby places."
            checked={nearbyConfig.intro.enabled}
            onCheckedChange={(checked) => patchNearbyIntro({ enabled: checked })}
          />

          {nearbyConfig.intro.enabled ? (
            <div className="space-y-2.5">
              <SettingsField label="Eyebrow">
                <Input
                  value={nearbyConfig.intro.eyebrow}
                  maxLength={80}
                  onChange={(event) =>
                    patchNearbyIntro({ eyebrow: event.target.value })
                  }
                  className="h-9 text-xs"
                  aria-label="Nearby intro eyebrow"
                />
              </SettingsField>
              <SettingsField label="Title">
                <Input
                  value={nearbyConfig.intro.title}
                  maxLength={120}
                  onChange={(event) =>
                    patchNearbyIntro({ title: event.target.value })
                  }
                  className="h-9 text-xs"
                  aria-label="Nearby intro title"
                />
              </SettingsField>
              <SettingsField label="Subtitle">
                <Input
                  value={nearbyConfig.intro.subtitle}
                  maxLength={240}
                  onChange={(event) =>
                    patchNearbyIntro({ subtitle: event.target.value })
                  }
                  className="h-9 text-xs"
                  aria-label="Nearby intro subtitle"
                />
              </SettingsField>
            </div>
          ) : null}
        </SettingsSection>

        <div className="rounded-md border border-border/70 bg-muted/15 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold leading-tight">Places list</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{summary}</p>
            </div>
            <Button type="button" size="sm" onClick={() => setOpen(true)}>
              {(savedCount ?? 0) === 0 ? (
                <>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add places
                </>
              ) : (
                <>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Manage places
                </>
              )}
            </Button>
          </div>
        </div>

        {!hasNearbyNav ? (
          <EditorSection
            title="Navigation"
            description="Add Nearby to the bottom nav so guests can open it."
            defaultExpanded
          >
            <div className="flex items-start gap-2 rounded-md border border-amber-200/70 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
              <AlertTriangle
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] leading-snug text-amber-800 dark:text-amber-300">
                  Nearby is not in the bottom nav yet.
                </p>
                {bottomNav.length < BOTTOM_NAV_MAX ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-[11px]"
                    onClick={addNearbyToNav}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Nearby to nav
                  </Button>
                ) : (
                  <p className="mt-2 text-[11px] leading-5 text-amber-800 dark:text-amber-300">
                    Bottom nav is full. Remove a nav slot first, then add Nearby.
                  </p>
                )}
              </div>
            </div>
          </EditorSection>
        ) : null}

        <PlacesCustomizerDialog open={open} onOpenChange={setOpen} />
      </EditorPanelShell>
    );
  }

  // Legacy variants — kept for any external callers/standalone usage.
  const variant = props.variant ?? "standalone";

  const card = (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
      <div className="flex items-stretch bg-indigo-50 dark:bg-indigo-500/8">
        <span
          className="flex w-[76px] shrink-0 items-center justify-center bg-indigo-200/70 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-400"
          aria-hidden
        >
          <MapPin className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <div className="flex flex-1 items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight tracking-tight">
              Nearby
            </p>
            <p className="mt-1 truncate text-[11.5px] leading-tight text-muted-foreground">
              {summary}
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            {(savedCount ?? 0) === 0 ? (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add
              </>
            ) : (
              <>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </>
            )}
          </Button>
        </div>
      </div>
      {!hasNearbyNav ? (
        <div className="border-t-2 border-border bg-amber-50/40 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 flex-1 text-[11px] text-amber-700">
              Nearby is not in the bottom nav yet.
            </p>
            {bottomNav.length < BOTTOM_NAV_MAX ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={addNearbyToNav}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add to nav
              </Button>
            ) : (
              <p className="text-[11px] leading-5 text-amber-700">
                Bottom nav is full.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );

  if (variant === "inline") {
    return (
      <>
        {card}
        <PlacesCustomizerDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-muted/20 p-4">
      <div className="space-y-3">{card}</div>
      <PlacesCustomizerDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
