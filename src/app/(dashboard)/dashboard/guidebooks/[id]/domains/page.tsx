import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CustomDomainsManager } from "@/components/dashboard/CustomDomainsManager";
import { GuidebookUnavailableState } from "@/components/dashboard/GuidebookUnavailableState";
import { requireGuidebookAccess } from "@/lib/guidebook-permissions";
import {
  GUIDEBOOK_OWNER_REQUIRED_MESSAGE,
  GUIDEBOOK_OWNER_REQUIRED_TITLE,
} from "@/lib/guidebook-error-copy";

type Props = { params: Promise<{ id: string }> };

export default async function GuidebookDomainsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/dashboard/guidebooks/${id}/domains`);

  const access = await requireGuidebookAccess(user.id, id, "owner");
  if (!access.ok) {
    if (access.status === 403) {
      return (
        <GuidebookUnavailableState
          title={GUIDEBOOK_OWNER_REQUIRED_TITLE}
          description={GUIDEBOOK_OWNER_REQUIRED_MESSAGE}
          actionHref={`/dashboard/guidebooks/${id}`}
          actionLabel="Back to guidebook"
        />
      );
    }
    return <GuidebookUnavailableState />;
  }

  const guidebook = access.guidebook;

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/dashboard/guidebooks/${id}`} />}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to guidebook
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Custom domains</h1>
        <p className="text-sm text-muted-foreground">
          Connect your own domain (like <code>guide.acmehouse.com</code> or
          even <code>acmehouse.com</code>) to your guidebook. Visitors land
          on your domain instead of <code>guestnix.com/g/{guidebook.slug}</code>.
        </p>
      </div>

      <CustomDomainsManager
        guidebookId={guidebook.id}
        guidebookSlug={guidebook.slug}
      />
    </div>
  );
}
