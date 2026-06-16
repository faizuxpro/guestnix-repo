import type { Metadata } from "next";
import { StoreRequestClient } from "./StoreRequestClient";

type Props = {
  params: Promise<{ slug: string; token: string }>;
};

export const metadata: Metadata = {
  title: "Store request",
  robots: { index: false, follow: false },
};

export default async function StoreRequestPage({ params }: Props) {
  const { slug, token } = await params;
  return <StoreRequestClient slug={slug} token={token} />;
}
