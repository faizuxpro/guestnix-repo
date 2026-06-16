import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { OnboardingPlanPicker } from "@/components/onboarding/OnboardingPlanPicker";

// Lives outside the (dashboard) route group on purpose: the dashboard layout
// redirects subscription-less users here, so this page must NOT be wrapped by
// that layout (which would loop).
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/onboarding");
  }

  // Already onboarded (has a subscription/trial) → go straight to the dashboard.
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, user.id),
  });
  if (existing) {
    redirect("/dashboard");
  }

  return <OnboardingPlanPicker />;
}
