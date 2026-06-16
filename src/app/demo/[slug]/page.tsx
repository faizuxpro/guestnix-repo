import type { Metadata, Viewport } from "next";
import {
  PublicGuidebookRoute,
  generatePublicGuidebookMetadata,
  generatePublicGuidebookViewport,
} from "@/components/guidebook/PublicGuidebookRoute";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return generatePublicGuidebookMetadata({ slug, mode: "demo" });
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { slug } = await params;
  return generatePublicGuidebookViewport({ slug, mode: "demo" });
}

export default async function DemoGuidebookPage({ params }: Props) {
  const { slug } = await params;
  return <PublicGuidebookRoute slug={slug} mode="demo" />;
}
