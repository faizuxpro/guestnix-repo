"use client";

import { memo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { MapPin, Navigation } from "lucide-react";
import type {
  DivIcon,
  Map as LeafletMap,
  Marker as LeafletMarker,
} from "leaflet";
import { HostIcon } from "@/components/icons/HostIcon";
import { nearbyCategoryMeta } from "@/lib/nearby-categories";
import { mergePlaceContact, extractNearbyEnrichedData } from "@/lib/nearby-enriched";

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

export type PlaceMarkerData = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  tags: Record<string, unknown> | null;
};

type Props = {
  place: PlaceMarkerData;
  icon: DivIcon;
  focused?: boolean;
  onSelect?: (id: string) => void;
  onOpen?: (marker: LeafletMarker, id: string) => void;
};

function PlaceMarkerImpl({ place, icon, focused, onSelect, onOpen }: Props) {
  const meta = nearbyCategoryMeta(place.category);
  const enriched = extractNearbyEnrichedData(place.tags);
  const merged = mergePlaceContact(
    { address: place.address, tags: place.tags },
    enriched
  );
  const directionsQuery = merged.address || `${place.lat},${place.lng}`;
  const shortDescription = place.description
    ? `${place.description.slice(0, 120)}${place.description.length > 120 ? "..." : ""}`
    : null;
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    if (!focused) return;
    const marker = markerRef.current;
    if (marker) {
      marker.openPopup();
      const map = (marker as unknown as { _map?: LeafletMap })._map;
      if (map) {
        map.setView([place.lat, place.lng], Math.max(map.getZoom(), 15), {
          animate: true,
        });
      }
    }
  }, [focused, place.lat, place.lng]);

  return (
    <Marker
      position={[place.lat, place.lng]}
      icon={icon}
      ref={(m) => {
        markerRef.current = m;
        if (m && onOpen) onOpen(m, place.id);
      }}
      eventHandlers={{
        click: () => onSelect?.(place.id),
      }}
    >
      <Popup className="places-popup" minWidth={260} maxWidth={280}>
        <article className="overflow-hidden bg-white text-slate-900">
          <div className="space-y-3 p-3">
            <header className="flex items-start gap-2.5">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border"
                style={{
                  borderColor: `${meta.color}55`,
                  background: meta.soft,
                  color: meta.color,
                }}
              >
                <HostIcon value={meta.icon} className="text-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                  style={{ background: meta.soft, color: meta.color }}
                >
                  {meta.label}
                </span>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-slate-950">
                  {place.name}
                </h3>
              </div>
            </header>

            {merged.address ? (
              <div className="flex items-start gap-1.5 rounded-md bg-slate-50 px-2.5 py-2 text-[11px] leading-snug text-slate-600">
                <MapPin
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
                <span className="line-clamp-2">{merged.address}</span>
              </div>
            ) : null}

            {shortDescription ? (
              <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">
                {shortDescription}
              </p>
            ) : null}

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(directionsQuery)}`}
              target="_blank"
              rel="noreferrer noopener"
              className="places-directions-link flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#042129] bg-[#042129] px-3 text-xs font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6FEF8B] focus-visible:ring-offset-2"
              aria-label={`Open directions to ${place.name}`}
            >
              <Navigation className="h-3.5 w-3.5 shrink-0 text-[#6FEF8B]" aria-hidden />
              <span>Directions</span>
            </a>
          </div>
        </article>
      </Popup>
    </Marker>
  );
}

export const PlaceMarker = memo(PlaceMarkerImpl, (prev, next) => {
  return (
    prev.place.id === next.place.id &&
    prev.place.lat === next.place.lat &&
    prev.place.lng === next.place.lng &&
    prev.place.name === next.place.name &&
    prev.place.category === next.place.category &&
    prev.focused === next.focused &&
    prev.icon === next.icon
  );
});
