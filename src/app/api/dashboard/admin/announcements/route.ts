import { NextResponse } from "next/server";
import {
  AnnouncementError,
  createAnnouncementCampaign,
  listAdminAnnouncementCampaigns,
} from "@/lib/announcements";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isPlatformAdmin(user)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const campaigns = await listAdminAnnouncementCampaigns();
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  try {
    const campaign = await createAnnouncementCampaign(body, auth.user.id);
    return NextResponse.json({ campaign }, { status: 201 });
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
