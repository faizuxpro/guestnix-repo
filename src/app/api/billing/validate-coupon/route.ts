import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { validateCouponSchema } from "@/lib/validations";
import { validateCoupon } from "@/lib/billing/coupons";

/** Validates a coupon so the UI can show "applied — X off" before checkout. */
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = validateCouponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await validateCoupon(parsed.data.code);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason });
  }
  return NextResponse.json({
    ok: true,
    code: result.code,
    discountType: result.discountType,
    discountValue: result.discountValue,
  });
}
