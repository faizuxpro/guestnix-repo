import { NextResponse } from "next/server";
import { fetchPublishedSnapshot } from "@/lib/snapshot";
import { resolveGuidebookFaviconSource } from "@/lib/guidebook-favicon";
import type { GuidebookPublicBasePath } from "@/lib/guidebook-public-url";

function sanitizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return trimmed;
  return fallback;
}

export async function generateGuidebookManifest(
  slug: string,
  publicBasePath: GuidebookPublicBasePath
) {
  const snap = await fetchPublishedSnapshot(slug);
  if (!snap) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const branding = snap.guidebook.branding as {
    logo_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
  };
  const settings = snap.guidebook.settings as { pwa_enabled?: boolean };

  if (settings.pwa_enabled === false) {
    return new NextResponse("PWA disabled", { status: 404 });
  }

  const themeColor = sanitizeColor(branding.primary_color, "#002927");
  const bgColor = sanitizeColor(branding.secondary_color, "#faf6ef");
  const encodedSlug = encodeURIComponent(slug);

  const favicon = resolveGuidebookFaviconSource(snap.guidebook);
  const icons: Array<{
    src: string;
    sizes: string;
    type?: string;
    purpose?: string;
  }> = [
    {
      src: `${publicBasePath}/${encodedSlug}/icon-192`,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: `${publicBasePath}/${encodedSlug}/icon-512`,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: `${publicBasePath}/${encodedSlug}/icon-512`,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];

  icons.push({ src: favicon.url, sizes: "any", purpose: "any" });

  const title = snap.guidebook.title;
  const shortName =
    title.length > 12 ? `${title.slice(0, 12).trimEnd()}...` : title;

  const manifest = {
    name: title,
    short_name: shortName,
    description: `Your welcome guide to ${title}.`,
    start_url: `${publicBasePath}/${encodedSlug}`,
    scope: `${publicBasePath}/${encodedSlug}`,
    display: "standalone",
    orientation: "portrait",
    theme_color: themeColor,
    background_color: bgColor,
    icons,
    lang: "en",
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
