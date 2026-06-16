"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HostIcon } from "@/components/icons/HostIcon";
import { nearbyCategoryMeta } from "@/lib/nearby-categories";
import { PlaceCard } from "./PlaceCard";
import type { SavedPlace } from "./useSavedPlaces";

type Props = {
  places: SavedPlace[];
  isLoading: boolean;
  focusedId: string | null;
  onFocus: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, target: SavedPlace) => Promise<void>;
  onUndoDelete: (place: SavedPlace) => Promise<void>;
};

export function MyPlacesTab({
  places,
  isLoading,
  focusedId,
  onFocus,
  onEdit,
  onDelete,
  onUndoDelete,
}: Props) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of places) set.add(p.category);
    return Array.from(set);
  }, [places]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter)
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.address ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, places, query]);

  const setItemRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      itemRefs.current.set(id, node);
    } else {
      itemRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    if (!focusedId) return;
    const node = itemRefs.current.get(focusedId);
    if (!node) return;
    node.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [filtered, focusedId]);

  useEffect(() => {
    if (!focusedId) return;
    const focused = places.find((place) => place.id === focusedId);
    if (!focused) return;

    const q = query.trim().toLowerCase();
    const hiddenByCategory =
      categoryFilter !== "all" && focused.category !== categoryFilter;
    const hiddenByQuery =
      q.length > 0 &&
      !(
        focused.name.toLowerCase().includes(q) ||
        (focused.address ?? "").toLowerCase().includes(q) ||
        (focused.description ?? "").toLowerCase().includes(q)
      );

    if (!hiddenByCategory && !hiddenByQuery) return;

    const timer = window.setTimeout(() => {
      setCategoryFilter("all");
      setQuery("");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [categoryFilter, focusedId, places, query]);

  const handleDelete = useCallback(
    async (id: string) => {
      const target = places.find((p) => p.id === id);
      if (!target) return;
      await onDelete(id, target);
      toast("Place removed", {
        action: {
          label: "Undo",
          onClick: () => void onUndoDelete(target),
        },
        duration: 5000,
      });
    },
    [onDelete, onUndoDelete, places]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border/80 bg-background px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter your places..."
            className="h-8 pl-7 text-xs"
          />
        </div>
        {categories.length > 0 ? (
          <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            <FilterChip
              active={categoryFilter === "all"}
              label="All"
              icon=""
              color="rgb(2 132 199)"
              soft="rgba(2,132,199,.12)"
              onClick={() => setCategoryFilter("all")}
            />
            {categories.map((cat) => {
              const meta = nearbyCategoryMeta(cat);
              return (
                <FilterChip
                  key={cat}
                  active={categoryFilter === cat}
                  label={meta.label}
                  icon={meta.icon}
                  color={meta.color}
                  soft={meta.soft}
                  onClick={() => setCategoryFilter(cat)}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : places.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-6 text-center text-xs text-muted-foreground">
            No saved places yet. Search the Discover tab or click the map in
            Add Location mode.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-6 text-center text-xs text-muted-foreground">
            No places match this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((place) => (
              <div key={place.id} ref={(node) => setItemRef(place.id, node)}>
                <PlaceCard
                  kind="saved"
                  place={place}
                  focused={place.id === focusedId}
                  onFocus={onFocus}
                  onEdit={onEdit}
                  onDelete={(id) => void handleDelete(id)}
                />
              </div>
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
  icon,
  color,
  soft,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  color: string;
  soft: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition"
      style={{
        borderColor: active ? color : "rgba(148,163,184,.35)",
        background: active ? soft : "white",
        color: active ? color : "rgb(71 85 105)",
      }}
    >
      <HostIcon value={icon} fallbackIconifyId={null} />
      <span>{label}</span>
    </button>
  );
}
