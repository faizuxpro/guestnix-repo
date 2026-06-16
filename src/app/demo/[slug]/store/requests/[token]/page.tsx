import { notFound } from "next/navigation";
import { StoreRequestClient } from "@/app/g/[slug]/store/requests/[token]/StoreRequestClient";
import { isDemoGuidebookSlug } from "@/lib/guidebook-demo-access";
import { DEMO_GUIDEBOOK_BASE_PATH } from "@/lib/guidebook-public-url";

type Props = {
  params: Promise<{ slug: string; token: string }>;
};

export default async function DemoStoreRequestPage({ params }: Props) {
  const { slug, token } = await params;
  if (!(await isDemoGuidebookSlug(slug))) {
    notFound();
  }

  return (
    <StoreRequestClient
      slug={slug}
      token={token}
      publicBasePath={DEMO_GUIDEBOOK_BASE_PATH}
    />
  );
}
