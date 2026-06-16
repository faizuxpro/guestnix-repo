"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationSummary = {
  items: NotificationItem[];
  unreadCount: number;
};

function formatRelative(value: string) {
  const date = new Date(value);
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

export function NotificationBellButton() {
  const [summary, setSummary] = useState<NotificationSummary>({
    items: [],
    unreadCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);

  const refresh = useCallback(async () => {
    const result = await apiFetch<NotificationSummary>(
      "/api/dashboard/notifications?limit=8",
      { cache: "no-store" }
    );
    setLoading(false);
    if (result.ok) {
      setSummary(result.data);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setMarkingRead(true);
    const result = await apiFetch<NotificationSummary>(
      "/api/dashboard/notifications?limit=8",
      {
        method: "PATCH",
        body: { all: true },
      }
    );
    setMarkingRead(false);
    if (result.ok) {
      setSummary(result.data);
    }
  }, []);

  const markOneRead = useCallback(async (id: string) => {
    const result = await apiFetch<NotificationSummary>(
      "/api/dashboard/notifications?limit=8",
      {
        method: "PATCH",
        body: { ids: [id] },
      }
    );
    if (result.ok) {
      setSummary(result.data);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const unread = summary.unreadCount;

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
            aria-label="Notifications"
          />
        }
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(360px,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void markAllRead()}
            disabled={unread === 0 || markingRead}
          >
            {markingRead ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Read
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notifications
            </div>
          ) : summary.items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            summary.items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="items-start gap-2 p-2"
                onClick={() => void markOneRead(item.id)}
                render={<Link href={item.href ?? "/dashboard/notifications"} />}
              >
                <span
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    item.readAt ? "bg-transparent" : "bg-primary"
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {formatRelative(item.createdAt)}
                  </span>
                </span>
              </DropdownMenuItem>
            ))
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          className="justify-center rounded-none py-2 text-sm font-medium text-primary"
          render={<Link href="/dashboard/notifications" />}
        >
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
