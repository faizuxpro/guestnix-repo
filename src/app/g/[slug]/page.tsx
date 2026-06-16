import type { Metadata, Viewport } from "next";
import {
  PublicGuidebookRoute,
  generatePublicGuidebookMetadata,
  generatePublicGuidebookViewport,
} from "@/components/guidebook/PublicGuidebookRoute";

// Owner-entitlement is checked per request so a lapsed trial takes a guide
// offline promptly; the snapshot itself is already fetched at runtime.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return generatePublicGuidebookMetadata({ slug, mode: "public" });
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { slug } = await params;
  return generatePublicGuidebookViewport({ slug, mode: "public" });
}

export default async function PublicGuidebookPage({ params }: Props) {
  const { slug } = await params;
  return <PublicGuidebookRoute slug={slug} mode="public" />;
}
