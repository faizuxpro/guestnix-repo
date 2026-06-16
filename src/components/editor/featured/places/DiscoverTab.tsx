"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HostIcon } from "@/components/icons/HostIcon";
import { nearbyCategoryMeta } from "@/lib/nearby-categories";
import { PlaceCard } from "./PlaceCard";
import type { SuggestionPlace } from "./useDiscover";
import { suggestionKey } from "./useDiscover";

type Props = {
  suggestions: SuggestionPlace[];
  isSearching: boolean;
  hasSearched: boolean;
  savedKeys: Set<string>;
  addingIds: Set<string>;
  focusedId: string | null;
  onSearch: () => void;
  onCancel: () => void;
  onAdd: (suggestion: SuggestionPlace) => void;
  onAddAll?: (suggestions: SuggestionPlace[]) => void;
  onEditAndAdd?: (suggestion: SuggestionPlace) => void;
  onFocus: (id: string) => void;
};

export function DiscoverTab({
  suggestions,
  isSearching,
  hasSearched,
  savedKeys,
  addingIds,
  focusedId,
  onSearch,
  onCancel,
  onAdd,
  onAddAll,
  onEditAndAdd,
  onFocus,
}: Props) {
  const [filter, setFilter] = useState<string>("all");
  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  const categoriesInResults = useMemo(() => {
    const set = new Set<string>();
    for (const s of suggestions) set.add(s.category);
    return Array.from(set);
  }, [suggestions]);

  const filtered = useMemo(() => {
    if (filter === "all") return suggestions;
    return suggestions.filter((s) => s.category === filter);
  }, [filter, suggestions]);

  const unsavedSuggestions = useMemo(
    () =>
      suggestions.filter((suggestion) => {
        const key = suggestionKey(
          suggestion.name,
          suggestion.lat,
          suggestion.lng
        );
        return !savedKeys.has(key);
      }),
    [savedKeys, suggestions]
  );

  const readyToAddSuggestions = useMemo(
    () =>
      unsavedSuggestions.filter(
        (suggestion) => !addingIds.has(suggestion.id)
      ),
    [addingIds, unsavedSuggestions]
  );

  const isAddingAll =
    unsavedSuggestions.length > 0 &&
    readyToAddSuggestions.length === 0 &&
    unsavedSuggestions.some((suggestion) => addingIds.has(suggestion.id));

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
    if (!focusedId || filter === "all") return;
    const focused = suggestions.find((suggestion) => suggestion.id === focusedId);
    if (!focused || focused.category === filter) return;

    const timer = window.setTimeout(() => {
      setFilter("all");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [filter, focusedId, suggestions]);

  const handleAdd = useCallback(
    (id: string) => {
      const suggestion = suggestions.find((s) => s.id === id);
      if (!suggestion) return;
      onAdd(suggestion);
    },
    [onAdd, suggestions]
  );

  const handleAddAll = useCallback(() => {
    if (!onAddAll || readyToAddSuggestions.length === 0) return;
    onAddAll(readyToAddSuggestions);
  }, [onAddAll, readyToAddSuggestions]);

  const handleEditAndAdd = useCallback(
    (id: string) => {
      const suggestion = suggestions.find((s) => s.id === id);
      if (!suggestion) return;
      onEditAndAdd?.(suggestion);
    },
    [onEditAndAdd, suggestions]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border/80 bg-background px-3 py-2.5">
        <div className="flex items-center gap-2">
          {isSearching ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Searching...
              <X className="ml-2 h-3 w-3" />
              <span className="text-xs">Cancel</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSearch}
              className="flex-1"
              disabled={isSearching}
            >
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Search nearby
            </Button>
          )}
          {onAddAll && suggestions.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleAddAll}
              disabled={
                isSearching ||
                readyToAddSuggestions.length === 0 ||
                isAddingAll
              }
              className="h-8 shrink-0 px-2.5 text-xs"
            >
              {isAddingAll ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isAddingAll
                ? "Adding..."
                : `Add all (${readyToAddSuggestions.length})`}
            </Button>
          ) : null}
        </div>
        {suggestions.length > 0 ? (
          <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            <FilterPill
              active={filter === "all"}
              label={`All categories (${suggestions.length})`}
              icon=""
              color="rgb(2 132 199)"
              soft="rgba(2,132,199,.12)"
              onClick={() => setFilter("all")}
            />
            {categoriesInResults.map((cat) => {
              const meta = nearbyCategoryMeta(cat);
              const count = suggestions.filter((s) => s.category === cat).length;
              return (
                <FilterPill
                  key={cat}
                  active={filter === cat}
                  label={`${meta.label} (${count})`}
                  icon={meta.icon}
                  color={meta.color}
                  soft={meta.soft}
                  onClick={() => setFilter(cat)}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isSearching && suggestions.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : !hasSearched ? (
          <div className="rounded-lg border border-dashed bg-background p-6 text-center text-xs text-muted-foreground">
            Click Search to find places near the current map location. Use the
            chips above to filter results once they arrive.
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-6 text-center text-xs text-muted-foreground">
            No suggestions match this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((suggestion) => {
              const key = suggestionKey(
                suggestion.name,
                suggestion.lat,
                suggestion.lng
              );
              const isAdded = savedKeys.has(key);
              return (
                <div
                  key={suggestion.id}
                  ref={(node) => setItemRef(suggestion.id, node)}
                >
                  <PlaceCard
                    kind="suggestion"
                    place={suggestion}
                    focused={suggestion.id === focusedId}
                    isAdded={isAdded}
                    isAdding={addingIds.has(suggestion.id)}
                    onAdd={handleAdd}
                    onEditAndAdd={
                      onEditAndAdd ? handleEditAndAdd : undefined
                    }
                    onFocus={onFocus}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({
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
