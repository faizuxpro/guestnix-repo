"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MessagesSidebar } from "./MessagesSidebar";
import { MessagesThread } from "./MessagesThread";
import { useHostInbox } from "./useHostInbox";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type InboxTab = "needs-reply" | "ai-activity" | "archived";

function isInboxTab(value: string | null): value is InboxTab {
  return value === "needs-reply" || value === "ai-activity" || value === "archived";
}

export function MessagesClient() {
  const {
    data,
    loading,
    error,
    refresh,
    notificationPermission,
    enableNotifications,
  } = useHostInbox();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("session");
  const requestedTab = searchParams.get("tab");
  const queryTab = isInboxTab(requestedTab) ? requestedTab : null;
  const tabFromActive = useMemo(() => {
    if (!data || !activeId) return null;
    if (data.needsReplySessions.some((s) => s.sessionId === activeId)) {
      return "needs-reply";
    }
    if (data.aiActivitySessions.some((s) => s.sessionId === activeId)) {
      return "ai-activity";
    }
    if (data.archivedSessions.some((s) => s.sessionId === activeId)) {
      return "archived";
    }
    return null;
  }, [activeId, data]);
  const queryTabHasActive = useMemo(() => {
    if (!data || !activeId || !queryTab) return true;
    const tabSessions =
      queryTab === "needs-reply"
        ? data.needsReplySessions
        : queryTab === "ai-activity"
          ? data.aiActivitySessions
          : data.archivedSessions;
    return tabSessions.some((s) => s.sessionId === activeId);
  }, [activeId, data, queryTab]);
  const tab: InboxTab =
    queryTab && queryTabHasActive
      ? queryTab
      : tabFromActive ?? queryTab ?? "needs-reply";
  const sessions = useMemo(
    () =>
      tab === "needs-reply"
        ? data?.needsReplySessions ?? data?.sessions ?? []
        : tab === "ai-activity"
          ? data?.aiActivitySessions ?? []
          : data?.archivedSessions ?? [],
    [data, tab]
  );

  useEffect(() => {
    if (!data) return;
    const unread = data.unreadMessageCount ?? 0;
    document.title =
      unread > 0 ? `(${unread}) Messages - Guestnix` : "Messages - Guestnix";
    return () => {
      document.title = "Messages - Guestnix";
    };
  }, [data]);

  const selectSession = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("session", id);
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const clearSession = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("session");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const changeTab = (nextTab: InboxTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", nextTab);
    params.delete("session");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const active = sessions.find((s) => s.sessionId === activeId) ?? null;
  const canReply = Boolean(active?.hostEscalatedAt);

  const tabs: Array<{ id: InboxTab; label: string; count: number }> = [
    {
      id: "needs-reply",
      label: "Host chat",
      count: data?.needsReplySessions.length ?? 0,
    },
    {
      id: "ai-activity",
      label: "AI activity",
      count: data?.aiActivitySessions.length ?? 0,
    },
    {
      id: "archived",
      label: "Archived",
      count: data?.archivedSessions.length ?? 0,
    },
  ];

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 -m-4 flex-col overflow-hidden bg-muted/30 sm:-m-6 lg:-m-8 md:flex-row md:rounded-lg md:border md:bg-background">
      <div
        className={cn(
          "min-h-0 w-full shrink-0 flex-col border-r bg-background md:w-88",
          active ? "hidden md:flex" : "flex"
        )}
      >
        <div className="grid grid-cols-3 gap-1 border-b bg-muted/35 p-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => changeTab(item.id)}
              className={cn(
                "min-w-0 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                tab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="block truncate">{item.label}</span>
              {item.count > 0 && (
                <span
                  className={cn(
                    "mt-0.5 block text-[10px] opacity-80"
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <MessagesSidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={selectSession}
          usage={data?.usage}
          mode={tab}
          notificationPermission={notificationPermission}
          onEnableNotifications={enableNotifications}
          loading={loading && !data}
        />
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 flex-col bg-background",
          active ? "flex" : "hidden md:flex"
        )}
      >
        {loading && !data ? (
          <ThreadLoadingState />
        ) : error ? (
          <div className="m-auto max-w-sm space-y-3 p-6 text-center text-sm">
            <div className="font-semibold text-destructive">{error.title}</div>
            <div className="text-muted-foreground">{error.message}</div>
            {error.retryable ? (
              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-md border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-muted"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : !active ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                {data?.unreadMessageCount ? data.unreadMessageCount : "0"}
              </div>
              <h2 className="text-base font-semibold">Select a conversation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a thread from {tab === "needs-reply" ? "Host chat" : tab === "ai-activity" ? "AI activity" : "Archived"} to see the full guest timeline.
              </p>
            </div>
          </div>
        ) : (
          <MessagesThread
            key={active.sessionId}
            sessionId={active.sessionId}
            guidebookId={active.guidebookId}
            guidebookTitle={active.guidebookTitle}
            canReply={canReply}
            viewMode={tab}
            onBack={clearSession}
            onAfterAction={refresh}
          />
        )}
      </div>
    </div>
  );
}

function ThreadLoadingState() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="hidden h-8 w-28 sm:block" />
          <Skeleton className="hidden h-8 w-28 sm:block" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-hidden bg-muted/20 p-4">
        <Skeleton className="mx-auto h-5 w-20 rounded-full" />
        <Skeleton className="h-16 w-3/5 rounded-2xl" />
        <Skeleton className="ml-auto h-20 w-2/3 rounded-2xl" />
        <Skeleton className="h-14 w-1/2 rounded-2xl" />
      </div>
      <div className="shrink-0 border-t p-3">
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}
