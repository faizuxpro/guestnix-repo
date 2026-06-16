import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validations";
import { getProvider } from "@/lib/billing/provider";
import { validateCoupon } from "@/lib/billing/coupons";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";

/**
 * Returns a provider checkout URL for the selected plan. Validates an optional
 * coupon against our catalogue before forwarding it (the provider applies the
 * actual discount). The client redirects to the returned URL.
 */
export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  let couponCode: string | undefined;
  if (parsed.data.couponCode) {
    const result = await validateCoupon(parsed.data.couponCode);
    if (!result.ok) {
      await trackServerProductEvent({
        distinctId: user.id,
        event: productEvents.couponValidationFailed,
        properties: {
          plan_name: parsed.data.plan,
          billing_interval: parsed.data.interval,
          source: "checkout",
        },
      });
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }
    couponCode = result.code;
  }

  try {
    const url = await getProvider().getCheckoutUrl({
      plan: parsed.data.plan,
      interval: parsed.data.interval,
      userId: user.id,
      email: user.email ?? "",
      couponCode,
    });
    await trackServerProductEvent({
      distinctId: user.id,
      event: productEvents.checkoutStarted,
      properties: {
        plan_name: parsed.data.plan,
        billing_interval: parsed.data.interval,
        source: "billing_api",
      },
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("POST /api/billing/checkout failed", err);
    return NextResponse.json(
      { error: "Checkout isn't available right now. Please try again later." },
      { status: 500 }
    );
  }
}
