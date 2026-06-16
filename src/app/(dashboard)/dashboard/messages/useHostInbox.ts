"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-fetch";
import type { ApiError } from "@/lib/api-errors";
import { toast } from "sonner";

export type InboxSession = {
  sessionId: string;
  guidebookId: string;
  guidebookTitle: string;
  guestName: string | null;
  guestEmail: string | null;
  anonymousLabel: string;
  aiEnabled: boolean;
  hostEscalatedAt: string | null;
  identityProvidedAt: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  snippet: string;
  hostSnippet: string;
  aiSnippet: string;
  unread: boolean;
  hostNeedsReply: boolean;
  hasAiActivity: boolean;
  latestGuestHostAt: string | null;
  latestHostReplyAt: string | null;
  latestAiActivityAt: string | null;
  hostArchivedAt: string | null;
  aiArchivedAt: string | null;
  unreadCount: number;
  latestHostActivityAt: string | null;
  latestRelevantAt: string | null;
  latestPreview: string;
  latestMessageRole: "guest" | "ai" | "host" | null;
  latestMessageTarget: "ai" | "host" | null;
};

type InboxResponse = {
  usage: { used: number; cap: number | null };
  sessions: InboxSession[];
  needsReplySessions: InboxSession[];
  aiActivitySessions: InboxSession[];
  archivedSessions: InboxSession[];
  quickAccessSessions: InboxSession[];
  unreadMessageCount: number;
};

/**
 * Live-polling hybrid: Supabase Realtime broadcast triggers an instant refresh
 * when the server broadcasts `host_inbox:{userId}` on any new chat message.
 * The 20s fallback poll covers network drops and tab-wake scenarios.
 *
 * Errors are surfaced as ApiError so the UI can show kind-specific messaging
 * (offline / unauthorized / server) instead of a generic string.
 */
export function useHostInbox(fallbackIntervalMs = 20000) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { user } = useAuth();
  const [data, setData] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenUnreadRef = useRef<Set<string> | null>(null);

  const fetchInbox = useCallback(async () => {
    const result = await apiFetch<InboxResponse>(
      "/api/dashboard/chat/sessions",
      { cache: "no-store" }
    );
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setData(result.data);
    setError(null);
  }, []);

  useEffect(() => {
    if (!data) return;
    const unread = new Set(
      data.needsReplySessions.filter((s) => s.unread).map((s) => s.sessionId)
    );
    if (seenUnreadRef.current === null) {
      seenUnreadRef.current = unread;
      return;
    }
    const fresh = data.needsReplySessions.filter(
      (s) => s.unread && !seenUnreadRef.current?.has(s.sessionId)
    );
    seenUnreadRef.current = unread;
    if (fresh.length === 0) return;

    const first = fresh[0];
    const label = first.guestName || first.anonymousLabel;
    if (document.visibilityState !== "visible") {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(
          `${first.unreadCount > 1 ? `${first.unreadCount} new messages` : "New host message"} from ${label}`,
          {
            body: first.hostSnippet || first.snippet || first.guidebookTitle,
            tag: first.sessionId,
          }
        );
      }
    } else {
      toast.info(first.unreadCount > 1 ? "New host messages" : "New host message", {
        description: `From ${label}`,
        duration: 8000,
      });
    }
  }, [data]);

  const enableNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Browser notifications are not supported here.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") {
      toast.success("Inbox notifications enabled.");
      new Notification("Guestnix inbox alerts enabled", {
        body: "You will be notified when a guest needs a host reply.",
        tag: "guestnix-notification-test",
      });
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ("Notification" in window) {
        setNotificationPermission(Notification.permission);
      }
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  // Realtime — push-driven refresh
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`host_inbox:${user.id}`);
    channel.on("broadcast", { event: "session_touch" }, () => {
      void fetchInbox();
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, fetchInbox]);

  // Fallback polling + visibility-driven refresh
  useEffect(() => {
    let disposed = false;
    const loop = async () => {
      if (disposed) return;
      if (document.visibilityState === "visible") {
        await fetchInbox();
      }
      timerRef.current = setTimeout(loop, fallbackIntervalMs);
    };
    void loop();
    const onVis = () => {
      if (document.visibilityState === "visible") void fetchInbox();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchInbox, fallbackIntervalMs]);

  return {
    data,
    loading,
    error,
    refresh: fetchInbox,
    notificationPermission,
    enableNotifications,
  };
}
