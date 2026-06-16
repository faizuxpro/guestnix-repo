"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import {
  Mail,
  Clock,
  MapPin,
  UtensilsCrossed,
  Map as MapIcon,
  Phone,
  Globe,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Navigation,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import type {
  CircleMarker as LeafletCircleMarker,
  Marker as LeafletMarker,
} from "leaflet";
import { HostIcon } from "@/components/icons/HostIcon";
import type { TemplatePlace } from "../types";
import { nearbyCategoryMeta } from "@/lib/nearby-categories";
import { extractNearbyEnrichedData, mergePlaceContact } from "@/lib/nearby-enriched";
import { readPlaceImageUrls } from "@/lib/place-images";
import { getHomeIcon, getMarkerIcon } from "@/components/editor/featured/places/markerIcons";
import {
  DEFAULT_NEARBY_INTRO_SETTINGS,
  type NearbyIntroSettings,
} from "@/lib/nearby";
import { editorInspectAttributes } from "@/lib/editor-inspect";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false,
});
const Circle = dynamic(() => import("react-leaflet").then((mod) => mod.Circle), {
  ssr: false,
});
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

type Props = {
  places: TemplatePlace[];
  /** Property name from Property and Host info. */
  propertyName?: string;
  /** Optional map/location label from the nearby map customizer. */
  locationLabel?: string;
  showMap?: boolean;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  radiusMiles?: number;
  categories?: string[];
  intro?: NearbyIntroSettings;
  focusedPlaceId?: string | null;
  highlightedPlaceId?: string | null;
  footerSlot?: ReactNode;
};

function metaFor(category: string) {
  return nearbyCategoryMeta(category);
}

function computeCenter(places: TemplatePlace[]): [number, number] {
  const withCoords = places.filter(
    (p): p is TemplatePlace & { lat: number; lng: number } =>
      typeof p.lat === "number" && typeof p.lng === "number"
  );
  if (withCoords.length === 0) {
    return [20, 0];
  }
  const sumLat = withCoords.reduce((acc, p) => acc + p.lat, 0);
  const sumLng = withCoords.reduce((acc, p) => acc + p.lng, 0);
  return [sumLat / withCoords.length, sumLng / withCoords.length];
}

function introText(text: string, locationLabel: string | undefined) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (
    !locationLabel &&
    (trimmed.includes("{location}") ||
      trimmed.includes("{{property_location}}"))
  ) {
    return "";
  }
  return trimmed
    .replaceAll("{{property_location}}", locationLabel ?? "")
    .replaceAll("{location}", locationLabel ?? "");
}

function PlacesIntro({
  intro,
  locationLabel,
}: {
  intro: NearbyIntroSettings;
  locationLabel?: string;
}) {
  const eyebrow = introText(intro.eyebrow, locationLabel);
  const title = introText(intro.title, locationLabel);
  const subtitle = introText(intro.subtitle, locationLabel);
  const showIntro = intro.enabled && Boolean(eyebrow || title || subtitle);

  if (!showIntro) return null;

  return (
    <header
      className="sl-tab-heading"
      {...editorInspectAttributes(
        { kind: "featured", view: "nearby", focus: "intro" },
        "Edit nearby intro"
      )}
    >
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      {title ? <h2>{title}</h2> : null}
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
  );
}

export function PlacesExplorer({
  places,
  propertyName,
  locationLabel,
  showMap = true,
  centerLat,
  centerLng,
  zoom = 13,
  radiusMiles,
  categories,
  intro = DEFAULT_NEARBY_INTRO_SETTINGS,
  focusedPlaceId,
  highlightedPlaceId,
  footerSlot,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [listScrollTargetId, setListScrollTargetId] = useState<string | null>(
    null
  );
  const [propertyFocused, setPropertyFocused] = useState(false);
  const [leafletLib, setLeafletLib] = useState<typeof import("leaflet") | null>(null);
  const placeCardRefs = useRef(new Map<string, HTMLElement>());
  const galleryRefs = useRef(new Map<string, HTMLDivElement>());
  const markerRefs = useRef(new Map<string, LeafletMarker | LeafletCircleMarker>());
  const propertyMarkerRef = useRef<LeafletMarker | null>(null);
  const propertyDisplayName = propertyName?.trim() || "Your stay";
  const mapLocationLabel = locationLabel?.trim() || undefined;

  useEffect(() => {
    let mounted = true;
    import("leaflet")
      .then((mod) => {
        if (!mounted) return;
        setLeafletLib(mod);
      })
      .catch(() => {
        if (!mounted) return;
        setLeafletLib(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredByConfig = useMemo(() => {
    const configured = Array.isArray(categories) ? categories.filter(Boolean) : [];
    if (configured.length === 0) return places;
    return places.filter((p) => configured.includes(p.category));
  }, [categories, places]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of filteredByConfig) set.add(p.category);
    return Array.from(set);
  }, [filteredByConfig]);

  const visiblePlaces = useMemo(() => {
    if (activeCategory === "all") return filteredByConfig;
    return filteredByConfig.filter((p) => p.category === activeCategory);
  }, [filteredByConfig, activeCategory]);
  const activePlaceId = propertyFocused
    ? null
    : selectedPlaceId ?? focusedPlaceId ?? highlightedPlaceId ?? null;

  useEffect(() => {
    const nextId = focusedPlaceId ?? highlightedPlaceId;
    if (!nextId) return;
    const place = filteredByConfig.find((p) => p.id === nextId);
    if (!place) return;
    setActiveCategory("all");
    setPropertyFocused(false);
    setSelectedPlaceId(nextId);
    setExpandedId(nextId);
    setListScrollTargetId(nextId);
  }, [filteredByConfig, focusedPlaceId, highlightedPlaceId]);

  useEffect(() => {
    if (!listScrollTargetId) return;
    if (!visiblePlaces.some((place) => place.id === listScrollTargetId)) return;
    const raf = requestAnimationFrame(() => {
      placeCardRefs.current
        .get(listScrollTargetId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      setListScrollTargetId(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [listScrollTargetId, visiblePlaces]);

  const mappablePlaces = useMemo(
    () =>
      visiblePlaces.filter(
        (p): p is TemplatePlace & { lat: number; lng: number } =>
          typeof p.lat === "number" && typeof p.lng === "number"
      ),
    [visiblePlaces]
  );

  const computedCenter = useMemo(() => computeCenter(visiblePlaces), [visiblePlaces]);
  const initialCenter: [number, number] =
    typeof centerLat === "number" && typeof centerLng === "number"
      ? [centerLat, centerLng]
      : computedCenter;
  const hasPropertyAnchor =
    typeof centerLat === "number" &&
    typeof centerLng === "number" &&
    Number.isFinite(centerLat) &&
    Number.isFinite(centerLng) &&
    !(centerLat === 0 && centerLng === 0);
  const propertyCenter = useMemo<[number, number] | null>(
    () => (hasPropertyAnchor ? [centerLat, centerLng] : null),
    [centerLat, centerLng, hasPropertyAnchor]
  );
  const radiusMeters =
    typeof radiusMiles === "number" && Number.isFinite(radiusMiles) && radiusMiles > 0
      ? radiusMiles * 1609.34
      : null;
  const initialZoom = mappablePlaces.length > 0 ? zoom : 2;
  const mapKey = `${initialCenter[0].toFixed(3)}-${initialCenter[1].toFixed(3)}-${initialZoom}-${mappablePlaces.length}`;

  const focusPlace = useCallback(
    (id: string) => {
      const place = filteredByConfig.find((p) => p.id === id);
      if (!place) return;
      if (activeCategory !== "all" && activeCategory !== place.category) {
        setActiveCategory("all");
      }
      setPropertyFocused(false);
      setSelectedPlaceId(id);
    },
    [activeCategory, filteredByConfig]
  );

  const selectPlaceFromMap = useCallback(
    (id: string) => {
      focusPlace(id);
      setExpandedId(id);
    },
    [focusPlace]
  );

  const scrollToPlaceListing = useCallback(
    (id: string) => {
      const place = filteredByConfig.find((p) => p.id === id);
      if (!place) return;
      if (activeCategory !== "all" && activeCategory !== place.category) {
        setActiveCategory("all");
      }
      setPropertyFocused(false);
      setSelectedPlaceId(id);
      setExpandedId(id);
      setListScrollTargetId(id);
    },
    [activeCategory, filteredByConfig]
  );

  const setMarkerRef = useCallback(
    (id: string, marker: LeafletMarker | LeafletCircleMarker | null) => {
      if (marker) {
        markerRefs.current.set(id, marker);
      } else {
        markerRefs.current.delete(id);
      }
    },
    []
  );

  const setGalleryRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      galleryRefs.current.set(id, node);
    } else {
      galleryRefs.current.delete(id);
    }
  }, []);

  const scrollGallery = useCallback((id: string, direction: -1 | 1) => {
    const gallery = galleryRefs.current.get(id);
    if (!gallery) return;
    gallery.scrollBy({
      left: direction * gallery.clientWidth,
      behavior: "smooth",
    });
  }, []);

  const focusMarker = useCallback(
    (
      marker: LeafletMarker | LeafletCircleMarker | null,
      center: [number, number]
    ) => {
      if (!marker) return;
      marker.openPopup();
      const map = (
        marker as unknown as {
          _map?: {
            getZoom: () => number;
            setView: (
              center: [number, number],
              zoom: number,
              options?: { animate?: boolean }
            ) => void;
          };
        }
      )._map;
      if (map) {
        map.setView(center, Math.max(map.getZoom(), 15), { animate: true });
      }
    },
    []
  );

  const focusProperty = useCallback(() => {
    if (!propertyCenter) return;
    setSelectedPlaceId(null);
    setExpandedId(null);
    setPropertyFocused(true);
  }, [propertyCenter]);

  useEffect(() => {
    if (!activePlaceId) return;
    const target = mappablePlaces.find((place) => place.id === activePlaceId);
    if (!target) return;

    const raf = requestAnimationFrame(() => {
      focusMarker(markerRefs.current.get(activePlaceId) ?? null, [
        target.lat,
        target.lng,
      ]);
    });
    return () => cancelAnimationFrame(raf);
  }, [activePlaceId, focusMarker, mappablePlaces]);

  useEffect(() => {
    if (!propertyFocused || !propertyCenter) return;
    const raf = requestAnimationFrame(() => {
      focusMarker(propertyMarkerRef.current, propertyCenter);
    });
    return () => cancelAnimationFrame(raf);
  }, [focusMarker, propertyCenter, propertyFocused]);

  if (filteredByConfig.length === 0) {
    return (
      <div
        className="sl-tab"
        {...editorInspectAttributes(
          { kind: "featured", view: "nearby", focus: "page" },
          "Edit nearby page"
        )}
      >
        <PlacesIntro intro={intro} locationLabel={propertyDisplayName} />
        <div className="sl-placeholder">
          <MapIcon aria-hidden />
          <div className="sl-placeholder-title">No nearby places yet.</div>
          <p>
            This section displays places on a map in nearby locations. If you
            are the host, please enable it by customizing the Nearby section.
          </p>
        </div>
        {footerSlot}
      </div>
    );
  }

  return (
    <div
      className="sl-tab sl-nearby"
      {...editorInspectAttributes(
        { kind: "featured", view: "nearby", focus: "page" },
        "Edit nearby page"
      )}
    >
      <PlacesIntro intro={intro} locationLabel={propertyDisplayName} />

      <div className={`sl-nearby-layout${showMap ? "" : " no-map"}`}>
        {showMap ? (
          <div
            className="sl-nearby-map-column"
            {...editorInspectAttributes(
              { kind: "featured", view: "nearby", focus: "map" },
              "Edit nearby map"
            )}
          >
            <div className="sl-nearby-map">
              <MapContainer
                key={mapKey}
                center={initialCenter}
                zoom={initialZoom}
                scrollWheelZoom
                style={{ height: "100%", width: "100%" }}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution="&copy; OpenStreetMap &copy; CARTO"
                />
                {propertyCenter && radiusMeters ? (
                  <Circle
                    center={propertyCenter}
                    radius={radiusMeters}
                    interactive={false}
                    pathOptions={{
                      color: "#1a2a6c",
                      fillColor: "#4a7bd9",
                      fillOpacity: 0.12,
                      weight: 2,
                    }}
                  />
                ) : null}
                {leafletLib && propertyCenter ? (
                  <Marker
                    position={propertyCenter}
                    icon={getHomeIcon(leafletLib)}
                    ref={(marker) => {
                      propertyMarkerRef.current = marker;
                    }}
                    keyboard={false}
                    zIndexOffset={1000}
                    eventHandlers={{
                      click: focusProperty,
                    }}
                  >
                    <Popup className="sl-nearby-popup sl-property-popup" minWidth={240} maxWidth={260}>
                      <article className="sl-map-popup-card">
                        <div className="sl-map-popup-title">
                          {propertyDisplayName}
                        </div>
                        <div className="sl-map-popup-copy">
                          {mapLocationLabel || "Your stay starts here."}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            mapLocationLabel || propertyCenter.join(",")
                          )}`}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="sl-map-popup-cta"
                        >
                          <Navigation aria-hidden />
                          <span>Directions</span>
                        </a>
                      </article>
                    </Popup>
                  </Marker>
                ) : null}
                {mappablePlaces.map((place) => {
                  const enriched = extractNearbyEnrichedData(place.tags);
                  const merged = mergePlaceContact(place, enriched);
                  const directionsQuery = merged.address || `${place.lat},${place.lng}`;
                  const isActive = activePlaceId === place.id;
                  const markerIcon = leafletLib
                    ? getMarkerIcon(leafletLib, place.category, isActive ? "focused" : "saved")
                    : null;
                  if (!markerIcon) {
                    return (
                      <CircleMarker
                        key={place.id}
                        center={[place.lat, place.lng]}
                        ref={(marker) => setMarkerRef(place.id, marker)}
                        radius={isActive ? 10 : 7}
                        pathOptions={{
                          color: metaFor(place.category).color,
                          fillColor: metaFor(place.category).color,
                          fillOpacity: 0.95,
                          weight: isActive ? 5 : 3,
                        }}
                        eventHandlers={{
                          click: () => selectPlaceFromMap(place.id),
                        }}
                      >
                        <Popup className="sl-nearby-popup">
                          <article className="sl-map-popup-card">
                            <div className="sl-map-popup-title">{place.name}</div>
                            <div className="sl-map-popup-copy">
                              {(place.description || "").slice(0, 100)}
                              {(place.description || "").length > 100 ? "..." : ""}
                            </div>
                            <div
                              className="sl-map-popup-cat"
                              style={{
                                background: metaFor(place.category).color,
                              }}
                            >
                              {metaFor(place.category).label}
                            </div>
                            <div className="sl-map-popup-actions">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}`}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="sl-map-popup-cta"
                              >
                                <Navigation aria-hidden />
                                <span>Directions</span>
                              </a>
                              <button
                                type="button"
                                className="sl-map-popup-secondary"
                                onClick={() => scrollToPlaceListing(place.id)}
                              >
                                View listing
                              </button>
                            </div>
                          </article>
                        </Popup>
                      </CircleMarker>
                    );
                  }
                  return (
                    <Marker
                      key={place.id}
                      position={[place.lat, place.lng]}
                      ref={(marker) => setMarkerRef(place.id, marker)}
                      icon={markerIcon as never}
                      eventHandlers={{
                        click: () => selectPlaceFromMap(place.id),
                      }}
                    >
                      <Popup className="sl-nearby-popup">
                        <article className="sl-map-popup-card">
                          <div className="sl-map-popup-title">{place.name}</div>
                          <div className="sl-map-popup-copy">
                            {(place.description || "").slice(0, 100)}
                            {(place.description || "").length > 100 ? "..." : ""}
                          </div>
                          <div
                            className="sl-map-popup-cat"
                            style={{
                              background: metaFor(place.category).color,
                            }}
                          >
                            {metaFor(place.category).label}
                          </div>
                          <div className="sl-map-popup-actions">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="sl-map-popup-cta"
                            >
                              <Navigation aria-hidden />
                              <span>Directions</span>
                            </a>
                            <button
                              type="button"
                              className="sl-map-popup-secondary"
                              onClick={() => scrollToPlaceListing(place.id)}
                            >
                              View listing
                            </button>
                          </div>
                        </article>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
              <style>{`
                .custom-marker {
                  background: transparent;
                  border: 0;
                }
              `}</style>
            </div>

            {propertyCenter ? (
              <button
                type="button"
                className={`sl-nearby-property-card${propertyFocused ? " is-focused" : ""}`}
                onClick={focusProperty}
              >
                <span className="sl-nearby-property-pin" aria-hidden>
                  <MapPin />
                </span>
                <span className="sl-nearby-property-body">
                  <span className="sl-nearby-property-kicker">Your stay</span>
                  <span className="sl-nearby-property-title">
                    {propertyDisplayName}
                  </span>
                  <span className="sl-nearby-property-copy">
                    {mapLocationLabel || "Tap to focus the map on your stay."}
                  </span>
                </span>
                <Navigation aria-hidden className="sl-nearby-property-action" />
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          className="sl-nearby-list-column"
          {...editorInspectAttributes(
            { kind: "featured", view: "nearby", focus: "places" },
            "Edit nearby places"
          )}
        >
          <div className="sl-nearby-meta">
            {mapLocationLabel && (
              <div className="sl-nearby-location">
                <MapPin aria-hidden />
                <span>{mapLocationLabel}</span>
              </div>
            )}
            <div className="sl-nearby-count">
              {visiblePlaces.length} {visiblePlaces.length === 1 ? "place" : "places"}
            </div>
          </div>

          {availableCategories.length > 1 && (
            <div
              className="sl-nearby-filters"
              role="tablist"
              aria-label="Filter places by category"
            >
              <button
                type="button"
                className={`sl-nearby-chip${activeCategory === "all" ? " is-active" : ""}`}
                onClick={() => setActiveCategory("all")}
                role="tab"
                aria-selected={activeCategory === "all"}
              >
                <LayoutGrid aria-hidden />
                <span>All</span>
              </button>
              {availableCategories.map((cat) => {
                const m = metaFor(cat);
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`sl-nearby-chip${isActive ? " is-active" : ""}`}
                    onClick={() => setActiveCategory(cat)}
                    role="tab"
                    aria-selected={isActive}
                  >
                    <HostIcon value={m.icon} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="sl-nearby-cards">
            {visiblePlaces.map((place) => {
          const m = metaFor(place.category);
          const isExpanded = expandedId === place.id;
          const isActive = activePlaceId === place.id;
          const isHighlighted = highlightedPlaceId === place.id;
          const enriched = extractNearbyEnrichedData(place.tags);
          const merged = mergePlaceContact(place, enriched);
          const imageUrls = readPlaceImageUrls(place);
          const mapQuery =
            merged.address ||
            (place.lat != null && place.lng != null
              ? `${place.lat},${place.lng}`
              : place.name);
          const detailRows: Array<{ Icon: LucideIcon; value: string; href: string | null }> = [
            merged.address ? { Icon: MapPin, value: merged.address, href: null } : null,
            merged.email ? { Icon: Mail, value: merged.email, href: `mailto:${merged.email}` } : null,
            merged.openingHours ? { Icon: Clock, value: merged.openingHours, href: null } : null,
            enriched.cuisine ? { Icon: UtensilsCrossed, value: enriched.cuisine, href: null } : null,
          ].filter((row): row is { Icon: LucideIcon; value: string; href: string | null } => Boolean(row));
          const hasDetails = detailRows.length > 0 || enriched.extraInfo.length > 0 || enriched.tags.length > 0;
          const togglePlace = () => {
            focusPlace(place.id);
            setExpandedId((prev) => (prev === place.id ? null : place.id));
          };
          return (
            <article
              key={place.id}
              ref={(node) => {
                if (node) {
                  placeCardRefs.current.set(place.id, node);
                } else {
                  placeCardRefs.current.delete(place.id);
                }
              }}
              className={`sl-nearby-card${imageUrls.length > 0 ? " has-gallery" : ""}${
                isExpanded ? " is-expanded" : ""
              }${
                isActive ? " is-focused" : ""
              }${
                isHighlighted ? " sl-search-highlight" : ""
              }`}
              style={
                {
                  "--sl-place-color": m.color,
                  "--sl-place-soft": m.soft,
                } as CSSProperties
              }
              data-guidebook-search-target={`place-${place.id}`}
              {...editorInspectAttributes(
                { kind: "featured", view: "nearby", focus: "places" },
                "Edit nearby places"
              )}
            >
              {imageUrls.length > 0 ? (
                <div
                  className="sl-nearby-card-media"
                  onClick={togglePlace}
                >
                  <div
                    ref={(node) => setGalleryRef(place.id, node)}
                    className="sl-nearby-card-gallery"
                  >
                    {imageUrls.map((imageUrl, index) => (
                      <span
                        key={`${place.id}-image-${index}-${imageUrl}`}
                        className="sl-nearby-card-gallery-item"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={`${place.name} photo ${index + 1}`}
                          loading="lazy"
                        />
                      </span>
                    ))}
                  </div>
                  {imageUrls.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="sl-nearby-card-scroll-cue left"
                        onClick={(event) => {
                          event.stopPropagation();
                          scrollGallery(place.id, -1);
                        }}
                        aria-label={`Previous photo for ${place.name}`}
                      >
                        <ChevronLeft />
                      </button>
                      <button
                        type="button"
                        className="sl-nearby-card-scroll-cue right"
                        onClick={(event) => {
                          event.stopPropagation();
                          scrollGallery(place.id, 1);
                        }}
                        aria-label={`Next photo for ${place.name}`}
                      >
                        <ChevronRight />
                      </button>
                      <span className="sl-nearby-card-photo-count">
                        {imageUrls.length} photos
                      </span>
                    </>
                  ) : null}
                </div>
              ) : null}
              <button
                type="button"
                className="sl-nearby-card-head"
                onClick={togglePlace}
                aria-expanded={isExpanded}
              >
                <div
                  className="sl-nearby-card-icon"
                  style={{
                    background: m.soft,
                    color: m.color,
                    borderColor: `${m.color}66`,
                  }}
                >
                  <HostIcon value={m.icon} />
                </div>
                <div className="sl-nearby-card-body">
                  <div className="sl-nearby-card-title-row">
                    <div className="sl-nearby-card-title-copy">
                      <span className="sl-nearby-card-name">{place.name}</span>
                      <span
                        className="sl-nearby-card-cat"
                        style={{ background: m.soft, color: m.color }}
                      >
                        {m.label}
                      </span>
                    </div>
                    <ChevronDown
                      className={`sl-nearby-card-chev${isExpanded ? " is-rotated" : ""}`}
                      aria-hidden
                    />
                  </div>
                  {merged.address && (
                    <div className="sl-nearby-card-addr">
                      <MapPin aria-hidden />
                      <span>{merged.address}</span>
                    </div>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="sl-nearby-card-detail">
                  {place.description && (
                    <p className="sl-nearby-card-desc">{place.description}</p>
                  )}
                  {merged.phone || merged.website ? (
                    <div className="sl-nearby-card-actions" style={{ marginBottom: "0.5rem" }}>
                      {merged.phone ? (
                        <a href={`tel:${merged.phone}`} className="sl-nearby-card-btn">
                          <Phone aria-hidden />
                          <span>{merged.phone}</span>
                        </a>
                      ) : null}
                      {merged.website ? (
                        <a
                          href={merged.website}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="sl-nearby-card-btn"
                        >
                          <Globe aria-hidden />
                          <span>Website</span>
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                  {hasDetails ? (
                    <div style={{ display: "grid", gap: "0.42rem", marginBottom: "0.5rem" }}>
                      {detailRows.map((row) => (
                        <div
                          key={`${place.id}-${row.value}`}
                          className="sl-nearby-card-addr"
                          style={{ whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }}
                        >
                          <row.Icon aria-hidden style={{ color: "var(--secondary)", width: "14px", height: "14px" }} />
                          {row.href ? (
                            <a href={row.href} style={{ color: "var(--secondary)", textDecoration: "none" }}>
                              {row.value}
                            </a>
                          ) : (
                            <span>{row.value}</span>
                          )}
                        </div>
                      ))}
                      {enriched.extraInfo.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.32rem" }}>
                          {enriched.extraInfo.map((info) => (
                            <span
                              key={`${place.id}-${info.text}`}
                              className="sl-card-meta"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.28rem",
                                padding: "0.16rem 0.45rem",
                                borderRadius: "0.35rem",
                                background: "var(--bg-paper)",
                                color: "var(--ink-soft)",
                              }}
                            >
                              <info.Icon aria-hidden style={{ color: "var(--secondary)", width: "12px", height: "12px" }} />
                              {info.text}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {enriched.tags.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.32rem" }}>
                          {enriched.tags.map((tag) => (
                            <span
                              key={`${place.id}-${tag}`}
                              className="sl-card-meta"
                              style={{
                                padding: "0.16rem 0.45rem",
                                borderRadius: "0.35rem",
                                background: "var(--bg-paper)",
                                color: "var(--ink-soft)",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="sl-nearby-card-actions">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="sl-nearby-card-btn primary"
                    >
                      <Navigation aria-hidden />
                      <span>Directions</span>
                    </a>
                    {merged.phone && (
                      <a href={`tel:${merged.phone}`} className="sl-nearby-card-btn">
                        <Phone aria-hidden />
                        <span>Call</span>
                      </a>
                    )}
                    {merged.website && (
                      <a
                        href={merged.website}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="sl-nearby-card-btn"
                      >
                        <Globe aria-hidden />
                        <span>Website</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
        </div>
      </div>
      {footerSlot}
    </div>
  );
}
