import type { CSSProperties, ElementType, ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Circle,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  HelpCircle,
  Inbox,
  LibraryBig,
  MessageSquareText,
  MousePointerClick,
  Plus,
  RadioTower,
  Send,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { withHostPreviewParam } from "@/lib/analytics/host-preview";
import { guidebookPublicPath } from "@/lib/guidebook-public-url";
import { db } from "@/lib/db";
import {
  analyticsEvents,
  chatMessages,
  chatSessions,
  guidebookCollaborators,
  guidebookSections,
  guidebooks,
  hostAssets,
  properties,
  storeRequestMessages,
  storeRequests,
} from "@/lib/db/schema";
import { getMonthlyCap, getMonthlyUsage } from "@/lib/ai/usage";
import { getUserEntitlement } from "@/lib/billing/entitlements";
import { PLAN_MAP, formatLimit } from "@/lib/billing/plans";
import { getNotificationSummary, type NotificationItem } from "@/lib/notifications";
import { readGuestTarget } from "@/lib/chat-message-metadata";
import { formatStoreMoney } from "@/lib/store/public";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";

type GuidebookRow = typeof guidebooks.$inferSelect & {
  property: typeof properties.$inferSelect | null;
};

type CommandGuidebook = GuidebookRow & {
  viewCount: number;
  recentViews: number;
  recentGuests: number;
  recentSectionClicks: number;
  recentShares: number;
  recentGuestQuestions: number;
};

type PropertySummary = typeof properties.$inferSelect & {
  guidebookCount: number;
  liveGuidebookCount: number;
  draftGuidebookCount: number;
  viewCount: number;
  lastGuidebookUpdatedAt: Date | null;
};

type EventRow = {
  guidebookId: string;
  eventType: string;
  visitorId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

type ChatMetricRow = {
  guidebookId: string;
  sessionId: string;
  role: string;
  createdAt: Date;
};

type SectionTitleRow = {
  id: string;
  title: string;
};

type StoreRequestActivityRow = {
  id: string;
  guidebookId: string;
  requestCode: string;
  guestName: string;
  status: string;
  paymentStatus: string;
  subtotalCents: number;
  currency: string;
  paymentProofSubmittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type StoreMessageActivityRow = {
  requestId: string;
  guidebookId: string;
  requestCode: string;
  authorType: string;
  createdAt: Date;
};

type SessionRow = {
  sessionId: string;
  guidebookId: string;
  guidebookTitle: string;
  guestName: string | null;
  guestEmail: string | null;
  hostEscalatedAt: Date | null;
  hostLastReadAt: Date | null;
  hostArchivedAt: Date | null;
  aiArchivedAt: Date | null;
  lastMessageAt: Date | null;
  createdAt: Date;
};

type MessageSummary = {
  sessionId: string;
  role: string;
  content: string;
  toolCalls: unknown;
  createdAt: Date;
};

type InboxItem = {
  sessionId: string;
  guidebookId: string;
  guidebookTitle: string;
  guestLabel: string;
  snippet: string;
  unread: boolean;
  hostNeedsReply: boolean;
  latestGuestHostAt: Date | null;
  lastMessageAt: Date | null;
};

type Accent = {
  bg: string;
  color: string;
  border: string;
};

type QueueTone = "danger" | "warning" | "info" | "success" | "neutral";

type QueueItem = {
  tone: QueueTone;
  icon: ElementType;
  title: string;
  body: string;
  href: string;
  action: string;
  count?: number;
};

type ActivityItem = {
  id: string;
  icon: ElementType;
  label: string;
  title: string;
  detail: string;
  href: string;
  createdAt: Date;
  tone: QueueTone;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TONE_ACCENTS = {
  danger: { bg: "#FFF1F2", color: "#E11D48", border: "#FDA4AF" },
  warning: { bg: "#FFF8E8", color: "#B7791F", border: "#F6D365" },
  info: { bg: "#EEF4FF", color: "#4D7CFF", border: "#B8CAFF" },
  success: { bg: "#ECFFF5", color: "#1FBF8F", border: "#A8EFD4" },
  neutral: { bg: "#F4F7F8", color: "#60717A", border: "#D8E0E4" },
} satisfies Record<QueueTone, Accent>;

const SIGNAL_ACCENTS = {
  replies: { bg: "#FFF1F2", color: "#E11D48", border: "#FDA4AF" },
  live: { bg: "#ECFFF5", color: "#1FBF8F", border: "#A8EFD4" },
  drafts: { bg: "#F4F7F8", color: "#60717A", border: "#D8E0E4" },
  changes: { bg: "#FFF8E8", color: "#B7791F", border: "#F6D365" },
  guests: { bg: "#EEF4FF", color: "#4D7CFF", border: "#B8CAFF" },
  actions: { bg: "#FFF8E8", color: "#B7791F", border: "#F6D365" },
  ai: { bg: "#F3F0FF", color: "#7C5CFF", border: "#C9BFFF" },
  store: { bg: "#ECFFF5", color: "#0F8F6B", border: "#A8EFD4" },
} satisfies Record<string, Accent>;

const DASHBOARD_TERM_COPY = {
  aiConcierge: {
    label: "AI Concierge",
    description: "Monthly AI usage plus recent AI replies sent in guest conversations. The detail shows AI replies from the last 30 days.",
  },
  commandQueue: {
    label: "Command Queue",
    description: "Ranked host actions based on the current account state, including guest replies, publishing health, setup gaps, and usage limits.",
  },
  contentActions: {
    label: "Content Actions",
    description: "Section taps plus guidebook shares from the last 30 days. The detail breaks the total into section taps and shares.",
  },
  guestActivityPulse: {
    label: "Guest Activity Pulse",
    description: "Operational events from guidebooks, conversations, and Store requests in the last 30 days, such as opens, questions, Store updates, shares, and section taps.",
  },
  guestsReached: {
    label: "Guests Reached",
    description: "Estimated unique guest devices that opened your guidebooks in the last 30 days. The detail shows all-time guidebook opens.",
  },
  guidebookOperations: {
    label: "Guidebook Operations",
    description: "Recent performance, publishing health, and fast actions for active guidebook work.",
  },
  inboxPreview: {
    label: "Inbox Preview",
    description: "Guest threads that need host attention, including unread or unanswered host-directed messages.",
  },
  publishedGuidebooks: {
    label: "Published",
    description: "Live guidebooks available to guests and counting against the current plan's published guidebook limit.",
  },
  draftGuidebooks: {
    label: "Drafts",
    description: "Draft guidebooks saved in the workspace and counting against the current plan's draft guidebook limit.",
  },
  unpublishedChanges: {
    label: "Unpublished Changes",
    description: "Live guidebooks with saved edits that guests cannot see until the host publishes changes.",
  },
  needsReply: {
    label: "Needs Reply",
    description: "Guest threads where the latest host-directed guest message has not been answered. The detail shows unread host threads.",
  },
  storeRequests: {
    label: "Store Requests",
    description: "Store orders that need host attention, plus recent Store request and payment-proof activity.",
  },
  propertyPortfolio: {
    label: "Property Portfolio",
    description: "Properties ranked by guest reach and guidebook coverage.",
  },
  readinessScore: {
    label: "Readiness Score",
    description: "Setup checklist progress across the core items that make Guestnix useful for guests. The card shows completed setup items and percent complete.",
  },
  topGuestNeeds: {
    label: "Top Guest Needs",
    description: "Sections guests are opening most often, based on recent guidebook section taps.",
  },
} as const;

type DashboardTermKey = keyof typeof DASHBOARD_TERM_COPY;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatCompact(value: number) {
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatRelativeTime(value: Date | string | null) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  if (abs < 60 * 1000) return "just now";
  if (abs < 60 * 60 * 1000) {
    return rtf.format(Math.round(diffMs / (60 * 1000)), "minute");
  }
  if (abs < MS_PER_DAY) {
    return rtf.format(Math.round(diffMs / (60 * 60 * 1000)), "hour");
  }
  if (abs < 30 * MS_PER_DAY) {
    return rtf.format(Math.round(diffMs / MS_PER_DAY), "day");
  }

  return formatDate(date);
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${formatNumber(value)} ${value === 1 ? singular : pluralLabel}`;
}

function formatQuotaValue(used: number, limit: number | null | undefined) {
  if (limit == null || !Number.isFinite(limit)) return formatNumber(used);
  return `${formatNumber(used)} / ${formatLimit(limit)}`;
}

function formatQuotaDetail(
  used: number,
  limit: number | null | undefined,
  noun: string,
  pluralLabel = `${noun}s`
) {
  if (limit == null) return "No active plan";
  if (!Number.isFinite(limit)) return `Unlimited ${pluralLabel} available`;

  const remaining = limit - used;
  if (remaining < 0) {
    return `${formatNumber(Math.abs(remaining))} over plan limit`;
  }
  return `${formatNumber(remaining)} ${remaining === 1 ? noun : pluralLabel} available`;
}

function snippet(message: MessageSummary | undefined) {
  const text = message?.content.trim();
  if (!text) return "No message preview";
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function latest<T extends { createdAt: Date }>(items: T[]) {
  return items[items.length - 1];
}

function findSectionTitle(
  metadata: Record<string, unknown> | null,
  sectionTitleById?: Map<string, string>
) {
  if (typeof metadata?.sectionTitle === "string" && metadata.sectionTitle.trim()) {
    return metadata.sectionTitle.trim();
  }

  if (typeof metadata?.sectionId === "string" && metadata.sectionId.trim()) {
    const title = sectionTitleById?.get(metadata.sectionId);
    if (title) return title;
    return `Section ${metadata.sectionId.slice(0, 8)}`;
  }

  return "A guidebook section";
}

function featuredPageLabel(metadata: Record<string, unknown> | null) {
  if (typeof metadata?.pageLabel === "string" && metadata.pageLabel.trim()) {
    return metadata.pageLabel.trim();
  }
  if (typeof metadata?.page === "string" && metadata.page.trim()) {
    const normalized = metadata.page.trim().replaceAll("_", " ");
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  return "Featured page";
}

function hasUnpublishedGuidebookChanges(guidebook: CommandGuidebook) {
  return (
    guidebook.status === "published" &&
    guidebook.publishedAt !== null &&
    guidebook.updatedAt.getTime() > guidebook.publishedAt.getTime()
  );
}

function guidebookStatus(guidebook: CommandGuidebook) {
  if (hasUnpublishedGuidebookChanges(guidebook)) {
    return {
      label: "Unpublished changes",
      className: "border-amber-300 bg-amber-50 text-amber-700",
    };
  }

  if (guidebook.status === "published") {
    return {
      label: "Live",
      className: "border-emerald-300 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label: "Draft",
    className: "border-slate-300 bg-slate-50 text-slate-600",
  };
}

function panelHeaderStyle(accent: Accent) {
  return {
    background: `linear-gradient(90deg, ${accent.bg}, transparent 82%)`,
  } satisfies CSSProperties;
}

function DashboardTerm({
  term,
  children,
  className,
}: {
  term: DashboardTermKey;
  children?: ReactNode;
  className?: string;
}) {
  const copy = DASHBOARD_TERM_COPY[term];

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 align-baseline", className)}>
      <span className="min-w-0">{children ?? copy.label}</span>
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-label={`What does ${copy.label} mean?`}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/75 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent className="max-w-72 text-left leading-relaxed">
          {copy.description}
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

function SignalCard({
  label,
  term,
  value,
  detail,
  icon: Icon,
  accent,
  href,
  ctaLabel,
}: {
  label: string;
  term: DashboardTermKey;
  value: string;
  detail: ReactNode;
  icon: ElementType;
  accent: Accent;
  href: string;
  ctaLabel: string;
}) {
  return (
    <Card size="sm" className="gap-0 !py-0 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader
        className="flex flex-row items-center justify-between px-4 py-3"
        style={panelHeaderStyle(accent)}
      >
        <CardTitle className="text-sm text-muted-foreground">
          <DashboardTerm term={term}>{label}</DashboardTerm>
        </CardTitle>
        <span
          className="grid size-7 place-items-center rounded-md bg-white/80"
          style={{ color: accent.color }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent className="py-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 h-6 px-0 text-xs text-primary hover:bg-transparent"
          render={<Link href={href} />}
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function QueueRow({ item }: { item: QueueItem }) {
  const Icon = item.icon;
  const accent = TONE_ACCENTS[item.tone];

  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 border-b py-3 transition-colors last:border-0 hover:text-primary"
    >
      <span
        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md border"
        style={{
          backgroundColor: accent.bg,
          borderColor: accent.border,
          color: accent.color,
        }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{item.title}</p>
          {typeof item.count === "number" && item.count > 0 ? (
            <span
              className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
              style={{ backgroundColor: accent.bg, color: accent.color }}
            >
              {formatNumber(item.count)}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
      </div>
      <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-[0.8rem] font-medium text-primary">
        {item.action}
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function ReadinessItem({
  done,
  label,
  detail,
  href,
}: {
  done: boolean;
  label: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-w-0 items-start gap-2 rounded-md border bg-background p-2.5 transition-colors hover:border-primary/35 hover:text-primary"
    >
      <span
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border",
          done
            ? "border-emerald-200 bg-emerald-50 text-emerald-600"
            : "border-muted bg-muted/35 text-muted-foreground"
        )}
      >
        {done ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium">{label}</span>
        <span className="block text-[11px] leading-snug text-muted-foreground">{detail}</span>
      </span>
    </Link>
  );
}

function FocusedSetupStep({
  step,
  done,
  label,
  detail,
  href,
}: {
  step: number;
  done: boolean;
  label: string;
  detail: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-48 flex-col justify-between rounded-xl border bg-background p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md",
        done && "border-emerald-200 bg-emerald-50/35"
      )}
    >
      <span className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-lg border text-sm font-semibold",
            done
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-primary/20 bg-primary/10 text-primary"
          )}
        >
          {done ? <CheckCircle2 className="h-5 w-5" /> : step}
        </span>
        <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="mt-6 block">
        <span className="block text-xl font-semibold">{label}</span>
        <span className="mt-2 block max-w-lg text-sm leading-relaxed text-muted-foreground">
          {detail}
        </span>
      </span>
      <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        {done ? "Review" : step === 1 ? "Add property" : "Create guidebook"}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.icon;
  const accent = TONE_ACCENTS[item.tone];

  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 border-b py-3 transition-colors last:border-0 hover:text-primary"
    >
      <span
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md"
        style={{ backgroundColor: accent.bg, color: accent.color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>
        <p className="mt-1 text-xs font-medium" style={{ color: accent.color }}>
          {item.label}
        </p>
      </div>
    </Link>
  );
}

function NotificationPanel({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  return (
    <Card className="pt-0">
      <CardHeader className="px-4 py-3" style={panelHeaderStyle(TONE_ACCENTS.info)}>
        <CardTitle>System Notifications</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" render={<Link href="/dashboard/notifications" />}>
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardAction>
        <CardDescription>
          {unreadCount > 0
            ? `${formatNumber(unreadCount)} unread update${unreadCount === 1 ? "" : "s"}`
            : "Invites, ownership requests, and account updates"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
            <p className="font-medium">No system notifications</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Important host updates will appear here.
            </p>
          </div>
        ) : (
          <div>
            {items.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={item.href ?? "/dashboard/notifications"}
                className="flex items-start gap-3 border-b py-3 transition-colors last:border-0 hover:text-primary"
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    item.readAt ? "bg-muted" : "bg-primary"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: ElementType;
  title: string;
  body: string;
  action: { label: string; href: string };
}) {
  return (
    <div className="grid place-items-center py-10 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      <Button className="mt-4" render={<Link href={action.href} />}>
        <Plus className="h-4 w-4" />
        {action.label}
      </Button>
    </div>
  );
}

function GuidebookListRow({ guidebook }: { guidebook: CommandGuidebook }) {
  const status = guidebookStatus(guidebook);
  const liveHref = withHostPreviewParam(
    guidebookPublicPath(guidebook.slug, guidebook.settings as Record<string, unknown>)
  );

  return (
    <div className="grid gap-3 border-b py-3 last:border-0 md:grid-cols-[minmax(0,1fr)_120px_120px_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/guidebooks/${guidebook.id}/editor`}
            className="truncate font-medium hover:text-primary"
          >
            {guidebook.title}
          </Link>
          <Badge variant="outline" className={cn("shrink-0", status.className)}>
            {status.label}
          </Badge>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {guidebook.property?.name ?? "No property linked"} - updated{" "}
          {formatRelativeTime(guidebook.updatedAt)}
        </p>
      </div>
      <div className="text-sm">
        <span className="font-semibold tabular-nums">{formatNumber(guidebook.recentViews)}</span>
        <span className="ml-1 text-xs text-muted-foreground">30-day opens</span>
      </div>
      <div className="text-sm">
        <span className="font-semibold tabular-nums">{formatCompact(guidebook.viewCount)}</span>
        <span className="ml-1 text-xs text-muted-foreground">all-time</span>
      </div>
      <div className="flex flex-wrap gap-1.5 md:justify-end">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Edit ${guidebook.title}`}
          render={<Link href={`/dashboard/guidebooks/${guidebook.id}/editor`} />}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Analytics for ${guidebook.title}`}
          render={<Link href={`/dashboard/analytics?guidebook_id=${guidebook.id}`} />}
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        {guidebook.status === "published" ? (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={`Open live guidebook ${guidebook.title}`}
            render={<Link href={liveHref} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function PropertyRow({ property }: { property: PropertySummary }) {
  const location = [property.city, property.state, property.country].filter(Boolean).join(", ");

  return (
    <div className="grid gap-3 border-b py-3 last:border-0 md:grid-cols-[minmax(0,1fr)_120px_120px_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-medium">{property.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {location || property.address || "No location added"}
        </p>
      </div>
      <div className="text-sm">
        <span className="font-semibold tabular-nums">{formatNumber(property.liveGuidebookCount)}</span>
        <span className="ml-1 text-xs text-muted-foreground">live</span>
      </div>
      <div className="text-sm">
        <span className="font-semibold tabular-nums">{formatCompact(property.viewCount)}</span>
        <span className="ml-1 text-xs text-muted-foreground">views</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="justify-start md:justify-center"
        render={<Link href={`/dashboard/guidebooks?property=${property.id}`} />}
      >
        Open
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function buildInboxItems(sessionRows: SessionRow[], messageSummaries: MessageSummary[]) {
  const bySession = new Map<string, MessageSummary[]>();

  for (const message of messageSummaries) {
    const messages = bySession.get(message.sessionId) ?? [];
    messages.push(message);
    bySession.set(message.sessionId, messages);
  }

  for (const messages of bySession.values()) {
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  return sessionRows
    .map<InboxItem>((session) => {
      const messages = bySession.get(session.sessionId) ?? [];
      const isHostGuestMessage = (message: MessageSummary) => {
        const target = readGuestTarget(message.toolCalls);
        return (
          message.role === "guest" &&
          (target === "host" ||
            (target == null &&
              session.hostEscalatedAt != null &&
              message.createdAt >= session.hostEscalatedAt))
        );
      };
      const hostGuestMessages = messages.filter(isHostGuestMessage);
      const latestGuestHost = latest(hostGuestMessages);
      const latestHostReply = latest(messages.filter((message) => message.role === "host"));
      const latestGuestHostAt = latestGuestHost?.createdAt ?? null;
      const latestHostReplyAt = latestHostReply?.createdAt ?? null;
      const hostNeedsReply =
        latestGuestHostAt != null &&
        (latestHostReplyAt == null || latestGuestHostAt > latestHostReplyAt) &&
        (session.hostArchivedAt == null || latestGuestHostAt > session.hostArchivedAt);
      const unread =
        latestGuestHostAt != null &&
        (session.hostLastReadAt == null || session.hostLastReadAt < latestGuestHostAt);
      const guestLabel =
        session.guestName ||
        session.guestEmail ||
        `Guest ${session.sessionId.replaceAll("-", "").slice(-4).toUpperCase()}`;

      return {
        sessionId: session.sessionId,
        guidebookId: session.guidebookId,
        guidebookTitle: session.guidebookTitle,
        guestLabel,
        snippet: snippet(latestGuestHost ?? latest(messages)),
        unread,
        hostNeedsReply,
        latestGuestHostAt,
        lastMessageAt: session.lastMessageAt,
      };
    })
    .filter((item) => item.hostNeedsReply || item.unread)
    .sort(
      (a, b) =>
        (b.latestGuestHostAt ?? b.lastMessageAt ?? new Date(0)).getTime() -
        (a.latestGuestHostAt ?? a.lastMessageAt ?? new Date(0)).getTime()
    );
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const periodStart = addDays(startOfDay(new Date()), -29);
  const [
    ownedGuidebooksRaw,
    hostProperties,
    sharedGuidebookRows,
    assetCountRows,
    entitlement,
    monthlyUsage,
    monthlyCap,
    notificationSummary,
  ] = await Promise.all([
    db.query.guidebooks.findMany({
      where: eq(guidebooks.userId, user.id),
      with: { property: true },
      orderBy: [desc(guidebooks.updatedAt)],
    }) as Promise<GuidebookRow[]>,
    db.query.properties.findMany({
      where: eq(properties.userId, user.id),
      orderBy: [desc(properties.updatedAt)],
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(guidebookCollaborators)
      .innerJoin(guidebooks, eq(guidebookCollaborators.guidebookId, guidebooks.id))
      .where(
        and(
          eq(guidebookCollaborators.userId, user.id),
          eq(guidebookCollaborators.role, "editor"),
          ne(guidebooks.userId, user.id)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(hostAssets)
      .where(eq(hostAssets.userId, user.id)),
    getUserEntitlement(user.id),
    getMonthlyUsage(user.id),
    getMonthlyCap(user.id),
    getNotificationSummary(user.id, 5),
  ]);

  const ownedGuidebookIds = ownedGuidebooksRaw.map((guidebook) => guidebook.id);
  const guidebookById = new Map(
    ownedGuidebooksRaw.map((guidebook) => [guidebook.id, guidebook])
  );

  let allTimeViewRows: Array<{ guidebookId: string; views: number }> = [];
  let recentEventRows: EventRow[] = [];
  let recentChatRows: ChatMetricRow[] = [];
  let sectionTitleRows: SectionTitleRow[] = [];
  let recentStoreRequestRows: StoreRequestActivityRow[] = [];
  let recentStoreMessageRows: StoreMessageActivityRow[] = [];
  let storeAttentionRows: Array<{ count: number }> = [];
  let sessionRows: SessionRow[] = [];

  if (ownedGuidebookIds.length > 0) {
    const [
      viewRows,
      eventRows,
      chatRows,
      storeRequestRows,
      storeMessageRows,
      attentionRows,
      sectionsForTitles,
      sessions,
    ] = await Promise.all([
      db
        .select({
          guidebookId: analyticsEvents.guidebookId,
          views: sql<number>`count(*)::int`,
        })
        .from(analyticsEvents)
        .where(
          and(
            inArray(analyticsEvents.guidebookId, ownedGuidebookIds),
            eq(analyticsEvents.eventType, "page_view")
          )
        )
        .groupBy(analyticsEvents.guidebookId),
      db
        .select({
          guidebookId: analyticsEvents.guidebookId,
          eventType: analyticsEvents.eventType,
          visitorId: analyticsEvents.visitorId,
          metadata: analyticsEvents.metadata,
          createdAt: analyticsEvents.createdAt,
        })
        .from(analyticsEvents)
        .where(
          and(
            inArray(analyticsEvents.guidebookId, ownedGuidebookIds),
            gte(analyticsEvents.createdAt, periodStart)
          )
        )
        .orderBy(desc(analyticsEvents.createdAt)),
      db
        .select({
          guidebookId: chatSessions.guidebookId,
          sessionId: chatMessages.sessionId,
          role: chatMessages.role,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
        .innerJoin(guidebooks, eq(chatSessions.guidebookId, guidebooks.id))
        .where(
          and(
            eq(guidebooks.userId, user.id),
            inArray(chatSessions.guidebookId, ownedGuidebookIds),
            gte(chatMessages.createdAt, periodStart)
          )
        ),
      db
        .select({
          id: storeRequests.id,
          guidebookId: storeRequests.guidebookId,
          requestCode: storeRequests.requestCode,
          guestName: storeRequests.guestName,
          status: storeRequests.status,
          paymentStatus: storeRequests.paymentStatus,
          subtotalCents: storeRequests.subtotalCents,
          currency: storeRequests.currency,
          paymentProofSubmittedAt: storeRequests.paymentProofSubmittedAt,
          createdAt: storeRequests.createdAt,
          updatedAt: storeRequests.updatedAt,
        })
        .from(storeRequests)
        .where(
          and(
            eq(storeRequests.userId, user.id),
            inArray(storeRequests.guidebookId, ownedGuidebookIds),
            or(
              gte(storeRequests.createdAt, periodStart),
              gte(storeRequests.paymentProofSubmittedAt, periodStart)
            )
          )
        )
        .orderBy(desc(storeRequests.createdAt))
        .limit(40),
      db
        .select({
          requestId: storeRequestMessages.requestId,
          guidebookId: storeRequests.guidebookId,
          requestCode: storeRequests.requestCode,
          authorType: storeRequestMessages.authorType,
          createdAt: storeRequestMessages.createdAt,
        })
        .from(storeRequestMessages)
        .innerJoin(storeRequests, eq(storeRequestMessages.requestId, storeRequests.id))
        .where(
          and(
            eq(storeRequests.userId, user.id),
            inArray(storeRequests.guidebookId, ownedGuidebookIds),
            gte(storeRequestMessages.createdAt, periodStart)
          )
        )
        .orderBy(desc(storeRequestMessages.createdAt))
        .limit(60),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(storeRequests)
        .where(
          and(
            eq(storeRequests.userId, user.id),
            inArray(storeRequests.guidebookId, ownedGuidebookIds),
            or(
              eq(storeRequests.status, "new"),
              eq(storeRequests.paymentStatus, "proof_submitted")
            )
          )
        ),
      db
        .select({
          id: guidebookSections.id,
          title: guidebookSections.title,
        })
        .from(guidebookSections)
        .where(inArray(guidebookSections.guidebookId, ownedGuidebookIds)),
      db
        .select({
          sessionId: chatSessions.id,
          guidebookId: chatSessions.guidebookId,
          guidebookTitle: guidebooks.title,
          guestName: chatSessions.guestName,
          guestEmail: chatSessions.guestEmail,
          hostEscalatedAt: chatSessions.hostEscalatedAt,
          hostLastReadAt: chatSessions.hostLastReadAt,
          hostArchivedAt: chatSessions.hostArchivedAt,
          aiArchivedAt: chatSessions.aiArchivedAt,
          lastMessageAt: chatSessions.lastMessageAt,
          createdAt: chatSessions.createdAt,
        })
        .from(chatSessions)
        .innerJoin(guidebooks, eq(chatSessions.guidebookId, guidebooks.id))
        .where(eq(guidebooks.userId, user.id))
        .orderBy(desc(chatSessions.lastMessageAt))
        .limit(40),
    ]);

    allTimeViewRows = viewRows;
    recentEventRows = eventRows as EventRow[];
    recentChatRows = chatRows;
    recentStoreRequestRows = storeRequestRows;
    recentStoreMessageRows = storeMessageRows;
    storeAttentionRows = attentionRows;
    sectionTitleRows = sectionsForTitles;
    sessionRows = sessions;
  }

  const sessionIds = sessionRows.map((session) => session.sessionId);
  const messageSummaries =
    sessionIds.length > 0
      ? ((await db
          .select({
            sessionId: chatMessages.sessionId,
            role: chatMessages.role,
            content: chatMessages.content,
            toolCalls: chatMessages.toolCalls,
            createdAt: chatMessages.createdAt,
          })
          .from(chatMessages)
          .where(inArray(chatMessages.sessionId, sessionIds))) as MessageSummary[])
      : [];
  const sectionTitleById = new Map(
    sectionTitleRows.map((section) => [section.id, section.title || "Untitled"])
  );

  const allTimeViewsByGuidebook = new Map(
    allTimeViewRows.map((row) => [row.guidebookId, Number(row.views)])
  );
  const recentViewsByGuidebook = new Map<string, number>();
  const recentGuestsByGuidebook = new Map<string, Set<string>>();
  const recentSectionClicksByGuidebook = new Map<string, number>();
  const recentSharesByGuidebook = new Map<string, number>();

  for (const event of recentEventRows) {
    if (event.visitorId) {
      const guests = recentGuestsByGuidebook.get(event.guidebookId) ?? new Set<string>();
      guests.add(event.visitorId);
      recentGuestsByGuidebook.set(event.guidebookId, guests);
    }
    if (event.eventType === "page_view") {
      recentViewsByGuidebook.set(
        event.guidebookId,
        (recentViewsByGuidebook.get(event.guidebookId) ?? 0) + 1
      );
    } else if (event.eventType === "section_click") {
      recentSectionClicksByGuidebook.set(
        event.guidebookId,
        (recentSectionClicksByGuidebook.get(event.guidebookId) ?? 0) + 1
      );
    } else if (event.eventType === "share") {
      recentSharesByGuidebook.set(
        event.guidebookId,
        (recentSharesByGuidebook.get(event.guidebookId) ?? 0) + 1
      );
    }
  }

  const recentGuestQuestionsByGuidebook = new Map<string, number>();
  for (const chat of recentChatRows) {
    if (chat.role !== "guest") continue;
    recentGuestQuestionsByGuidebook.set(
      chat.guidebookId,
      (recentGuestQuestionsByGuidebook.get(chat.guidebookId) ?? 0) + 1
    );
  }

  const commandGuidebooks: CommandGuidebook[] = ownedGuidebooksRaw.map((guidebook) => ({
    ...guidebook,
    viewCount: allTimeViewsByGuidebook.get(guidebook.id) ?? 0,
    recentViews: recentViewsByGuidebook.get(guidebook.id) ?? 0,
    recentGuests: recentGuestsByGuidebook.get(guidebook.id)?.size ?? 0,
    recentSectionClicks: recentSectionClicksByGuidebook.get(guidebook.id) ?? 0,
    recentShares: recentSharesByGuidebook.get(guidebook.id) ?? 0,
    recentGuestQuestions: recentGuestQuestionsByGuidebook.get(guidebook.id) ?? 0,
  }));

  const propertyMetrics = new Map<
    string,
    {
      guidebookCount: number;
      liveGuidebookCount: number;
      draftGuidebookCount: number;
      viewCount: number;
      lastGuidebookUpdatedAt: Date | null;
    }
  >();

  for (const guidebook of commandGuidebooks) {
    if (!guidebook.propertyId) continue;
    const current =
      propertyMetrics.get(guidebook.propertyId) ??
      {
        guidebookCount: 0,
        liveGuidebookCount: 0,
        draftGuidebookCount: 0,
        viewCount: 0,
        lastGuidebookUpdatedAt: null,
      };

    current.guidebookCount += 1;
    if (guidebook.status === "published") {
      current.liveGuidebookCount += 1;
    } else {
      current.draftGuidebookCount += 1;
    }
    current.viewCount += guidebook.viewCount;
    if (!current.lastGuidebookUpdatedAt || guidebook.updatedAt > current.lastGuidebookUpdatedAt) {
      current.lastGuidebookUpdatedAt = guidebook.updatedAt;
    }
    propertyMetrics.set(guidebook.propertyId, current);
  }

  const propertySummaries: PropertySummary[] = hostProperties.map((property) => {
    const metrics = propertyMetrics.get(property.id);
    return {
      ...property,
      guidebookCount: metrics?.guidebookCount ?? 0,
      liveGuidebookCount: metrics?.liveGuidebookCount ?? 0,
      draftGuidebookCount: metrics?.draftGuidebookCount ?? 0,
      viewCount: metrics?.viewCount ?? 0,
      lastGuidebookUpdatedAt: metrics?.lastGuidebookUpdatedAt ?? null,
    };
  });

  const inboxItems = buildInboxItems(sessionRows, messageSummaries);
  const needsReplyCount = inboxItems.filter((item) => item.hostNeedsReply).length;
  const unreadReplyCount = inboxItems.filter((item) => item.unread).length;
  const liveGuidebooks = commandGuidebooks.filter(
    (guidebook) => guidebook.status === "published"
  );
  const unpublishedChangesGuidebooks = liveGuidebooks.filter(
    hasUnpublishedGuidebookChanges
  );
  const draftGuidebooks = commandGuidebooks.filter(
    (guidebook) => guidebook.status === "draft"
  );
  const publishedGuidebookLimit = entitlement.limits?.publishedGuidebooks;
  const draftGuidebookLimit = entitlement.limits?.drafts;
  const unpublishedChangesHref =
    unpublishedChangesGuidebooks.length > 0
      ? `/dashboard/guidebooks/${unpublishedChangesGuidebooks[0].id}/editor`
      : "/dashboard/guidebooks";
  const unlinkedGuidebooks = commandGuidebooks.filter((guidebook) => !guidebook.propertyId);
  const quietLiveGuidebooks = liveGuidebooks.filter((guidebook) => guidebook.recentViews === 0);
  const totalViews = commandGuidebooks.reduce((sum, guidebook) => sum + guidebook.viewCount, 0);
  const recentAiReplies = recentChatRows.filter((chat) => chat.role === "ai").length;
  const totalAssets = Number(assetCountRows[0]?.count ?? 0);
  const sharedGuidebookCount = Number(sharedGuidebookRows[0]?.count ?? 0);
  const recentStoreRequestCount = recentStoreRequestRows.filter(
    (request) => request.createdAt >= periodStart
  ).length;
  const recentStoreGuestMessageCount = recentStoreMessageRows.filter(
    (message) => message.authorType === "guest"
  ).length;
  const recentStoreProofCount = recentStoreRequestRows.filter(
    (request) =>
      request.paymentProofSubmittedAt != null &&
      request.paymentProofSubmittedAt >= periodStart
  ).length;
  const storeAttentionCount = Number(storeAttentionRows[0]?.count ?? 0);
  const aiUsageLabel =
    monthlyCap == null ? `${formatNumber(monthlyUsage)} used` : `${formatNumber(monthlyUsage)} / ${formatNumber(monthlyCap)}`;
  const aiNearLimit =
    monthlyCap != null && monthlyCap > 0 && monthlyUsage / monthlyCap >= 0.8;
  const planLabel = entitlement.plan ? PLAN_MAP[entitlement.plan].label : "No plan";
  const subscriptionLabel =
    entitlement.status === "active"
      ? `${planLabel} active`
      : entitlement.status === "trialing" && entitlement.isEntitled
        ? `${planLabel} trial, ${entitlement.trialDaysLeft ?? 0} days left`
        : "Trial ended";

  const queueItems: QueueItem[] = [];

  if (needsReplyCount > 0) {
    queueItems.push({
      tone: "danger",
      icon: Inbox,
      title: "Guests need a host reply",
      body: `${plural(unreadReplyCount, "unread thread")} waiting in the host inbox.`,
      href: "/dashboard/messages",
      action: "Reply",
      count: needsReplyCount,
    });
  }

  if (storeAttentionCount > 0) {
    queueItems.push({
      tone: "warning",
      icon: ShoppingBag,
      title: "Store requests need review",
      body: `${plural(storeAttentionCount, "request")} waiting for approval or payment confirmation.`,
      href: "/dashboard/store",
      action: "Review",
      count: storeAttentionCount,
    });
  }

  if (unpublishedChangesGuidebooks.length > 0) {
    const target = unpublishedChangesGuidebooks[0];
    queueItems.push({
      tone: "warning",
      icon: AlertTriangle,
      title: "Live guidebook has unpublished changes",
      body: "Saved guidebook changes are waiting to be published before guests can see them.",
      href: `/dashboard/guidebooks/${target.id}/editor`,
      action: "Publish changes",
      count: unpublishedChangesGuidebooks.length,
    });
  }

  if (entitlement.status !== "active") {
    queueItems.push({
      tone: entitlement.isEntitled ? "warning" : "danger",
      icon: TriangleAlert,
      title: entitlement.isEntitled ? "Trial clock is running" : "Guides may be offline",
      body:
        entitlement.status === "trialing"
          ? `${entitlement.trialDaysLeft ?? 0} trial days left on ${planLabel}.`
          : "Reactivate billing so guest-facing guidebooks stay available.",
      href: "/dashboard/settings?tab=billing",
      action: "Billing",
    });
  }

  if (draftGuidebooks.length > 0 && liveGuidebooks.length === 0) {
    queueItems.push({
      tone: "warning",
      icon: FileText,
      title: "No guidebook is live yet",
      body: "Finish and publish a draft so guests can actually use Guestnix.",
      href: `/dashboard/guidebooks/${draftGuidebooks[0].id}/editor`,
      action: "Publish",
      count: draftGuidebooks.length,
    });
  } else if (draftGuidebooks.length > 0) {
    queueItems.push({
      tone: "info",
      icon: FileText,
      title: "Drafts waiting for review",
      body: "Draft guidebooks are ready to complete, publish, or archive.",
      href: "/dashboard/guidebooks",
      action: "Review",
      count: draftGuidebooks.length,
    });
  }

  if (unlinkedGuidebooks.length > 0 && propertySummaries.length > 0) {
    queueItems.push({
      tone: "info",
      icon: Building2,
      title: "Guidebooks without a property",
      body: "Linking guidebooks to properties keeps portfolio reporting and filtering useful.",
      href: "/dashboard/guidebooks",
      action: "Link",
      count: unlinkedGuidebooks.length,
    });
  }

  if (quietLiveGuidebooks.length > 0 && liveGuidebooks.length > 0) {
    queueItems.push({
      tone: "neutral",
      icon: RadioTower,
      title: "Live guides with no recent opens",
      body: "These links may not be visible in guest messages or check-in instructions.",
      href: "/dashboard/analytics",
      action: "Inspect",
      count: quietLiveGuidebooks.length,
    });
  }

  if (aiNearLimit) {
    queueItems.push({
      tone: "warning",
      icon: Sparkles,
      title: "AI replies are near the monthly cap",
      body: "Raise the cap or review guest questions before the assistant stops responding.",
      href: "/dashboard/settings?tab=ai",
      action: "Adjust",
    });
  }

  if (totalAssets === 0 && commandGuidebooks.length > 0) {
    queueItems.push({
      tone: "info",
      icon: LibraryBig,
      title: "Assets Hub is empty",
      body: "Save reusable answers, brand kits, and local recommendations for faster guidebook work.",
      href: "/dashboard/assets-hub",
      action: "Build",
    });
  }

  if (queueItems.length === 0) {
    queueItems.push({
      tone: "success",
      icon: CheckCircle2,
      title: "Command center is clear",
      body: "No urgent host actions are waiting right now.",
      href: "/dashboard/analytics",
      action: "Analyze",
    });
  }

  const firstName =
    user.user_metadata?.full_name?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";
  const primaryAction =
    propertySummaries.length === 0
      ? {
          label: "Add property",
          href: "/dashboard/properties",
          icon: Building2,
        }
      : commandGuidebooks.length === 0
        ? {
            label: "Create guidebook",
            href: "/dashboard/guidebooks?new=1",
            icon: BookOpen,
          }
        : needsReplyCount > 0
          ? {
              label: "Reply to guests",
              href: "/dashboard/messages",
              icon: MessageSquareText,
            }
          : storeAttentionCount > 0
            ? {
                label: "Review store requests",
                href: "/dashboard/store",
                icon: ShoppingBag,
              }
            : unpublishedChangesGuidebooks.length > 0
              ? {
                  label: "Publish changes",
                  href: `/dashboard/guidebooks/${unpublishedChangesGuidebooks[0].id}/editor`,
                  icon: AlertTriangle,
                }
              : liveGuidebooks.length === 0 && draftGuidebooks[0]
                ? {
                    label: "Publish first guide",
                    href: `/dashboard/guidebooks/${draftGuidebooks[0].id}/editor`,
                    icon: FileCheck2,
                  }
                : {
                    label: "Open analytics",
                    href: "/dashboard/analytics",
                    icon: BarChart3,
                  };
  const PrimaryIcon = primaryAction.icon;
  const readinessItems = [
    {
      done: propertySummaries.length > 0,
      label: "Property profile",
      detail:
        propertySummaries.length > 0
          ? plural(propertySummaries.length, "property", "properties")
          : "Add the place guests are staying.",
      href: "/dashboard/properties",
    },
    {
      done: commandGuidebooks.length > 0,
      label: "Guidebook created",
      detail:
        commandGuidebooks.length > 0
          ? plural(commandGuidebooks.length, "guidebook")
          : "Create the digital welcome guide.",
      href: "/dashboard/guidebooks",
    },
    {
      done: liveGuidebooks.length > 0,
      label: "Guest-facing guide is live",
      detail:
        liveGuidebooks.length > 0
          ? `${plural(liveGuidebooks.length, "guidebook")} ready for guests.`
          : "Publish at least one guidebook.",
      href: "/dashboard/guidebooks",
    },
    {
      done: totalAssets > 0,
      label: "Reusable content saved",
      detail:
        totalAssets > 0
          ? `${plural(totalAssets, "asset")} in Assets Hub.`
          : "Save common answers and local picks.",
      href: "/dashboard/assets-hub",
    },
    {
      done: totalViews > 0,
      label: "Guest activity received",
      detail:
        totalViews > 0
          ? `${formatCompact(totalViews)} all-time guidebook opens.`
          : "Share a live link to start collecting guest activity.",
      href: "/dashboard/analytics",
    },
  ];
  const readinessDone = readinessItems.filter((item) => item.done).length;
  const readinessPercent = Math.round((readinessDone / readinessItems.length) * 100);
  const coreSetupItems = readinessItems.slice(0, 2);
  const coreSetupDone = coreSetupItems.filter((item) => item.done).length;
  const coreSetupComplete = coreSetupDone === coreSetupItems.length;
  const nextCoreSetupItem =
    coreSetupItems.find((item) => !item.done) ?? coreSetupItems[coreSetupItems.length - 1];

  const topGuidebooks = [...commandGuidebooks]
    .sort(
      (a, b) =>
        b.recentViews - a.recentViews ||
        b.viewCount - a.viewCount ||
        b.updatedAt.getTime() - a.updatedAt.getTime()
    )
    .slice(0, 5);
  const topProperties = [...propertySummaries]
    .sort(
      (a, b) =>
        b.viewCount - a.viewCount ||
        (b.lastGuidebookUpdatedAt?.getTime() ?? 0) -
          (a.lastGuidebookUpdatedAt?.getTime() ?? 0)
    )
    .slice(0, 4);

  const topSections = [...recentEventRows]
    .filter((event) => event.eventType === "section_click")
    .reduce((map, event) => {
      const guidebook = guidebookById.get(event.guidebookId);
      const title = findSectionTitle(event.metadata, sectionTitleById);
      const key = `${event.guidebookId}:${title}`;
      const existing = map.get(key);
      if (existing) {
        existing.clicks += 1;
      } else {
        map.set(key, {
          key,
          guidebookId: event.guidebookId,
          title,
          guidebookTitle: guidebook?.title ?? "Guidebook",
          clicks: 1,
        });
      }
      return map;
    }, new Map<string, { key: string; guidebookId: string; title: string; guidebookTitle: string; clicks: number }>());
  const topSectionRows = [...topSections.values()]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  const importantEventFeed: ActivityItem[] = recentEventRows
    .filter(
      (event) =>
        event.eventType !== "page_view" &&
        ![
          "chat_message",
          "store_request_submitted",
          "store_message_sent",
          "store_payment_proof_submitted",
        ].includes(event.eventType)
    )
    .slice(0, 24)
    .map((event) => {
      const guidebook = guidebookById.get(event.guidebookId);
      if (event.eventType === "share") {
        return {
          id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-share`,
          icon: Share2,
          label: "Share",
          title: guidebook?.title ?? "Guidebook shared",
          detail: "A guest used the share action.",
          href: `/dashboard/analytics?guidebook_id=${event.guidebookId}&range=30d`,
          createdAt: event.createdAt,
          tone: "warning" as QueueTone,
        };
      }

      if (event.eventType === "featured_page_viewed") {
        return {
          id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-featured`,
          icon: Eye,
          label: "Page opened",
          title: featuredPageLabel(event.metadata),
          detail: `${guidebook?.title ?? "Guidebook"} featured page`,
          href: `/dashboard/analytics?guidebook_id=${event.guidebookId}&range=30d`,
          createdAt: event.createdAt,
          tone: "success" as QueueTone,
        };
      }

      if (event.eventType === "store_viewed") {
        return {
          id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-store-viewed`,
          icon: ShoppingBag,
          label: "Store opened",
          title: "Store",
          detail: guidebook?.title ?? "Guidebook",
          href: "/dashboard/store",
          createdAt: event.createdAt,
          tone: "success" as QueueTone,
        };
      }

      if (event.eventType === "store_item_selected") {
        return {
          id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-store-item`,
          icon: ShoppingBag,
          label: "Store item selected",
          title: "Store item",
          detail: guidebook?.title ?? "Guidebook",
          href: "/dashboard/store",
          createdAt: event.createdAt,
          tone: "info" as QueueTone,
        };
      }

      if (event.eventType === "store_request_opened") {
        return {
          id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-store-request-opened`,
          icon: ShoppingBag,
          label: "Store request opened",
          title: "Request thread",
          detail: guidebook?.title ?? "Guidebook",
          href: "/dashboard/store",
          createdAt: event.createdAt,
          tone: "info" as QueueTone,
        };
      }

      if (event.eventType === "chat_open") {
        return {
          id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-chat-open`,
          icon: MessageSquareText,
          label: "Chat opened",
          title: guidebook?.title ?? "Guidebook",
          detail: "A guest opened the guidebook chat.",
          href: `/dashboard/messages`,
          createdAt: event.createdAt,
          tone: "info" as QueueTone,
        };
      }

      if (event.eventType === "outbound_link") {
        return {
          id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-outbound`,
          icon: ExternalLink,
          label: "Link opened",
          title:
            typeof event.metadata?.label === "string" && event.metadata.label.trim()
              ? event.metadata.label.trim()
              : "External link",
          detail: guidebook?.title ?? "Guidebook",
          href: `/dashboard/analytics?guidebook_id=${event.guidebookId}&range=30d`,
          createdAt: event.createdAt,
          tone: "info" as QueueTone,
        };
      }

      if (event.eventType === "place_click") {
        return {
          id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-place`,
          icon: MousePointerClick,
          label: "Place opened",
          title:
            typeof event.metadata?.placeName === "string" && event.metadata.placeName.trim()
              ? event.metadata.placeName.trim()
              : "Nearby place",
          detail: guidebook?.title ?? "Guidebook",
          href: `/dashboard/analytics?guidebook_id=${event.guidebookId}&range=30d`,
          createdAt: event.createdAt,
          tone: "info" as QueueTone,
        };
      }

      if (event.eventType === "section_click") {
        return {
          id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-section`,
          icon: MousePointerClick,
          label: "Content opened",
          title: findSectionTitle(event.metadata, sectionTitleById),
          detail: `${guidebook?.title ?? "Guidebook"} section`,
          href: `/dashboard/analytics?guidebook_id=${event.guidebookId}&range=30d`,
          createdAt: event.createdAt,
          tone: "info" as QueueTone,
        };
      }

      return {
        id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-${event.eventType}`,
        icon: Eye,
        label: "Guidebook activity",
        title: guidebook?.title ?? "Guidebook",
        detail: event.eventType.replaceAll("_", " "),
        href: `/dashboard/analytics?guidebook_id=${event.guidebookId}&range=30d`,
        createdAt: event.createdAt,
        tone: "neutral" as QueueTone,
      };
    });

  const guestQuestionFeed: ActivityItem[] = recentChatRows
    .filter((chat) => chat.role === "guest")
    .slice(0, 24)
    .map((chat) => {
      const guidebook = guidebookById.get(chat.guidebookId);
      return {
        id: `chat-${chat.sessionId}-${chat.createdAt.toISOString()}`,
        icon: MessageSquareText,
        label: "Guest question",
        title: guidebook?.title ?? "Guidebook",
        detail: "A guest asked the concierge or host for help.",
        href: `/dashboard/messages?session=${chat.sessionId}`,
        createdAt: chat.createdAt,
        tone: "danger" as QueueTone,
      };
    });

  const storeRequestFeed: ActivityItem[] = recentStoreRequestRows
    .flatMap((request) => {
      const guidebook = guidebookById.get(request.guidebookId);
      const items: ActivityItem[] = [];
      if (request.createdAt >= periodStart) {
        items.push({
          id: `store-request-${request.id}`,
          icon: ShoppingBag,
          label: "Store request",
          title: request.requestCode,
          detail: `${guidebook?.title ?? "Guidebook"} - ${formatStoreMoney(request.subtotalCents, request.currency)}`,
          href: `/dashboard/store?request=${request.id}`,
          createdAt: request.createdAt,
          tone: "warning" as QueueTone,
        });
      }
      if (
        request.paymentProofSubmittedAt != null &&
        request.paymentProofSubmittedAt >= periodStart
      ) {
        items.push({
          id: `store-proof-${request.id}`,
          icon: FileCheck2,
          label: "Payment proof",
          title: request.requestCode,
          detail: `${request.guestName} submitted proof for ${guidebook?.title ?? "Guidebook"}.`,
          href: `/dashboard/store?request=${request.id}`,
          createdAt: request.paymentProofSubmittedAt,
          tone: "success" as QueueTone,
        });
      }
      return items;
    })
    .slice(0, 24);

  const storeMessageFeed: ActivityItem[] = recentStoreMessageRows
    .filter((message) => message.authorType === "guest")
    .slice(0, 24)
    .map((message) => {
      const guidebook = guidebookById.get(message.guidebookId);
      return {
        id: `store-message-${message.requestId}-${message.createdAt.toISOString()}`,
        icon: MessageSquareText,
        label: "Store message",
        title: message.requestCode,
        detail: `Guest replied in a Store request for ${guidebook?.title ?? "Guidebook"}.`,
        href: `/dashboard/store?request=${message.requestId}`,
        createdAt: message.createdAt,
        tone: "info" as QueueTone,
      };
    });

  const primaryActivityCount =
    importantEventFeed.length +
    guestQuestionFeed.length +
    storeRequestFeed.length +
    storeMessageFeed.length;
  const pageViewFeed: ActivityItem[] = primaryActivityCount >= 4
    ? []
    : recentEventRows
        .filter((event) => event.eventType === "page_view")
        .slice(0, 8)
        .map((event) => {
          const guidebook = guidebookById.get(event.guidebookId);
          return {
            id: `view-${event.guidebookId}-${event.createdAt.toISOString()}`,
            icon: Eye,
            label: "Guide opened",
            title: guidebook?.title ?? "Guidebook",
            detail: "A guest opened the public guidebook.",
            href: `/dashboard/analytics?guidebook_id=${event.guidebookId}&range=30d`,
            createdAt: event.createdAt,
            tone: "success" as QueueTone,
          };
        });

  const activityFeed = [
    ...guestQuestionFeed,
    ...storeRequestFeed,
    ...storeMessageFeed,
    ...importantEventFeed,
    ...pageViewFeed,
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);

  if (!coreSetupComplete) {
    return (
      <div className="space-y-5">
        {notificationSummary.items.length > 0 ? (
          <NotificationPanel
            items={notificationSummary.items}
            unreadCount={notificationSummary.unreadCount}
          />
        ) : null}
        <section className="flex min-h-[calc(100dvh-7.5rem)] flex-col rounded-xl border bg-card p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-background"
                  render={<Link href="/dashboard/settings?tab=billing" />}
                >
                  {subscriptionLabel}
                </Badge>
                <Badge variant="secondary">
                  Step {Math.min(coreSetupDone + 1, coreSetupItems.length)} of{" "}
                  {coreSetupItems.length}
                </Badge>
              </div>
              <h1 className="font-heading max-w-3xl text-3xl font-semibold tracking-tight">
                Set up your host workspace
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Complete these first two steps before the command center opens.
                This keeps the dashboard focused while Guestnix has no property
                and guidebook to report on yet.
              </p>
            </div>
            <Button className="w-full lg:w-auto" render={<Link href={nextCoreSetupItem.href} />}>
              {coreSetupDone === 0 ? (
                <Building2 className="h-4 w-4" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              Continue setup
            </Button>
          </div>

          <div className="mt-6 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary"
              style={{ width: `${Math.round((coreSetupDone / coreSetupItems.length) * 100)}%` }}
            />
          </div>

          <div className="mt-8 grid flex-1 gap-4 lg:grid-cols-2">
            {coreSetupItems.map((item, index) => (
              <FocusedSetupStep
                key={item.label}
                step={index + 1}
                done={item.done}
                label={item.label}
                detail={item.detail}
                href={item.href}
              />
            ))}
          </div>

          <div className="mt-6 rounded-lg border bg-muted/25 p-4 text-sm text-muted-foreground">
            The operational dashboard unlocks after your first property and
            first guidebook exist. Then you will see guest replies, publishing
            health, analytics, activity, and portfolio panels.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="bg-background"
                render={<Link href="/dashboard/settings?tab=billing" />}
              >
                {subscriptionLabel}
              </Badge>
              {readinessDone < readinessItems.length ? (
                <Badge
                  variant="outline"
                  className="bg-background"
                  render={
                    <Link
                      href={
                        readinessItems.find((item) => !item.done)?.href ??
                        "/dashboard/guidebooks"
                      }
                    />
                  }
                >
                  Setup: {readinessItems.length - readinessDone} remaining
                </Badge>
              ) : null}
              {sharedGuidebookCount > 0 ? (
                <Badge variant="secondary" render={<Link href="/dashboard/guidebooks" />}>
                  {plural(sharedGuidebookCount, "shared guidebook")}
                </Badge>
              ) : null}
            </div>
            <h1 className="font-heading text-2xl font-semibold">
              Good to see you, {firstName}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Your command center for urgent guest replies, publishing health,
              guest activity, and the next host action.
            </p>
          </div>
          <Button className="w-full lg:w-auto" render={<Link href={primaryAction.href} />}>
            <PrimaryIcon className="h-4 w-4" />
            {primaryAction.label}
          </Button>
        </div>

        {readinessDone < readinessItems.length ? (
          <div className="mt-4 rounded-lg border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="font-medium">
                <DashboardTerm term="readinessScore">Setup gaps</DashboardTerm>
              </div>
              <span className="text-xs text-muted-foreground">
                {readinessDone} of {readinessItems.length} complete
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${readinessPercent}%` }}
              />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              {readinessItems.map((item) => (
                <ReadinessItem key={item.label} {...item} />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <SignalCard
          label="Needs Reply"
          term="needsReply"
          value={formatNumber(needsReplyCount)}
          detail={`${formatNumber(unreadReplyCount)} unread host thread${unreadReplyCount === 1 ? "" : "s"}`}
          icon={Inbox}
          accent={SIGNAL_ACCENTS.replies}
          href="/dashboard/messages"
          ctaLabel="Open inbox"
        />
        <SignalCard
          label="Store Requests"
          term="storeRequests"
          value={formatNumber(storeAttentionCount)}
          detail={`${formatNumber(recentStoreRequestCount)} new, ${formatNumber(recentStoreProofCount)} proof update${recentStoreProofCount === 1 ? "" : "s"}, ${formatNumber(recentStoreGuestMessageCount)} guest message${recentStoreGuestMessageCount === 1 ? "" : "s"} in 30 days`}
          icon={ShoppingBag}
          accent={SIGNAL_ACCENTS.store}
          href="/dashboard/store"
          ctaLabel="Open store"
        />
        <SignalCard
          label="Published"
          term="publishedGuidebooks"
          value={formatQuotaValue(liveGuidebooks.length, publishedGuidebookLimit)}
          detail={formatQuotaDetail(
            liveGuidebooks.length,
            publishedGuidebookLimit,
            "published slot"
          )}
          icon={FileCheck2}
          accent={SIGNAL_ACCENTS.live}
          href="/dashboard/guidebooks"
          ctaLabel="Manage guides"
        />
        <SignalCard
          label="Drafts"
          term="draftGuidebooks"
          value={formatQuotaValue(draftGuidebooks.length, draftGuidebookLimit)}
          detail={formatQuotaDetail(
            draftGuidebooks.length,
            draftGuidebookLimit,
            "draft"
          )}
          icon={FileText}
          accent={SIGNAL_ACCENTS.drafts}
          href="/dashboard/guidebooks"
          ctaLabel="Review drafts"
        />
        <SignalCard
          label="Unpublished Changes"
          term="unpublishedChanges"
          value={formatNumber(unpublishedChangesGuidebooks.length)}
          detail={
            unpublishedChangesGuidebooks.length > 0
              ? `${formatNumber(unpublishedChangesGuidebooks.length)} live ${unpublishedChangesGuidebooks.length === 1 ? "guide needs" : "guides need"} publishing`
              : "All live guides are current"
          }
          icon={AlertTriangle}
          accent={SIGNAL_ACCENTS.changes}
          href={unpublishedChangesHref}
          ctaLabel={
            unpublishedChangesGuidebooks.length > 0
              ? "Publish changes"
              : "Manage guides"
          }
        />
        <SignalCard
          label="AI Concierge"
          term="aiConcierge"
          value={aiUsageLabel}
          detail={`${formatNumber(recentAiReplies)} AI replies in 30 days`}
          icon={Sparkles}
          accent={SIGNAL_ACCENTS.ai}
          href="/dashboard/settings?tab=ai"
          ctaLabel="AI settings"
        />
      </div>

      <NotificationPanel
        items={notificationSummary.items}
        unreadCount={notificationSummary.unreadCount}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <Card className="pt-0">
          <CardHeader className="px-4 py-3" style={panelHeaderStyle(TONE_ACCENTS.danger)}>
            <CardTitle>
              <DashboardTerm term="commandQueue">Command Queue</DashboardTerm>
            </CardTitle>
            <CardDescription>Ranked host actions based on the current account state.</CardDescription>
          </CardHeader>
          <CardContent>
            {queueItems.map((item) => (
              <QueueRow key={`${item.title}-${item.href}`} item={item} />
            ))}
          </CardContent>
        </Card>

        <Card className="pt-0">
          <CardHeader className="px-4 py-3" style={panelHeaderStyle(TONE_ACCENTS.info)}>
            <CardTitle>
              <DashboardTerm term="inboxPreview">Inbox Preview</DashboardTerm>
            </CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/dashboard/messages" />}>
                Open inbox
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardAction>
            <CardDescription>Guest threads that need host attention.</CardDescription>
          </CardHeader>
          <CardContent>
            {inboxItems.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                <p className="font-medium">No host replies waiting</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Guest conversations are clear for now.
                </p>
              </div>
            ) : (
              <div>
                {inboxItems.slice(0, 4).map((item) => (
                  <Link
                    key={item.sessionId}
                    href={`/dashboard/messages?session=${item.sessionId}`}
                    className="block border-b py-3 last:border-0 hover:text-primary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.guestLabel}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.guidebookTitle}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(item.latestGuestHostAt ?? item.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {item.snippet}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <Card className="pt-0">
          <CardHeader className="px-4 py-3" style={panelHeaderStyle(TONE_ACCENTS.success)}>
            <CardTitle>
              <DashboardTerm term="guestActivityPulse">Guest Activity Pulse</DashboardTerm>
            </CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" render={<Link href="/dashboard/activity" />}>
                Full activity
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardAction>
            <CardDescription>
              Operational events from guidebooks, conversations, and Store requests in the last 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activityFeed.length === 0 ? (
              <EmptyPanel
                icon={Send}
                title="No guest activity yet"
                body="Publish and share a guidebook link to start seeing opens, questions, Store requests, and section taps here."
                action={{ label: "Open guidebooks", href: "/dashboard/guidebooks" }}
              />
            ) : (
              <div>{activityFeed.map((item) => <ActivityRow key={item.id} item={item} />)}</div>
            )}
          </CardContent>
        </Card>

        <Card className="pt-0">
          <CardHeader className="px-4 py-3" style={panelHeaderStyle(TONE_ACCENTS.warning)}>
            <CardTitle>
              <DashboardTerm term="topGuestNeeds">Top Guest Needs</DashboardTerm>
            </CardTitle>
            <CardDescription>Sections guests are opening most often.</CardDescription>
          </CardHeader>
          <CardContent>
            {topSectionRows.length === 0 ? (
              <div className="py-8 text-center">
                <MousePointerClick className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No section taps yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once guests use guide content, the most useful sections appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 py-1">
                {topSectionRows.map((section) => {
                  const max = Math.max(1, topSectionRows[0]?.clicks ?? 1);
                  return (
                    <Link
                      key={section.key}
                      href={`/dashboard/analytics?guidebook_id=${section.guidebookId}&range=30d`}
                      className="block rounded-md p-2 -mx-2 transition-colors hover:bg-muted/45 hover:text-primary"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{section.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {section.guidebookTitle}
                          </p>
                        </div>
                        <span className="font-semibold tabular-nums">
                          {formatNumber(section.clicks)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full bg-amber-500"
                          style={{
                            width: `${Math.max(8, Math.round((section.clicks / max) * 100))}%`,
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="pt-0">
        <CardHeader className="px-4 py-3" style={panelHeaderStyle(TONE_ACCENTS.neutral)}>
          <CardTitle>
            <DashboardTerm term="guidebookOperations">Guidebook Operations</DashboardTerm>
          </CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" render={<Link href="/dashboard/guidebooks" />}>
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardAction>
          <CardDescription>
            Recent performance, publishing health, and fast actions for active work.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topGuidebooks.length === 0 ? (
            <EmptyPanel
              icon={BookOpen}
              title="Create your first guidebook"
              body="Start with a property guide, publish it, then share the live link with guests."
              action={{ label: "New guidebook", href: "/dashboard/guidebooks?new=1" }}
            />
          ) : (
            <div>{topGuidebooks.map((guidebook) => <GuidebookListRow key={guidebook.id} guidebook={guidebook} />)}</div>
          )}
        </CardContent>
      </Card>

      <Card className="pt-0">
        <CardHeader className="px-4 py-3" style={panelHeaderStyle(TONE_ACCENTS.info)}>
          <CardTitle>
            <DashboardTerm term="propertyPortfolio">Property Portfolio</DashboardTerm>
          </CardTitle>
          <CardAction>
            <Button variant="ghost" size="sm" render={<Link href="/dashboard/properties" />}>
              Manage
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardAction>
          <CardDescription>
            Properties ranked by guest reach and linked guidebook coverage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topProperties.length === 0 ? (
            <EmptyPanel
              icon={Building2}
              title="Add a property"
              body="Properties turn guidebooks into a portfolio, so you can track live coverage per place."
              action={{ label: "Add property", href: "/dashboard/properties" }}
            />
          ) : (
            <div>{topProperties.map((property) => <PropertyRow key={property.id} property={property} />)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
