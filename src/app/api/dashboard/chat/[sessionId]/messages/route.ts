import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSessions, chatMessages, guidebooks } from "@/lib/db/schema";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hostReplySchema } from "@/lib/validations";
import {
  escapeHtml,
  renderBrandedEmail,
  renderEmailQuote,
  sendEmail,
} from "@/lib/email";
import { absoluteUrl } from "@/lib/utils";
import { guidebookPublicPath } from "@/lib/guidebook-public-url";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = hostReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const row = await db
    .select({
      session: chatSessions,
      guidebookSlug: guidebooks.slug,
      guidebookTitle: guidebooks.title,
      guidebookSettings: guidebooks.settings,
    })
    .from(chatSessions)
    .innerJoin(guidebooks, eq(chatSessions.guidebookId, guidebooks.id))
    .where(and(eq(chatSessions.id, sessionId), eq(guidebooks.userId, user.id)))
    .limit(1);
  const owned = row[0];
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = owned.session;
  if (!session.hostEscalatedAt) {
    return NextResponse.json(
      { error: "Guest has not contacted the host for this session" },
      { status: 403 }
    );
  }

  const shouldEmailGuest =
    Boolean(session.guestEmail) && parsed.data.sendResumeLinkEmail === true;

  const now = new Date();
  const [msg] = await db
    .insert(chatMessages)
    .values({
      sessionId: session.id,
      role: "host",
      content: parsed.data.content,
      senderUserId: user.id,
    })
    .returning();

  const patch: Partial<typeof chatSessions.$inferInsert> = {
    lastMessageAt: now,
    hostLastReadAt: now,
    updatedAt: now,
  };
  if (typeof parsed.data.aiEnabled === "boolean") {
    patch.aiEnabled = parsed.data.aiEnabled;
  }
  await db.update(chatSessions).set(patch).where(eq(chatSessions.id, session.id));

  try {
    const admin = createAdminClient();
    await admin.channel(`chat_session:${session.id}`).send({
      type: "broadcast",
      event: "message_insert",
      payload: {
        id: msg.id,
        sessionId: session.id,
        role: "host",
        content: msg.content,
        createdAt: msg.createdAt,
      },
    });
    await admin.channel(`host_inbox:${user.id}`).send({
      type: "broadcast",
      event: "session_touch",
      payload: { sessionId: session.id, kind: "host_message" },
    });
  } catch (err) {
    console.warn("Realtime broadcast failed (host reply)", err);
  }

  if (session.guestEmail && shouldEmailGuest) {
    try {
      const resumeUrl = absoluteUrl(
        `${guidebookPublicPath(
          owned.guidebookSlug,
          owned.guidebookSettings as Record<string, unknown>
        )}?chat=${encodeURIComponent(session.sessionToken)}`
      );
      const guestName = session.guestName?.trim() || "there";
      const guidebookTitle = owned.guidebookTitle || "your stay";
      const hostMessage = parsed.data.content.trim();
      const html = renderBrandedEmail({
        preheader: `Your host replied about ${guidebookTitle}.`,
        eyebrow: "Host reply",
        title: `Your host replied about ${guidebookTitle}`,
        bodyHtml: `
          <p style="margin:0 0 16px">Hi ${escapeHtml(guestName)},</p>
          <p style="margin:0 0 18px">Your host replied in your ${escapeHtml(
            guidebookTitle
          )} chat.</p>
          ${renderEmailQuote(hostMessage)}
        `,
        action: {
          label: "Continue chat",
          url: resumeUrl,
        },
      });
      await sendEmail({
        to: session.guestEmail,
        subject: `Your host replied about ${guidebookTitle}`,
        html,
        text: `Hi ${guestName},\n\nYour host replied in your ${guidebookTitle} chat:\n\n"${hostMessage}"\n\nContinue chat: ${resumeUrl}`,
      });
    } catch (err) {
      console.warn("Guest host-reply email failed", err);
    }
  }

  return NextResponse.json({ messageId: msg.id }, { status: 201 });
}
