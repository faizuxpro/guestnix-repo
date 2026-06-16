import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  chatSessions,
  chatMessages,
  guidebooks,
} from "@/lib/db/schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendGuestMessageSchema } from "@/lib/validations";
import { canAiRespond } from "@/lib/ai/usage";
import {
  aiReplyMetadata,
  guestTargetMetadata,
  readGuestTarget,
} from "@/lib/chat-message-metadata";
import {
  checkRateLimit,
  clientIpIdentifier,
  rateLimitedResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

async function loadSession(token: string) {
  return db.query.chatSessions.findFirst({
    where: eq(chatSessions.sessionToken, token),
    with: { guidebook: true },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionToken: string }> }
) {
  const { sessionToken } = await params;
  const session = await loadSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id))
    .orderBy(asc(chatMessages.createdAt));

  return NextResponse.json({
    sessionId: session.id,
    aiEnabled: session.aiEnabled,
    guestName: session.guestName,
    guestEmail: session.guestEmail,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls,
      target: m.role === "guest" ? readGuestTarget(m.toolCalls) : undefined,
      createdAt: m.createdAt,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionToken: string }> }
) {
  const { sessionToken } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = sendGuestMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const messageLimit = await checkRateLimit(request, {
    scope: "chat_guest_message",
    identifier: `${clientIpIdentifier(request)}:${sessionToken}`,
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!messageLimit.allowed) {
    return rateLimitedResponse(messageLimit);
  }

  const session = await loadSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const settings = (session.guidebook.settings ?? {}) as Record<string, unknown>;
  if (settings.ai_chat_enabled === false) {
    return NextResponse.json({ error: "Chat disabled" }, { status: 403 });
  }

  const now = new Date();
  const [msg] = await db
    .insert(chatMessages)
    .values({
      sessionId: session.id,
      role: "guest",
      content: parsed.data.content,
      toolCalls: guestTargetMetadata("ai"),
    })
    .returning();

  await db
    .update(chatSessions)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(eq(chatSessions.id, session.id));

  // Best-effort Realtime broadcast so host inbox + guest widget see it fast.
  // Failures are non-fatal (DB insert is the source of truth).
  try {
    const admin = createAdminClient();
    await admin.channel(`chat_session:${session.id}`).send({
      type: "broadcast",
      event: "message_insert",
      payload: {
        id: msg.id,
        sessionId: session.id,
        role: msg.role,
        content: msg.content,
        toolCalls: msg.toolCalls,
        target: readGuestTarget(msg.toolCalls),
        createdAt: msg.createdAt,
      },
    });
    await admin.channel(`host_inbox:${session.guidebook.userId}`).send({
      type: "broadcast",
      event: "session_touch",
      payload: { sessionId: session.id, kind: "guest_message" },
    });
  } catch (err) {
    console.warn("Realtime broadcast failed", err);
  }

  // Decide whether AI should respond.
  if (!session.aiEnabled) {
    return NextResponse.json({ messageId: msg.id, aiWillRespond: false });
  }

  const guidebook = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.id, session.guidebookId),
  });
  if (!guidebook) {
    return NextResponse.json({ messageId: msg.id, aiWillRespond: false });
  }

  const { allowed, used, cap } = await canAiRespond(guidebook.userId);
  if (!allowed) {
    const [aiNote] = await db
      .insert(chatMessages)
      .values({
        sessionId: session.id,
        role: "ai",
        content:
          "AI concierge is paused for this month. Please use Contact Host if you need a reply from your host.",
        toolCalls: aiReplyMetadata(msg.id),
      })
      .returning();
    return NextResponse.json({
      messageId: msg.id,
      aiWillRespond: false,
      capReached: true,
      used,
      cap,
      systemMessageId: aiNote.id,
    });
  }

  return NextResponse.json({ messageId: msg.id, aiWillRespond: true });
}
