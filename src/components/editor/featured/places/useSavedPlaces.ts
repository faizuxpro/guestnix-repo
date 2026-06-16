"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { useEditorStore } from "@/stores/editor-store";
import type { CreatePlaceInput, UpdatePlaceInput } from "@/lib/validations";

export type SavedPlace = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  tags: Record<string, unknown> | null;
  orderIndex: number;
};

const BUMP_DEBOUNCE_MS = 750;

export function useSavedPlaces(guidebookId: string | null, enabled: boolean) {
  const bumpPlacesVersion = useEditorStore((s) => s.bumpPlacesVersion);
  const applyDraftTouch = useEditorStore((s) => s.applyDraftTouch);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleBump = useCallback(() => {
    if (bumpTimer.current) clearTimeout(bumpTimer.current);
    bumpTimer.current = setTimeout(() => {
      bumpPlacesVersion();
      bumpTimer.current = null;
    }, BUMP_DEBOUNCE_MS);
  }, [bumpPlacesVersion]);

  const refetch = useCallback(async () => {
    if (!guidebookId) return;
    setIsLoading(true);
    const result = await apiFetch<SavedPlace[]>(
      `/api/guidebooks/${guidebookId}/places`
    );
    setIsLoading(false);
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load places",
        // eslint-disable-next-line react-hooks/immutability
        onRetry: () => void refetch(),
      });
      return;
    }
    setPlaces(Array.isArray(result.data) ? result.data : []);
    hasLoadedRef.current = true;
  }, [guidebookId]);

  useEffect(() => {
    if (!enabled || !guidebookId || hasLoadedRef.current) return;
    void refetch();
  }, [enabled, guidebookId, refetch]);

  useEffect(() => {
    return () => {
      if (bumpTimer.current) clearTimeout(bumpTimer.current);
    };
  }, []);

  const createPlace = useCallback(
    async (input: CreatePlaceInput): Promise<SavedPlace | null> => {
      if (!guidebookId) return null;
      const result = await apiFetch<SavedPlace>(
        `/api/guidebooks/${guidebookId}/places`,
        { method: "POST", body: input }
      );
      if (!result.ok) {
        toastApiError(result.error, {
          title: "Couldn't add place",
          // eslint-disable-next-line react-hooks/immutability
          onRetry: () => void createPlace(input),
        });
        return null;
      }
      applyDraftTouch(result.data);
      setPlaces((prev) => [...prev, result.data]);
      scheduleBump();
      return result.data;
    },
    [applyDraftTouch, guidebookId, scheduleBump]
  );

  const updatePlace = useCallback(
    async (id: string, patch: UpdatePlaceInput): Promise<boolean> => {
      if (!guidebookId) return false;
      const previous = places;
      setPlaces((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.category !== undefined
                  ? { category: patch.category }
                  : {}),
                ...(patch.description !== undefined
                  ? { description: patch.description ?? null }
                  : {}),
                ...(patch.lat !== undefined ? { lat: patch.lat } : {}),
                ...(patch.lng !== undefined ? { lng: patch.lng } : {}),
                ...(patch.address !== undefined
                  ? { address: patch.address ?? null }
                  : {}),
                ...(patch.phone !== undefined
                  ? { phone: patch.phone ?? null }
                  : {}),
                ...(patch.website !== undefined
                  ? { website: patch.website ?? null }
                  : {}),
                ...(patch.email !== undefined
                  ? { email: patch.email ?? null }
                  : {}),
                ...(patch.imageUrl !== undefined
                  ? { imageUrl: patch.imageUrl ?? null }
                  : {}),
                ...(patch.openingHours !== undefined
                  ? { openingHours: patch.openingHours ?? null }
                  : {}),
                ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
              }
            : p
        )
      );
      const result = await apiFetch(
        `/api/guidebooks/${guidebookId}/places/${id}`,
        { method: "PATCH", body: patch }
      );
      if (!result.ok) {
        setPlaces(previous);
        toastApiError(result.error, {
          title: "Couldn't update place",
          // eslint-disable-next-line react-hooks/immutability
          onRetry: () => void updatePlace(id, patch),
        });
        return false;
      }
      applyDraftTouch(result.data);
      scheduleBump();
      return true;
    },
    [applyDraftTouch, guidebookId, places, scheduleBump]
  );

  const deletePlace = useCallback(
    async (id: string): Promise<SavedPlace | null> => {
      if (!guidebookId) return null;
      const target = places.find((p) => p.id === id) ?? null;
      setPlaces((prev) => prev.filter((p) => p.id !== id));
      const result = await apiFetch(
        `/api/guidebooks/${guidebookId}/places/${id}`,
        { method: "DELETE" }
      );
      if (!result.ok) {
        if (target) setPlaces((prev) => [...prev, target]);
        toastApiError(result.error, {
          title: "Couldn't remove place",
          // eslint-disable-next-line react-hooks/immutability
          onRetry: () => void deletePlace(id),
        });
        return null;
      }
      applyDraftTouch(result.data);
      scheduleBump();
      return target;
    },
    [applyDraftTouch, guidebookId, places, scheduleBump]
  );

  return {
    places,
    isLoading,
    refetch,
    createPlace,
    updatePlace,
    deletePlace,
  };
}
