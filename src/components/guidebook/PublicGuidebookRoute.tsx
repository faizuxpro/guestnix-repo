import type { Metadata, Viewport } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense, cache } from "react";
import { eq } from "drizzle-orm";
import { GuidebookLoaderGate } from "@/components/guidebook/GuidebookLoaderGate";
import { GuidebookLoadingScreen } from "@/components/guidebook/GuidebookLoadingScreen";
import { GuidebookViewer } from "@/components/guidebook/GuidebookViewer";
import { PasswordGate } from "@/components/guidebook/PasswordGate";
import {
  isGuidebookProtected,
  isGuidebookUnlocked,
} from "@/lib/guidebook-access";
import {
  fetchPublishedLoaderConfig,
  fetchPublishedSnapshot,
} from "@/lib/snapshot";
import {
  type GuidebookLoaderSettings,
  normalizeGuidebookLoaderSettings,
} from "@/lib/guidebook-loader-settings";
import { resolveGuidebookFaviconUrl } from "@/lib/guidebook-favicon";
import { isGuideServable } from "@/lib/billing/guide-access";
import { GuidePaused } from "@/components/guidebook/GuidePaused";
import { db } from "@/lib/db";
import { guidebooks } from "@/lib/db/schema";
import {
  buildQuickVariableRenderPayload,
  readQuickVariablesFromSettings,
  type QuickVariableRenderPayload,
} from "@/lib/quick-variables";
import {
  DEMO_GUIDEBOOK_BASE_PATH,
  PUBLIC_GUIDEBOOK_BASE_PATH,
  guidebookPublicPathFromBase,
  isDemoGuidebookSettings,
  type GuidebookPublicBasePath,
} from "@/lib/guidebook-public-url";

type RouteMode = "public" | "demo";

type Props = {
  slug: string;
  mode: RouteMode;
};

// React's `cache()` dedupes per-request, so generateMetadata,
// generateViewport, and the page itself share a single Storage fetch.
const loadSnapshot = cache(fetchPublishedSnapshot);

async function loadGuidebookRouteSettings(slug: string) {
  try {
    const row = await db.query.guidebooks.findFirst({
      where: eq(guidebooks.slug, slug),
      columns: { settings: true },
    });
    return (row?.settings ?? null) as Record<string, unknown> | null;
  } catch (err) {
    console.error("loadGuidebookRouteSettings failed", err);
    return null;
  }
}

async function loadLiveQuickVariables(
  guidebookId: string,
  context?: {
    guidebookTitle?: string | null;
    propertyName?: string | null;
    hostName?: string | null;
    heroData?: unknown;
  }
): Promise<QuickVariableRenderPayload | null> {
  try {
    const row = await db.query.guidebooks.findFirst({
      where: eq(guidebooks.id, guidebookId),
      columns: { settings: true },
    });
    if (!row) return null;

    return buildQuickVariableRenderPayload({
      quickVariables: readQuickVariablesFromSettings(row.settings),
      mode: "live",
      publicMode: true,
      context,
    });
  } catch (err) {
    console.error("loadLiveQuickVariables failed", err);
    return null;
  }
}

async function loadAccessSettings(guidebookId: string) {
  try {
    const row = await db.query.guidebooks.findFirst({
      where: eq(guidebooks.id, guidebookId),
      columns: { settings: true },
    });
    return (row?.settings ?? {}) as Record<string, unknown>;
  } catch (err) {
    console.error("loadAccessSettings failed", err);
    return {};
  }
}

function publicBasePathForMode(mode: RouteMode): GuidebookPublicBasePath {
  return mode === "demo" ? DEMO_GUIDEBOOK_BASE_PATH : PUBLIC_GUIDEBOOK_BASE_PATH;
}

async function enforceRouteMode(slug: string, mode: RouteMode) {
  const routeSettings = await loadGuidebookRouteSettings(slug);
  const demoEnabled = isDemoGuidebookSettings(routeSettings);

  if (mode === "demo") {
    if (!demoEnabled) notFound();
    return;
  }

  if (demoEnabled) {
    redirect(guidebookPublicPathFromBase(DEMO_GUIDEBOOK_BASE_PATH, slug));
  }
}

export async function generatePublicGuidebookMetadata({
  slug,
  mode,
}: Props): Promise<Metadata> {
  const snap = await loadSnapshot(slug);
  if (!snap) return { title: "Not Found" };

  const routeSettings = await loadGuidebookRouteSettings(slug);
  const demoEnabled = isDemoGuidebookSettings(routeSettings);
  if ((mode === "demo") !== demoEnabled) {
    return { title: "Not Found" };
  }

  const publicBasePath = publicBasePathForMode(mode);
  const { guidebook } = snap;
  const settings = guidebook.settings as Record<string, unknown>;
  const pwaEnabled = settings.pwa_enabled !== false;
  const encodedSlug = encodeURIComponent(slug);
  const faviconUrl = `${publicBasePath}/${encodedSlug}/icon`;
  const sourceFaviconUrl = resolveGuidebookFaviconUrl(guidebook);

  return {
    title: guidebook.title,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
    manifest: pwaEnabled
      ? `${publicBasePath}/${encodedSlug}/manifest.webmanifest`
      : undefined,
    icons: pwaEnabled
      ? {
          icon: [
            sourceFaviconUrl,
            { url: faviconUrl, sizes: "192x192", type: "image/png" },
          ],
          apple: `${publicBasePath}/${encodedSlug}/icon-192`,
        }
      : {
          icon: [
            sourceFaviconUrl,
            { url: faviconUrl, sizes: "192x192", type: "image/png" },
          ],
        },
    appleWebApp: pwaEnabled
      ? {
          capable: true,
          title: guidebook.title,
          statusBarStyle: "black-translucent",
        }
      : undefined,
  };
}

export async function generatePublicGuidebookViewport({
  slug,
}: Props): Promise<Viewport> {
  const snap = await loadSnapshot(slug);
  const branding = (snap?.guidebook.branding ?? {}) as Record<string, unknown>;
  const themeColor =
    typeof branding.primary_color === "string"
      ? branding.primary_color
      : "#002927";

  return {
    themeColor,
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
  };
}

export async function PublicGuidebookRoute({ slug, mode }: Props) {
  await enforceRouteMode(slug, mode);

  const loaderConfig =
    (await fetchPublishedLoaderConfig(slug)) ??
    normalizeGuidebookLoaderSettings();

  return (
    <Suspense
      fallback={
        loaderConfig.enabled ? (
          <GuidebookLoadingScreen settings={loaderConfig} />
        ) : null
      }
    >
      <PublicGuidebookContent
        slug={slug}
        loaderConfig={loaderConfig}
        publicBasePath={publicBasePathForMode(mode)}
        showDemoBadge={mode === "demo"}
      />
    </Suspense>
  );
}

async function PublicGuidebookContent({
  slug,
  loaderConfig,
  publicBasePath,
  showDemoBadge,
}: {
  slug: string;
  loaderConfig: GuidebookLoaderSettings;
  publicBasePath: GuidebookPublicBasePath;
  showDemoBadge: boolean;
}) {
  const snap = await loadSnapshot(slug);
  if (!snap) notFound();

  const { guidebook, sections, blocks, places, storefront } = snap;

  // Take the guide offline when its owner isn't entitled (trial ended / canceled).
  if (!(await isGuideServable(slug))) {
    const branding = guidebook.branding as Record<string, unknown>;
    const primaryColor =
      typeof branding.primary_color === "string"
        ? branding.primary_color
        : undefined;
    return <GuidePaused title={guidebook.title} primaryColor={primaryColor} />;
  }

  const accessSettings = await loadAccessSettings(guidebook.id);
  if (isGuidebookProtected(accessSettings)) {
    const unlocked = await isGuidebookUnlocked(guidebook.id, accessSettings);
    if (!unlocked) {
      const branding = guidebook.branding as Record<string, unknown>;
      const primaryColor =
        typeof branding.primary_color === "string"
          ? branding.primary_color
          : undefined;
      return (
        <PasswordGate
          slug={guidebook.slug}
          title={guidebook.title}
          primaryColor={primaryColor}
        />
      );
    }
  }

  const quickVariables = await loadLiveQuickVariables(guidebook.id, {
    guidebookTitle: guidebook.title,
    propertyName: guidebook.propertyName,
    hostName: guidebook.hostFirstName,
    heroData: guidebook.heroData,
  });

  return (
    <GuidebookLoaderGate settings={loaderConfig}>
      <GuidebookViewer
        guidebook={{
          id: guidebook.id,
          title: guidebook.title,
          slug: guidebook.slug,
          templateId: guidebook.templateId,
          branding: guidebook.branding,
          heroData: guidebook.heroData,
          bottomNav: guidebook.bottomNav,
          settings: guidebook.settings,
          propertyName: guidebook.propertyName,
          hostFirstName: guidebook.hostFirstName,
        }}
        sections={sections}
        blocks={blocks}
        places={places}
        storefront={storefront ?? null}
        quickVariables={quickVariables}
        publicBasePath={publicBasePath}
        showDemoBadge={showDemoBadge}
      />
    </GuidebookLoaderGate>
  );
}
