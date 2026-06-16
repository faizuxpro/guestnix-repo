"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useChatStore } from "@/stores/chat-store";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { writeGuestIdentity } from "@/lib/guest-identity";
import type { ChatMessage } from "./types";

const TOKEN_KEY = (slug: string) => `guestnix_chat_token_${slug}`;

export function useChatSession(guidebookSlug: string) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const setSession = useChatStore((s) => s.setSession);
  const setMessages = useChatStore((s) => s.setMessages);
  const sessionId = useChatStore((s) => s.sessionId);
  const sessionToken = useChatStore((s) => s.sessionToken);

  const ensureSession = useCallback(
    async (opts: { guestName?: string | null } = {}) => {
      const existingToken =
        typeof window !== "undefined"
          ? window.localStorage.getItem(TOKEN_KEY(guidebookSlug))
          : null;
      const result = await apiFetch<{
        sessionId: string;
        sessionToken: string;
        guestName?: string | null;
        guestEmail?: string | null;
      }>(`/api/chat/${existingToken ?? "new"}/session`, {
        method: "POST",
        body: {
          guidebookSlug,
          guestName: opts.guestName ?? null,
        },
      });
      if (!result.ok) {
        toastApiError(result.error, {
          title: "Couldn't start chat",
          // eslint-disable-next-line react-hooks/immutability
          onRetry: () => void ensureSession(opts),
        });
        throw new Error(result.error.message);
      }
      const data = result.data;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_KEY(guidebookSlug), data.sessionToken);
      }
      writeGuestIdentity(guidebookSlug, {
        guestName: data.guestName ?? opts.guestName ?? null,
        guestEmail: data.guestEmail ?? null,
        source: "chat",
      });
      setSession({
        sessionId: data.sessionId,
        sessionToken: data.sessionToken,
        guestName: data.guestName ?? opts.guestName ?? null,
        guestEmail: data.guestEmail ?? null,
      });
      return data;
    },
    [guidebookSlug, setSession]
  );

  const loadHistory = useCallback(
    async (token: string) => {
      const result = await apiFetch<{
        sessionId: string;
        aiEnabled: boolean;
        guestName: string | null;
        guestEmail: string | null;
        messages: ChatMessage[];
      }>(`/api/chat/${token}/messages`);
      if (!result.ok) {
        // Loading history is non-blocking; the chat still works if it fails.
        // Surface it only if the user is actively retrying.
        return false;
      }
      const data = result.data;
      writeGuestIdentity(guidebookSlug, {
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        source: "chat",
      });
      setSession({
        sessionId: data.sessionId,
        sessionToken: token,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        aiEnabled: data.aiEnabled,
      });
      setMessages(data.messages);
      return true;
    },
    [guidebookSlug, setMessages, setSession]
  );

  // Resume session from localStorage on mount
  const resumedRef = useRef(false);
  const resumeQueryTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const queryToken =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("chat")?.trim() || null
        : null;
    const token =
      queryToken ??
      (typeof window !== "undefined"
        ? window.localStorage.getItem(TOKEN_KEY(guidebookSlug))
        : null);
    if (queryToken && typeof window !== "undefined") {
      resumeQueryTokenRef.current = queryToken;
    }
    if (token) {
      void loadHistory(token).then((loaded) => {
        if (!loaded || !queryToken || typeof window === "undefined") return;
        window.localStorage.setItem(TOKEN_KEY(guidebookSlug), queryToken);
        const url = new URL(window.location.href);
        url.searchParams.delete("chat");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      });
    }
  }, [guidebookSlug, loadHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const queryToken = new URLSearchParams(window.location.search)
      .get("chat")
      ?.trim();
    if (
      !queryToken ||
      queryToken === sessionToken ||
      queryToken === resumeQueryTokenRef.current
    ) {
      return;
    }
    resumeQueryTokenRef.current = queryToken;
    void loadHistory(queryToken).then((loaded) => {
      if (!loaded) return;
      window.localStorage.setItem(TOKEN_KEY(guidebookSlug), queryToken);
      const url = new URL(window.location.href);
      url.searchParams.delete("chat");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    });
  }, [guidebookSlug, loadHistory, sessionToken]);

  // Realtime subscription: broadcasts only tell us to refresh API history.
  useEffect(() => {
    if (!sessionId || !sessionToken) return;
    const channel = supabase.channel(`chat_session:${sessionId}`);
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    channel.on("broadcast", { event: "message_insert" }, () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        void loadHistory(sessionToken);
      }, 100);
    });

    channel.subscribe();
    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [loadHistory, sessionId, sessionToken, supabase]);

  return { ensureSession, loadHistory, sessionId, sessionToken };
}
