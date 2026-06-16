"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { PLACE_CATEGORIES } from "@/lib/constants";

export type SuggestionPlace = {
  id: string;
  name: string;
  category: (typeof PLACE_CATEGORIES)[number];
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  tags: Record<string, unknown>;
};

export type DiscoverPayload = {
  lat?: number;
  lng?: number;
  locationQuery?: string;
  radiusMiles: number;
  limit: number;
  categories?: string[];
};

type DiscoverResponse = {
  location: { lat: number; lng: number; name: string };
  places: Array<SuggestionPlace>;
};

export type DiscoverResult = {
  location: { lat: number; lng: number; name: string };
  added: number;
};

function suggestionKey(name: string, lat: number, lng: number) {
  return `${name.toLowerCase()}-${lat.toFixed(5)}-${lng.toFixed(5)}`;
}

export function useDiscover() {
  const [suggestions, setSuggestions] = useState<SuggestionPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsSearching(false);
  }, []);

  const searchEndpoint = useCallback(
    async (
      endpoint: string,
      payload: DiscoverPayload,
      existingKeys: Set<string>
    ): Promise<DiscoverResult | null> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsSearching(true);

      const result = await apiFetch<DiscoverResponse>(
        endpoint,
        { method: "POST", body: payload, signal: controller.signal }
      );

      // If a newer call replaced us, the older one shouldn't touch state.
      if (controllerRef.current !== controller) {
        return null;
      }
      controllerRef.current = null;
      setIsSearching(false);

      if (!result.ok) {
        // Aborted is silent (toastApiError no-ops on `aborted`).
        toastApiError(result.error, {
          title: "Couldn't load suggestions",
          onRetry: () =>
            // eslint-disable-next-line react-hooks/immutability
            void searchEndpoint(endpoint, payload, existingKeys),
        });
        return null;
      }

      const seen = new Set(existingKeys);
      const next = result.data.places.filter((p) => {
        const key = suggestionKey(p.name, p.lat, p.lng);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setSuggestions(next);
      return { location: result.data.location, added: next.length };
    },
    []
  );

  const search = useCallback(
    async (
      guidebookId: string,
      payload: DiscoverPayload,
      existingKeys: Set<string>
    ): Promise<DiscoverResult | null> => {
      return searchEndpoint(
        `/api/guidebooks/${guidebookId}/places/discover`,
        payload,
        existingKeys
      );
    },
    [searchEndpoint]
  );

  const removeSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
  }, []);

  const indexByKey = useMemo(() => {
    const map = new Map<string, SuggestionPlace>();
    for (const s of suggestions) {
      map.set(suggestionKey(s.name, s.lat, s.lng), s);
    }
    return map;
  }, [suggestions]);

  return {
    suggestions,
    isSearching,
    search,
    searchEndpoint,
    cancel,
    removeSuggestion,
    clear,
    indexByKey,
  };
}

export { suggestionKey };
