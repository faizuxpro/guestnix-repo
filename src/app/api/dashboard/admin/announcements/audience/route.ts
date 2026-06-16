import { NextResponse } from "next/server";
import {
  previewAnnouncementAudience,
  listAnnouncementAudienceUsers,
} from "@/lib/announcements";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const error = await requireAdmin();
  if (error) return error;

  const users = await listAnnouncementAudienceUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const error = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const audience = await previewAnnouncementAudience(body.audienceFilter ?? body);
  return NextResponse.json({ audience });
}
