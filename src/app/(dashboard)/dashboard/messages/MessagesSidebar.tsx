"use client";

import Link from "next/link";
import {
  Bell,
  Archive,
  Infinity as InfinityIcon,
  MessageCircle,
  Settings2,
  Sparkles,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { guestAvatarStyle, guestInitials } from "@/lib/guest-avatar";
import type { InboxSession } from "./useHostInbox";

type Props = {
  sessions: InboxSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  usage?: { used: number; cap: number | null };
  mode: "needs-reply" | "ai-activity" | "archived";
  notificationPermission: NotificationPermission;
  onEnableNotifications: () => void;
  loading?: boolean;
};

function snippetTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
  return d.toLocaleDateString();
}

function sessionTime(session: InboxSession, mode: Props["mode"]) {
  if (mode === "ai-activity") return session.latestAiActivityAt;
  if (mode === "archived") return session.latestRelevantAt ?? session.lastMessageAt;
  return session.latestHostActivityAt ?? session.latestGuestHostAt ?? session.lastMessageAt;
}

function sessionPreview(session: InboxSession, mode: Props["mode"]) {
  if (mode === "ai-activity") return session.aiSnippet || session.latestPreview;
  if (mode === "archived") {
    return session.hostSnippet || session.aiSnippet || session.latestPreview || session.snippet;
  }
  return session.hostSnippet || session.latestPreview || session.snippet;
}

function EmptyState({ mode }: { mode: Props["mode"] }) {
  const copy =
    mode === "needs-reply"
      ? {
          title: "No host conversations",
          body: "Guest messages that need human attention will appear here.",
          icon: MessageCircle,
        }
      : mode === "ai-activity"
        ? {
            title: "No AI activity",
            body: "When guests ask the AI concierge questions, the latest threads will appear here.",
            icon: Sparkles,
          }
        : {
            title: "No archived chats",
            body: "Archived host chats and AI activity will be kept here for reference.",
            icon: Archive,
          };
  const Icon = copy.icon;
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-sm font-semibold">{copy.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.body}</p>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-lg border border-transparent px-2 py-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessagesSidebar({
  sessions,
  activeId,
  onSelect,
  usage,
  mode,
  notificationPermission,
  onEnableNotifications,
  loading = false,
}: Props) {
  const unreadMessages = sessions.reduce(
    (total, session) => total + (mode === "needs-reply" ? session.unreadCount : 0),
    0
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Inbox</h2>
          <p className="text-[11px] text-muted-foreground">
            {mode === "needs-reply"
              ? unreadMessages > 0
                ? `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"}`
                : "No unread host messages"
              : mode === "ai-activity"
                ? "AI-handled guest threads"
                : "Resolved or muted threads"}
          </p>
        </div>
        {usage && (
          <Link
            href="/dashboard/settings?tab=ai"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            title="AI concierge settings"
          >
            <span>
              AI: {usage.used}
              {" / "}
              {usage.cap === null ? (
                <InfinityIcon className="inline h-3 w-3 -mt-0.5" />
              ) : (
                usage.cap
              )}
            </span>
            <Settings2 className="h-3 w-3 opacity-60" />
          </Link>
        )}
      </div>
      {notificationPermission !== "granted" && (
        <div className="border-b px-3 py-2">
          <button
            type="button"
            onClick={onEnableNotifications}
            className="flex w-full items-center gap-2 rounded-md border border-primary/15 bg-secondary/50 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Bell className="h-3.5 w-3.5 text-primary" />
            Enable desktop alerts
          </button>
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <SidebarSkeleton />
        ) : sessions.length === 0 ? (
          <EmptyState mode={mode} />
        ) : (
          <ul className="space-y-1 p-2">
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <button
                  type="button"
                  className={cn(
                    "group w-full rounded-lg border border-transparent px-2.5 py-2.5 text-left transition-colors",
                    s.unread && mode === "needs-reply"
                      ? "bg-secondary/70 hover:bg-secondary"
                      : "hover:bg-muted/70",
                    activeId === s.sessionId &&
                      "border-primary/25 bg-background shadow-sm ring-1 ring-primary/10"
                  )}
                  onClick={() => onSelect(s.sessionId)}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-sm",
                        mode === "ai-activity"
                          ? "border-transparent bg-blue-50 text-blue-700"
                          : "bg-background"
                      )}
                      style={
                        mode === "ai-activity" ? undefined : guestAvatarStyle(s.sessionId)
                      }
                    >
                      {mode === "ai-activity" ? (
                        <Sparkles className="h-4 w-4" />
                      ) : (
                        guestInitials(s.guestName || s.anonymousLabel)
                      )}
                      {s.unread && mode === "needs-reply" && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-background" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block truncate text-sm",
                              s.unread && mode === "needs-reply"
                                ? "font-bold"
                                : "font-semibold"
                            )}
                          >
                            {s.guestName || s.anonymousLabel}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {s.guidebookTitle}
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          {snippetTime(sessionTime(s, mode))}
                        </span>
                      </span>
                      <span className="mt-2 flex items-center gap-2">
                        {mode === "archived" ? (
                          <Archive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : mode === "ai-activity" ? (
                          <Sparkles className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {sessionPreview(s, mode) || "No messages yet"}
                        </span>
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5">
                        {s.hostNeedsReply && mode === "needs-reply" && (
                          <Badge className="h-5 rounded-full bg-amber-100 px-2 text-[10px] font-semibold text-amber-900 hover:bg-amber-100">
                            Needs reply
                          </Badge>
                        )}
                        {s.unreadCount > 0 && mode === "needs-reply" && (
                          <Badge className="h-5 rounded-full bg-red-600 px-2 text-[10px] font-bold text-white hover:bg-red-600">
                            {s.unreadCount} unread
                          </Badge>
                        )}
                        {mode === "ai-activity" && (
                          <Badge
                            variant="outline"
                            className="h-5 rounded-full border-blue-200 px-2 text-[10px] font-semibold text-blue-700"
                          >
                            AI activity
                          </Badge>
                        )}
                        {!s.aiEnabled && (
                          <Badge
                            variant="outline"
                            className="h-5 rounded-full px-2 text-[10px] font-semibold"
                          >
                            AI off
                          </Badge>
                        )}
                      </span>
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
