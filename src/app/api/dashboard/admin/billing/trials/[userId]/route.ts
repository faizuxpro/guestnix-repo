import { NextResponse } from "next/server";
import { AdminBillingError, updateAdminTrial } from "@/lib/admin-billing";
import { requirePlatformAdminApi } from "@/lib/auth/admin-api";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requirePlatformAdminApi();
  if (auth.response) return auth.response;

  const { userId } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const subscription = await updateAdminTrial(userId, body, auth.user.id);
    return NextResponse.json({ subscription });
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
