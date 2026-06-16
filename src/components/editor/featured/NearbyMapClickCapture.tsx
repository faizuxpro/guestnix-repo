"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { useMapEvents } from "react-leaflet";

type Props = {
  enabled: boolean;
  onPick: (lat: number, lng: number) => void;
  onMapReady?: (map: LeafletMap) => void;
  onMoveEnd?: (map: LeafletMap) => void;
};

export function NearbyMapClickCapture({
  enabled,
  onPick,
  onMapReady,
  onMoveEnd,
}: Props) {
  const onPickRef = useRef(onPick);
  const onMapReadyRef = useRef(onMapReady);
  const onMoveEndRef = useRef(onMoveEnd);
  const readyMapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    onMoveEndRef.current = onMoveEnd;
  }, [onMoveEnd]);

  const map = useMapEvents({
    click: (e) => {
      if (!enabled) return;
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    },
    moveend: () => {
      onMoveEndRef.current?.(map);
    },
  });

  useEffect(() => {
    const onReady = onMapReadyRef.current;
    if (!onReady) return;
    if (readyMapRef.current === map) return;
    readyMapRef.current = map;
    onReady(map);
  }, [map]);

  return null;
}
