import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import {
  getNotificationSummary,
  markUserNotificationsRead,
} from "@/lib/notifications";

export const runtime = "nodejs";

const markReadSchema = z.object({
  all: z.boolean().optional(),
  ids: z.array(z.string().uuid()).max(100).optional(),
});

async function requireUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function readLimit(url: string) {
  const value = Number(new URL(url).searchParams.get("limit") ?? 10);
  if (!Number.isFinite(value)) return 10;
  return Math.min(30, Math.max(1, Math.floor(value)));
}

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getNotificationSummary(user.id, readLimit(request.url));
  return NextResponse.json(summary);
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const ids = parsed.data.ids ?? [];
  if (!parsed.data.all && ids.length === 0) {
    return NextResponse.json(
      { error: "Provide notification ids or set all to true" },
      { status: 400 }
    );
  }

  await markUserNotificationsRead(user.id, parsed.data.all ? undefined : ids);
  const summary = await getNotificationSummary(user.id, readLimit(request.url));
  return NextResponse.json(summary);
}
