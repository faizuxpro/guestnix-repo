import { notFound, redirect } from "next/navigation";
import {
  listAdminAnnouncementCampaigns,
  listAnnouncementAudienceUsers,
} from "@/lib/announcements";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { createServerClient } from "@/lib/supabase/server";
import { AnnouncementsAdminClient } from "./AnnouncementsAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/admin/announcements");
  }

  if (!isPlatformAdmin(user)) {
    notFound();
  }

  const [campaigns, audienceUsers] = await Promise.all([
    listAdminAnnouncementCampaigns(),
    listAnnouncementAudienceUsers(),
  ]);

  return (
    <AnnouncementsAdminClient
      initialCampaigns={campaigns}
      audienceUsers={audienceUsers}
    />
  );
}
