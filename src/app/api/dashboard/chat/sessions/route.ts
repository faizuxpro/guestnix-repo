import { NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSessions, chatMessages, guidebooks } from "@/lib/db/schema";
import { createServerClient } from "@/lib/supabase/server";
import { getMonthlyUsage, getMonthlyCap } from "@/lib/ai/usage";
import { readGuestTarget } from "@/lib/chat-message-metadata";

export const runtime = "nodejs";

type MessageSummary = {
  sessionId: string;
  role: string;
  content: string;
  toolCalls: unknown;
  createdAt: Date;
};

function latest<T extends { createdAt: Date }>(items: T[]): T | undefined {
  return items[items.length - 1];
}

function snippet(message: MessageSummary | undefined) {
  if (!message) return "";
  return message.content.slice(0, 140) + (message.content.length > 140 ? "..." : "");
}

function maxDate(...dates: Array<Date | null | undefined>) {
  const valid = dates.filter((date): date is Date => Boolean(date));
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid.map((date) => date.getTime())));
}

function dateTime(value: Date | null | undefined) {
  return value?.getTime() ?? 0;
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      sessionId: chatSessions.id,
      guidebookId: chatSessions.guidebookId,
      guidebookTitle: guidebooks.title,
      guestName: chatSessions.guestName,
      guestEmail: chatSessions.guestEmail,
      aiEnabled: chatSessions.aiEnabled,
      hostEscalatedAt: chatSessions.hostEscalatedAt,
      identityProvidedAt: chatSessions.identityProvidedAt,
      lastMessageAt: chatSessions.lastMessageAt,
      hostLastReadAt: chatSessions.hostLastReadAt,
      hostArchivedAt: chatSessions.hostArchivedAt,
      aiArchivedAt: chatSessions.aiArchivedAt,
      createdAt: chatSessions.createdAt,
    })
    .from(chatSessions)
    .innerJoin(guidebooks, eq(chatSessions.guidebookId, guidebooks.id))
    .where(eq(guidebooks.userId, user.id))
    .orderBy(desc(chatSessions.lastMessageAt));

  const sessionIds = rows.map((r) => r.sessionId);
  let messageSummaries: MessageSummary[] = [];
  if (sessionIds.length > 0) {
    messageSummaries = await db
      .select({
        sessionId: chatMessages.sessionId,
        content: chatMessages.content,
        role: chatMessages.role,
        toolCalls: chatMessages.toolCalls,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(inArray(chatMessages.sessionId, sessionIds));
  }

  const bySession = new Map<string, MessageSummary[]>();
  for (const message of messageSummaries) {
    const messages = bySession.get(message.sessionId) ?? [];
    messages.push(message);
    bySession.set(message.sessionId, messages);
  }
  for (const messages of bySession.values()) {
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  const [usage, cap] = await Promise.all([
    getMonthlyUsage(user.id),
    getMonthlyCap(user.id),
  ]);

  const sessions = rows.map((r) => {
    const anonymousLabel = `Guest ${r.sessionId.replaceAll("-", "").slice(-4).toUpperCase()}`;
    const messages = bySession.get(r.sessionId) ?? [];
    const latestAny = latest(messages);
    const isHostGuestMessage = (m: MessageSummary) =>
      m.role === "guest" &&
      (readGuestTarget(m.toolCalls) === "host" ||
        (readGuestTarget(m.toolCalls) == null &&
          r.hostEscalatedAt != null &&
          m.createdAt >= r.hostEscalatedAt));
    const hostGuestMessages = messages.filter(isHostGuestMessage);
    const aiActivityMessages = messages.filter(
      (m) => m.role === "ai" || (m.role === "guest" && !isHostGuestMessage(m))
    );
    const latestGuestHost = latest(hostGuestMessages);
    const latestHostReply = latest(messages.filter((m) => m.role === "host"));
    const latestAiActivity = latest(aiActivityMessages);
    const latestGuestHostAt = latestGuestHost?.createdAt ?? null;
    const latestHostReplyAt = latestHostReply?.createdAt ?? null;
    const latestAiActivityAt = latestAiActivity?.createdAt ?? null;
    const latestHostActivityAt = maxDate(latestGuestHostAt, latestHostReplyAt);
    const latestRelevantAt =
      latestAny?.createdAt ?? r.lastMessageAt ?? latestHostActivityAt ?? r.createdAt;
    const hostNeedsReply =
      latestGuestHostAt != null &&
      (latestHostReplyAt == null || latestGuestHostAt > latestHostReplyAt) &&
      (r.hostArchivedAt == null || latestGuestHostAt > r.hostArchivedAt);
    const hasAiActivity =
      latestAiActivityAt != null &&
      (r.aiArchivedAt == null || latestAiActivityAt > r.aiArchivedAt);
    const hostArchivedCurrent =
      r.hostArchivedAt != null &&
      (latestGuestHostAt == null || latestGuestHostAt <= r.hostArchivedAt) &&
      (latestHostReplyAt == null || latestHostReplyAt <= r.hostArchivedAt);
    const aiArchivedCurrent =
      r.aiArchivedAt != null &&
      (latestAiActivityAt == null || latestAiActivityAt <= r.aiArchivedAt);
    const unread =
      latestGuestHostAt != null &&
      (r.hostLastReadAt == null || r.hostLastReadAt < latestGuestHostAt);
    const unreadCount = hostGuestMessages.filter(
      (message) => r.hostLastReadAt == null || r.hostLastReadAt < message.createdAt
    ).length;

    return {
      sessionId: r.sessionId,
      guidebookId: r.guidebookId,
      guidebookTitle: r.guidebookTitle,
      guestName: r.guestName,
      guestEmail: r.guestEmail,
      anonymousLabel,
      aiEnabled: r.aiEnabled,
      hostEscalatedAt: r.hostEscalatedAt,
      identityProvidedAt: r.identityProvidedAt,
      lastMessageAt: r.lastMessageAt,
      createdAt: r.createdAt,
      snippet: snippet(latestAny),
      hostSnippet: snippet(latestGuestHost ?? latestHostReply),
      aiSnippet: snippet(latestAiActivity),
      unread,
      hostNeedsReply,
      hasAiActivity,
      latestGuestHostAt,
      latestHostReplyAt,
      latestAiActivityAt,
      hostArchivedAt: r.hostArchivedAt,
      aiArchivedAt: r.aiArchivedAt,
      hostArchivedCurrent,
      aiArchivedCurrent,
      unreadCount,
      latestHostActivityAt,
      latestRelevantAt,
      latestPreview: snippet(latestAny),
      latestMessageRole: latestAny?.role ?? null,
      latestMessageTarget: latestAny ? readGuestTarget(latestAny.toolCalls) : null,
    };
  });
  const needsReplySessions = sessions.filter(
    (s) =>
      !s.hostArchivedCurrent &&
      (s.hostEscalatedAt != null ||
        s.latestGuestHostAt != null ||
        s.latestHostReplyAt != null)
  );
  const aiActivitySessions = sessions.filter((s) => s.hasAiActivity);
  const archivedSessions = sessions.filter(
    (s) => s.hostArchivedCurrent || s.aiArchivedCurrent
  );
  const quickAccessById = new Map<string, (typeof sessions)[number]>();
  for (const session of [...needsReplySessions, ...aiActivitySessions]) {
    quickAccessById.set(session.sessionId, session);
  }
  const quickAccessSessions = Array.from(quickAccessById.values())
    .sort((a, b) => dateTime(b.latestRelevantAt) - dateTime(a.latestRelevantAt))
    .slice(0, 8);
  const unreadMessageCount = needsReplySessions.reduce(
    (total, session) => total + session.unreadCount,
    0
  );

  return NextResponse.json({
    usage: { used: usage, cap },
    sessions: needsReplySessions,
    needsReplySessions,
    aiActivitySessions,
    archivedSessions,
    quickAccessSessions,
    unreadMessageCount,
  });
}
