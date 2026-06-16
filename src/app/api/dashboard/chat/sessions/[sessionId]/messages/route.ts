import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatSessions, chatMessages, guidebooks } from "@/lib/db/schema";
import { createServerClient } from "@/lib/supabase/server";
import { updateThreadSchema } from "@/lib/validations";
import { readGuestTarget } from "@/lib/chat-message-metadata";

export const runtime = "nodejs";

async function requireOwnedSession(userId: string, sessionId: string) {
  const row = await db
    .select({ session: chatSessions })
    .from(chatSessions)
    .innerJoin(guidebooks, eq(chatSessions.guidebookId, guidebooks.id))
    .where(and(eq(chatSessions.id, sessionId), eq(guidebooks.userId, userId)))
    .limit(1);
  return row[0]?.session ?? null;
}

export async function GET(
  _request: Request,
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
  const session = await requireOwnedSession(user.id, sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id))
    .orderBy(asc(chatMessages.createdAt));

  return NextResponse.json({
    sessionId: session.id,
    guestName: session.guestName,
    guestEmail: session.guestEmail,
    hostEscalatedAt: session.hostEscalatedAt,
    identityProvidedAt: session.identityProvidedAt,
    aiEnabled: session.aiEnabled,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      toolCalls: m.toolCalls,
      target: readGuestTarget(m.toolCalls),
      createdAt: m.createdAt,
    })),
  });
}

export async function PATCH(
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
  const session = await requireOwnedSession(user.id, sessionId);
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updateThreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const patch: Partial<typeof chatSessions.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof parsed.data.aiEnabled === "boolean") {
    patch.aiEnabled = parsed.data.aiEnabled;
  }
  if (parsed.data.markRead) {
    patch.hostLastReadAt = new Date();
  }
  if (parsed.data.archive === "host") {
    patch.hostArchivedAt = new Date();
    patch.hostLastReadAt = new Date();
  }
  if (parsed.data.archive === "ai") {
    patch.aiArchivedAt = new Date();
  }

  const [updated] = await db
    .update(chatSessions)
    .set(patch)
    .where(eq(chatSessions.id, session.id))
    .returning();

  return NextResponse.json({
    sessionId: updated.id,
    aiEnabled: updated.aiEnabled,
    hostLastReadAt: updated.hostLastReadAt,
  });
}
