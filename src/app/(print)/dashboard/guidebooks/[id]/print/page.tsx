import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { BookOpen, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrintToolbar } from "@/components/print/PrintToolbar";
import { RuntimeFontLoader } from "@/components/fonts/RuntimeFontLoader";
import { createServerClient } from "@/lib/supabase/server";
import { requireGuidebookAccess } from "@/lib/guidebook-permissions";
import { checkEntitled } from "@/lib/billing/entitlements";
import { db } from "@/lib/db";
import { guidebookPublications } from "@/lib/db/schema";
import { absoluteAppUrl } from "@/lib/app-url";
import { guidebookPublicPath } from "@/lib/guidebook-public-url";
import {
  fetchPublishedSnapshotByPath,
  type GuidebookSnapshot,
} from "@/lib/snapshot";
import { createPrintDocument } from "@/lib/print/normalize";
import { getPrintTemplate } from "@/print-templates/registry";
import {
  buildQuickVariableRenderPayload,
  readQuickVariablesFromSettings,
  resolveQuickVariablesInBlockContent,
  resolveQuickVariablesInString,
  resolveQuickVariablesInValue,
  type QuickVariableRenderPayload,
} from "@/lib/quick-variables";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string }>;
};

function resolveSnapshotQuickVariables(
  snapshot: GuidebookSnapshot,
  quickVariables: QuickVariableRenderPayload
): GuidebookSnapshot {
  return {
    ...snapshot,
    guidebook: {
      ...snapshot.guidebook,
      title: resolveQuickVariablesInString(
        snapshot.guidebook.title,
        quickVariables
      ),
      branding: resolveQuickVariablesInValue(
        snapshot.guidebook.branding,
        quickVariables
      ),
      heroData: resolveQuickVariablesInValue(
        snapshot.guidebook.heroData,
        quickVariables
      ),
      settings: resolveQuickVariablesInValue(
        snapshot.guidebook.settings,
        quickVariables
      ),
      bottomNav: resolveQuickVariablesInValue(
        snapshot.guidebook.bottomNav,
        quickVariables
      ),
    },
    sections: snapshot.sections.map((section) => ({
      ...section,
      title: resolveQuickVariablesInString(section.title, quickVariables),
      itemSettings: resolveQuickVariablesInValue(
        section.itemSettings,
        quickVariables
      ),
    })),
    blocks: snapshot.blocks.map((block) => ({
      ...block,
      content: resolveQuickVariablesInBlockContent(
        block.type,
        block.content,
        quickVariables
      ),
    })),
    places: snapshot.places.map((place) => ({
      ...place,
      name: resolveQuickVariablesInString(place.name, quickVariables),
      description: place.description
        ? resolveQuickVariablesInString(place.description, quickVariables)
        : null,
      address: place.address
        ? resolveQuickVariablesInString(place.address, quickVariables)
        : null,
      phone: place.phone
        ? resolveQuickVariablesInString(place.phone, quickVariables)
        : null,
      website: place.website
        ? resolveQuickVariablesInString(place.website, quickVariables)
        : null,
      email: place.email
        ? resolveQuickVariablesInString(place.email, quickVariables)
        : null,
      openingHours: place.openingHours
        ? resolveQuickVariablesInString(place.openingHours, quickVariables)
        : null,
      tags: resolveQuickVariablesInValue(place.tags, quickVariables),
    })),
    storefront: resolveQuickVariablesInValue(
      snapshot.storefront ?? null,
      quickVariables
    ),
  };
}

function PrintUnavailable({
  title,
  message,
  guidebookId,
}: {
  title: string;
  message: string;
  guidebookId: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-sm">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Printer className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button render={<Link href={`/dashboard/guidebooks/${guidebookId}`} />}>
            Guidebook settings
          </Button>
          <Button
            variant="outline"
            render={<Link href={`/dashboard/guidebooks/${guidebookId}/editor`} />}
          >
            <BookOpen className="h-4 w-4" />
            Open editor
          </Button>
        </div>
      </div>
    </main>
  );
}

export default async function PrintGuidebookPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/dashboard/guidebooks/${id}/print`);
  }

  const access = await requireGuidebookAccess(user.id, id, "owner");
  if (!access.ok) {
    return (
      <PrintUnavailable
        title="Print export unavailable"
        message={access.error}
        guidebookId={id}
      />
    );
  }

  const entitlement = await checkEntitled(access.guidebook.userId);
  if (!entitlement.allowed) {
    return (
      <PrintUnavailable
        title="Print export unavailable"
        message={entitlement.reason}
        guidebookId={id}
      />
    );
  }

  if (access.guidebook.status !== "published") {
    return (
      <PrintUnavailable
        title="Publish before printing"
        message="The print template uses the current published guidebook snapshot."
        guidebookId={id}
      />
    );
  }

  const [publication] = await db
    .select()
    .from(guidebookPublications)
    .where(eq(guidebookPublications.guidebookId, id))
    .orderBy(desc(guidebookPublications.version))
    .limit(1);

  if (!publication) {
    return (
      <PrintUnavailable
        title="Published snapshot missing"
        message="Publish this guidebook again to create a printable snapshot."
        guidebookId={id}
      />
    );
  }

  const snapshot = await fetchPublishedSnapshotByPath(publication.snapshotPath);
  if (!snapshot) {
    return (
      <PrintUnavailable
        title="Published snapshot unavailable"
        message="The latest guidebook snapshot could not be loaded."
        guidebookId={id}
      />
    );
  }

  const template = getPrintTemplate(query.template);
  const publicUrl = absoluteAppUrl(
    guidebookPublicPath(snapshot.guidebook.slug, snapshot.guidebook.settings)
  );
  const quickVariables = buildQuickVariableRenderPayload({
    quickVariables: readQuickVariablesFromSettings(access.guidebook.settings),
    mode: "live",
    publicMode: true,
    context: {
      guidebookTitle: snapshot.guidebook.title,
      propertyName: snapshot.guidebook.propertyName,
      hostName: snapshot.guidebook.hostFirstName,
      heroData: snapshot.guidebook.heroData,
    },
  });
  const document = createPrintDocument(
    resolveSnapshotQuickVariables(snapshot, quickVariables),
    { publicUrl }
  );
  const Template = template.Component;

  return (
    <>
      <PrintToolbar
        title={document.title}
        backHref={`/dashboard/guidebooks/${id}`}
        publicUrl={publicUrl}
        templateName={template.name}
      />
      <RuntimeFontLoader
        id={`print-${document.slug}`}
        fontFamilies={[document.brand.headingFont, document.brand.bodyFont]}
        customFonts={document.brand.customFonts}
      />
      <Template document={document} />
    </>
  );
}
