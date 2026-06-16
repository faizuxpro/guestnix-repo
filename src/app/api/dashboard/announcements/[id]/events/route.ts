import { NextResponse } from "next/server";
import {
  AnnouncementError,
  recordAnnouncementEvent,
} from "@/lib/announcements";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const result = await recordAnnouncementEvent(id, user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AnnouncementError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }
    throw error;
  }
}
