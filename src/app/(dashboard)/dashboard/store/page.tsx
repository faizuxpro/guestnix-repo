import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getDashboardStoreInitialData } from "@/lib/store/dashboard-data";
import { createServerClient } from "@/lib/supabase/server";
import { StoreDashboardClient } from "./StoreDashboardClient";

export const metadata: Metadata = {
  title: "Store | Guestnix",
};

export const dynamic = "force-dynamic";

export default async function DashboardStorePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/store");
  }

  const initialData = await getDashboardStoreInitialData(user.id);

  return (
    <Suspense fallback={null}>
      <StoreDashboardClient initialData={initialData} />
    </Suspense>
  );
}
