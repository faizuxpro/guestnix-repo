import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { DashboardAnnouncementBanner } from "@/components/dashboard/DashboardAnnouncementBanner";
import { DashboardPageTitleProvider } from "@/components/dashboard/DashboardPageTitle";
import { createServerClient } from "@/lib/supabase/server";
import { getUserEntitlement } from "@/lib/billing/entitlements";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already gates /dashboard, but this layout reads the user's
  // subscription so guard explicitly too.
  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const platformAdmin = isPlatformAdmin(user);
  const ent = await getUserEntitlement(user.id);
  // No subscription yet → finish onboarding (pick a plan to start the trial).
  if (ent.status === "none" && !platformAdmin) {
    redirect("/onboarding");
  }

  const trial = {
    status: ent.status,
    isEntitled: ent.isEntitled,
    plan: ent.plan,
    interval: ent.billingInterval,
    trialDaysLeft: ent.trialDaysLeft,
  };

  return (
    <DashboardPageTitleProvider>
      <div className="brand-refresh-scope brand-refresh-typography fixed inset-0 flex min-h-0 min-w-0 overflow-hidden">
        <Sidebar trial={trial} isPlatformAdmin={platformAdmin} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardAnnouncementBanner />
          <Topbar isPlatformAdmin={platformAdmin} />
          {/* Mobile only: the sidebar (with its trial card) is hidden < md, so
              show a slim banner here instead. */}
          <div className="md:hidden">
            <TrialBanner {...trial} />
          </div>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </DashboardPageTitleProvider>
  );
}
