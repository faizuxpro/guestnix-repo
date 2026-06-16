import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Settings } from "lucide-react";
import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { getMonthlyCap, getMonthlyUsage } from "@/lib/ai/usage";
import { getUserEntitlement } from "@/lib/billing/entitlements";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/settings");
  }

  await ensureProfile(user);

  const [profile, ent, cap, used] = await Promise.all([
    db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
      columns: {
        email: true,
        fullName: true,
        avatarUrl: true,
      },
    }),
    getUserEntitlement(user.id),
    getMonthlyCap(user.id),
    getMonthlyUsage(user.id),
  ]);

  const metadata = user.user_metadata as Record<string, unknown> | null;
  const profileData = {
    email: user.email ?? profile?.email ?? "",
    fullName:
      profile?.fullName ?? readMetadataString(metadata, "full_name") ?? null,
    avatarUrl:
      profile?.avatarUrl ?? readMetadataString(metadata, "avatar_url") ?? null,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-5 w-5 text-primary" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, AI concierge, notifications, and billing.
        </p>
      </div>

      <SettingsTabs
        profile={profileData}
        ai={{ cap, used }}
        billing={{
          currentPlan: ent.plan,
          currentInterval: ent.billingInterval,
          status: ent.status,
          trialEndsAt: ent.trialEndsAt?.toISOString() ?? null,
          trialDaysLeft: ent.trialDaysLeft,
        }}
      />
    </div>
  );
}
