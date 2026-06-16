import { NextResponse } from "next/server";
import { AdminBillingError, listAdminTrials } from "@/lib/admin-billing";
import { requirePlatformAdminApi } from "@/lib/auth/admin-api";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requirePlatformAdminApi();
  if (auth.response) return auth.response;

  try {
    const users = await listAdminTrials();
    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof AdminBillingError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      );
    }
    throw error;
  }
}
