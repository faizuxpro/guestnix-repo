import { NextResponse } from "next/server";
import { listActiveAnnouncementsForUser } from "@/lib/announcements";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const announcements = await listActiveAnnouncementsForUser(user.id);
  return NextResponse.json({
    announcement: announcements[0] ?? null,
    announcements,
  });
}
