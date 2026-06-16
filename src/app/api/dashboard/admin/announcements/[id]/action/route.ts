import { NextResponse } from "next/server";
import {
  AnnouncementError,
  announcementActionInputSchema,
  runAnnouncementCampaignAction,
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = announcementActionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const campaign = await runAnnouncementCampaignAction(
      id,
      auth.user.id,
      parsed.data.action
    );
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
