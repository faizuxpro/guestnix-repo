"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Archive,
  Bot,
  Clock3,
  Loader2,
  MessageCircle,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { guestAvatarStyle, guestInitials } from "@/lib/guest-avatar";

type InboxSummary = {
  quickAccessSessions: QuickAccessSession[];
  unreadMessageCount: number;
};

type QuickAccessSession = {
  sessionId: string;
  guestName: string | null;
  anonymousLabel: string;
  guidebookTitle: string;
  aiEnabled: boolean;
  hostNeedsReply: boolean;
  hasAiActivity: boolean;
  latestHostActivityAt: string | null;
  latestAiActivityAt: string | null;
  latestRelevantAt: string | null;
  latestPreview: string;
  hostSnippet: string;
  aiSnippet: string;
  snippet: string;
  unreadCount: number;
};

function formatRelative(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  if (abs < 60 * 1000) return "just now";
  if (abs < 60 * 60 * 1000) {
    return rtf.format(Math.round(diffMs / (60 * 1000)), "minute");
  }
  if (abs < 24 * 60 * 60 * 1000) {
    return rtf.format(Math.round(diffMs / (60 * 60 * 1000)), "hour");
  }
  return rtf.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day");
}

function sessionTab(session: QuickAccessSession) {
  if (session.hostNeedsReply || session.latestHostActivityAt) return "needs-reply";
  if (session.hasAiActivity) return "ai-activity";
  return "archived";
}

function sessionHref(session: QuickAccessSession) {
  const params = new URLSearchParams({
    tab: sessionTab(session),
    session: session.sessionId,
  });
  return `/dashboard/messages?${params.toString()}`;
}

function sessionPreview(session: QuickAccessSession) {
  if (session.hostNeedsReply || session.latestHostActivityAt) {
    return session.hostSnippet || session.latestPreview || session.snippet;
  }
  return session.aiSnippet || session.latestPreview || session.snippet;
}

function sessionTime(session: QuickAccessSession) {
  return (
    session.latestRelevantAt ??
    session.latestHostActivityAt ??
    session.latestAiActivityAt
  );
}

export function MessageInboxButton() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const [sessions, setSessions] = useState<QuickAccessSession[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const unreadLabel = unread > 9 ? "9+" : String(unread);

  const refresh = useCallback(async () => {
    const result = await apiFetch<InboxSummary>("/api/dashboard/chat/sessions", {
      cache: "no-store",
    });
    setLoading(false);
    if (!result.ok) return;
    setSessions(result.data.quickAccessSessions ?? []);
    setUnread(result.data.unreadMessageCount ?? 0);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`host_inbox:${user.id}`);
    channel.on("broadcast", { event: "session_touch" }, () => {
      void refresh();
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, supabase, refresh]);

  return (
    <DropdownMenu onOpenChange={(open) => (open ? void refresh() : undefined)}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative rounded-full",
              unread > 0 && "text-primary hover:text-primary"
            )}
            aria-label="Messages"
          />
        }
      >
        <MessageSquare className="h-5 w-5" />
        <AnimatePresence>
          {unread > 0 && !shouldReduceMotion && (
            <motion.span
              key="unread-ping"
              aria-hidden="true"
              className="pointer-events-none absolute -right-1 -top-1 h-6 w-6 rounded-full bg-red-500/35"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0.65, 0], scale: [0.72, 1.75] }}
              exit={{
                opacity: 0,
                scale: 0.8,
                transition: { duration: 0.12, ease: "easeOut" },
              }}
              transition={{
                duration: 1.8,
                ease: "easeOut",
                repeat: Infinity,
                repeatDelay: 0.45,
              }}
            />
          )}
          {unread > 0 && (
            <motion.span
              key={unreadLabel}
              className="absolute -right-0.5 -top-0.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-[0_6px_14px_rgba(220,38,38,0.32)] ring-2 ring-card"
              initial={
                shouldReduceMotion
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0.72, y: 2 }
              }
              animate={
                shouldReduceMotion
                  ? { opacity: 1, scale: 1, y: 0 }
                  : { opacity: 1, scale: [1, 1.18, 1], y: 0 }
              }
              exit={
                shouldReduceMotion
                  ? { opacity: 0, transition: { duration: 0 } }
                  : {
                      opacity: 0,
                      scale: 0.7,
                      y: -2,
                      transition: { duration: 0.16, ease: "easeOut" },
                    }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      opacity: { duration: 0.16 },
                      y: { type: "spring", stiffness: 520, damping: 20 },
                      scale: {
                        duration: 1.6,
                        ease: "easeInOut",
                        repeat: Infinity,
                        repeatDelay: 1.15,
                      },
                    }
              }
            >
              {unreadLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(390px,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">Messages</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0
                ? `${unread} unread guest message${unread === 1 ? "" : "s"}`
                : "No unread guest messages"}
            </p>
          </div>
          <Button variant="outline" size="sm" render={<Link href="/dashboard/messages" />}>
            Inbox
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading messages
            </div>
          ) : sessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold">No message activity yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Host chats and recent AI conversations will appear here.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const tab = sessionTab(session);
              const isAi = tab === "ai-activity";
              const isArchived = tab === "archived";
              return (
                <DropdownMenuItem
                  key={session.sessionId}
                  className="items-start gap-3 rounded-md p-2"
                  render={<Link href={sessionHref(session)} />}
                >
                  <span
                    className={cn(
                      "relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isAi
                        ? "bg-blue-50 text-blue-700"
                        : isArchived
                          ? "bg-muted text-muted-foreground"
                          : "border bg-background shadow-sm"
                    )}
                    style={
                      !isAi && !isArchived
                        ? guestAvatarStyle(session.sessionId)
                        : undefined
                    }
                  >
                    {isAi ? (
                      <Sparkles className="h-4 w-4" />
                    ) : isArchived ? (
                      <Archive className="h-4 w-4" />
                    ) : (
                      guestInitials(session.guestName || session.anonymousLabel)
                    )}
                    {session.unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] leading-none text-white ring-2 ring-popover">
                        {session.unreadCount > 9 ? "9+" : session.unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-sm",
                            session.unreadCount > 0 ? "font-bold" : "font-semibold"
                          )}
                        >
                          {session.guestName || session.anonymousLabel}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {session.guidebookTitle}
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {formatRelative(sessionTime(session))}
                      </span>
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                      {sessionPreview(session) || "No messages yet"}
                    </span>
                    <span className="mt-2 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold",
                          isAi
                            ? "border-blue-200 text-blue-700"
                            : session.hostNeedsReply
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "text-muted-foreground"
                        )}
                      >
                        {isAi ? (
                          <Sparkles className="h-3 w-3" />
                        ) : session.hostNeedsReply ? (
                          <MessageCircle className="h-3 w-3" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                        {isAi
                          ? "AI activity"
                          : session.hostNeedsReply
                            ? "Needs reply"
                            : "Host chat"}
                      </span>
                      {!session.aiEnabled && (
                        <span className="inline-flex h-5 rounded-full border px-2 text-[10px] font-semibold text-muted-foreground">
                          AI off
                        </span>
                      )}
                    </span>
                  </span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          className="justify-center rounded-none py-2 text-sm font-semibold text-primary"
          render={<Link href="/dashboard/messages" />}
        >
          Open full inbox
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
