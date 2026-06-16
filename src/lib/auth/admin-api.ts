import { NextResponse } from "next/server";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createServerClient } from "@/lib/supabase/server";

export async function requirePlatformAdminApi() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isPlatformAdmin(user)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { user, response: null };
}
