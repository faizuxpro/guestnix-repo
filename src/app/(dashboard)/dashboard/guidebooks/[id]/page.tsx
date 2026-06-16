import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { absoluteAppUrl } from "@/lib/app-url";
import { requireGuidebookAccess } from "@/lib/guidebook-permissions";
import { redactGuidebookAccessSettingsForClient } from "@/lib/guidebook-access";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { guidebookPublicBasePath } from "@/lib/guidebook-public-url";
import { GuidebookUnavailableState } from "@/components/dashboard/GuidebookUnavailableState";
import { GuidebookSettingsPage } from "@/components/dashboard/GuidebookSettingsPage";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { title: "Guidebook settings" };
  }

  const access = await requireGuidebookAccess(user.id, id, "editor");
  if (!access.ok) {
    return { title: "Guidebook settings" };
  }

  return { title: `Settings for ${access.guidebook.title}` };
}

export default async function GuidebookOverviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/dashboard/guidebooks/${id}`);

  const access = await requireGuidebookAccess(user.id, id, "editor");
  if (!access.ok) {
    return <GuidebookUnavailableState />;
  }

  const guidebook = access.guidebook;
  const publicUrlBase = absoluteAppUrl(
    guidebookPublicBasePath(guidebook.settings as Record<string, unknown>)
  );

  return (
    <GuidebookSettingsPage
      guidebook={{
        id: guidebook.id,
        title: guidebook.title,
        slug: guidebook.slug,
        status: guidebook.status,
        accessRole: access.role,
        settings: redactGuidebookAccessSettingsForClient(
          (guidebook.settings ?? {}) as Record<string, unknown>
        ),
        publishedAt: guidebook.publishedAt
          ? guidebook.publishedAt.toISOString()
          : null,
        updatedAt: guidebook.updatedAt.toISOString(),
      }}
      publicUrlBase={publicUrlBase}
      isPlatformAdmin={isPlatformAdmin(user)}
    />
  );
}
