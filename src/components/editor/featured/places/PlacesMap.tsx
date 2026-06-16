"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Home, MapPin, MousePointerClick, Radar } from "lucide-react";
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";
import { cn } from "@/lib/utils";
import { NearbyMapClickCapture } from "../NearbyMapClickCapture";
import { PlaceMarker, type PlaceMarkerData } from "./PlaceMarker";
import { getHomeIcon, getMarkerIcon, type MarkerVariant } from "./markerIcons";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

function formatRadiusLabel(radiusMeters: number) {
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    return "Search area";
  }

  if (radiusMeters >= 1000) {
    const kilometers = radiusMeters / 1000;
    const rounded =
      kilometers >= 10
        ? Math.round(kilometers).toString()
        : kilometers.toFixed(1).replace(/\.0$/, "");
    return `${rounded} km radius`;
  }

  return `${Math.round(radiusMeters)} m radius`;
}

export type PlacesMapEntry = PlaceMarkerData & { variant: MarkerVariant };

type Props = {
  entries: PlacesMapEntry[];
  center: { lat: number; lng: number };
  zoom: number;
  radiusMeters: number;
  focusedId?: string | null;
  addMode?: boolean;
  onMapPick?: (lat: number, lng: number) => void;
  onSelect?: (id: string) => void;
  onMoveEnd?: (center: { lat: number; lng: number }, zoom: number) => void;
};

export function PlacesMap({
  entries,
  center,
  zoom,
  radiusMeters,
  focusedId,
  addMode,
  onMapPick,
  onSelect,
  onMoveEnd,
}: Props) {
  const [leafletLib, setLeafletLib] = useState<typeof import("leaflet") | null>(
    null
  );
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRegistry = useRef(new Map<string, LeafletMarker>());
  const programmaticMoveTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isProgrammatic = useRef(false);

  useEffect(() => {
    let mounted = true;
    import("leaflet")
      .then((mod) => {
        if (mounted) setLeafletLib(mod);
      })
      .catch(() => {
        if (mounted) setLeafletLib(null);
      });
    return () => {
      mounted = false;
      if (programmaticMoveTimer.current) {
        clearTimeout(programmaticMoveTimer.current);
      }
    };
  }, []);

  const handleMapReady = useCallback((map: LeafletMap) => {
    mapRef.current = map;
    queueMicrotask(() => {
      if (mapRef.current === map) {
        map.invalidateSize();
      }
    });
  }, []);

  const handleMoveEnd = useCallback(
    (map: LeafletMap) => {
      if (isProgrammatic.current) return;
      const c = map.getCenter();
      onMoveEnd?.({ lat: c.lat, lng: c.lng }, map.getZoom());
    },
    [onMoveEnd]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusedId) return;
    const target = entries.find((e) => e.id === focusedId);
    if (!target) return;
    isProgrammatic.current = true;
    if (programmaticMoveTimer.current) {
      clearTimeout(programmaticMoveTimer.current);
    }
    programmaticMoveTimer.current = setTimeout(() => {
      isProgrammatic.current = false;
    }, 350);
    const nextZoom = Math.max(map.getZoom(), 15);
    map.setView([target.lat, target.lng], nextZoom, { animate: true });
    const marker = markerRegistry.current.get(focusedId);
    if (marker) marker.openPopup();
  }, [focusedId, entries]);

  // Re-center the map when the anchor (search/detect target) changes after
  // mount — MapContainer only respects the initial `center` prop on its own.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getCenter();
    if (
      Math.abs(current.lat - center.lat) < 1e-6 &&
      Math.abs(current.lng - center.lng) < 1e-6
    ) {
      return;
    }
    isProgrammatic.current = true;
    if (programmaticMoveTimer.current) {
      clearTimeout(programmaticMoveTimer.current);
    }
    programmaticMoveTimer.current = setTimeout(() => {
      isProgrammatic.current = false;
    }, 350);
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center.lat, center.lng]);

  const handleMarkerOpen = useCallback(
    (marker: LeafletMarker, id: string) => {
      markerRegistry.current.set(id, marker);
    },
    []
  );

  const mapCenter = useMemo<[number, number]>(
    () => [center.lat, center.lng],
    [center.lat, center.lng]
  );
  const coordinateLabel = useMemo(
    () => `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`,
    [center.lat, center.lng]
  );
  const searchRadiusLabel = useMemo(
    () => formatRadiusLabel(radiusMeters),
    [radiusMeters]
  );

  const hasValidAnchor =
    Number.isFinite(center.lat) &&
    Number.isFinite(center.lng) &&
    !(center.lat === 0 && center.lng === 0);

  return (
    <div
      className={cn(
        "relative h-full w-full",
        addMode && "places-map--add-mode"
      )}
    >
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <NearbyMapClickCapture
          enabled={Boolean(addMode)}
          onPick={(lat, lng) => onMapPick?.(lat, lng)}
          onMapReady={handleMapReady}
          onMoveEnd={handleMoveEnd}
        />
        {hasValidAnchor ? (
          <Circle
            center={mapCenter}
            radius={radiusMeters}
            pathOptions={{
              color: "#1a2a6c",
              fillColor: "#4a7bd9",
              fillOpacity: 0.12,
              weight: 2,
            }}
          />
        ) : null}
        {leafletLib && hasValidAnchor ? (
          <Marker
            position={mapCenter}
            icon={getHomeIcon(leafletLib)}
            keyboard={false}
            zIndexOffset={1000}
          >
            <Popup
              className="places-popup places-property-popup"
              minWidth={260}
              maxWidth={280}
            >
              <article className="overflow-hidden bg-white text-slate-900">
                <header className="relative overflow-hidden bg-[linear-gradient(135deg,#042129_0%,#0b3039_62%,#134954_100%)] px-3.5 pb-3 pt-3.5 pr-8 text-white">
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[#6FEF8B]" />
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                      <Home
                        className="h-5 w-5 text-[#6FEF8B]"
                        aria-hidden
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#BDF9C9]">
                        <Radar className="h-3 w-3" aria-hidden />
                        <span>Search anchor</span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-semibold leading-snug text-white">
                        Property location
                      </h3>
                    </div>
                  </div>
                </header>
                <div className="p-3.5">
                  <p className="text-xs leading-relaxed text-slate-600">
                    Nearby suggestions are searched from this point.
                  </p>
                  <dl className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
                    <div className="grid grid-cols-[1.5rem_1fr] gap-x-2.5 py-2.5">
                      <dt className="flex h-6 w-6 items-center justify-center text-[#0b3039]">
                        <Radar className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">Discovery radius</span>
                      </dt>
                      <dd>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Discovery radius
                        </div>
                        <div className="mt-0.5 text-xs font-medium text-slate-800">
                          {searchRadiusLabel}
                        </div>
                      </dd>
                    </div>
                    <div className="grid grid-cols-[1.5rem_1fr] gap-x-2.5 py-2.5">
                      <dt className="flex h-6 w-6 items-center justify-center text-[#0b3039]">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">Coordinates</span>
                      </dt>
                      <dd>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Coordinates
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[11px] text-slate-700">
                          {coordinateLabel}
                        </div>
                      </dd>
                    </div>
                  </dl>
                </div>
              </article>
            </Popup>
          </Marker>
        ) : null}
        {leafletLib
          ? entries.map((entry) => {
              const variant: MarkerVariant =
                entry.id === focusedId ? "focused" : entry.variant;
              const icon = getMarkerIcon(leafletLib, entry.category, variant);
              return (
                <PlaceMarker
                  key={entry.id}
                  place={entry}
                  icon={icon}
                  focused={entry.id === focusedId}
                  onSelect={onSelect}
                  onOpen={handleMarkerOpen}
                />
              );
            })
          : null}
      </MapContainer>
      {addMode ? (
        <div className="pointer-events-none absolute inset-0 z-[950]">
          <div className="absolute inset-0 border-2 border-primary/70 shadow-[inset_0_0_0_9999px_rgba(4,33,41,0.08),inset_0_0_44px_rgba(4,33,41,0.18)]" />
          <div className="absolute left-1/2 top-4 w-[min(420px,calc(100%-32px))] -translate-x-1/2 overflow-hidden rounded-xl border border-white/70 bg-slate-950/92 text-white shadow-2xl">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary shadow-lg">
                <MapPin className="h-5 w-5" aria-hidden />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-slate-950">
                  +
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <MousePointerClick className="h-4 w-4 text-primary-foreground" />
                  Click map to place pin
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-white/72">
                  Pick the exact spot for the new recommendation.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <style>{`
        .places-map--add-mode .leaflet-container,
        .places-map--add-mode .leaflet-pane,
        .places-map--add-mode .leaflet-tile,
        .places-map--add-mode .leaflet-interactive {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23042129' d='M16 2C10.48 2 6 6.48 6 12c0 7.5 8.8 16.8 9.18 17.2a1.12 1.12 0 0 0 1.64 0C17.2 28.8 26 19.5 26 12c0-5.52-4.48-10-10-10Z'/%3E%3Ccircle cx='16' cy='12' r='4.2' fill='%236FEF8B'/%3E%3Cpath fill='white' d='M15 7h2v10h-2zM11 11h10v2H11z'/%3E%3C/svg%3E") 16 30, crosshair !important;
        }
        .places-map--add-mode .leaflet-control,
        .places-map--add-mode .leaflet-control * {
          cursor: auto !important;
        }
        .custom-marker {
          background: transparent;
          border: 0;
        }
        .leaflet-container .leaflet-marker-icon.custom-marker {
          background: transparent;
        }
        .leaflet-container .places-popup .leaflet-popup-content-wrapper {
          overflow: hidden;
          border-radius: 10px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.22);
          padding: 0;
        }
        .leaflet-container .places-popup .leaflet-popup-content {
          margin: 0;
          width: 260px !important;
        }
        .leaflet-container .places-property-popup .leaflet-popup-content {
          width: 280px !important;
        }
        .leaflet-container .places-popup .leaflet-popup-tip {
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.16);
        }
        .leaflet-container .places-popup .leaflet-popup-close-button {
          align-items: center;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 999px;
          color: rgb(51, 65, 85);
          display: flex;
          font: 18px/1 sans-serif;
          height: 22px;
          justify-content: center;
          padding: 0;
          right: 8px;
          top: 8px;
          width: 22px;
        }
        .leaflet-container .places-popup .leaflet-popup-close-button:hover,
        .leaflet-container .places-popup .leaflet-popup-close-button:focus-visible {
          background: #ffffff;
          color: rgb(15, 23, 42);
        }
        .leaflet-container .places-popup .places-directions-link,
        .leaflet-container .places-popup .places-directions-link:visited {
          background: #042129;
          border-color: #042129;
          color: #ffffff !important;
          text-decoration: none;
        }
        .leaflet-container .places-popup .places-directions-link:hover,
        .leaflet-container .places-popup .places-directions-link:focus-visible {
          background: #0b3039;
          border-color: #0b3039;
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
}
