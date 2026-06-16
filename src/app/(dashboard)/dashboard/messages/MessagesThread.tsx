"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HostComposer } from "./HostComposer";
import { cn } from "@/lib/utils";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Bot,
  CheckCheck,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import {
  guestAvatarStyle,
  guestInitials as initials,
} from "@/lib/guest-avatar";

type ThreadMessage = {
  id: string;
  role: "guest" | "ai" | "host";
  content: string;
  target?: "ai" | "host";
  createdAt: string;
};

type ThreadResponse = {
  sessionId: string;
  guestName: string | null;
  guestEmail: string | null;
  hostEscalatedAt: string | null;
  identityProvidedAt: string | null;
  aiEnabled: boolean;
  messages: ThreadMessage[];
};

type ViewMode = "needs-reply" | "ai-activity" | "archived";

type Props = {
  sessionId: string;
  guidebookId: string;
  guidebookTitle: string;
  canReply: boolean;
  viewMode: ViewMode;
  onBack?: () => void;
  onAfterAction?: () => void;
};

function formatDaySeparator(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type RenderItem =
  | { kind: "separator"; id: string; label: string }
  | {
      kind: "message";
      message: ThreadMessage;
      showAvatar: boolean;
      showName: boolean;
      isLastInGroup: boolean;
    };

function buildRenderItems(messages: ThreadMessage[]): RenderItem[] {
  const items: RenderItem[] = [];
  let lastDay: string | null = null;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const dayLabel = formatDaySeparator(message.createdAt);
    if (dayLabel !== lastDay) {
      items.push({ kind: "separator", id: `sep-${dayLabel}-${i}`, label: dayLabel });
      lastDay = dayLabel;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const prevDay = prev ? formatDaySeparator(prev.createdAt) : null;
    const nextDay = next ? formatDaySeparator(next.createdAt) : null;
    const showAvatar = !prev || prev.role !== message.role || prevDay !== dayLabel;
    const isLastInGroup = !next || next.role !== message.role || nextDay !== dayLabel;
    items.push({
      kind: "message",
      message,
      showAvatar,
      showName: showAvatar,
      isLastInGroup,
    });
  }
  return items;
}

export function MessagesThread({
  sessionId,
  guidebookId,
  guidebookTitle,
  canReply,
  viewMode,
  onBack,
  onAfterAction,
}: Props) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [data, setData] = useState<ThreadResponse | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const tempIdRef = useRef(0);
  const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const upsertLocal = useCallback((message: ThreadMessage) => {
    setData((prev) => {
      if (!prev) return prev;
      const idx = prev.messages.findIndex((x) => x.id === message.id);
      if (idx === -1) return { ...prev, messages: [...prev.messages, message] };
      const next = [...prev.messages];
      next[idx] = { ...next[idx], ...message };
      return { ...prev, messages: next };
    });
  }, []);

  const refresh = useCallback(async () => {
    const result = await apiFetch<ThreadResponse>(
      `/api/dashboard/chat/sessions/${sessionId}/messages`,
      { cache: "no-store" }
    );
    if (result.ok) setData(result.data);
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const channel = supabase.channel(`chat_session:${sessionId}`);
    channel.on("broadcast", { event: "message_insert" }, () => {
      if (realtimeRefreshTimerRef.current) return;
      realtimeRefreshTimerRef.current = setTimeout(() => {
        realtimeRefreshTimerRef.current = null;
        void refresh();
      }, 100);
    });
    channel.subscribe();
    return () => {
      if (realtimeRefreshTimerRef.current) {
        clearTimeout(realtimeRefreshTimerRef.current);
        realtimeRefreshTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [refresh, sessionId, supabase]);

  useEffect(() => {
    void apiFetch(`/api/dashboard/chat/sessions/${sessionId}/messages`, {
      method: "PATCH",
      body: { markRead: true },
      parseJson: false,
    }).then(() => onAfterAction?.());
  }, [sessionId, onAfterAction]);

  const lastContent = data?.messages[data.messages.length - 1]?.content;
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !endRef.current || !data) return;
    const nearBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
    if (nearBottom) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [data, lastContent]);

  const handleSend = async (
    content: string,
    options: { sendResumeLinkEmail: boolean }
  ) => {
    tempIdRef.current += 1;
    const optimistic: ThreadMessage = {
      id: `temp-host-${tempIdRef.current}`,
      role: "host",
      content,
      createdAt: new Date().toISOString(),
    };
    upsertLocal(optimistic);
    setSending(true);
    const result = await apiFetch(`/api/dashboard/chat/${sessionId}/messages`, {
      method: "POST",
      body: { content, sendResumeLinkEmail: options.sendResumeLinkEmail },
      parseJson: false,
    });
    setSending(false);
    if (!result.ok) {
      setData((prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimistic.id) }
          : prev
      );
      toastApiError(result.error, {
        title: "Couldn't send message",
        onRetry: () => void handleSend(content, options),
      });
      return;
    }
    await refresh();
    onAfterAction?.();
  };

  const archiveCurrentView = async () => {
    const result = await apiFetch(
      `/api/dashboard/chat/sessions/${sessionId}/messages`,
      {
        method: "PATCH",
        body: { archive: viewMode === "needs-reply" ? "host" : "ai" },
        parseJson: false,
      }
    );
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't archive conversation",
        onRetry: () => void archiveCurrentView(),
      });
      return;
    }
    await refresh();
    onAfterAction?.();
  };

  const toggleAi = async (next: boolean) => {
    const result = await apiFetch(
      `/api/dashboard/chat/sessions/${sessionId}/messages`,
      { method: "PATCH", body: { aiEnabled: next }, parseJson: false }
    );
    if (!result.ok) {
      toastApiError(result.error, {
        title: next ? "Couldn't enable AI" : "Couldn't pause AI",
        onRetry: () => void toggleAi(next),
      });
      return;
    }
    await refresh();
    onAfterAction?.();
  };

  if (!data) {
    return <ThreadSkeleton />;
  }

  const escalationTime = data.hostEscalatedAt
    ? new Date(data.hostEscalatedAt).getTime()
    : null;
  const isHostGuestMessage = (message: ThreadMessage) =>
    message.role === "guest" &&
    (message.target === "host" ||
      (message.target == null &&
        escalationTime != null &&
        new Date(message.createdAt).getTime() >= escalationTime));
  const aiContextMessages =
    viewMode === "needs-reply" && escalationTime != null
      ? data.messages.filter(
          (message) =>
            message.role === "ai" ||
            (message.role === "guest" && !isHostGuestMessage(message)) ||
            new Date(message.createdAt).getTime() < escalationTime
        )
      : [];
  const conversationMessages =
    viewMode === "needs-reply" && escalationTime != null
      ? data.messages.filter(
          (message) =>
            (message.role === "host" || isHostGuestMessage(message)) &&
            new Date(message.createdAt).getTime() >= escalationTime
        )
      : data.messages;
  const items = buildRenderItems(conversationMessages);
  const anonymousLabel = `Guest ${sessionId.replaceAll("-", "").slice(-4).toUpperCase()}`;
  const guestLabel = data.guestName || anonymousLabel;
  const latestGuestHostAt = conversationMessages
    .filter(isHostGuestMessage)
    .reduce(
      (latest, message) =>
        Math.max(latest, new Date(message.createdAt).getTime()),
      0
    );
  const latestHostReplyAt = conversationMessages
    .filter((message) => message.role === "host")
    .reduce(
      (latest, message) =>
        Math.max(latest, new Date(message.createdAt).getTime()),
      0
    );
  const shouldSuggestResumeLinkEmail =
    Boolean(data.guestEmail) && latestGuestHostAt > latestHostReplyAt;
  const latestMessageAt =
    conversationMessages[conversationMessages.length - 1]?.createdAt ??
    data.messages[data.messages.length - 1]?.createdAt;
  const replyState =
    viewMode === "archived"
      ? "Archived"
      : canReply && viewMode === "needs-reply"
        ? "Host can reply"
        : "AI-only view";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="shrink-0 border-b bg-background p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-1 md:hidden"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold shadow-sm"
              style={guestAvatarStyle(sessionId)}
            >
              {initials(data.guestName || guestLabel)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate text-base font-semibold leading-tight">
                  {guestLabel}
                </p>
                <Badge
                  variant="outline"
                  className="h-5 rounded-full px-2 text-[10px] font-semibold"
                >
                  {replyState}
                </Badge>
                {data.identityProvidedAt ? (
                  <Badge className="h-5 rounded-full bg-emerald-100 px-2 text-[10px] font-semibold text-emerald-900 hover:bg-emerald-100 xl:hidden">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Identity shared
                  </Badge>
                ) : null}
              </div>
              <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 xl:hidden">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{data.guestEmail || "No guest email yet"}</span>
                </span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{guidebookTitle}</span>
                </span>
                {latestMessageAt ? (
                  <span className="flex min-w-0 items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      Last activity {formatDateTime(latestMessageAt)}
                    </span>
                  </span>
                ) : null}
                <span className="flex min-w-0 items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {data.hostEscalatedAt
                      ? `Contacted host ${formatDateTime(data.hostEscalatedAt)}`
                      : "Guest has not contacted host"}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:ml-auto xl:justify-end">
            <div
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5",
                data.aiEnabled ? "bg-secondary/60" : "bg-muted/50"
              )}
            >
              <Bot className={cn("h-3.5 w-3.5", data.aiEnabled ? "text-primary" : "text-muted-foreground")} />
              <Label htmlFor="ai-toggle" className="text-xs">
                AI {data.aiEnabled ? "active" : "paused"}
              </Label>
              <Switch
                id="ai-toggle"
                checked={data.aiEnabled}
                onCheckedChange={toggleAi}
              />
            </div>
            {viewMode !== "archived" && (
              <Button variant="outline" size="sm" onClick={archiveCurrentView}>
                <Archive className="mr-2 h-3.5 w-3.5" />
                Archive {viewMode === "needs-reply" ? "host chat" : "AI activity"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/dashboard/guidebooks/${guidebookId}/editor`} />}
            >
              <BookOpen className="mr-2 h-3.5 w-3.5" />
              Open guidebook
            </Button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-3 py-4 sm:px-5"
          >
            {viewMode === "needs-reply" && aiContextMessages.length > 0 && (
              <details className="mb-4 rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-sm">
                <summary className="cursor-pointer font-semibold text-blue-900">
                  AI context before host handoff
                </summary>
                <div className="mt-3 space-y-2 border-t pt-3">
                  {aiContextMessages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-md bg-background/90 px-3 py-2 shadow-sm"
                    >
                      <div className="mb-1 text-[10px] font-semibold uppercase text-blue-700">
                        {message.role === "guest" ? "Guest asked AI" : "AI answered"}
                      </div>
                      <div className="whitespace-pre-wrap text-xs text-foreground/80">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
            {viewMode === "needs-reply" && (
              <div className="mb-3 inline-flex rounded-full border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Host conversation
              </div>
            )}
            {items.length === 0 ? (
              <div className="flex min-h-80 items-center justify-center text-center">
                <div className="max-w-xs">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-background text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold">No messages in this view</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Switch tabs to see AI activity, host chat, or archived context for this guest.
                  </p>
                </div>
              </div>
            ) : (
              items.map((item) =>
                item.kind === "separator" ? (
                  <div
                    key={item.id}
                    className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground"
                  >
                    <div className="flex-1 border-t" />
                    <span className="rounded-full bg-background px-2 py-0.5 shadow-sm">
                      {item.label}
                    </span>
                    <div className="flex-1 border-t" />
                  </div>
                ) : (
                  <ThreadBubble
                    key={item.message.id}
                    message={item.message}
                    guestLabel={guestLabel}
                    avatarSeed={sessionId}
                    showAvatar={item.showAvatar}
                    showName={item.showName}
                    isLastInGroup={item.isLastInGroup}
                  />
                )
              )
            )}
            <div ref={endRef} />
          </div>

          {canReply && viewMode === "needs-reply" ? (
            <HostComposer
              key={`${sessionId}-${shouldSuggestResumeLinkEmail ? "suggest" : "idle"}`}
              onSend={handleSend}
              disabled={sending}
              sending={sending}
              canEmailResumeLink={Boolean(data.guestEmail)}
              defaultSendResumeLinkEmail={shouldSuggestResumeLinkEmail}
            />
          ) : viewMode === "archived" ? (
            <div className="border-t bg-background px-4 py-3 text-xs text-muted-foreground">
              Archived conversation. New guest messages will reopen it in the inbox.
            </div>
          ) : (
            <div className="border-t bg-background px-4 py-3 text-xs text-muted-foreground">
              AI activity only. The guest must use Contact Host and provide their name and email before you can reply.
            </div>
          )}
        </div>

        <GuestProfilePanel
          guestLabel={guestLabel}
          guestEmail={data.guestEmail}
          guidebookTitle={guidebookTitle}
          identityProvidedAt={data.identityProvidedAt}
          hostEscalatedAt={data.hostEscalatedAt}
          latestMessageAt={latestMessageAt}
          aiEnabled={data.aiEnabled}
          replyState={replyState}
          avatarSeed={sessionId}
        />
      </div>
    </div>
  );
}

function GuestProfilePanel({
  guestLabel,
  guestEmail,
  guidebookTitle,
  identityProvidedAt,
  hostEscalatedAt,
  latestMessageAt,
  aiEnabled,
  replyState,
  avatarSeed,
}: {
  guestLabel: string;
  guestEmail: string | null;
  guidebookTitle: string;
  identityProvidedAt: string | null;
  hostEscalatedAt: string | null;
  latestMessageAt: string | undefined;
  aiEnabled: boolean;
  replyState: string;
  avatarSeed: string;
}) {
  return (
    <aside className="hidden min-h-0 border-l bg-muted/15 xl:flex xl:flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="rounded-lg border bg-background p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-sm font-bold shadow-sm"
              style={guestAvatarStyle(avatarSeed)}
            >
              {initials(guestLabel)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{guestLabel}</p>
              <p className="truncate text-xs text-muted-foreground">{replyState}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {identityProvidedAt ? (
              <Badge className="h-5 rounded-full bg-emerald-100 px-2 text-[10px] font-semibold text-emerald-900 hover:bg-emerald-100">
                <ShieldCheck className="mr-1 h-3 w-3" />
                Identity shared
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-5 rounded-full px-2 text-[10px] font-semibold"
              >
                Identity pending
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "h-5 rounded-full px-2 text-[10px] font-semibold",
                aiEnabled && "border-emerald-200 bg-emerald-50 text-emerald-900"
              )}
            >
              <Bot className="mr-1 h-3 w-3" />
              AI {aiEnabled ? "active" : "paused"}
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            <ProfileDetail
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={guestEmail || "Not provided"}
            />
            <ProfileDetail
              icon={<BookOpen className="h-4 w-4" />}
              label="Guidebook"
              value={guidebookTitle}
            />
            <ProfileDetail
              icon={<MessageCircle className="h-4 w-4" />}
              label="Last activity"
              value={latestMessageAt ? formatDateTime(latestMessageAt) : "No messages yet"}
            />
            <ProfileDetail
              icon={<UserRound className="h-4 w-4" />}
              label="Host handoff"
              value={
                hostEscalatedAt
                  ? formatDateTime(hostEscalatedAt)
                  : "Guest has not contacted host"
              }
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

function ProfileDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 break-words text-xs font-medium leading-relaxed text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="shrink-0 border-b bg-background p-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-72 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="hidden h-8 w-24 sm:block" />
          <Skeleton className="hidden h-8 w-32 sm:block" />
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-hidden bg-muted/20 p-5">
        <Skeleton className="mx-auto h-6 w-20 rounded-full" />
        <Skeleton className="h-16 w-3/5 rounded-2xl" />
        <Skeleton className="ml-auto h-20 w-2/3 rounded-2xl" />
        <Skeleton className="h-14 w-1/2 rounded-2xl" />
        <Skeleton className="ml-auto h-12 w-1/3 rounded-2xl" />
      </div>
      <div className="shrink-0 border-t bg-background p-3">
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}

function ThreadBubble({
  message,
  guestLabel,
  avatarSeed,
  showAvatar,
  showName,
  isLastInGroup,
}: {
  message: ThreadMessage;
  guestLabel: string;
  avatarSeed: string;
  showAvatar: boolean;
  showName: boolean;
  isLastInGroup: boolean;
}) {
  const { role, content, createdAt } = message;
  const isHost = role === "host";
  const isAi = role === "ai";
  const isPending = message.id.startsWith("temp-host-");
  const senderLabel = isAi ? "AI Concierge" : isHost ? "You" : guestLabel;

  return (
    <div
      className={cn(
        "flex gap-2",
        isHost ? "flex-row-reverse" : "flex-row",
        showAvatar ? "mt-3" : "mt-0.5"
      )}
    >
      <div className="w-8 shrink-0">
        {showAvatar ? (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold shadow-sm",
              isAi
                ? "bg-blue-600 text-white"
                : isHost
                  ? "bg-primary text-primary-foreground"
                  : "border bg-background"
            )}
            style={!isAi && !isHost ? guestAvatarStyle(avatarSeed) : undefined}
          >
            {isAi ? <Sparkles className="h-3.5 w-3.5" /> : isHost ? "Me" : initials(guestLabel)}
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "flex max-w-[82%] flex-col min-w-0 sm:max-w-[72%]",
          isHost ? "items-end" : "items-start"
        )}
      >
        {showName && (
          <span
            className={cn(
              "mb-0.5 inline-flex items-center gap-1 px-1 text-[10px] font-medium",
              isAi ? "text-blue-700" : "text-muted-foreground"
            )}
          >
            {isAi && <Sparkles className="h-2.5 w-2.5" />}
            {senderLabel}
          </span>
        )}
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm shadow-sm",
            isHost
              ? "rounded-br-md bg-primary text-primary-foreground"
              : isAi
                ? "rounded-bl-md border border-blue-100 bg-blue-50 text-blue-950"
                : "rounded-bl-md border bg-background",
            isPending && "opacity-70"
          )}
        >
          {content}
        </div>
        {isLastInGroup && (
          <span className="mt-0.5 inline-flex items-center gap-1 px-1 text-[10px] text-muted-foreground/70">
            {formatTime(createdAt)}
            {isHost && (
              <>
                <CheckCheck className="h-2.5 w-2.5" />
                {isPending ? "Sending" : null}
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export { initials as _initials };
