"use client";

import type { ElementType, ReactNode, TouchEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  CreditCard,
  ExternalLink,
  Gift,
  Info,
  Megaphone,
  Rocket,
  ShieldAlert,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AnnouncementBehaviorConfig = {
  dismissible: boolean;
  pinned: boolean;
  requireAcknowledgement: boolean;
  snoozeEnabled: boolean;
  frequency: "until_dismissed" | "once" | "once_per_session" | "daily" | "always";
  snoozeHours: number;
  autoHideSeconds: number | null;
};

export type DashboardAnnouncement = {
  id: string;
  title: string;
  body: string;
  priority: number;
  tone:
    | "info"
    | "success"
    | "warning"
    | "critical"
    | "launch"
    | "promo"
    | "maintenance"
    | "billing"
    | "security";
  displayMode: "slim" | "standard" | "expanded" | "critical" | "popin";
  icon: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  behaviorConfig: AnnouncementBehaviorConfig;
};

type ActiveAnnouncementResponse = {
  announcement: DashboardAnnouncement | null;
  announcements?: DashboardAnnouncement[];
};

type AnnouncementEventType =
  | "view"
  | "dismiss"
  | "snooze"
  | "acknowledge"
  | "expand"
  | "cta_click";

const ICONS: Record<string, ElementType> = {
  alert: AlertTriangle,
  bell: Bell,
  billing: CreditCard,
  gift: Gift,
  info: Info,
  launch: Rocket,
  maintenance: Wrench,
  megaphone: Megaphone,
  security: ShieldAlert,
  warning: AlertTriangle,
};

const TONE_STYLES: Record<
  DashboardAnnouncement["tone"],
  {
    shell: string;
    strongShell: string;
    icon: string;
    panel: string;
    cta: "default" | "outline" | "secondary" | "destructive";
  }
> = {
  info: {
    shell: "border-sky-200 bg-sky-50 text-sky-950",
    strongShell: "border-sky-300 bg-sky-100 text-sky-950",
    icon: "bg-sky-100 text-sky-700 ring-sky-200",
    panel: "border-sky-200 bg-white text-sky-950",
    cta: "default",
  },
  success: {
    shell: "border-emerald-200 bg-emerald-50 text-emerald-950",
    strongShell: "border-emerald-300 bg-emerald-100 text-emerald-950",
    icon: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    panel: "border-emerald-200 bg-white text-emerald-950",
    cta: "default",
  },
  warning: {
    shell: "border-amber-200 bg-amber-50 text-amber-950",
    strongShell: "border-amber-300 bg-amber-100 text-amber-950",
    icon: "bg-amber-100 text-amber-700 ring-amber-200",
    panel: "border-amber-200 bg-white text-amber-950",
    cta: "outline",
  },
  critical: {
    shell: "border-red-200 bg-red-50 text-red-950",
    strongShell: "border-red-400 bg-red-100 text-red-950",
    icon: "bg-red-100 text-red-700 ring-red-200",
    panel: "border-red-300 bg-white text-red-950",
    cta: "destructive",
  },
  launch: {
    shell: "border-indigo-200 bg-indigo-50 text-indigo-950",
    strongShell: "border-indigo-300 bg-indigo-100 text-indigo-950",
    icon: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    panel: "border-indigo-200 bg-white text-indigo-950",
    cta: "default",
  },
  promo: {
    shell: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950",
    strongShell: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-950",
    icon: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
    panel: "border-fuchsia-200 bg-white text-fuchsia-950",
    cta: "secondary",
  },
  maintenance: {
    shell: "border-slate-300 bg-slate-50 text-slate-950",
    strongShell: "border-slate-400 bg-slate-100 text-slate-950",
    icon: "bg-slate-100 text-slate-700 ring-slate-200",
    panel: "border-slate-300 bg-white text-slate-950",
    cta: "outline",
  },
  billing: {
    shell: "border-orange-200 bg-orange-50 text-orange-950",
    strongShell: "border-orange-300 bg-orange-100 text-orange-950",
    icon: "bg-orange-100 text-orange-700 ring-orange-200",
    panel: "border-orange-200 bg-white text-orange-950",
    cta: "outline",
  },
  security: {
    shell: "border-violet-200 bg-violet-50 text-violet-950",
    strongShell: "border-violet-300 bg-violet-100 text-violet-950",
    icon: "bg-violet-100 text-violet-700 ring-violet-200",
    panel: "border-violet-200 bg-white text-violet-950",
    cta: "default",
  },
};

function storageKey(kind: "viewed" | "hidden", id: string) {
  return `guestnix_announcement_${kind}_${id}`;
}

function isExternalHref(href: string) {
  return /^https:\/\//i.test(href);
}

async function postAnnouncementEvent(
  id: string,
  eventType: AnnouncementEventType,
  metadata?: Record<string, unknown>,
  keepalive = false
) {
  await fetch(`/api/dashboard/announcements/${encodeURIComponent(id)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType, metadata }),
    keepalive,
  }).catch(() => undefined);
}

function AnnouncementActions({
  announcement,
  mode,
  preview,
  tone,
  onDismiss,
  onSnooze,
  onAcknowledge,
  onCtaClick,
}: {
  announcement: DashboardAnnouncement;
  mode: DashboardAnnouncement["displayMode"];
  preview: boolean;
  tone: (typeof TONE_STYLES)[DashboardAnnouncement["tone"]];
  onDismiss?: () => void;
  onSnooze?: () => void;
  onAcknowledge?: () => void;
  onCtaClick?: () => void;
}) {
  const behavior = announcement.behaviorConfig;
  const canDismiss = behavior.dismissible && !behavior.pinned;
  const ctaHref = announcement.ctaHref;
  const actionSize =
    mode === "popin" || mode === "expanded" || mode === "critical"
      ? "default"
      : "sm";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {ctaHref && announcement.ctaLabel ? (
        <Button
          variant={tone.cta}
          size={actionSize}
          render={
            <a
              href={ctaHref}
              target={isExternalHref(ctaHref) ? "_blank" : undefined}
              rel={isExternalHref(ctaHref) ? "noreferrer" : undefined}
              onClick={onCtaClick}
            />
          }
        >
          {announcement.ctaLabel}
          {isExternalHref(ctaHref) ? <ExternalLink className="h-3.5 w-3.5" /> : null}
        </Button>
      ) : null}

      {behavior.snoozeEnabled ? (
        <Button
          type="button"
          variant="ghost"
          size={actionSize}
          onClick={onSnooze}
          disabled={preview}
        >
          <Clock3 className="h-3.5 w-3.5" />
          Snooze
        </Button>
      ) : null}

      {behavior.requireAcknowledgement ? (
        <Button
          type="button"
          variant={announcement.tone === "critical" || mode === "critical" ? "destructive" : "outline"}
          size={actionSize}
          onClick={onAcknowledge}
          disabled={preview}
        >
          <Check className="h-3.5 w-3.5" />
          Acknowledge
        </Button>
      ) : canDismiss ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          disabled={preview}
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function DashboardAnnouncementBannerView({
  announcement,
  expanded = false,
  preview = false,
  previewContext = "standalone",
  carouselControls,
  className,
  onToggleExpanded,
  onDismiss,
  onSnooze,
  onAcknowledge,
  onCtaClick,
}: {
  announcement: DashboardAnnouncement;
  expanded?: boolean;
  preview?: boolean;
  previewContext?: "standalone" | "dashboard";
  carouselControls?: ReactNode;
  className?: string;
  onToggleExpanded?: () => void;
  onDismiss?: () => void;
  onSnooze?: () => void;
  onAcknowledge?: () => void;
  onCtaClick?: () => void;
}) {
  const behavior = announcement.behaviorConfig;
  const tone = TONE_STYLES[announcement.tone] ?? TONE_STYLES.info;
  const Icon = ICONS[announcement.icon] ?? ICONS[announcement.tone] ?? Megaphone;
  const mode = announcement.displayMode;
  const showBody = mode !== "slim" || expanded;
  const canExpand = mode === "slim" || mode === "standard";
  const isProminent = mode === "expanded" || mode === "critical";

  if (mode === "popin") {
    return (
      <div
        className={cn(
          preview && previewContext === "dashboard"
            ? "absolute inset-0 z-20 grid place-items-center bg-black/25 p-4 backdrop-blur-sm"
            : preview
            ? "relative grid min-h-72 place-items-center overflow-hidden bg-black/10 p-4"
            : "fixed inset-0 z-50 grid place-items-center bg-black/25 p-4 backdrop-blur-sm",
          className
        )}
        role={announcement.tone === "critical" ? "alertdialog" : "dialog"}
        aria-label="Announcement"
      >
        <div
          className={cn(
            "w-full max-w-lg rounded-lg border p-5 shadow-2xl",
            announcement.tone === "critical" && "ring-2 ring-red-400/40",
            tone.panel
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-lg ring-1",
                tone.icon
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold leading-6">{announcement.title}</h2>
                {behavior.requireAcknowledgement ? (
                  <span className="rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium">
                    Action required
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-current/80">{announcement.body}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {carouselControls}
            <AnnouncementActions
              announcement={announcement}
              mode={mode}
              preview={preview}
              tone={tone}
              onDismiss={onDismiss}
              onSnooze={onSnooze}
              onAcknowledge={onAcknowledge}
              onCtaClick={onCtaClick}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "border-b px-3 transition-colors sm:px-4",
        mode === "critical" ? tone.strongShell : tone.shell,
        mode === "slim" && "py-1",
        mode === "standard" && "py-2.5",
        mode === "expanded" && "border-b-2 py-4 shadow-sm",
        mode === "critical" &&
          "border-y-2 py-3 shadow-[inset_4px_0_0_rgba(220,38,38,0.55)]",
        className
      )}
      role={mode === "critical" || announcement.tone === "critical" ? "alert" : undefined}
      aria-label="Announcement"
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-none gap-3",
          isProminent
            ? "flex-col sm:flex-row sm:items-start"
            : "items-center"
        )}
      >
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-md ring-1",
            mode === "slim" && "size-7",
            mode === "standard" && "size-9",
            mode === "expanded" && "size-12 rounded-lg",
            mode === "critical" && "size-10 rounded-lg ring-2",
            tone.icon
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              mode === "expanded" && "h-5 w-5",
              mode === "critical" && "h-5 w-5"
            )}
            aria-hidden="true"
          />
        </span>

        <div
          className={cn(
            "min-w-0 flex-1",
            mode === "expanded" && "border-l border-current/15 pl-3",
            mode === "critical" && "pl-1"
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p
              className={cn(
                "min-w-0 font-semibold leading-5",
                mode === "slim" ? "text-sm" : "text-[0.95rem]",
                mode === "expanded" && "text-lg leading-6",
                mode === "critical" && "text-base"
              )}
            >
              {announcement.title}
            </p>
            {mode === "critical" ? (
              <span className="rounded-full border border-current/25 px-2 py-0.5 text-[11px] font-medium">
                Critical
              </span>
            ) : null}
            {behavior.requireAcknowledgement ? (
              <span className="rounded-full border border-current/20 px-2 py-0.5 text-[11px] font-medium">
                Action required
              </span>
            ) : null}
          </div>
          {showBody ? (
            <p
              className={cn(
                "mt-1 max-w-4xl text-sm leading-5 opacity-85",
                mode === "expanded" && "text-[0.95rem] leading-6",
                mode === "critical" && "font-medium opacity-90",
                mode === "slim" && "line-clamp-2"
              )}
            >
              {announcement.body}
            </p>
          ) : null}
        </div>

        <div
          className={cn(
            "flex w-full shrink-0 flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end",
            isProminent && "border-t border-current/15 pt-3 sm:border-t-0 sm:pt-0"
          )}
        >
          <div className="flex items-center gap-2">
            {carouselControls}
            {canExpand ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onToggleExpanded}
                disabled={preview}
                aria-label={expanded ? "Collapse announcement" : "Expand announcement"}
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Details
              </Button>
            ) : null}
          </div>
          <AnnouncementActions
            announcement={announcement}
            mode={mode}
            preview={preview}
            tone={tone}
            onDismiss={onDismiss}
            onSnooze={onSnooze}
            onAcknowledge={onAcknowledge}
            onCtaClick={onCtaClick}
          />
        </div>
      </div>
    </section>
  );
}

export function DashboardAnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const expandedEventSent = useRef<Set<string>>(new Set());
  const announcement = announcements[currentIndex] ?? null;

  const fetchActive = useCallback(async () => {
    const response = await fetch("/api/dashboard/announcements/active", {
      cache: "no-store",
    }).catch(() => null);
    if (!response?.ok) return;
    const data = (await response.json().catch(() => null)) as
      | ActiveAnnouncementResponse
      | null;
    const queue =
      data?.announcements ??
      (data?.announcement ? [data.announcement] : []);
    const visible = queue.filter(
      (item) =>
        item.behaviorConfig.frequency !== "once_per_session" ||
        !window.sessionStorage.getItem(storageKey("hidden", item.id))
    );
    setAnnouncements(visible);
    setCurrentIndex((index) => Math.min(index, Math.max(visible.length - 1, 0)));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchActive();
    const id = window.setInterval(() => void fetchActive(), 60000);
    return () => window.clearInterval(id);
  }, [fetchActive]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(false);
  }, [announcement?.id]);

  const removeCurrent = useCallback(() => {
    if (!announcement) return;
    setAnnouncements((items) => items.filter((item) => item.id !== announcement.id));
    setCurrentIndex((index) =>
      Math.min(index, Math.max(announcements.length - 2, 0))
    );
    setExpanded(false);
  }, [announcement, announcements.length]);

  useEffect(() => {
    if (!announcement) return;
    const viewedKey = storageKey("viewed", announcement.id);
    if (window.sessionStorage.getItem(viewedKey)) return;

    const id = window.setTimeout(() => {
      window.sessionStorage.setItem(viewedKey, "1");
      if (announcement.behaviorConfig.frequency === "once_per_session") {
        window.sessionStorage.setItem(storageKey("hidden", announcement.id), "1");
      }
      void postAnnouncementEvent(announcement.id, "view");
    }, 1000);

    return () => window.clearTimeout(id);
  }, [announcement]);

  useEffect(() => {
    if (!announcement) return;
    const seconds = announcement.behaviorConfig.autoHideSeconds;
    if (
      !seconds ||
      announcement.behaviorConfig.requireAcknowledgement ||
      announcement.behaviorConfig.pinned ||
      !announcement.behaviorConfig.dismissible
    ) {
      return;
    }

    const id = window.setTimeout(() => {
      removeCurrent();
      void postAnnouncementEvent(announcement.id, "dismiss", {
        source: "auto_hide",
      });
    }, seconds * 1000);

    return () => window.clearTimeout(id);
  }, [announcement, removeCurrent]);

  const go = useCallback(
    (delta: number) => {
      setCurrentIndex((index) => {
        if (announcements.length === 0) return 0;
        return (index + delta + announcements.length) % announcements.length;
      });
    },
    [announcements.length]
  );

  const hideWithEvent = useCallback(
    (eventType: "dismiss" | "snooze" | "acknowledge") => {
      if (!announcement) return;
      const current = announcement;
      removeCurrent();
      void postAnnouncementEvent(
        current.id,
        eventType,
        eventType === "snooze"
          ? { snoozeHours: current.behaviorConfig.snoozeHours }
          : undefined
      );
    },
    [announcement, removeCurrent]
  );

  const onToggleExpanded = useCallback(() => {
    setExpanded((current) => !current);
    if (announcement && !expandedEventSent.current.has(announcement.id)) {
      expandedEventSent.current.add(announcement.id);
      void postAnnouncementEvent(announcement.id, "expand");
    }
  }, [announcement]);

  const ctaClick = useCallback(() => {
    if (!announcement) return;
    void postAnnouncementEvent(announcement.id, "cta_click", undefined, true);
  }, [announcement]);

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null || announcements.length <= 1) return;
    const end = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = end - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    go(delta < 0 ? 1 : -1);
  }

  const carouselControls = useMemo(() => {
    if (announcements.length <= 1) return null;
    return (
      <div className="flex items-center gap-1 text-xs">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => go(-1)}
          aria-label="Previous announcement"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="min-w-10 text-center font-medium">
          {currentIndex + 1}/{announcements.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => go(1)}
          aria-label="Next announcement"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }, [announcements.length, currentIndex, go]);

  if (!announcement) return null;

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <DashboardAnnouncementBannerView
        announcement={announcement}
        expanded={expanded}
        carouselControls={carouselControls}
        onToggleExpanded={onToggleExpanded}
        onDismiss={() => hideWithEvent("dismiss")}
        onSnooze={() => hideWithEvent("snooze")}
        onAcknowledge={() => hideWithEvent("acknowledge")}
        onCtaClick={ctaClick}
      />
    </div>
  );
}
