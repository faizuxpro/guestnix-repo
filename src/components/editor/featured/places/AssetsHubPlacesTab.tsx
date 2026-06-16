"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, MapPinned, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { HostAsset } from "@/lib/assets-hub";
import {
  getRecommendationGroupKey,
  getRecommendationGroupLabel,
  getRecommendationInput,
  getRecommendationSourceLabel,
} from "@/lib/assets-hub";
import { nearbyCategoryLabel } from "@/lib/nearby-categories";
import { useAssetsHubAssets } from "@/hooks/use-assets-hub-content-blocks";
import { suggestionKey } from "./useDiscover";

type Props = {
  savedKeys: Set<string>;
  addingIds: Set<string>;
  onAdd: (asset: HostAsset) => void;
};

function textValue(content: Record<string, unknown>, key: string, fallback = "") {
  const value = content[key];
  return typeof value === "string" ? value : fallback;
}

function numberValue(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function groupRecommendationAssets(assets: HostAsset[]) {
  const groups = new Map<
    string,
    { key: string; label: string; assets: HostAsset[] }
  >();

  for (const asset of assets) {
    const key = getRecommendationGroupKey(asset);
    const existing = groups.get(key);
    if (existing) {
      existing.assets.push(asset);
    } else {
      groups.set(key, {
        key,
        label: getRecommendationGroupLabel(asset),
        assets: [asset],
      });
    }
  }

  return Array.from(groups.values());
}

export function AssetsHubPlacesTab({ savedKeys, addingIds, onAdd }: Props) {
  const { assets, loading } = useAssetsHubAssets("local_recommendation");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const asset of assets) {
      set.add(textValue(asset.content, "category", "other"));
    }
    return Array.from(set);
  }, [assets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      const category = textValue(asset.content, "category", "other");
      if (categoryFilter !== "all" && category !== categoryFilter) return false;
      if (!q) return true;
      return (
        asset.name.toLowerCase().includes(q) ||
        (asset.description ?? "").toLowerCase().includes(q) ||
        textValue(asset.content, "address").toLowerCase().includes(q) ||
        getRecommendationSourceLabel(asset).toLowerCase().includes(q)
      );
    });
  }, [assets, categoryFilter, query]);

  const groups = useMemo(() => groupRecommendationAssets(filtered), [filtered]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border/80 bg-background px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Assets Hub recommendations..."
            className="h-8 pl-7 text-xs"
          />
        </div>
        {categories.length > 0 ? (
          <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            <FilterChip
              active={categoryFilter === "all"}
              label="All"
              onClick={() => setCategoryFilter("all")}
            />
            {categories.map((cat) => (
              <FilterChip
                key={cat}
                active={categoryFilter === cat}
                label={nearbyCategoryLabel(cat)}
                onClick={() => setCategoryFilter(cat)}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-6 text-center text-xs text-muted-foreground">
            No Assets Hub recommendations yet.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-6 text-center text-xs text-muted-foreground">
            No recommendations match this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.key} className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <MapPinned className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <h3 className="truncate text-xs font-semibold">
                      {group.label}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {group.assets.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.assets.map((asset) => {
                    const input = getRecommendationInput(asset);
                    const lat = numberValue(asset.content, "lat");
                    const lng = numberValue(asset.content, "lng");
                    const key = suggestionKey(asset.name, lat, lng);
                    const alreadySaved = savedKeys.has(key);
                    const isAdding = addingIds.has(asset.id);
                    const category = textValue(
                      asset.content,
                      "category",
                      "other"
                    );

                    return (
                      <div
                        key={asset.id}
                        className="rounded-xl border bg-card p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-semibold">
                                {asset.name}
                              </p>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {nearbyCategoryLabel(category)}
                              </Badge>
                            </div>
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {(input.description as string | null) ||
                                textValue(asset.content, "address") ||
                                "Local recommendation"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            disabled={alreadySaved || isAdding}
                            onClick={() => onAdd(asset)}
                          >
                            {alreadySaved ? (
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                            ) : isAdding ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Plus className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {alreadySaved ? "Added" : "Add"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
