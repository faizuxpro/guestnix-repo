import { notFound, redirect } from "next/navigation";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createServerClient } from "@/lib/supabase/server";
import { listAdminCoupons, listAdminTrials } from "@/lib/admin-billing";
import { BillingAdminClient } from "./BillingAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/admin/billing");
  }

  if (!isPlatformAdmin(user)) {
    notFound();
  }

  const [coupons, users] = await Promise.all([
    listAdminCoupons(),
    listAdminTrials(),
  ]);

  return <BillingAdminClient initialCoupons={coupons} initialUsers={users} />;
}
