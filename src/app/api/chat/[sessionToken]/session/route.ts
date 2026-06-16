import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSessions, chatMessages, guidebooks, profiles } from "@/lib/db/schema";
import { contactHostSchema, createChatSessionSchema } from "@/lib/validations";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isGuidebookProtected,
  isGuidebookUnlocked,
} from "@/lib/guidebook-access";
import {
  checkRateLimit,
  clientIpIdentifier,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { guestTargetMetadata, readGuestTarget } from "@/lib/chat-message-metadata";
import { absoluteUrl } from "@/lib/utils";
import {
  escapeHtml,
  renderBrandedEmail,
  renderEmailQuote,
  sendEmail,
} from "@/lib/email";

export const runtime = "nodejs";
const HOST_NOTIFICATION_QUIET_MS = 10 * 60 * 1000;

function makeChatSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionToken: string }> }
) {
  const { sessionToken: urlToken } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = createChatSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const sessionLimit = await checkRateLimit(request, {
    scope: "chat_session_start",
    identifier: `${clientIpIdentifier(request)}:${parsed.data.guidebookSlug}`,
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!sessionLimit.allowed) {
    return rateLimitedResponse(sessionLimit);
  }

  const gb = await db.query.guidebooks.findFirst({
    where: and(
      eq(guidebooks.slug, parsed.data.guidebookSlug),
      eq(guidebooks.status, "published")
    ),
  });
  if (!gb) {
    return NextResponse.json({ error: "Guidebook not found" }, { status: 404 });
  }

  const settings = (gb.settings ?? {}) as Record<string, unknown>;
  if (settings.ai_chat_enabled === false) {
    return NextResponse.json({ error: "Chat disabled" }, { status: 403 });
  }

  if (isGuidebookProtected(settings)) {
    const unlocked = await isGuidebookUnlocked(gb.id, settings);
    if (!unlocked) {
      return NextResponse.json({ error: "Locked" }, { status: 403 });
    }
  }

  // The URL token is either a freshly-minted UUID or an existing persisted
  // token. Reuse if it matches; otherwise create new.
  const existing = urlToken
    ? await db.query.chatSessions.findFirst({
        where: eq(chatSessions.sessionToken, urlToken),
      })
    : null;

  if (existing && existing.guidebookId === gb.id) {
    return NextResponse.json({
      sessionId: existing.id,
      sessionToken: existing.sessionToken,
      guestName: existing.guestName,
      guestEmail: existing.guestEmail,
    });
  }

  const sessionToken = makeChatSessionToken();
  const [created] = await db
    .insert(chatSessions)
    .values({
      guidebookId: gb.id,
      sessionToken,
      guestName: parsed.data.guestName ?? null,
    })
    .returning();

  return NextResponse.json(
    {
      sessionId: created.id,
      sessionToken: created.sessionToken,
      guestName: created.guestName,
      guestEmail: created.guestEmail,
    },
    { status: 201 }
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionToken: string }> }
) {
  const { sessionToken } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = contactHostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const contactLimit = await checkRateLimit(request, {
    scope: "chat_contact_host",
    identifier: `${clientIpIdentifier(request)}:${sessionToken}`,
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });
  if (!contactLimit.allowed) {
    return rateLimitedResponse(contactLimit);
  }

  const session = await db.query.chatSessions.findFirst({
    where: eq(chatSessions.sessionToken, sessionToken),
    with: { guidebook: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const settings = (session.guidebook.settings ?? {}) as Record<string, unknown>;
  if (settings.ai_chat_enabled === false) {
    return NextResponse.json({ error: "Chat disabled" }, { status: 403 });
  }

  const previousMessages = await db
    .select({
      role: chatMessages.role,
      toolCalls: chatMessages.toolCalls,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id));
  const hostReadAt = session.hostLastReadAt?.getTime() ?? 0;
  const alreadyUnreadForHost = previousMessages.some((message) => {
    if (message.role !== "guest") return false;
    const guestTarget = readGuestTarget(message.toolCalls);
    const isHostMessage =
      guestTarget === "host" ||
      (guestTarget == null &&
        session.hostEscalatedAt != null &&
        message.createdAt >= session.hostEscalatedAt);
    return isHostMessage && message.createdAt.getTime() > hostReadAt;
  });

  const now = new Date();
  const [msg] = await db
    .insert(chatMessages)
    .values({
      sessionId: session.id,
      role: "guest",
      content: parsed.data.content,
      toolCalls: guestTargetMetadata("host"),
    })
    .returning();

  await db
    .update(chatSessions)
    .set({
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      hostEscalatedAt: session.hostEscalatedAt ?? msg.createdAt,
      identityProvidedAt: session.identityProvidedAt ?? now,
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(chatSessions.id, session.id));

  const hostProfile = await db.query.profiles.findFirst({
    where: eq(profiles.id, session.guidebook.userId),
  });
  const hostRecentlyActive =
    session.hostLastReadAt != null &&
    now.getTime() - session.hostLastReadAt.getTime() < HOST_NOTIFICATION_QUIET_MS;
  const shouldNotifyHost =
    Boolean(hostProfile?.email) && !alreadyUnreadForHost && !hostRecentlyActive;

  if (hostProfile?.email && shouldNotifyHost) {
    try {
      const threadUrl = absoluteUrl(
        `/dashboard/messages?session=${encodeURIComponent(session.id)}`
      );
      const guestName = parsed.data.guestName.trim() || "A guest";
      const guidebookTitle = session.guidebook.title || "your guidebook";
      const guestMessage = parsed.data.content.trim();
      const html = renderBrandedEmail({
        preheader: `${guestName} sent a message in Guestnix.`,
        eyebrow: "New guest message",
        title: `New guest message for ${guidebookTitle}`,
        bodyHtml: `
          <p style="margin:0 0 18px">${escapeHtml(
            guestName
          )} sent you a message in Guestnix.</p>
          ${renderEmailQuote(guestMessage)}
          <p style="margin:0">Open the guest thread to read it and reply.</p>
        `,
        action: {
          label: "Open guest thread",
          url: threadUrl,
        },
      });
      await sendEmail({
        to: hostProfile.email,
        subject: `New guest message for ${guidebookTitle}`,
        html,
        text: `${guestName} sent you a message in Guestnix:\n\n"${guestMessage}"\n\nOpen the guest thread to read it and reply:\n${threadUrl}`,
      });
    } catch (err) {
      console.warn("Host guest-message email failed", err);
    }
  }

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
      payload: { sessionId: session.id, kind: "host_escalation" },
    });
  } catch (err) {
    console.warn("Realtime broadcast failed (host escalation)", err);
  }

  return NextResponse.json({
    messageId: msg.id,
    createdAt: msg.createdAt,
  });
}
