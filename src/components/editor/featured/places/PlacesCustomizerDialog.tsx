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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PLACE_CATEGORIES } from "@/lib/constants";
import { apiFetch } from "@/lib/api-fetch";
import type { HostAsset } from "@/lib/assets-hub";
import { getRecommendationInput } from "@/lib/assets-hub";
import { cn } from "@/lib/utils";
import { readNearbySettingsFromGuidebookSettings } from "@/lib/nearby";
import { formatLocationSearchAddress } from "@/lib/hero-data";
import { useEditorStore } from "@/stores/editor-store";
import type { CreatePlaceInput } from "@/lib/validations";
import { MyPlacesTab } from "./MyPlacesTab";
import { DiscoverTab } from "./DiscoverTab";
import { AssetsHubPlacesTab } from "./AssetsHubPlacesTab";
import { PlaceEditPanel, type PlaceEditTarget } from "./PlaceEditPanel";
import { PlacesMap, type PlacesMapEntry } from "./PlacesMap";
import { useDiscover, suggestionKey, type SuggestionPlace } from "./useDiscover";
import { useSavedPlaces, type SavedPlace } from "./useSavedPlaces";

type Category = (typeof PLACE_CATEGORIES)[number];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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

function inputFromSuggestion(suggestion: SuggestionPlace): CreatePlaceInput {
  return {
    name: suggestion.name,
    category: suggestion.category,
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

function draftTargetFromSuggestion(
  suggestion: SuggestionPlace
): PlaceEditTarget {
  return {
    kind: "draft",
    name: suggestion.name,
    category: suggestion.category,
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
                Precise property pin
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Use coordinates for the precise, exact location pin of your
                property.
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

export function PlacesCustomizerDialog({ open, onOpenChange }: Props) {
  const guidebookId = useEditorStore((s) => s.guidebookId);
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const heroProperty = useEditorStore((s) => s.guidebook?.heroData.property);
  const updateGuidebookSettings = useEditorStore(
    (s) => s.updateGuidebookSettings
  );

  const nearbyConfig = useMemo(
    () => readNearbySettingsFromGuidebookSettings(guidebookSettings),
    [guidebookSettings]
  );

  const saved = useSavedPlaces(guidebookId, open);
  const discover = useDiscover();

  const [activeTab, setActiveTab] = useState<"saved" | "discover" | "assets">(
    "saved"
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<PlaceEditTarget | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [isAddByMapMode, setIsAddByMapMode] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const [locationQuery, setLocationQuery] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const [anchor, setAnchor] = useState<{ lat: number; lng: number }>(() => ({
    lat: nearbyConfig.center_lat,
    lng: nearbyConfig.center_lng,
  }));
  const [zoom, setZoom] = useState<number>(nearbyConfig.zoom ?? 13);
  const [radiusMiles, setRadiusMiles] = useState<number>(
    nearbyConfig.radius_miles ?? 3
  );

  const settingsDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (settingsDebounce.current) clearTimeout(settingsDebounce.current);
    };
  }, []);

  const scheduleSettingsPersist = useCallback(
    (patch: Partial<typeof nearbyConfig>) => {
      if (settingsDebounce.current) clearTimeout(settingsDebounce.current);
      settingsDebounce.current = setTimeout(() => {
        updateGuidebookSettings({
          nearby: {
            ...nearbyConfig,
            ...patch,
          },
        });
      }, 300);
    },
    [nearbyConfig, updateGuidebookSettings]
  );

  const handleMoveEnd = useCallback(
    (_next: { lat: number; lng: number }, nextZoom: number) => {
      // Anchor stays where the user pinned/searched/detected; only zoom is
      // a viewport preference worth persisting.
      setZoom(nextZoom);
      scheduleSettingsPersist({ zoom: nextZoom });
    },
    [scheduleSettingsPersist]
  );

  const handleRadiusChange = useCallback(
    (next: number) => {
      const clamped = Math.max(1, Math.min(10, next));
      setRadiusMiles(clamped);
      scheduleSettingsPersist({ radius_miles: clamped });
    },
    [scheduleSettingsPersist]
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
      scheduleSettingsPersist({
        center_lat: lat,
        center_lng: lng,
        location_name: label,
      });
      toast.success("Location detected.");
    } catch {
      toast.error("Could not detect location.");
    } finally {
      setIsDetecting(false);
    }
  }, [scheduleSettingsPersist]);

  const savedKeyIndex = useMemo(() => {
    const set = new Set<string>();
    for (const p of saved.places) {
      set.add(suggestionKey(p.name, p.lat, p.lng));
    }
    return set;
  }, [saved.places]);

  const runSearch = useCallback(
    async (params: { query: string; radius: number; limit: number }) => {
      if (!guidebookId) return;
      const trimmed = params.query.trim();
      if (!trimmed) {
        toast.error("Enter a city, address, or coordinates.");
        return;
      }
      const coords = parseCoordinates(trimmed);
      const payload: Parameters<typeof discover.search>[1] = {
        radiusMiles: Math.max(1, Math.min(10, params.radius)),
        limit: Math.max(10, Math.min(200, params.limit)),
      };
      if (coords) {
        payload.lat = coords.lat;
        payload.lng = coords.lng;
      } else {
        payload.locationQuery = trimmed;
      }
      setHasSearched(true);
      setActiveTab("discover");
      const result = await discover.search(guidebookId, payload, savedKeyIndex);
      if (!result) return;
      setAnchor({ lat: result.location.lat, lng: result.location.lng });
      setLocationQuery(result.location.name);
      setLocationName(result.location.name);
      scheduleSettingsPersist({
        center_lat: result.location.lat,
        center_lng: result.location.lng,
        location_name: result.location.name,
      });
      if (result.added === 0) {
        toast.message("No new places (all already saved).");
      } else {
        toast.success(`${result.added} suggestions ready to review.`);
      }
    },
    [discover, guidebookId, savedKeyIndex, scheduleSettingsPersist]
  );

  const handleSearch = useCallback(() => {
    void runSearch({
      query: locationQuery,
      radius: radiusMiles,
      limit: nearbyConfig.places_limit ?? 100,
    });
  }, [locationQuery, nearbyConfig.places_limit, radiusMiles, runSearch]);

  useEffect(() => {
    if (!open) {
      hydratedRef.current = false;
      return;
    }
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const savedName =
      typeof nearbyConfig.location_name === "string"
        ? nearbyConfig.location_name
        : "";
    const hasSavedLocation =
      savedName.length > 0 ||
      nearbyConfig.center_lat !== 0 ||
      nearbyConfig.center_lng !== 0;
    // Search query uses city/state/country only — Overpass/Nominatim choke
    // on a specific street address but resolve city/state reliably.
    const propertySearchAddress = heroProperty
      ? formatLocationSearchAddress(heroProperty)
      : "";
    const initialQuery = hasSavedLocation ? savedName : propertySearchAddress;
    const initialRadius = nearbyConfig.radius_miles ?? 3;
    const initialLimit = nearbyConfig.places_limit ?? 100;
    setLocationQuery(initialQuery);
    setLocationName(savedName);
    setAnchor({
      lat: nearbyConfig.center_lat,
      lng: nearbyConfig.center_lng,
    });
    setZoom(nearbyConfig.zoom ?? 13);
    setRadiusMiles(initialRadius);
    setActiveTab("saved");
    setFocusedId(null);
    setEditTarget(null);
    setIsAddByMapMode(false);
    setHasSearched(false);
    discover.clear();
    // If we've never saved a nearby location and the host has a property
    // address on file, run Discover automatically so the modal opens with
    // useful suggestions instead of an empty map.
    if (!hasSavedLocation && propertySearchAddress) {
      void runSearch({
        query: propertySearchAddress,
        radius: initialRadius,
        limit: initialLimit,
      });
    }
  }, [open, nearbyConfig, heroProperty, discover, runSearch]);

  const handleAddSuggestion = useCallback(
    async (suggestion: SuggestionPlace) => {
      const key = suggestionKey(suggestion.name, suggestion.lat, suggestion.lng);
      if (savedKeyIndex.has(key) || addingIds.has(suggestion.id)) return;

      setAddingIds((prev) => {
        const next = new Set(prev);
        next.add(suggestion.id);
        return next;
      });
      const created = await saved.createPlace(inputFromSuggestion(suggestion));
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
      if (created) {
        toast.success(`Added "${suggestion.name}".`);
      }
    },
    [addingIds, saved, savedKeyIndex]
  );

  const handleAddAllSuggestions = useCallback(
    async (suggestions: SuggestionPlace[]) => {
      const candidates = suggestions.filter((suggestion) => {
        const key = suggestionKey(
          suggestion.name,
          suggestion.lat,
          suggestion.lng
        );
        return !savedKeyIndex.has(key) && !addingIds.has(suggestion.id);
      });

      if (candidates.length === 0) {
        toast.message("All discovered places are already added.");
        return;
      }

      setAddingIds((prev) => {
        const next = new Set(prev);
        for (const suggestion of candidates) next.add(suggestion.id);
        return next;
      });

      let addedCount = 0;
      try {
        for (const suggestion of candidates) {
          const created = await saved.createPlace(
            inputFromSuggestion(suggestion)
          );
          if (created) addedCount += 1;
        }
      } finally {
        setAddingIds((prev) => {
          const next = new Set(prev);
          for (const suggestion of candidates) next.delete(suggestion.id);
          return next;
        });
      }

      if (addedCount === candidates.length) {
        toast.success(`Added ${addedCount} places.`);
      } else if (addedCount > 0) {
        toast.message(`Added ${addedCount} of ${candidates.length} places.`);
      }
    },
    [addingIds, saved, savedKeyIndex]
  );

  const handleEditAndAddSuggestion = useCallback(
    (suggestion: SuggestionPlace) => {
      const key = suggestionKey(suggestion.name, suggestion.lat, suggestion.lng);
      if (savedKeyIndex.has(key)) {
        toast.message("This place is already added.");
        return;
      }
      setFocusedId(suggestion.id);
      setEditTarget(draftTargetFromSuggestion(suggestion));
    },
    [savedKeyIndex]
  );

  const handleAddAssetsHubPlace = useCallback(
    async (asset: HostAsset) => {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.add(asset.id);
        return next;
      });

      const input = getRecommendationInput(asset);
      const created = await saved.createPlace({
        name: String(input.name ?? asset.name),
        category: (PLACE_CATEGORIES as readonly string[]).includes(
          String(input.category ?? "other")
        )
          ? (String(input.category) as Category)
          : "other",
        description: (input.description as string | null) ?? null,
        lat: typeof input.lat === "number" ? input.lat : 0,
        lng: typeof input.lng === "number" ? input.lng : 0,
        address: (input.address as string | null) ?? null,
        phone: (input.phone as string | null) ?? null,
        website: (input.website as string | null) ?? null,
        email: (input.email as string | null) ?? null,
        imageUrl: (input.imageUrl as string | null) ?? null,
        openingHours: (input.openingHours as string | null) ?? null,
        tags: (input.tags as Record<string, unknown>) ?? {},
      });

      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });

      if (created) {
        void apiFetch(`/api/assets-hub/${asset.id}/use`, { method: "POST" });
        toast.success(`Added "${asset.name}" from Assets Hub.`);
      }
    },
    [saved]
  );

  const handleEdit = useCallback(
    (id: string) => {
      const place = saved.places.find((p) => p.id === id);
      if (!place) return;
      setEditTarget({ kind: "saved", place });
      setFocusedId(id);
    },
    [saved.places]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await saved.deletePlace(id);
      setFocusedId((current) => (current === id ? null : current));
    },
    [saved]
  );

  const handleUndoDelete = useCallback(
    async (place: SavedPlace) => {
      const category = (PLACE_CATEGORIES as readonly string[]).includes(
        place.category
      )
        ? (place.category as Category)
        : "other";
      await saved.createPlace({
        name: place.name,
        category,
        description: place.description,
        lat: place.lat,
        lng: place.lng,
        address: place.address,
        phone: place.phone,
        website: place.website,
        email: place.email,
        imageUrl: place.imageUrl,
        openingHours: place.openingHours,
        tags: (place.tags as Record<string, unknown>) ?? {},
      });
    },
    [saved]
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

  const handleSelectFromMap = useCallback(
    (id: string) => {
      const isSavedPlace = saved.places.some((place) => place.id === id);
      const isSuggestion = discover.suggestions.some(
        (suggestion) => suggestion.id === id
      );

      if (isSavedPlace) {
        setActiveTab("saved");
      } else if (isSuggestion) {
        setActiveTab("discover");
      }
      setFocusedId(id);
    },
    [discover.suggestions, saved.places]
  );

  const mapEntries = useMemo<PlacesMapEntry[]>(() => {
    const entries: PlacesMapEntry[] = saved.places
      .filter(
        (p) =>
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng) &&
          p.lat !== 0 &&
          p.lng !== 0
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        lat: p.lat,
        lng: p.lng,
        address: p.address,
        tags: p.tags,
        variant: "saved",
      }));
    if (activeTab === "discover") {
      for (const s of discover.suggestions) {
        const key = suggestionKey(s.name, s.lat, s.lng);
        if (savedKeyIndex.has(key)) continue;
        entries.push({
          id: s.id,
          name: s.name,
          category: s.category,
          description: s.description,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
          tags: s.tags,
          variant: "suggestion",
        });
      }
    }
    return entries;
  }, [activeTab, discover.suggestions, saved.places, savedKeyIndex]);

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
            Maps & Local Places
          </DialogTitle>
          <DialogDescription>
            Saved places update instantly. Use Discover to find more nearby.
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(94vh-72px)] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-border/80 bg-muted/20 px-3 py-2.5">
            <div className="flex min-w-[300px] max-w-[680px] flex-[1_1_460px] items-stretch overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
              <div className="relative flex min-w-0 flex-1 items-center">
                <MapPin className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="City, address, or lat,lng"
                  className="h-10 min-w-0 rounded-none border-0 bg-transparent pl-9 pr-11 shadow-none focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSearch();
                  }}
                />
                <CoordinatesHelpPopover className="absolute right-1.5 top-1/2 -translate-y-1/2 border-transparent bg-muted/60 shadow-none hover:bg-muted" />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSearch()}
                disabled={discover.isSearching}
                className="h-auto rounded-none px-4"
              >
                {discover.isSearching ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                )}
                Search
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-xl px-3"
                onClick={() => void handleDetect()}
                disabled={isDetecting}
                aria-label="Use current location"
              >
                {isDetecting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Navigation className="mr-1.5 h-3.5 w-3.5" />
                )}
                Current location
              </Button>
              <div className="flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-background px-3 text-xs shadow-sm">
                <span className="font-medium text-muted-foreground">
                  Radius
                </span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={radiusMiles}
                  onChange={(e) =>
                    handleRadiusChange(Number(e.target.value) || 3)
                  }
                  className="h-2 w-24 cursor-pointer accent-[var(--primary)]"
                  aria-label="Search radius"
                />
                <span className="w-10 text-right font-semibold text-primary">
                  {radiusMiles.toFixed(1)} mi
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant={isAddByMapMode ? "default" : "outline"}
              size="sm"
              className="ml-auto h-10 rounded-xl px-3"
              onClick={() => setIsAddByMapMode((v) => !v)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {isAddByMapMode ? "Cancel pin" : "Add by map"}
            </Button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(360px,1fr)_1.4fr]">
            <div className="relative flex min-h-0 flex-col border-b border-border/80 lg:border-b-0 lg:border-r">
              <Tabs
                value={activeTab}
                onValueChange={(v) =>
                  setActiveTab((v as "saved" | "discover" | "assets") ?? "saved")
                }
                className="flex h-full min-h-0 flex-col"
              >
                <div className="border-b border-border/80 bg-background px-3 py-2">
                  <TabsList className="w-full">
                    <TabsTrigger value="saved">
                      <Bookmark className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      My Places ({saved.places.length})
                    </TabsTrigger>
                    <TabsTrigger value="discover">
                      <Search className="mr-1.5 h-3.5 w-3.5" />
                      Discover{" "}
                      {discover.suggestions.length > 0
                        ? `(${discover.suggestions.length})`
                        : ""}
                    </TabsTrigger>
                    <TabsTrigger value="assets">
                      <Bookmark className="mr-1.5 h-3.5 w-3.5" />
                      Assets Hub
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="saved"
                  className="min-h-0 flex-1 overflow-hidden"
                >
                  <MyPlacesTab
                    places={saved.places}
                    isLoading={saved.isLoading}
                    focusedId={focusedId}
                    onFocus={setFocusedId}
                    onEdit={handleEdit}
                    onDelete={(id) => handleDelete(id)}
                    onUndoDelete={handleUndoDelete}
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
                    onAdd={(s) => void handleAddSuggestion(s)}
                    onAddAll={(suggestions) =>
                      void handleAddAllSuggestions(suggestions)
                    }
                    onEditAndAdd={handleEditAndAddSuggestion}
                    onFocus={setFocusedId}
                  />
                </TabsContent>
                <TabsContent
                  value="assets"
                  className="min-h-0 flex-1 overflow-hidden"
                >
                  <AssetsHubPlacesTab
                    savedKeys={savedKeyIndex}
                    addingIds={addingIds}
                    onAdd={(asset) => void handleAddAssetsHubPlace(asset)}
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
                  onSelect={handleSelectFromMap}
                  onMoveEnd={handleMoveEnd}
                />
              ) : null}
              <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[1050] flex items-center justify-between gap-2">
                <div className="rounded-full border border-white/70 bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow">
                  {locationName || "No location selected"}
                </div>
              </div>

              <PlaceEditPanel
                open={editTarget !== null}
                target={editTarget}
                onClose={() => setEditTarget(null)}
                onCreate={saved.createPlace}
                onUpdate={saved.updatePlace}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
