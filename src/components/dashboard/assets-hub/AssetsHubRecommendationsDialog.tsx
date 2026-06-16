"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Info,
  Loader2,
  MapPin,
  MapPinned,
  Navigation,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HostIcon } from "@/components/icons/HostIcon";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { PLACE_CATEGORIES } from "@/lib/constants";
import type { HostAsset } from "@/lib/assets-hub";
import {
  getRecommendationInput,
  getRecommendationSourceLabel,
} from "@/lib/assets-hub";
import {
  nearbyCategoryLabel,
  nearbyCategoryMeta,
} from "@/lib/nearby-categories";
import { cn } from "@/lib/utils";
import type { CreatePlaceInput, UpdatePlaceInput } from "@/lib/validations";
import { PlaceCard } from "@/components/editor/featured/places/PlaceCard";
import { DiscoverTab } from "@/components/editor/featured/places/DiscoverTab";
import { PlaceEditPanel } from "@/components/editor/featured/places/PlaceEditPanel";
import {
  PlacesMap,
  type PlacesMapEntry,
} from "@/components/editor/featured/places/PlacesMap";
import {
  suggestionKey,
  useDiscover,
  type DiscoverPayload,
  type SuggestionPlace,
} from "@/components/editor/featured/places/useDiscover";
import type { SavedPlace } from "@/components/editor/featured/places/useSavedPlaces";

type Category = (typeof PLACE_CATEGORIES)[number];
type SearchCategory = "all" | Category;
type RecommendationTab = "saved" | "discover";

const RECOMMENDATION_TAB_ACCENTS: Record<
  RecommendationTab,
  { bg: string; color: string }
> = {
  saved: { bg: "#ECFFF5", color: "#1FBF8F" },
  discover: { bg: "#EEF4FF", color: "#4D7CFF" },
};

function tabAccentStyle(tab: RecommendationTab, active: boolean) {
  if (!active) return undefined;

  const accent = RECOMMENDATION_TAB_ACCENTS[tab];
  return {
    backgroundColor: accent.bg,
    borderColor: `${accent.color}33`,
    color: accent.color,
  };
}

type RecommendationSource = {
  sourceQuery: string;
  sourceLocation: string;
  sourceLat: number;
  sourceLng: number;
  sourceRadiusMiles: number;
  sourceCategory: SearchCategory;
};

type EditTarget =
  | { kind: "saved"; place: SavedPlace }
  | { kind: "draft"; lat: number; lng: number }
  | null;

type AssetPayload = {
  assetType: "local_recommendation";
  name: string;
  description?: string | null;
  content: Record<string, unknown>;
  fileUrl?: string | null;
  tags?: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "browse" | "add-by-map";
  assets: HostAsset[];
  onAssetCreated: (asset: HostAsset) => void;
  onAssetUpdated: (asset: HostAsset) => void;
  onAssetDeleted: (assetId: string) => void;
};

const DISCOVER_ENDPOINT = "/api/assets-hub/recommendations/discover";

function parseCoordinates(input: string) {
  const trimmed = input.trim();
  const regex =
    /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  if (!regex.test(trimmed)) return null;
  const [latRaw, lngRaw] = trimmed.split(",");
  const lat = Number(latRaw.trim());
  const lng = Number(lngRaw.trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function CoordinatesHelpPopover({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "h-8 w-8 shrink-0 rounded-md border border-primary/20 bg-primary/10 text-primary shadow-sm hover:border-primary/35 hover:bg-primary/15",
              className
            )}
            aria-label="How to use precise map coordinates"
          />
        }
      >
        <Info className="h-4 w-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="w-[min(380px,calc(100vw-24px))] gap-0 overflow-hidden rounded-xl border border-primary/20 bg-background p-0 text-left shadow-xl ring-1 ring-primary/10"
      >
        <div className="border-b border-border/70 bg-primary/5 px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-foreground">
                Precise location pin
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Use coordinates for the precise, exact location pin of your
                location.
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-3.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Go to Google Maps and right-click your place. A dropdown appears
            with the coordinates at the top. Copy them and paste them here.
          </p>
          <div className="overflow-hidden rounded-lg border border-border/70 bg-muted/25 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/help/google-maps-coordinates-help.svg"
              alt="Google Maps menu showing coordinates at the top after right-clicking a place."
              className="block aspect-[843/793] w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFromRecord(
  record: Record<string, unknown> | undefined,
  key: string,
  fallback = ""
) {
  const value = record?.[key];
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toCategory(value: unknown): Category {
  const raw = typeof value === "string" ? value : "other";
  return (PLACE_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as Category)
    : "other";
}

function validCoords(place: { lat: number; lng: number }) {
  return (
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng) &&
    place.lat !== 0 &&
    place.lng !== 0
  );
}

function uniqueTags(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ).slice(0, 24);
}

function sourceFromAsset(asset: HostAsset): RecommendationSource | null {
  const sourceQuery = textFromRecord(asset.content, "sourceQuery");
  const sourceLocation = textFromRecord(asset.content, "sourceLocation");
  const sourceLat = numberValue(asset.content.sourceLat, 0);
  const sourceLng = numberValue(asset.content.sourceLng, 0);
  const sourceRadiusMiles = numberValue(asset.content.sourceRadiusMiles, 0);
  const sourceCategoryRaw = textFromRecord(asset.content, "sourceCategory", "all");
  const sourceCategory =
    sourceCategoryRaw === "all" ||
    (PLACE_CATEGORIES as readonly string[]).includes(sourceCategoryRaw)
      ? (sourceCategoryRaw as SearchCategory)
      : "all";

  if (!sourceQuery && !sourceLocation) return null;

  return {
    sourceQuery,
    sourceLocation,
    sourceLat,
    sourceLng,
    sourceRadiusMiles,
    sourceCategory,
  };
}

function sourceContent(source: RecommendationSource | null | undefined) {
  if (!source) return {};
  return {
    sourceQuery: source.sourceQuery,
    sourceLocation: source.sourceLocation,
    sourceLat: source.sourceLat,
    sourceLng: source.sourceLng,
    sourceRadiusMiles: source.sourceRadiusMiles,
    sourceCategory: source.sourceCategory,
  };
}

function assetToSavedPlace(asset: HostAsset, index = 0): SavedPlace {
  const input = getRecommendationInput(asset);
  const category = toCategory(input.category);
  const tags = isRecord(input.tags) ? input.tags : {};

  return {
    id: asset.id,
    name:
      typeof input.name === "string" && input.name.trim()
        ? input.name
        : asset.name,
    category,
    description: nullableText(input.description),
    lat: numberValue(input.lat),
    lng: numberValue(input.lng),
    address: nullableText(input.address),
    phone: nullableText(input.phone),
    website: nullableText(input.website),
    email: nullableText(input.email),
    imageUrl: nullableText(input.imageUrl),
    openingHours: nullableText(input.openingHours),
    tags,
    orderIndex: index,
  };
}

function payloadFromPlaceInput(
  input: CreatePlaceInput,
  source?: RecommendationSource | null
): AssetPayload {
  return {
    assetType: "local_recommendation",
    name: input.name.trim(),
    description: input.description ?? null,
    content: {
      name: input.name.trim(),
      category: input.category,
      description: input.description ?? null,
      lat: input.lat,
      lng: input.lng,
      address: input.address ?? null,
      phone: input.phone ?? null,
      website: input.website ?? null,
      email: input.email ?? null,
      imageUrl: input.imageUrl ?? null,
      openingHours: input.openingHours ?? null,
      tags: input.tags ?? {},
      ...sourceContent(source),
    },
    fileUrl: input.imageUrl ?? null,
    tags: uniqueTags(["local", input.category]),
  };
}

function placeInputFromSuggestion(suggestion: SuggestionPlace): CreatePlaceInput {
  return {
    name: suggestion.name,
    category: toCategory(suggestion.category),
    description: suggestion.description,
    lat: suggestion.lat,
    lng: suggestion.lng,
    address: suggestion.address,
    phone: suggestion.phone,
    website: suggestion.website,
    email: suggestion.email,
    imageUrl: suggestion.imageUrl,
    openingHours: suggestion.openingHours,
    tags: suggestion.tags ?? {},
  };
}

function placeInputFromSavedPlace(
  place: SavedPlace,
  patch: UpdatePlaceInput = {}
): CreatePlaceInput {
  return {
    name: patch.name ?? place.name,
    category: toCategory(patch.category ?? place.category),
    description:
      patch.description !== undefined ? patch.description : place.description,
    lat: patch.lat ?? place.lat,
    lng: patch.lng ?? place.lng,
    address: patch.address !== undefined ? patch.address : place.address,
    phone: patch.phone !== undefined ? patch.phone : place.phone,
    website: patch.website !== undefined ? patch.website : place.website,
    email: patch.email !== undefined ? patch.email : place.email,
    imageUrl: patch.imageUrl !== undefined ? patch.imageUrl : place.imageUrl,
    openingHours:
      patch.openingHours !== undefined
        ? patch.openingHours
        : place.openingHours,
    tags: patch.tags !== undefined ? patch.tags : (place.tags ?? {}),
  };
}

function propertySearchQuery(assets: HostAsset[]) {
  for (const asset of assets) {
    if (asset.assetType === "property_host_profile") {
      const property = isRecord(asset.content.property)
        ? asset.content.property
        : {};
      const parts = [
        textFromRecord(property, "address"),
        textFromRecord(property, "city"),
        textFromRecord(property, "state"),
        textFromRecord(property, "country"),
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }

    if (asset.assetType === "property_asset") {
      const parts = [
        textFromRecord(asset.content, "address"),
        textFromRecord(asset.content, "city"),
        textFromRecord(asset.content, "state"),
        textFromRecord(asset.content, "country"),
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(", ");
    }
  }

  return "";
}

function groupSavedRecommendationPlaces(
  places: SavedPlace[],
  sourceById: Map<string, string>
) {
  const groups = new Map<
    string,
    { key: string; label: string; places: SavedPlace[] }
  >();

  for (const place of places) {
    const label = sourceById.get(place.id) || "Ungrouped recommendations";
    const key = label.trim().toLowerCase() || "__ungrouped_recommendations";
    const existing = groups.get(key);
    if (existing) {
      existing.places.push(place);
    } else {
      groups.set(key, { key, label, places: [place] });
    }
  }

  return Array.from(groups.values());
}

function SavedRecommendationsTab({
  places,
  sourceById,
  focusedId,
  deletingIds,
  onFocus,
  onEdit,
  onDelete,
}: {
  places: SavedPlace[];
  sourceById: Map<string, string>;
  focusedId: string | null;
  deletingIds: Set<string>;
  onFocus: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of places) set.add(p.category);
    return Array.from(set);
  }, [places]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.address ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (sourceById.get(p.id) ?? "").toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, places, query, sourceById]);

  const groups = useMemo(
    () => groupSavedRecommendationPlaces(filtered, sourceById),
    [filtered, sourceById]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 border-b border-border/80 bg-background px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter Assets Hub places..."
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
        {places.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-6 text-center text-xs text-muted-foreground">
            No saved Assets Hub recommendations yet.
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
                    <h3 className="truncate text-xs font-semibold text-foreground">
                      {group.label}
                    </h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {group.places.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.places.map((place) => (
                    <div key={place.id} className="relative">
                      <PlaceCard
                        kind="saved"
                        place={place}
                        focused={place.id === focusedId}
                        onFocus={onFocus}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                      {deletingIds.has(place.id) ? (
                        <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/70">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      ) : null}
                    </div>
                  ))}
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

export function AssetsHubRecommendationsDialog({
  open,
  onOpenChange,
  initialMode = "browse",
  assets,
  onAssetCreated,
  onAssetUpdated,
  onAssetDeleted,
}: Props) {
  const discover = useDiscover();
  const hydratedRef = useRef(false);

  const [activeTab, setActiveTab] = useState<RecommendationTab>("saved");
  const [hasSearched, setHasSearched] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isAddByMapMode, setIsAddByMapMode] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationName, setLocationName] = useState("");
  const [anchor, setAnchor] = useState({ lat: 0, lng: 0 });
  const [zoom, setZoom] = useState(2);
  const [radiusMiles, setRadiusMiles] = useState(3);
  const [searchCategory, setSearchCategory] = useState<SearchCategory>("all");
  const [currentSearchSource, setCurrentSearchSource] =
    useState<RecommendationSource | null>(null);

  const recommendationAssets = useMemo(
    () => assets.filter((asset) => asset.assetType === "local_recommendation"),
    [assets]
  );

  const savedPlaces = useMemo(
    () =>
      recommendationAssets.map((asset, index) =>
        assetToSavedPlace(asset, index)
      ),
    [recommendationAssets]
  );

  const sourceById = useMemo(() => {
    return new Map(
      recommendationAssets
        .map((asset) => [asset.id, getRecommendationSourceLabel(asset)] as const)
        .filter((entry) => entry[1])
    );
  }, [recommendationAssets]);

  const savedKeyIndex = useMemo(() => {
    const set = new Set<string>();
    for (const p of savedPlaces) {
      set.add(suggestionKey(p.name, p.lat, p.lng));
    }
    return set;
  }, [savedPlaces]);

  const initialPropertyQuery = useMemo(
    () => propertySearchQuery(assets),
    [assets]
  );

  const runSearch = useCallback(
    async (params: {
      query: string;
      radius: number;
      limit: number;
      category: SearchCategory;
    }) => {
      const trimmed = params.query.trim();
      if (!trimmed) {
        toast.error("Enter a city, address, or coordinates.");
        return;
      }

      const coords = parseCoordinates(trimmed);
      const payload: DiscoverPayload = {
        radiusMiles: Math.max(1, Math.min(10, params.radius)),
        limit: Math.max(10, Math.min(200, params.limit)),
      };
      if (params.category !== "all") {
        payload.categories = [params.category];
      }
      if (coords) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      } else {
        payload.locationQuery = trimmed;
      }

      setHasSearched(true);
      setActiveTab("discover");
      const result = await discover.searchEndpoint(
        DISCOVER_ENDPOINT,
        payload,
        savedKeyIndex
      );
      if (!result) return;

      setAnchor({ lat: result.location.lat, lng: result.location.lng });
      setLocationQuery(result.location.name);
      setLocationName(result.location.name);
      setZoom((current) => Math.max(current, 13));
      setCurrentSearchSource({
        sourceQuery: trimmed,
        sourceLocation: result.location.name,
        sourceLat: result.location.lat,
        sourceLng: result.location.lng,
        sourceRadiusMiles: payload.radiusMiles,
        sourceCategory: params.category,
      });

      if (result.added === 0) {
        toast.message("No new places (all already saved in Assets Hub).");
      } else {
        toast.success(`${result.added} suggestions ready to save.`);
      }
    },
    [discover, savedKeyIndex]
  );

  const handleSearch = useCallback(() => {
    void runSearch({
      query: locationQuery,
      radius: radiusMiles,
      limit: 100,
      category: searchCategory,
    });
  }, [locationQuery, radiusMiles, runSearch, searchCategory]);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const firstPlace = savedPlaces.find(validCoords);
    const initialQuery =
      initialPropertyQuery ||
      firstPlace?.address ||
      (firstPlace ? `${firstPlace.lat.toFixed(4)}, ${firstPlace.lng.toFixed(4)}` : "");

    setLocationQuery(initialQuery);
    setLocationName(initialQuery);
    setAnchor(firstPlace ? { lat: firstPlace.lat, lng: firstPlace.lng } : { lat: 0, lng: 0 });
    setZoom(firstPlace ? 13 : 2);
    setRadiusMiles(3);
    setSearchCategory("all");
    setCurrentSearchSource(null);
    setActiveTab("saved");
    setFocusedId(null);
    setEditTarget(null);
    setIsAddByMapMode(initialMode === "add-by-map");
    setHasSearched(false);
    discover.clear();

    if (initialPropertyQuery && savedPlaces.length === 0) {
      void runSearch({
        query: initialPropertyQuery,
        radius: 3,
        limit: 100,
        category: "all",
      });
    }
  }, [discover, initialMode, initialPropertyQuery, open, runSearch, savedPlaces]);

  const createRecommendationAsset = useCallback(
    async (
      input: CreatePlaceInput,
      source?: RecommendationSource | null
    ): Promise<SavedPlace | null> => {
      const payload = payloadFromPlaceInput(input, source);
      const result = await apiFetch<HostAsset>("/api/assets-hub", {
        method: "POST",
        body: payload,
      });

      if (!result.ok) {
        toastApiError(result.error, {
          title: "Couldn't save recommendation",
        });
        return null;
      }

      onAssetCreated(result.data);
      return assetToSavedPlace(result.data);
    },
    [onAssetCreated]
  );

  const handleAddSuggestion = useCallback(
    async (suggestion: SuggestionPlace) => {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.add(suggestion.id);
        return next;
      });

      const created = await createRecommendationAsset(
        placeInputFromSuggestion(suggestion),
        currentSearchSource
      );

      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });

      if (created) {
        discover.removeSuggestion(suggestion.id);
        toast.success(`Saved "${suggestion.name}" to Assets Hub.`);
      }
    },
    [createRecommendationAsset, currentSearchSource, discover]
  );

  const handleCreateFromPanel = useCallback(
    async (input: CreatePlaceInput) => {
      const created = await createRecommendationAsset(input);
      if (created) {
        toast.success(`Saved "${created.name}" to Assets Hub.`);
      }
      return created;
    },
    [createRecommendationAsset]
  );

  const handleUpdatePlace = useCallback(
    async (id: string, patch: UpdatePlaceInput) => {
      const current = savedPlaces.find((place) => place.id === id);
      if (!current) return false;
      const currentAsset =
        recommendationAssets.find((asset) => asset.id === id) ?? null;

      const payload = payloadFromPlaceInput(
        placeInputFromSavedPlace(current, patch),
        currentAsset ? sourceFromAsset(currentAsset) : null
      );
      const result = await apiFetch<HostAsset>(`/api/assets-hub/${id}`, {
        method: "PATCH",
        body: payload,
      });

      if (!result.ok) {
        toastApiError(result.error, {
          title: "Couldn't update recommendation",
        });
        return false;
      }

      onAssetUpdated(result.data);
      return true;
    },
    [onAssetUpdated, recommendationAssets, savedPlaces]
  );

  const handleDeletePlace = useCallback(
    async (id: string) => {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      const result = await apiFetch(`/api/assets-hub/${id}`, {
        method: "DELETE",
        parseJson: false,
      });

      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (!result.ok) {
        toastApiError(result.error, {
          title: "Couldn't delete recommendation",
        });
        return;
      }

      onAssetDeleted(id);
      setFocusedId((current) => (current === id ? null : current));
      if (editTarget?.kind === "saved" && editTarget.place.id === id) {
        setEditTarget(null);
      }
      toast.success("Recommendation deleted.");
    },
    [editTarget, onAssetDeleted]
  );

  const handleDetect = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not available in this browser.");
      return;
    }

    setIsDetecting(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAnchor({ lat, lng });
      setLocationQuery(label);
      setLocationName(label);
      setZoom((current) => Math.max(current, 13));
      toast.success("Location detected.");
    } catch {
      toast.error("Could not detect location.");
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      const place = savedPlaces.find((p) => p.id === id);
      if (!place) return;
      setEditTarget({ kind: "saved", place });
      setFocusedId(id);
    },
    [savedPlaces]
  );

  const handleMapPick = useCallback(
    (lat: number, lng: number) => {
      if (!isAddByMapMode) return;
      setEditTarget({ kind: "draft", lat, lng });
      setIsAddByMapMode(false);
      setActiveTab("saved");
    },
    [isAddByMapMode]
  );

  const mapEntries = useMemo<PlacesMapEntry[]>(() => {
    const entries: PlacesMapEntry[] = savedPlaces
      .filter(validCoords)
      .map((place) => ({
        id: place.id,
        name: place.name,
        category: place.category,
        description: place.description,
        lat: place.lat,
        lng: place.lng,
        address: place.address,
        tags: place.tags,
        variant: "saved",
      }));

    if (activeTab === "discover") {
      for (const suggestion of discover.suggestions) {
        const key = suggestionKey(
          suggestion.name,
          suggestion.lat,
          suggestion.lng
        );
        if (savedKeyIndex.has(key)) continue;
        entries.push({
          id: suggestion.id,
          name: suggestion.name,
          category: suggestion.category,
          description: suggestion.description,
          lat: suggestion.lat,
          lng: suggestion.lng,
          address: suggestion.address,
          tags: suggestion.tags,
          variant: "suggestion",
        });
      }
    }

    return entries;
  }, [activeTab, discover.suggestions, savedKeyIndex, savedPlaces]);

  const radiusMeters = radiusMiles * 1609.34;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[94vh] max-w-[97vw] gap-0 overflow-hidden p-0 sm:max-w-[97vw]"
        showCloseButton
      >
        <DialogHeader className="border-b border-border/80 bg-card px-4 py-3">
          <DialogTitle className="flex items-center gap-2">
            <MapPinned className="h-4 w-4" />
            Assets Hub Local Places
          </DialogTitle>
          <DialogDescription>
            Discover and save reusable recommendations for guidebooks.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(94vh-72px)] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/80 bg-muted/20 px-3 py-2">
            <div className="relative min-w-[220px] flex-1">
              <MapPin className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="City, address, or lat,lng"
                className="h-9 pl-7 pr-11"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch();
                }}
              />
              <CoordinatesHelpPopover className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 border-transparent bg-muted/60 shadow-none hover:bg-muted" />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDetect()}
              disabled={isDetecting}
            >
              {isDetecting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Navigation className="mr-1.5 h-3.5 w-3.5" />
              )}
              Detect
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSearch()}
              disabled={discover.isSearching}
            >
              {discover.isSearching ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-3.5 w-3.5" />
              )}
              Search
            </Button>
            <Select
              value={searchCategory}
              onValueChange={(value) =>
                setSearchCategory((value as SearchCategory) || "all")
              }
            >
              <SelectTrigger className="h-9 w-[176px] bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {PLACE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {nearbyCategoryLabel(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs">
              <span className="text-muted-foreground">Radius</span>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={radiusMiles}
                onChange={(e) =>
                  setRadiusMiles(Math.max(1, Math.min(10, Number(e.target.value) || 3)))
                }
                className="h-2 w-24 cursor-pointer accent-[var(--primary)]"
              />
              <span className="w-10 text-right font-medium text-primary">
                {radiusMiles.toFixed(1)} mi
              </span>
            </div>
            <Button
              type="button"
              variant={isAddByMapMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsAddByMapMode((value) => !value)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {isAddByMapMode ? "Cancel pin" : "Add by map"}
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(360px,1fr)_1.4fr]">
            <div className="relative flex min-h-0 flex-col border-b border-border/80 lg:border-b-0 lg:border-r">
              <Tabs
                value={activeTab}
                onValueChange={(value) =>
                  setActiveTab((value as "saved" | "discover") ?? "saved")
                }
                className="flex h-full min-h-0 flex-col"
              >
                <div className="border-b border-border/80 bg-background px-3 py-2">
                  <TabsList className="w-full gap-1 bg-transparent p-0">
                    <TabsTrigger
                      value="saved"
                      className="border border-border/60 bg-background/80 px-2.5 data-active:shadow-none"
                      style={tabAccentStyle("saved", activeTab === "saved")}
                    >
                      <Bookmark className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      Saved Assets ({savedPlaces.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="discover"
                      className="border border-border/60 bg-background/80 px-2.5 data-active:shadow-none"
                      style={tabAccentStyle(
                        "discover",
                        activeTab === "discover"
                      )}
                    >
                      <Search className="mr-1.5 h-3.5 w-3.5" />
                      Discover{" "}
                      {discover.suggestions.length > 0
                        ? `(${discover.suggestions.length})`
                        : ""}
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="saved"
                  className="min-h-0 flex-1 overflow-hidden"
                >
                  <SavedRecommendationsTab
                    places={savedPlaces}
                    sourceById={sourceById}
                    focusedId={focusedId}
                    deletingIds={deletingIds}
                    onFocus={setFocusedId}
                    onEdit={handleEdit}
                    onDelete={(id) => void handleDeletePlace(id)}
                  />
                </TabsContent>
                <TabsContent
                  value="discover"
                  className="min-h-0 flex-1 overflow-hidden"
                >
                  <DiscoverTab
                    suggestions={discover.suggestions}
                    isSearching={discover.isSearching}
                    hasSearched={hasSearched}
                    savedKeys={savedKeyIndex}
                    addingIds={addingIds}
                    focusedId={focusedId}
                    onSearch={() => void handleSearch()}
                    onCancel={discover.cancel}
                    onAdd={(suggestion) => void handleAddSuggestion(suggestion)}
                    onFocus={setFocusedId}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="relative min-h-[320px]">
              {open ? (
                <PlacesMap
                  entries={mapEntries}
                  center={anchor}
                  zoom={zoom}
                  radiusMeters={radiusMeters}
                  focusedId={focusedId}
                  addMode={isAddByMapMode}
                  onMapPick={handleMapPick}
                  onSelect={setFocusedId}
                  onMoveEnd={(_center, nextZoom) => setZoom(nextZoom)}
                />
              ) : null}
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[1050] flex items-center justify-between gap-2">
                <div className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow">
                  {locationName || "No location selected"}
                </div>
                {isAddByMapMode ? (
                  <div className="pointer-events-none rounded-full bg-slate-900/90 px-3 py-1 text-xs font-medium text-white shadow">
                    Click map to place pin
                  </div>
                ) : null}
              </div>

              <PlaceEditPanel
                open={editTarget !== null}
                target={editTarget}
                onClose={() => setEditTarget(null)}
                onCreate={handleCreateFromPanel}
                onUpdate={handleUpdatePlace}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
