import { NextResponse } from "next/server";
import {
  AdminBillingError,
  createAdminCoupon,
  listAdminCoupons,
} from "@/lib/admin-billing";
import { requirePlatformAdminApi } from "@/lib/auth/admin-api";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof AdminBillingError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status }
    );
  }
  throw error;
}

export async function GET() {
  const auth = await requirePlatformAdminApi();
  if (auth.response) return auth.response;

  try {
    const coupons = await listAdminCoupons();
    return NextResponse.json({ coupons });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdminApi();
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => ({}));
  try {
    const coupon = await createAdminCoupon(body, auth.user.id);
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
