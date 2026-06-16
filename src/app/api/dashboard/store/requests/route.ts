import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getDashboardStoreRequests } from "@/lib/store/dashboard-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const guidebookId = url.searchParams.get("guidebookId");
  const selectedRequestId = url.searchParams.get("request");

  const requests = await getDashboardStoreRequests(user.id, {
    status,
    guidebookId,
    selectedRequestId,
  });

  return NextResponse.json({ requests });
}
