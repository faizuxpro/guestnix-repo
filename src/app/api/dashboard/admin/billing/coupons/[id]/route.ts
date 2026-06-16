import { NextResponse } from "next/server";
import {
  AdminBillingError,
  archiveAdminCoupon,
  updateAdminCoupon,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdminApi();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const coupon = await updateAdminCoupon(id, body, auth.user.id);
    return NextResponse.json({ coupon });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePlatformAdminApi();
  if (auth.response) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await archiveAdminCoupon(id, body, auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
