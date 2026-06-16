import type { CSSProperties, ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, gte, inArray, or } from "drizzle-orm";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Eye,
  HelpCircle,
  MessageSquareText,
  MonitorSmartphone,
  MousePointerClick,
  RotateCcw,
  Share2,
  ShoppingBag,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  analyticsEvents,
  chatMessages,
  chatSessions,
  guidebooks,
  storeRequestMessages,
  storeRequests,
} from "@/lib/db/schema";
import { formatStoreMoney } from "@/lib/store/public";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const dynamic = "force-dynamic";

type SearchParams = {
  guidebook_id?: string;
  range?: string;
};

type AnalyticsPageProps = {
  searchParams: Promise<SearchParams>;
};

type EventRow = {
  guidebookId: string;
  eventType: string;
  visitorId: string | null;
  deviceType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

type ChatRow = {
  guidebookId: string;
  sessionId: string;
  role: string;
  createdAt: Date;
};

type StoreRequestRow = {
  id: string;
  guidebookId: string;
  status: string;
  paymentStatus: string;
  subtotalCents: number;
  currency: string;
  paymentProofSubmittedAt: Date | null;
  createdAt: Date;
};

type StoreMessageRow = {
  guidebookId: string;
  requestId: string;
  authorType: string;
  createdAt: Date;
};

type GuidebookOption = {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: Date | null;
};

type AnalyticsAccent = {
  bg: string;
  color: string;
};

type ActivityPoint = {
  key: string;
  label: string;
  pageViews: number;
  sectionClicks: number;
  shares: number;
  guestMessages: number;
  storeActions: number;
};

type GuidebookPerformance = {
  guidebookId: string;
  title: string;
  slug: string;
  status: string;
  pageViews: number;
  uniqueVisitors: number;
  sectionClicks: number;
  shares: number;
  guestMessages: number;
  aiMessages: number;
  conversations: number;
  storeRequests: number;
  storeMessages: number;
  storeProofs: number;
  storeValueCents: number;
  storeCurrency: string | null;
};

type SectionPerformance = {
  key: string;
  name: string;
  guidebookTitle: string;
  clicks: number;
};

type HostNoteItem = {
  title: string;
  body: React.ReactNode;
  accent: AnalyticsAccent;
};

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "365d", label: "Last 12 months", days: 365 },
] as const;

const ANALYTICS_ACCENTS = {
  views: { bg: "#EEF4FF", color: "#4D7CFF" },
  visitors: { bg: "#ECFFF5", color: "#1FBF8F" },
  clicks: { bg: "#FFF8E8", color: "#FFB020" },
  messages: { bg: "#F3F0FF", color: "#7C5CFF" },
  shares: { bg: "#FFF3EE", color: "#FF6B3D" },
  neutral: { bg: "#F4F7F8", color: "#6B7C85" },
  strong: { bg: "#ECFFF5", color: "#042129" },
  sections: { bg: "#FFF1F5", color: "#FF4D7D" },
  store: { bg: "#ECFFF5", color: "#0F8F6B" },
} satisfies Record<string, AnalyticsAccent>;

const DEVICE_ACCENTS: Record<string, AnalyticsAccent> = {
  mobile: { bg: "#EEF4FF", color: "#4D7CFF" },
  tablet: { bg: "#F3F0FF", color: "#7C5CFF" },
  desktop: { bg: "#ECFFF5", color: "#1FBF8F" },
  unknown: { bg: "#F4F7F8", color: "#6B7C85" },
};

const ANALYTICS_TERM_COPY = {
  activityOverTime: {
    label: "Guest Activity Over Time",
    description: "A date-by-date view of opens, section taps, shares, and guest questions in the selected period.",
  },
  contentOpens: {
    label: "Content Opens",
    description: "Times guests opened a guidebook section, such as Wi-Fi, check-in, or recommendations. The detail shows content opens per guest.",
  },
  deviceMix: {
    label: "Device Mix",
    description: "Where guests are opening the guidebook, based on page view events.",
  },
  guestQuestions: {
    label: "Guest Questions",
    description: "Messages sent by guests in the guidebook chat. The detail shows conversation count and questions per guest.",
  },
  guestsReached: {
    label: "Guests Reached",
    description: "Estimated unique guests, counted by visitor ID or device in the selected range.",
  },
  guidebookComparison: {
    label: "Guidebook Comparison",
    description: "A per-guidebook breakdown of opens, guests, actions, questions, and shares.",
  },
  guidebookOpens: {
    label: "Guidebook Opens",
    description: "Times guests opened or refreshed a guidebook page. The detail shows how many guidebooks are in scope.",
  },
  hostNotes: {
    label: "Host Notes",
    description: "Operational signals to review before the next stay.",
  },
  sectionsGuestsOpen: {
    label: "Sections Guests Open",
    description: "The content guests are actively checking during their stay.",
  },
  shares: {
    label: "Shares",
    description: "Times guests used the guidebook share action. The detail shows the share rate among guests.",
  },
  storeRequests: {
    label: "Store Requests",
    description: "Guest Store requests submitted in the selected period. The detail shows request value and Store thread activity.",
  },
} as const;

type AnalyticsTermKey = keyof typeof ANALYTICS_TERM_COPY;

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const FULL_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getRangeOption(value: string | undefined) {
  return RANGE_OPTIONS.find((option) => option.value === value) ?? RANGE_OPTIONS[1];
}

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

function getPeriodStart(days: number) {
  return addDays(startOfDay(new Date()), -(days - 1));
}

function dayKey(date: Date) {
  return startOfDay(date).toISOString();
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatDecimal(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
  });
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function formatStoreValue(rows: StoreRequestRow[]) {
  if (rows.length === 0) return formatStoreMoney(0, "USD");
  const currencies = new Set(rows.map((row) => row.currency));
  if (currencies.size > 1) return "Mixed currencies";
  const currency = rows[0]?.currency ?? "USD";
  const total = rows.reduce((sum, row) => sum + row.subtotalCents, 0);
  return formatStoreMoney(total, currency);
}

function getBucketSize(rangeDays: number) {
  if (rangeDays > 180) return 14;
  if (rangeDays > 60) return 7;
  return 1;
}

function formatBucketLabel(start: Date, end: Date) {
  if (start.toDateString() === end.toDateString()) {
    return SHORT_DATE_FORMATTER.format(start);
  }

  return `${SHORT_DATE_FORMATTER.format(start)}-${SHORT_DATE_FORMATTER.format(end)}`;
}

function fadedHeaderStyle(accent: AnalyticsAccent) {
  return {
    background: `linear-gradient(90deg, ${accent.bg}, transparent 78%)`,
  } satisfies CSSProperties;
}

function findSectionTitle(metadata: Record<string, unknown> | null) {
  if (typeof metadata?.sectionTitle === "string" && metadata.sectionTitle.trim()) {
    return metadata.sectionTitle.trim();
  }

  if (typeof metadata?.sectionId === "string" && metadata.sectionId.trim()) {
    return `Section ${metadata.sectionId.slice(0, 8)}`;
  }

  return "Unknown section";
}

function buildActivitySeries(
  events: EventRow[],
  chats: ChatRow[],
  storeRequestRows: StoreRequestRow[],
  storeMessageRows: StoreMessageRow[],
  rangeDays: number
) {
  const bucketSize = getBucketSize(rangeDays);
  const periodStart = getPeriodStart(rangeDays);
  const today = startOfDay(new Date());
  const points: ActivityPoint[] = [];

  for (let cursor = periodStart; cursor <= today; cursor = addDays(cursor, bucketSize)) {
    const bucketEnd = addDays(cursor, bucketSize - 1);
    const cappedEnd = bucketEnd > today ? today : bucketEnd;
    points.push({
      key: dayKey(cursor),
      label: formatBucketLabel(cursor, cappedEnd),
      pageViews: 0,
      sectionClicks: 0,
      shares: 0,
      guestMessages: 0,
      storeActions: 0,
    });
  }

  const pointForDate = (date: Date) => {
    const diff = Math.max(0, Math.floor((startOfDay(date).getTime() - periodStart.getTime()) / MS_PER_DAY));
    const index = Math.min(points.length - 1, Math.floor(diff / bucketSize));
    return points[index];
  };

  for (const event of events) {
    const point = pointForDate(event.createdAt);
    if (!point) continue;

    if (event.eventType === "page_view") point.pageViews += 1;
    else if (event.eventType === "section_click") point.sectionClicks += 1;
    else if (event.eventType === "share") point.shares += 1;
  }

  for (const chat of chats) {
    if (chat.role !== "guest") continue;
    const point = pointForDate(chat.createdAt);
    if (point) point.guestMessages += 1;
  }

  for (const request of storeRequestRows) {
    if (request.createdAt >= periodStart) {
      const point = pointForDate(request.createdAt);
      if (point) point.storeActions += 1;
    }
    if (
      request.paymentProofSubmittedAt != null &&
      request.paymentProofSubmittedAt >= periodStart
    ) {
      const point = pointForDate(request.paymentProofSubmittedAt);
      if (point) point.storeActions += 1;
    }
  }

  for (const message of storeMessageRows) {
    if (message.authorType !== "guest") continue;
    const point = pointForDate(message.createdAt);
    if (point) point.storeActions += 1;
  }

  return points;
}

function AnalyticsTerm({
  term,
  children,
  className = "",
}: {
  term: AnalyticsTermKey;
  children?: React.ReactNode;
  className?: string;
}) {
  const copy = ANALYTICS_TERM_COPY[term];

  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 align-baseline ${className}`}>
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

function MetricCard({
  label,
  term,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  term: AnalyticsTermKey;
  value: string;
  detail: React.ReactNode;
  icon: ElementType;
  accent: AnalyticsAccent;
}) {
  return (
    <Card size="sm" className="gap-0 !py-0">
      <CardHeader
        className="flex flex-row items-center justify-between px-4 py-3"
        style={fadedHeaderStyle(accent)}
      >
        <CardTitle className="text-sm font-medium text-muted-foreground">
          <AnalyticsTerm term={term}>{label}</AnalyticsTerm>
        </CardTitle>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md bg-white/80"
          style={{ color: accent.color }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent className="py-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  id,
  name,
  label,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm font-medium">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="h-8 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        {children}
      </select>
    </label>
  );
}

function AnalyticsFilters({
  guidebooks: filterGuidebooks,
  selectedGuidebookId,
  selectedRange,
}: {
  guidebooks: GuidebookOption[];
  selectedGuidebookId: string | null;
  selectedRange: string;
}) {
  return (
    <form
      action="/dashboard/analytics"
      className="grid gap-3 rounded-lg border bg-card p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(180px,240px)_auto_auto] sm:items-end"
    >
      <FilterSelect
        id="guidebook_id"
        name="guidebook_id"
        label="Guidebook"
        defaultValue={selectedGuidebookId ?? ""}
      >
        <option value="">All guidebooks</option>
        {filterGuidebooks.map((guidebook) => (
          <option key={guidebook.id} value={guidebook.id}>
            {guidebook.title}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="range"
        name="range"
        label="Time period"
        defaultValue={selectedRange}
      >
        {RANGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FilterSelect>

      <Button type="submit" className="w-full sm:w-auto">
        <SlidersHorizontal className="h-4 w-4" />
        Apply
      </Button>
      <Button
        variant="outline"
        className="w-full sm:w-auto"
        render={<Link href="/dashboard/analytics" />}
      >
        <RotateCcw className="h-4 w-4" />
        Reset
      </Button>
    </form>
  );
}

function HostNote({
  title,
  body,
  accent,
}: {
  title: string;
  body: React.ReactNode;
  accent: AnalyticsAccent;
}) {
  return (
    <div
      className="rounded-md border bg-background p-3"
      style={{ borderLeft: `3px solid ${accent.color}` }}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: accent.bg, color: accent.color }}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </span>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}

function NoteStrong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

function ActivityTooltipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-medium tabular-nums text-foreground">{formatNumber(value)}</span>
    </div>
  );
}

function ActivityTooltip({ point, total }: { point: ActivityPoint; total: number }) {
  return (
    <div className="pointer-events-none absolute bottom-[calc(100%+0.75rem)] left-1/2 z-30 w-56 -translate-x-1/2 rounded-md border bg-popover p-3 text-xs text-popover-foreground opacity-0 shadow-lg transition-opacity group-hover/bar:opacity-100 group-focus-visible/bar:opacity-100">
      <div className="mb-2 flex items-start justify-between gap-3 border-b pb-2">
        <span className="font-medium text-foreground">{point.label}</span>
        <span className="font-semibold tabular-nums text-foreground">
          {formatNumber(total)}
        </span>
      </div>
      <div className="space-y-1.5 text-muted-foreground">
        <ActivityTooltipRow
          label="Opens"
          value={point.pageViews}
          color={ANALYTICS_ACCENTS.views.color}
        />
        <ActivityTooltipRow
          label="Section taps"
          value={point.sectionClicks}
          color={ANALYTICS_ACCENTS.clicks.color}
        />
        <ActivityTooltipRow
          label="Shares"
          value={point.shares}
          color={ANALYTICS_ACCENTS.shares.color}
        />
        <ActivityTooltipRow
          label="Questions"
          value={point.guestMessages}
          color={ANALYTICS_ACCENTS.messages.color}
        />
        <ActivityTooltipRow
          label="Store"
          value={point.storeActions}
          color={ANALYTICS_ACCENTS.store.color}
        />
      </div>
      <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r bg-popover" />
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const sp = await searchParams;
  const rangeOption = getRangeOption(sp.range);
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const ownedGuidebooks = (await db.query.guidebooks.findMany({
    where: eq(guidebooks.userId, user.id),
    columns: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
    },
  })) as GuidebookOption[];

  if (ownedGuidebooks.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track guest reach, content usage, and support load once guidebooks are live.
          </p>
        </div>
        <Card className="border-dashed" style={{ backgroundColor: ANALYTICS_ACCENTS.views.bg }}>
          <CardContent className="py-12 text-center">
            <span
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-white/75"
              style={{ color: ANALYTICS_ACCENTS.views.color }}
            >
              <BarChart3 className="h-8 w-8" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">No guidebooks yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create and publish a guidebook to start collecting host analytics.
            </p>
            <Button className="mt-4" render={<Link href="/dashboard/guidebooks" />}>
              Go to guidebooks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allowedGuidebookIds = ownedGuidebooks.map((guidebook) => guidebook.id);
  const requestedGuidebookId = sp.guidebook_id?.trim() || null;
  const selectedGuidebookId =
    requestedGuidebookId && allowedGuidebookIds.includes(requestedGuidebookId)
      ? requestedGuidebookId
      : null;
  const selectedGuidebook =
    ownedGuidebooks.find((guidebook) => guidebook.id === selectedGuidebookId) ?? null;
  const targetGuidebookIds = selectedGuidebookId ? [selectedGuidebookId] : allowedGuidebookIds;
  const guidebookById = new Map(ownedGuidebooks.map((guidebook) => [guidebook.id, guidebook]));
  const periodStart = getPeriodStart(rangeOption.days);

  const [events, chats, storeRequestRows, storeMessageRows] = await Promise.all([
    db
      .select({
        guidebookId: analyticsEvents.guidebookId,
        eventType: analyticsEvents.eventType,
        visitorId: analyticsEvents.visitorId,
        deviceType: analyticsEvents.deviceType,
        metadata: analyticsEvents.metadata,
        createdAt: analyticsEvents.createdAt,
      })
      .from(analyticsEvents)
      .where(
        and(
          inArray(analyticsEvents.guidebookId, targetGuidebookIds),
          gte(analyticsEvents.createdAt, periodStart)
        )
      ),
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
          inArray(chatSessions.guidebookId, targetGuidebookIds),
          gte(chatMessages.createdAt, periodStart)
        )
      ),
    db
      .select({
        id: storeRequests.id,
        guidebookId: storeRequests.guidebookId,
        status: storeRequests.status,
        paymentStatus: storeRequests.paymentStatus,
        subtotalCents: storeRequests.subtotalCents,
        currency: storeRequests.currency,
        paymentProofSubmittedAt: storeRequests.paymentProofSubmittedAt,
        createdAt: storeRequests.createdAt,
      })
      .from(storeRequests)
      .where(
        and(
          eq(storeRequests.userId, user.id),
          inArray(storeRequests.guidebookId, targetGuidebookIds),
          or(
            gte(storeRequests.createdAt, periodStart),
            gte(storeRequests.paymentProofSubmittedAt, periodStart)
          )
        )
      ),
    db
      .select({
        guidebookId: storeRequests.guidebookId,
        requestId: storeRequestMessages.requestId,
        authorType: storeRequestMessages.authorType,
        createdAt: storeRequestMessages.createdAt,
      })
      .from(storeRequestMessages)
      .innerJoin(storeRequests, eq(storeRequestMessages.requestId, storeRequests.id))
      .where(
        and(
          eq(storeRequests.userId, user.id),
          inArray(storeRequests.guidebookId, targetGuidebookIds),
          gte(storeRequestMessages.createdAt, periodStart)
        )
      ),
  ]);

  const eventRows = events as EventRow[];
  const chatRows = chats as ChatRow[];
  const storeRows = storeRequestRows as StoreRequestRow[];
  const storeMessages = storeMessageRows as StoreMessageRow[];
  const pageViewRows = eventRows.filter((event) => event.eventType === "page_view");
  const pageViews = pageViewRows.length;
  const visitorIds = new Set(
    eventRows.filter((event) => event.visitorId).map((event) => event.visitorId as string)
  );
  const uniqueVisitors = visitorIds.size;
  const sectionClicks = eventRows.filter((event) => event.eventType === "section_click").length;
  const shares = eventRows.filter((event) => event.eventType === "share").length;
  const guestMessages = chatRows.filter((chat) => chat.role === "guest").length;
  const aiMessages = chatRows.filter((chat) => chat.role === "ai").length;
  const hostMessages = chatRows.filter((chat) => chat.role === "host").length;
  const conversations = new Set(chatRows.map((chat) => chat.sessionId)).size;
  const storeRequestsCreated = storeRows.filter(
    (request) => request.createdAt >= periodStart
  );
  const storeRequestCount = storeRequestsCreated.length;
  const storeProofSubmissions = storeRows.filter(
    (request) =>
      request.paymentProofSubmittedAt != null &&
      request.paymentProofSubmittedAt >= periodStart
  ).length;
  const storeGuestMessages = storeMessages.filter(
    (message) => message.authorType === "guest"
  ).length;
  const storeValueLabel = formatStoreValue(storeRequestsCreated);
  const clicksPerGuest = uniqueVisitors > 0 ? sectionClicks / uniqueVisitors : 0;
  const questionsPerGuest = uniqueVisitors > 0 ? guestMessages / uniqueVisitors : 0;
  const shareRate = uniqueVisitors > 0 ? shares / uniqueVisitors : 0;

  const deviceCounts = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };
  const deviceSourceRows = pageViewRows.length > 0 ? pageViewRows : eventRows;
  for (const event of deviceSourceRows) {
    if (event.deviceType === "mobile") deviceCounts.mobile += 1;
    else if (event.deviceType === "tablet") deviceCounts.tablet += 1;
    else if (event.deviceType === "desktop") deviceCounts.desktop += 1;
    else deviceCounts.unknown += 1;
  }
  const totalDeviceEvents = Object.values(deviceCounts).reduce((sum, count) => sum + count, 0);

  const performanceAccumulators = new Map<
    string,
    {
      guidebook: GuidebookOption;
      pageViews: number;
      sectionClicks: number;
      shares: number;
      guestMessages: number;
      aiMessages: number;
      visitorIds: Set<string>;
      conversationIds: Set<string>;
      storeRequests: number;
      storeMessages: number;
      storeProofs: number;
      storeValueCents: number;
      storeCurrency: string | null;
    }
  >();

  for (const guidebookId of targetGuidebookIds) {
    const guidebook = guidebookById.get(guidebookId);
    if (!guidebook) continue;
    performanceAccumulators.set(guidebookId, {
      guidebook,
      pageViews: 0,
      sectionClicks: 0,
      shares: 0,
      guestMessages: 0,
      aiMessages: 0,
      visitorIds: new Set(),
      conversationIds: new Set(),
      storeRequests: 0,
      storeMessages: 0,
      storeProofs: 0,
      storeValueCents: 0,
      storeCurrency: null,
    });
  }

  for (const event of eventRows) {
    const accumulator = performanceAccumulators.get(event.guidebookId);
    if (!accumulator) continue;
    if (event.visitorId) accumulator.visitorIds.add(event.visitorId);
    if (event.eventType === "page_view") accumulator.pageViews += 1;
    else if (event.eventType === "section_click") accumulator.sectionClicks += 1;
    else if (event.eventType === "share") accumulator.shares += 1;
  }

  for (const chat of chatRows) {
    const accumulator = performanceAccumulators.get(chat.guidebookId);
    if (!accumulator) continue;
    accumulator.conversationIds.add(chat.sessionId);
    if (chat.role === "guest") accumulator.guestMessages += 1;
    else if (chat.role === "ai") accumulator.aiMessages += 1;
  }

  for (const request of storeRows) {
    const accumulator = performanceAccumulators.get(request.guidebookId);
    if (!accumulator) continue;
    if (request.createdAt >= periodStart) {
      accumulator.storeRequests += 1;
      accumulator.storeValueCents += request.subtotalCents;
      accumulator.storeCurrency =
        accumulator.storeCurrency && accumulator.storeCurrency !== request.currency
          ? "mixed"
          : request.currency;
    }
    if (
      request.paymentProofSubmittedAt != null &&
      request.paymentProofSubmittedAt >= periodStart
    ) {
      accumulator.storeProofs += 1;
    }
  }

  for (const message of storeMessages) {
    const accumulator = performanceAccumulators.get(message.guidebookId);
    if (!accumulator || message.authorType !== "guest") continue;
    accumulator.storeMessages += 1;
  }

  const guidebookPerformance: GuidebookPerformance[] = [...performanceAccumulators.values()]
    .map((item) => ({
      guidebookId: item.guidebook.id,
      title: item.guidebook.title,
      slug: item.guidebook.slug,
      status: item.guidebook.status,
      pageViews: item.pageViews,
      uniqueVisitors: item.visitorIds.size,
      sectionClicks: item.sectionClicks,
      shares: item.shares,
      guestMessages: item.guestMessages,
      aiMessages: item.aiMessages,
      conversations: item.conversationIds.size,
      storeRequests: item.storeRequests,
      storeMessages: item.storeMessages,
      storeProofs: item.storeProofs,
      storeValueCents: item.storeValueCents,
      storeCurrency: item.storeCurrency,
    }))
    .sort(
      (a, b) =>
        b.pageViews - a.pageViews ||
        b.storeRequests - a.storeRequests ||
        b.sectionClicks - a.sectionClicks
    );

  const sectionMap = new Map<string, SectionPerformance>();
  for (const event of eventRows) {
    if (event.eventType !== "section_click") continue;
    const guidebook = guidebookById.get(event.guidebookId);
    const name = findSectionTitle(event.metadata);
    const key = selectedGuidebookId ? name : `${event.guidebookId}:${name}`;
    const existing = sectionMap.get(key);
    if (existing) {
      existing.clicks += 1;
    } else {
      sectionMap.set(key, {
        key,
        name,
        guidebookTitle: guidebook?.title ?? "Untitled guidebook",
        clicks: 1,
      });
    }
  }
  const topSections = [...sectionMap.values()]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 8);

  const activitySeries = buildActivitySeries(
    eventRows,
    chatRows,
    storeRows,
    storeMessages,
    rangeOption.days
  );
  const peakActivity = Math.max(
    1,
    ...activitySeries.map(
      (point) =>
        point.pageViews +
        point.sectionClicks +
        point.shares +
        point.guestMessages +
        point.storeActions
    )
  );
  const totalStoreActivity =
    storeRequestCount + storeProofSubmissions + storeGuestMessages;
  const totalActivity = sectionClicks + shares + guestMessages + totalStoreActivity;
  const totalGuestActivity = pageViews + totalActivity;
  const busiestGuidebook = guidebookPerformance.find((item) => item.pageViews > 0) ?? null;
  const quietGuidebooks = guidebookPerformance.filter((item) => item.pageViews === 0).length;
  const topSection = topSections[0] ?? null;
  const topDevice = Object.entries(deviceCounts)
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count)[0];
  const topDeviceShare =
    topDevice && totalDeviceEvents > 0 ? topDevice.count / totalDeviceEvents : 0;
  const scopeLabel = selectedGuidebook?.title ?? "All guidebooks";
  const periodLabel = `${FULL_DATE_FORMATTER.format(periodStart)} - ${FULL_DATE_FORMATTER.format(
    new Date()
  )}`;
  const visibleGuidebookCount = selectedGuidebook ? 1 : ownedGuidebooks.length;

  const notes: HostNoteItem[] = [];
  if (totalGuestActivity === 0) {
    notes.push({
      title: "No guest traffic in this view",
      body: (
        <>
          <NoteStrong>No guest traffic</NoteStrong> in this view. Share the guidebook link
          or QR code and revisit after guests open it.
        </>
      ),
      accent: ANALYTICS_ACCENTS.views,
    });
  } else {
    if (busiestGuidebook) {
      notes.push({
        title: "Most attention",
        body: (
          <>
            <NoteStrong>{busiestGuidebook.title}</NoteStrong> is leading this period with{" "}
            <NoteStrong>{formatNumber(busiestGuidebook.pageViews)} opens</NoteStrong>.
          </>
        ),
        accent: ANALYTICS_ACCENTS.views,
      });
    }

    if (topSection) {
      notes.push({
        title: "Content guests rely on",
        body: (
          <>
            <NoteStrong>{topSection.name}</NoteStrong> has{" "}
            <NoteStrong>{formatNumber(topSection.clicks)} opens</NoteStrong>
            {selectedGuidebookId ? "" : " in "}
            {!selectedGuidebookId && <NoteStrong>{topSection.guidebookTitle}</NoteStrong>}.
            Keep that section crisp and current.
          </>
        ),
        accent: ANALYTICS_ACCENTS.sections,
      });
    }

    if (guestMessages > 0) {
      notes.push({
        title: "Support load",
        body: (
          <>
            <NoteStrong>{formatNumber(guestMessages)} guest questions</NoteStrong> created{" "}
            <NoteStrong>{formatNumber(aiMessages)} AI replies</NoteStrong> and{" "}
            <NoteStrong>{formatNumber(hostMessages)} host replies</NoteStrong>.
          </>
        ),
        accent: ANALYTICS_ACCENTS.messages,
      });
    }

    if (storeRequestCount > 0) {
      notes.push({
        title: "Store demand",
        body: (
          <>
            <NoteStrong>{formatNumber(storeRequestCount)} Store requests</NoteStrong>{" "}
            represent <NoteStrong>{storeValueLabel}</NoteStrong> in requested extras
            during this period.
          </>
        ),
        accent: ANALYTICS_ACCENTS.store,
      });
    }

    if (topDevice && totalDeviceEvents > 0) {
      notes.push({
        title: "Primary device",
        body: (
          <>
            <NoteStrong>{topDevice.device}</NoteStrong> accounts for{" "}
            <NoteStrong>{formatPercent(topDeviceShare)}</NoteStrong> of opens in this view.
            Preview key sections on that screen size.
          </>
        ),
        accent: DEVICE_ACCENTS[topDevice.device] ?? DEVICE_ACCENTS.unknown,
      });
    }

    if (!selectedGuidebookId && quietGuidebooks > 0) {
      notes.push({
        title: "Quiet guidebooks",
        body: (
          <>
            <NoteStrong>
              {quietGuidebooks} guidebook{quietGuidebooks === 1 ? "" : "s"}
            </NoteStrong>{" "}
            {quietGuidebooks === 1 ? "has" : "have"} no opens in this period. Check
            whether those links are visible in guest messages.
          </>
        ),
        accent: ANALYTICS_ACCENTS.neutral,
      });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Showing {scopeLabel} for {rangeOption.label.toLowerCase()} ({periodLabel}).
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          render={
            <Link
              href={
                selectedGuidebook
                  ? `/dashboard/guidebooks/${selectedGuidebook.id}`
                  : "/dashboard/guidebooks"
              }
            />
          }
        >
          <BookOpen className="h-4 w-4" />
          {selectedGuidebook ? "Open guidebook" : "Manage guidebooks"}
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>

      <AnalyticsFilters
        guidebooks={ownedGuidebooks}
        selectedGuidebookId={selectedGuidebookId}
        selectedRange={rangeOption.value}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Guidebook Opens"
          term="guidebookOpens"
          value={formatNumber(pageViews)}
          detail={`${formatNumber(visibleGuidebookCount)} guidebook${visibleGuidebookCount === 1 ? "" : "s"} in scope`}
          icon={Eye}
          accent={ANALYTICS_ACCENTS.views}
        />
        <MetricCard
          label="Guests Reached"
          term="guestsReached"
          value={formatNumber(uniqueVisitors)}
          detail="Unique guest devices"
          icon={Users}
          accent={ANALYTICS_ACCENTS.visitors}
        />
        <MetricCard
          label="Content Opens"
          term="contentOpens"
          value={formatNumber(sectionClicks)}
          detail={`${formatDecimal(clicksPerGuest)} per guest`}
          icon={MousePointerClick}
          accent={ANALYTICS_ACCENTS.clicks}
        />
        <MetricCard
          label="Guest Questions"
          term="guestQuestions"
          value={formatNumber(guestMessages)}
          detail={`${formatNumber(conversations)} conversation${conversations === 1 ? "" : "s"}, ${formatDecimal(questionsPerGuest)} per guest`}
          icon={MessageSquareText}
          accent={ANALYTICS_ACCENTS.messages}
        />
        <MetricCard
          label="Store Requests"
          term="storeRequests"
          value={formatNumber(storeRequestCount)}
          detail={`${storeValueLabel}, ${formatNumber(storeGuestMessages)} Store message${storeGuestMessages === 1 ? "" : "s"}`}
          icon={ShoppingBag}
          accent={ANALYTICS_ACCENTS.store}
        />
        <MetricCard
          label="Shares"
          term="shares"
          value={formatNumber(shares)}
          detail={`${formatPercent(shareRate)} of guests shared`}
          icon={Share2}
          accent={ANALYTICS_ACCENTS.shares}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <Card className="overflow-visible pt-0">
          <CardHeader className="px-4 py-3" style={fadedHeaderStyle(ANALYTICS_ACCENTS.views)}>
            <CardTitle>
              <AnalyticsTerm term="activityOverTime">Guest Activity Over Time</AnalyticsTerm>
            </CardTitle>
            <CardDescription>
              Opens, section taps, shares, guest questions, and Store actions in the selected period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activitySeries.every(
              (point) =>
                point.pageViews === 0 &&
                point.sectionClicks === 0 &&
                point.shares === 0 &&
                point.guestMessages === 0 &&
                point.storeActions === 0
            ) ? (
              <p className="text-sm text-muted-foreground">
                No analytics events were recorded for this guidebook and time period.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-5">
                  <div className="rounded-md border p-3" style={{ backgroundColor: ANALYTICS_ACCENTS.views.bg }}>
                    <div className="text-xs text-muted-foreground">Total activity</div>
                    <div className="text-lg font-semibold tabular-nums">{formatNumber(totalGuestActivity)}</div>
                  </div>
                  <div className="rounded-md border p-3" style={{ backgroundColor: ANALYTICS_ACCENTS.clicks.bg }}>
                    <div className="text-xs text-muted-foreground">Content actions</div>
                    <div className="text-lg font-semibold tabular-nums">{formatNumber(sectionClicks + shares)}</div>
                  </div>
                  <div className="rounded-md border p-3" style={{ backgroundColor: ANALYTICS_ACCENTS.messages.bg }}>
                    <div className="text-xs text-muted-foreground">Guest questions</div>
                    <div className="text-lg font-semibold tabular-nums">{formatNumber(guestMessages)}</div>
                  </div>
                  <div className="rounded-md border p-3" style={{ backgroundColor: ANALYTICS_ACCENTS.store.bg }}>
                    <div className="text-xs text-muted-foreground">Store actions</div>
                    <div className="text-lg font-semibold tabular-nums">{formatNumber(totalStoreActivity)}</div>
                  </div>
                  <div className="rounded-md border p-3" style={{ backgroundColor: ANALYTICS_ACCENTS.visitors.bg }}>
                    <div className="text-xs text-muted-foreground">Activity per guest</div>
                    <div className="text-lg font-semibold tabular-nums">
                      {formatDecimal(uniqueVisitors > 0 ? totalGuestActivity / uniqueVisitors : 0)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ANALYTICS_ACCENTS.views.color }} />
                    Opens
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ANALYTICS_ACCENTS.clicks.color }} />
                    Section taps
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ANALYTICS_ACCENTS.shares.color }} />
                    Shares
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ANALYTICS_ACCENTS.messages.color }} />
                    Questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ANALYTICS_ACCENTS.store.color }} />
                    Store
                  </span>
                </div>

                <div className="flex h-56 gap-2">
                  <div className="flex h-full flex-col justify-between text-[11px] text-muted-foreground">
                    <span>{formatNumber(peakActivity)}</span>
                    <span>{formatNumber(Math.round(peakActivity / 2))}</span>
                    <span>0</span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-end gap-1 overflow-visible">
                    {activitySeries.map((point) => {
                      const total =
                        point.pageViews +
                        point.sectionClicks +
                        point.shares +
                        point.guestMessages +
                        point.storeActions;
                      const height = total > 0 ? Math.max(4, Math.round((total / peakActivity) * 100)) : 1;
                      const segmentHeight = (value: number) =>
                        total > 0 ? `${Math.max(value > 0 ? 8 : 0, Math.round((value / total) * 100))}%` : "0%";
                      const ariaLabel = `${point.label}: ${formatNumber(total)} total activity, ${formatNumber(point.pageViews)} opens, ${formatNumber(point.sectionClicks)} section taps, ${formatNumber(point.shares)} shares, ${formatNumber(point.guestMessages)} questions, ${formatNumber(point.storeActions)} Store actions.`;

                      return (
                        <div
                          key={point.key}
                          aria-label={ariaLabel}
                          className="group/bar relative flex h-full min-w-[3px] flex-1 cursor-default items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                          tabIndex={0}
                        >
                          <ActivityTooltip point={point} total={total} />
                          <div
                            className="flex w-full flex-col justify-end overflow-hidden rounded-sm bg-muted transition-opacity group-hover/bar:opacity-90 group-focus-visible/bar:opacity-90"
                            style={{ height: `${height}%` }}
                          >
                            <span
                              className="block"
                              style={{
                                height: segmentHeight(point.storeActions),
                                backgroundColor: ANALYTICS_ACCENTS.store.color,
                              }}
                            />
                            <span
                              className="block"
                              style={{
                                height: segmentHeight(point.guestMessages),
                                backgroundColor: ANALYTICS_ACCENTS.messages.color,
                              }}
                            />
                            <span
                              className="block"
                              style={{
                                height: segmentHeight(point.shares),
                                backgroundColor: ANALYTICS_ACCENTS.shares.color,
                              }}
                            />
                            <span
                              className="block"
                              style={{
                                height: segmentHeight(point.sectionClicks),
                                backgroundColor: ANALYTICS_ACCENTS.clicks.color,
                              }}
                            />
                            <span
                              className="block"
                              style={{
                                height: segmentHeight(point.pageViews),
                                backgroundColor: ANALYTICS_ACCENTS.views.color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{activitySeries[0]?.label}</span>
                  <span>{getBucketSize(rangeOption.days) === 1 ? "Daily" : "Grouped"} activity</span>
                  <span>{activitySeries[activitySeries.length - 1]?.label}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="pt-0">
          <CardHeader className="px-4 py-3" style={fadedHeaderStyle(ANALYTICS_ACCENTS.strong)}>
            <CardTitle>
              <AnalyticsTerm term="hostNotes">Host Notes</AnalyticsTerm>
            </CardTitle>
            <CardDescription>Operational signals to review before the next stay.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notes.map((note) => (
                <HostNote
                  key={note.title}
                  title={note.title}
                  body={note.body}
                  accent={note.accent}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="pt-0">
          <CardHeader className="px-4 py-3" style={fadedHeaderStyle(ANALYTICS_ACCENTS.views)}>
            <CardTitle>
              <AnalyticsTerm term="guidebookComparison">
                {selectedGuidebookId ? "Guidebook Snapshot" : "Guidebook Comparison"}
              </AnalyticsTerm>
            </CardTitle>
            <CardDescription>
              Compare opens, guest reach, content actions, Store requests, and questions by guidebook.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {guidebookPerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No guidebooks match this view.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Guidebook</th>
                      <th className="px-3 py-2 font-medium">Opens</th>
                      <th className="px-3 py-2 font-medium">Guests</th>
                      <th className="px-3 py-2 font-medium">Actions</th>
                      <th className="px-3 py-2 font-medium">Store</th>
                      <th className="px-3 py-2 font-medium">Questions</th>
                      <th className="py-2 pl-3 font-medium">Shares</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guidebookPerformance.slice(0, selectedGuidebookId ? 1 : 8).map((item) => (
                      <tr key={item.guidebookId} className="border-b last:border-0">
                        <td className="max-w-[220px] py-3 pr-3">
                          <Link
                            href={`/dashboard/guidebooks/${item.guidebookId}`}
                            className="font-medium hover:underline"
                          >
                            {item.title}
                          </Link>
                          <div className="mt-1 text-xs capitalize text-muted-foreground">
                            {item.status}
                          </div>
                        </td>
                        <td className="px-3 py-3 tabular-nums">{formatNumber(item.pageViews)}</td>
                        <td className="px-3 py-3 tabular-nums">{formatNumber(item.uniqueVisitors)}</td>
                        <td className="px-3 py-3 tabular-nums">
                          {formatNumber(item.sectionClicks + item.shares)}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {formatNumber(item.storeRequests)}
                          {item.storeProofs > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({formatNumber(item.storeProofs)} proof)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {formatNumber(item.guestMessages)}
                          {item.aiMessages > 0 && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({formatNumber(item.aiMessages)} AI)
                            </span>
                          )}
                        </td>
                        <td className="py-3 pl-3 tabular-nums">{formatNumber(item.shares)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="pt-0">
          <CardHeader className="px-4 py-3" style={fadedHeaderStyle(ANALYTICS_ACCENTS.sections)}>
            <CardTitle>
              <AnalyticsTerm term="sectionsGuestsOpen">Sections Guests Open</AnalyticsTerm>
            </CardTitle>
            <CardDescription>
              The content guests are actively checking during their stay.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topSections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No section interactions yet for the selected guidebook and time period.
              </p>
            ) : (
              <div className="space-y-3">
                {topSections.map((section) => {
                  const maxClicks = Math.max(1, topSections[0]?.clicks ?? 1);
                  return (
                    <div key={section.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{section.name}</div>
                          {!selectedGuidebookId && (
                            <div className="truncate text-xs text-muted-foreground">
                              {section.guidebookTitle}
                            </div>
                          )}
                        </div>
                        <span className="font-medium tabular-nums">{formatNumber(section.clicks)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.max(8, Math.round((section.clicks / maxClicks) * 100))}%`,
                            backgroundColor: ANALYTICS_ACCENTS.sections.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="pt-0">
        <CardHeader className="px-4 py-3" style={fadedHeaderStyle(ANALYTICS_ACCENTS.neutral)}>
          <CardTitle>
            <AnalyticsTerm term="deviceMix">Device Mix</AnalyticsTerm>
          </CardTitle>
          <CardDescription>
            Where guests are opening the guidebook, based on page view events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalDeviceEvents === 0 ? (
            <p className="text-sm text-muted-foreground">No device data yet for this view.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(deviceCounts).map(([device, count]) => {
                const accent = DEVICE_ACCENTS[device] ?? DEVICE_ACCENTS.unknown;
                const share = count / totalDeviceEvents;

                return (
                  <div
                    key={device}
                    className="rounded-md border p-3"
                    style={{ backgroundColor: accent.bg }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MonitorSmartphone className="h-4 w-4" style={{ color: accent.color }} />
                        <span className="text-sm font-medium capitalize">{device}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{formatPercent(share)}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/75">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.max(4, Math.round(share * 100))}%`,
                          backgroundColor: accent.color,
                        }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatNumber(count)} open{count === 1 ? "" : "s"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <div className="flex gap-2">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Filters affect every card on this page. Select one guidebook to inspect a property, or keep all
            guidebooks selected to compare portfolio performance.
          </p>
        </div>
      </div>
    </div>
  );
}
