"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  STORE_REQUESTS_UPDATED_EVENT,
  countUnreadStoreRequestUpdates,
  parseStoreRequestResumeUrl,
  readSavedStoreRequests,
  updateStoreRequestKnownAt,
  type SavedStoreRequest,
} from "@/lib/store/guest-request-cache";

type Props = {
  guidebookSlug: string;
  disabled?: boolean;
  onUnreadChange: (count: number) => void;
};

export function StoreUpdatesClient({
  guidebookSlug,
  disabled = false,
  onUnreadChange,
}: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [savedRequests, setSavedRequests] = useState<SavedStoreRequest[]>([]);

  const syncFromStorage = useCallback(() => {
    const next = readSavedStoreRequests(guidebookSlug);
    setSavedRequests(next);
    onUnreadChange(countUnreadStoreRequestUpdates(next));
    return next;
  }, [guidebookSlug, onUnreadChange]);

  const refreshKnownUpdates = useCallback(async () => {
    const requests = readSavedStoreRequests(guidebookSlug);
    if (requests.length === 0) {
      setSavedRequests([]);
      onUnreadChange(0);
      return;
    }

    await Promise.all(
      requests.map(async (request) => {
        const parsed = parseStoreRequestResumeUrl(request.resumeUrl);
        if (!parsed) return;

        const response = await fetch(parsed.apiPath, {
          cache: "no-store",
        }).catch(() => null);
        if (!response?.ok) return;

        const payload = await response.json().catch(() => null);
        const updatedAt =
          typeof payload?.request?.updatedAt === "string"
            ? payload.request.updatedAt
            : null;
        if (!updatedAt) return;

        updateStoreRequestKnownAt({
          slug: guidebookSlug,
          requestId: parsed.requestId,
          updatedAt,
        });
      })
    );

    syncFromStorage();
  }, [guidebookSlug, onUnreadChange, syncFromStorage]);

  useEffect(() => {
    let initialTimer: number | null = null;

    if (disabled) {
      initialTimer = window.setTimeout(() => {
        onUnreadChange(0);
      }, 0);
      return () => {
        if (initialTimer != null) window.clearTimeout(initialTimer);
      };
    }

    initialTimer = window.setTimeout(() => {
      syncFromStorage();
      void refreshKnownUpdates();
    }, 0);

    const handleStoreRequestUpdate = (event: Event) => {
      const custom = event as CustomEvent<{ slug?: string }>;
      if (custom.detail?.slug !== guidebookSlug) return;
      syncFromStorage();
    };
    window.addEventListener(
      STORE_REQUESTS_UPDATED_EVENT,
      handleStoreRequestUpdate
    );

    const interval = window.setInterval(() => {
      void refreshKnownUpdates();
    }, 60_000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshKnownUpdates();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener(
        STORE_REQUESTS_UPDATED_EVENT,
        handleStoreRequestUpdate
      );
      if (initialTimer != null) window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [
    disabled,
    guidebookSlug,
    onUnreadChange,
    refreshKnownUpdates,
    syncFromStorage,
  ]);

  useEffect(() => {
    if (disabled || savedRequests.length === 0) return;

    const channels = savedRequests
      .map((request) => parseStoreRequestResumeUrl(request.resumeUrl))
      .filter((request): request is NonNullable<typeof request> =>
        Boolean(request)
      )
      .map((request) => {
        const channel = supabase.channel(`store_request:${request.requestId}`);
        channel.on("broadcast", { event: "request_update" }, () => {
          void refreshKnownUpdates();
        });
        channel.subscribe();
        return channel;
      });

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [
    disabled,
    guidebookSlug,
    refreshKnownUpdates,
    savedRequests,
    supabase,
    syncFromStorage,
  ]);

  return null;
}
