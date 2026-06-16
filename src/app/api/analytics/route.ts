import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  analyticsEvents,
  chatMessages,
  chatSessions,
  guidebooks,
  storeRequestMessages,
  storeRequests,
} from "@/lib/db/schema";
import { and, eq, gte, inArray, or } from "drizzle-orm";
import { trackAnalyticsSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";

function parseRange(value: string | null) {
  if (!value) return 30;
  const match = /^(\d+)d$/i.exec(value.trim());
  if (!match) return null;
  const days = Number(match[1]);
  if (!Number.isFinite(days) || days < 1 || days > 365) return null;
  return days;
}

type EventRow = {
  guidebookId: string;
  eventType: string;
  visitorId: string | null;
  deviceType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

type ChatRow = {
  role: string;
  createdAt: Date;
};

type StoreRequestRow = {
  guidebookId: string;
  subtotalCents: number;
  paymentProofSubmittedAt: Date | null;
  createdAt: Date;
};

type StoreMessageRow = {
  authorType: string;
  createdAt: Date;
};

/**
 * Fire-and-forget analytics endpoint for the public guidebook viewer.
 * Public — no auth required. Validates that the guidebook exists and is
 * published before recording the event.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = trackAnalyticsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { guidebookId, eventType, visitorId, deviceType, referrer, metadata } =
    parsed.data;

  // Confirm the guidebook exists and is published before recording.
  const guidebook = await db.query.guidebooks.findFirst({
    where: and(
      eq(guidebooks.id, guidebookId),
      eq(guidebooks.status, "published")
    ),
    columns: { id: true },
  });
  if (!guidebook) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  try {
    await db.insert(analyticsEvents).values({
      guidebookId,
      eventType,
      visitorId,
      deviceType,
      referrer,
      metadata: metadata ?? {},
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("POST /api/analytics failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Authenticated dashboard analytics endpoint.
 * Supports:
 * - GET /api/analytics?range=30d
 * - GET /api/analytics?guidebook_id=<uuid>&range=30d
 */
export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const guidebookId = searchParams.get("guidebook_id");
  const rangeDays = parseRange(searchParams.get("range"));

  if (rangeDays == null) {
    return NextResponse.json(
      { error: "Invalid range. Expected format like 7d, 30d, or 90d." },
      { status: 400 }
    );
  }

  const ownedGuidebooks = await db.query.guidebooks.findMany({
    where: eq(guidebooks.userId, user.id),
    columns: { id: true, title: true },
  });

  if (ownedGuidebooks.length === 0) {
    return NextResponse.json({
      rangeDays,
      summary: {
        pageViews: 0,
        uniqueVisitors: 0,
        sectionClicks: 0,
        shares: 0,
        chatMessages: 0,
        aiMessages: 0,
        storeRequests: 0,
        storeMessages: 0,
        storeProofSubmissions: 0,
        storeRequestValueCents: 0,
      },
      deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0, unknown: 0 },
      topSections: [],
      viewsByGuidebook: [],
      timeseries: [],
    });
  }

  const allowedGuidebookIds = ownedGuidebooks.map((g) => g.id);
  const guidebookTitleById = new Map(ownedGuidebooks.map((g) => [g.id, g.title]));

  if (guidebookId && !allowedGuidebookIds.includes(guidebookId)) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const targetGuidebookIds = guidebookId ? [guidebookId] : allowedGuidebookIds;
  const since = new Date();
  since.setDate(since.getDate() - rangeDays);

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
          gte(analyticsEvents.createdAt, since)
        )
      ),
    db
      .select({
        role: chatMessages.role,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
      .innerJoin(guidebooks, eq(chatSessions.guidebookId, guidebooks.id))
      .where(
        and(
          eq(guidebooks.userId, user.id),
          inArray(guidebooks.id, targetGuidebookIds),
          gte(chatMessages.createdAt, since)
        )
      ),
    db
      .select({
        guidebookId: storeRequests.guidebookId,
        subtotalCents: storeRequests.subtotalCents,
        paymentProofSubmittedAt: storeRequests.paymentProofSubmittedAt,
        createdAt: storeRequests.createdAt,
      })
      .from(storeRequests)
      .where(
        and(
          eq(storeRequests.userId, user.id),
          inArray(storeRequests.guidebookId, targetGuidebookIds),
          or(
            gte(storeRequests.createdAt, since),
            gte(storeRequests.paymentProofSubmittedAt, since)
          )
        )
      ),
    db
      .select({
        authorType: storeRequestMessages.authorType,
        createdAt: storeRequestMessages.createdAt,
      })
      .from(storeRequestMessages)
      .innerJoin(storeRequests, eq(storeRequestMessages.requestId, storeRequests.id))
      .where(
        and(
          eq(storeRequests.userId, user.id),
          inArray(storeRequests.guidebookId, targetGuidebookIds),
          gte(storeRequestMessages.createdAt, since)
        )
      ),
  ]);

  const eventRows = events as EventRow[];
  const chatRows = chats as ChatRow[];
  const storeRows = storeRequestRows as StoreRequestRow[];
  const storeMessages = storeMessageRows as StoreMessageRow[];

  const pageViews = eventRows.filter((e) => e.eventType === "page_view").length;
  const uniqueVisitors = new Set(
    eventRows.filter((e) => e.visitorId).map((e) => e.visitorId as string)
  ).size;
  const sectionClicks = eventRows.filter((e) => e.eventType === "section_click").length;
  const shares = eventRows.filter((e) => e.eventType === "share").length;
  const chatMessagesCount = chatRows.length;
  const aiMessages = chatRows.filter((row) => row.role === "ai").length;
  const storeRequestsCreated = storeRows.filter((row) => row.createdAt >= since);
  const storeRequestsCount = storeRequestsCreated.length;
  const storeMessagesCount = storeMessages.filter(
    (row) => row.authorType === "guest"
  ).length;
  const storeProofSubmissions = storeRows.filter(
    (row) => row.paymentProofSubmittedAt != null && row.paymentProofSubmittedAt >= since
  ).length;
  const storeRequestValueCents = storeRequestsCreated.reduce(
    (sum, row) => sum + row.subtotalCents,
    0
  );

  const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };
  for (const event of eventRows) {
    if (event.deviceType === "mobile") deviceBreakdown.mobile += 1;
    else if (event.deviceType === "tablet") deviceBreakdown.tablet += 1;
    else if (event.deviceType === "desktop") deviceBreakdown.desktop += 1;
    else deviceBreakdown.unknown += 1;
  }

  const viewsByGuidebookMap = new Map<string, number>();
  for (const event of eventRows) {
    if (event.eventType !== "page_view") continue;
    viewsByGuidebookMap.set(
      event.guidebookId,
      (viewsByGuidebookMap.get(event.guidebookId) ?? 0) + 1
    );
  }
  const viewsByGuidebook = [...viewsByGuidebookMap.entries()]
    .map(([id, views]) => ({
      guidebookId: id,
      title: guidebookTitleById.get(id) ?? "Untitled guidebook",
      views,
    }))
    .sort((a, b) => b.views - a.views);

  const sectionClicksByName = new Map<string, number>();
  for (const event of eventRows) {
    if (event.eventType !== "section_click") continue;
    const sectionTitle =
      typeof event.metadata?.sectionTitle === "string"
        ? event.metadata.sectionTitle
        : typeof event.metadata?.sectionId === "string"
          ? `Section ${event.metadata.sectionId.slice(0, 8)}`
          : "Unknown section";
    sectionClicksByName.set(
      sectionTitle,
      (sectionClicksByName.get(sectionTitle) ?? 0) + 1
    );
  }
  const topSections = [...sectionClicksByName.entries()]
    .map(([name, clicks]) => ({ name, clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const timeseriesMap = new Map<
    string,
    {
      date: string;
      pageViews: number;
      sectionClicks: number;
      shares: number;
      chatMessages: number;
      storeRequests: number;
      storeMessages: number;
      storeProofSubmissions: number;
    }
  >();

  const ensurePoint = (date: string) => {
    if (!timeseriesMap.has(date)) {
      timeseriesMap.set(date, {
        date,
        pageViews: 0,
        sectionClicks: 0,
        shares: 0,
        chatMessages: 0,
        storeRequests: 0,
        storeMessages: 0,
        storeProofSubmissions: 0,
      });
    }
    return timeseriesMap.get(date)!;
  };

  for (const event of eventRows) {
    const date = event.createdAt.toISOString().slice(0, 10);
    const point = ensurePoint(date);
    if (event.eventType === "page_view") point.pageViews += 1;
    else if (event.eventType === "section_click") point.sectionClicks += 1;
    else if (event.eventType === "share") point.shares += 1;
  }

  for (const chat of chatRows) {
    const date = chat.createdAt.toISOString().slice(0, 10);
    const point = ensurePoint(date);
    point.chatMessages += 1;
  }

  for (const storeRequest of storeRows) {
    if (storeRequest.createdAt >= since) {
      const date = storeRequest.createdAt.toISOString().slice(0, 10);
      const point = ensurePoint(date);
      point.storeRequests += 1;
    }
    if (
      storeRequest.paymentProofSubmittedAt != null &&
      storeRequest.paymentProofSubmittedAt >= since
    ) {
      const date = storeRequest.paymentProofSubmittedAt.toISOString().slice(0, 10);
      const point = ensurePoint(date);
      point.storeProofSubmissions += 1;
    }
  }

  for (const storeMessage of storeMessages) {
    if (storeMessage.authorType !== "guest") continue;
    const date = storeMessage.createdAt.toISOString().slice(0, 10);
    const point = ensurePoint(date);
    point.storeMessages += 1;
  }

  const timeseries = [...timeseriesMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return NextResponse.json({
    rangeDays,
    guidebookId: guidebookId ?? null,
    summary: {
      pageViews,
      uniqueVisitors,
      sectionClicks,
      shares,
      chatMessages: chatMessagesCount,
      aiMessages,
      storeRequests: storeRequestsCount,
      storeMessages: storeMessagesCount,
      storeProofSubmissions,
      storeRequestValueCents,
    },
    deviceBreakdown,
    viewsByGuidebook,
    topSections,
    timeseries,
  });
}
