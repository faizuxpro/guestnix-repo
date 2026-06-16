import { NextResponse } from "next/server";
import { AdminBillingError, getAdminCouponUsage } from "@/lib/admin-billing";
import { requirePlatformAdminApi } from "@/lib/auth/admin-api";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdminApi();
  if (auth.response) return auth.response;

  const { id } = await params;
  try {
    const result = await getAdminCouponUsage(id);
    return NextResponse.json(result);
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
