import type { ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  ExternalLink,
  FileCheck2,
  MessageSquareText,
  MousePointerClick,
  Share2,
  ShoppingBag,
} from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  analyticsEvents,
  chatMessages,
  chatSessions,
  guidebookSections,
  guidebooks,
  storeRequestMessages,
  storeRequests,
} from "@/lib/db/schema";
import { formatStoreMoney } from "@/lib/store/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ACTIVITY_LIMIT = 160;

type QueueTone = "danger" | "warning" | "info" | "success" | "neutral";

type GuidebookOption = {
  id: string;
  title: string;
  slug: string;
  status: string;
};

type EventRow = {
  guidebookId: string;
  eventType: string;
  visitorId: string | null;
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
  requestCode: string;
  guestName: string;
  status: string;
  paymentStatus: string;
  subtotalCents: number;
  currency: string;
  paymentProofSubmittedAt: Date | null;
  createdAt: Date;
};

type StoreMessageRow = {
  requestId: string;
  guidebookId: string;
  requestCode: string;
  authorType: string;
  createdAt: Date;
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

const TONE_STYLES = {
  danger: "bg-rose-50 text-rose-700",
  warning: "bg-amber-50 text-amber-800",
  info: "bg-blue-50 text-blue-700",
  success: "bg-emerald-50 text-emerald-700",
  neutral: "bg-muted text-muted-foreground",
} satisfies Record<QueueTone, string>;

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
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
  return rtf.format(Math.round(diffMs / MS_PER_DAY), "day");
}

function findSectionTitle(
  metadata: Record<string, unknown> | null,
  sectionTitleById: Map<string, string>
) {
  if (typeof metadata?.sectionTitle === "string" && metadata.sectionTitle.trim()) {
    return metadata.sectionTitle.trim();
  }

  if (typeof metadata?.sectionId === "string" && metadata.sectionId.trim()) {
    const title = sectionTitleById.get(metadata.sectionId);
    if (title) return title;
    return `Section ${metadata.sectionId.slice(0, 8)}`;
  }

  return "Guidebook section";
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

function metadataLabel(
  metadata: Record<string, unknown> | null,
  key: string,
  fallback: string
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function eventToActivityItem({
  event,
  guidebook,
  sectionTitleById,
}: {
  event: EventRow;
  guidebook: GuidebookOption | undefined;
  sectionTitleById: Map<string, string>;
}): ActivityItem | null {
  const guidebookTitle = guidebook?.title ?? "Guidebook";
  const analyticsHref = `/dashboard/analytics?guidebook_id=${event.guidebookId}&range=7d`;

  if (
    [
      "chat_message",
      "store_request_submitted",
      "store_message_sent",
      "store_payment_proof_submitted",
    ].includes(event.eventType)
  ) {
    return null;
  }

  if (event.eventType === "page_view") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-page`,
      icon: Eye,
      label: "Guide opened",
      title: guidebookTitle,
      detail: "A guest opened the public guidebook.",
      href: analyticsHref,
      createdAt: event.createdAt,
      tone: "success",
    };
  }

  if (event.eventType === "section_click") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-section`,
      icon: MousePointerClick,
      label: "Content opened",
      title: findSectionTitle(event.metadata, sectionTitleById),
      detail: `${guidebookTitle} section`,
      href: analyticsHref,
      createdAt: event.createdAt,
      tone: "info",
    };
  }

  if (event.eventType === "featured_page_viewed") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-featured`,
      icon: Eye,
      label: "Page opened",
      title: featuredPageLabel(event.metadata),
      detail: `${guidebookTitle} featured page`,
      href: analyticsHref,
      createdAt: event.createdAt,
      tone: "success",
    };
  }

  if (event.eventType === "share") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-share`,
      icon: Share2,
      label: "Share",
      title: guidebookTitle,
      detail: "A guest used the share action.",
      href: analyticsHref,
      createdAt: event.createdAt,
      tone: "warning",
    };
  }

  if (event.eventType === "chat_open") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-chat-open`,
      icon: MessageSquareText,
      label: "Chat opened",
      title: guidebookTitle,
      detail: "A guest opened the guidebook chat.",
      href: "/dashboard/messages",
      createdAt: event.createdAt,
      tone: "info",
    };
  }

  if (event.eventType === "store_viewed") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-store-open`,
      icon: ShoppingBag,
      label: "Store opened",
      title: "Store",
      detail: guidebookTitle,
      href: "/dashboard/store",
      createdAt: event.createdAt,
      tone: "success",
    };
  }

  if (event.eventType === "store_item_selected") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-store-item`,
      icon: ShoppingBag,
      label: "Store item selected",
      title: "Store item",
      detail: guidebookTitle,
      href: "/dashboard/store",
      createdAt: event.createdAt,
      tone: "info",
    };
  }

  if (event.eventType === "store_request_opened") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-store-request-open`,
      icon: ShoppingBag,
      label: "Store request opened",
      title: "Request thread",
      detail: guidebookTitle,
      href: "/dashboard/store",
      createdAt: event.createdAt,
      tone: "info",
    };
  }

  if (event.eventType === "place_click") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-place`,
      icon: MousePointerClick,
      label: "Place opened",
      title: metadataLabel(event.metadata, "placeName", "Nearby place"),
      detail: guidebookTitle,
      href: analyticsHref,
      createdAt: event.createdAt,
      tone: "info",
    };
  }

  if (event.eventType === "outbound_link") {
    return {
      id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-link`,
      icon: ExternalLink,
      label: "Link opened",
      title: metadataLabel(event.metadata, "label", "External link"),
      detail: guidebookTitle,
      href: analyticsHref,
      createdAt: event.createdAt,
      tone: "info",
    };
  }

  return {
    id: `event-${event.guidebookId}-${event.createdAt.toISOString()}-${event.eventType}`,
    icon: Eye,
    label: "Guidebook activity",
    title: guidebookTitle,
    detail: event.eventType.replaceAll("_", " "),
    href: analyticsHref,
    createdAt: event.createdAt,
    tone: "neutral",
  };
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="grid gap-3 border-b p-4 transition-colors last:border-0 hover:bg-muted/30 hover:text-primary sm:grid-cols-[auto_minmax(0,1fr)_auto]"
    >
      <span className={`grid size-9 place-items-center rounded-md ${TONE_STYLES[item.tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{item.title}</span>
          <Badge variant="secondary">{item.label}</Badge>
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{item.detail}</span>
      </span>
      <span className="text-sm text-muted-foreground sm:text-right">
        {formatRelativeTime(item.createdAt)}
      </span>
    </Link>
  );
}

export default async function DashboardActivityPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/activity");
  }

  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 3);
  const ownedGuidebooks = (await db.query.guidebooks.findMany({
    where: eq(guidebooks.userId, user.id),
    columns: {
      id: true,
      title: true,
      slug: true,
      status: true,
    },
  })) as GuidebookOption[];
  const ownedGuidebookIds = ownedGuidebooks.map((guidebook) => guidebook.id);
  const guidebookById = new Map(ownedGuidebooks.map((guidebook) => [guidebook.id, guidebook]));

  let eventRows: EventRow[] = [];
  let chatRows: ChatRow[] = [];
  let sectionRows: Array<{ id: string; title: string }> = [];
  let storeRequestRows: StoreRequestRow[] = [];
  let storeMessageRows: StoreMessageRow[] = [];

  if (ownedGuidebookIds.length > 0) {
    const [events, chats, sections, storeRequestsResult, storeMessagesResult] =
      await Promise.all([
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
          .orderBy(desc(analyticsEvents.createdAt))
          .limit(300),
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
          )
          .orderBy(desc(chatMessages.createdAt))
          .limit(200),
        db
          .select({
            id: guidebookSections.id,
            title: guidebookSections.title,
          })
          .from(guidebookSections)
          .where(inArray(guidebookSections.guidebookId, ownedGuidebookIds)),
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
          .limit(200),
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
          .limit(200),
      ]);

    eventRows = events as EventRow[];
    chatRows = chats;
    sectionRows = sections;
    storeRequestRows = storeRequestsResult;
    storeMessageRows = storeMessagesResult;
  }

  const sectionTitleById = new Map(
    sectionRows.map((section) => [section.id, section.title || "Untitled"])
  );

  const eventItems = eventRows.flatMap((event) => {
    const item = eventToActivityItem({
      event,
      guidebook: guidebookById.get(event.guidebookId),
      sectionTitleById,
    });
    return item ? [item] : [];
  });

  const chatItems: ActivityItem[] = chatRows
    .filter((chat) => chat.role === "guest")
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
        tone: "danger",
      };
    });

  const storeRequestItems: ActivityItem[] = storeRequestRows.flatMap((request) => {
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
        tone: "warning",
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
        tone: "success",
      });
    }

    return items;
  });

  const storeMessageItems: ActivityItem[] = storeMessageRows
    .filter((message) => message.authorType === "guest")
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
        tone: "info",
      };
    });

  const activityItems = [
    ...eventItems,
    ...chatItems,
    ...storeRequestItems,
    ...storeMessageItems,
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, ACTIVITY_LIMIT);

  const guideOpens = eventRows.filter((event) => event.eventType === "page_view").length;
  const contentOpens = eventRows.filter(
    (event) =>
      event.eventType === "section_click" ||
      event.eventType === "featured_page_viewed"
  ).length;
  const storeActions =
    storeRequestItems.length +
    storeMessageItems.length +
    eventRows.filter(
      (event) =>
        event.eventType === "store_viewed" ||
        event.eventType === "store_item_selected" ||
        event.eventType === "store_request_opened"
    ).length;
  const guestMessages = chatItems.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" render={<Link href="/dashboard" />}>
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Guest Activity</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Full guest activity from the last 3 days across guidebook opens, sections,
            featured pages, chat, and Store requests.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/dashboard/analytics?range=7d" />}>
          <BarChart3 className="h-4 w-4" />
          Analytics
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card size="sm">
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Guide opens</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(guideOpens)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Pages and content</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(contentOpens)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Store actions</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(storeActions)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="py-4">
            <div className="text-xs text-muted-foreground">Guest questions</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">
              {formatNumber(guestMessages)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="pt-0">
        <CardHeader>
          <CardTitle>Full Activity</CardTitle>
          <CardDescription>
            Showing up to {ACTIVITY_LIMIT} most recent events from the last 3 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {activityItems.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Eye className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No guest activity in the last 3 days</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Share a live guidebook link to start collecting guest activity.
              </p>
            </div>
          ) : (
            <div>{activityItems.map((item) => <ActivityRow key={item.id} item={item} />)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
