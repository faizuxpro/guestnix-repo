import { NextResponse } from "next/server";
import {
  AnnouncementError,
  deleteAnnouncementCampaign,
  getAdminAnnouncementCampaign,
  updateAnnouncementCampaign,
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  try {
    const result = await getAdminAnnouncementCampaign(id);
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const campaign = await updateAnnouncementCampaign(id, body);
    return NextResponse.json({ campaign });
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  try {
    const result = await deleteAnnouncementCampaign(id);
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
