import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { startTrialSchema } from "@/lib/validations";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { syncProductUserProfile } from "@/lib/analytics/product-user";

/**
 * Starts a host's 7-day trial on the plan they picked during onboarding. The
 * trial uses that plan's limits and they're only charged when they later check
 * out on Gumroad. Idempotent: never resets an existing subscription's trial.
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
  const parsed = startTrialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await ensureProfile(user);

  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
  });
  if (existing) {
    // While still trialing, the host can switch the plan that defines their
    // trial limits (no charge). Once active/lapsed, this is a no-op — plan
    // changes then go through checkout.
    if (existing.status === "trialing") {
      await db
        .update(subscriptions)
        .set({
          plan: parsed.data.plan,
          billingInterval: parsed.data.interval,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, user.id));
      await Promise.all([
        trackServerProductEvent({
          distinctId: user.id,
          event: productEvents.planSelected,
          properties: {
            plan_name: parsed.data.plan,
            billing_interval: parsed.data.interval,
            source: "onboarding",
          },
        }),
        syncProductUserProfile(user.id),
      ]);
      return NextResponse.json({ ok: true, updated: true });
    }
    return NextResponse.json({ ok: true, alreadyExists: true });
  }

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000);
  await db
    .insert(subscriptions)
    .values({
      userId: user.id,
      plan: parsed.data.plan,
      billingInterval: parsed.data.interval,
      status: "trialing",
      provider: null,
      trialEndsAt,
    })
    .onConflictDoNothing({ target: subscriptions.userId });

  await Promise.all([
    trackServerProductEvent({
      distinctId: user.id,
      event: productEvents.planSelected,
      properties: {
        plan_name: parsed.data.plan,
        billing_interval: parsed.data.interval,
        source: "onboarding",
      },
    }),
    trackServerProductEvent({
      distinctId: user.id,
      event: productEvents.trialStarted,
      properties: {
        plan_name: parsed.data.plan,
        billing_interval: parsed.data.interval,
        source: "onboarding",
      },
    }),
    trackServerProductEvent({
      distinctId: user.id,
      event: productEvents.onboardingCompleted,
      properties: {
        plan_name: parsed.data.plan,
        billing_interval: parsed.data.interval,
      },
    }),
    syncProductUserProfile(user.id),
  ]);

  return NextResponse.json({ ok: true });
}
