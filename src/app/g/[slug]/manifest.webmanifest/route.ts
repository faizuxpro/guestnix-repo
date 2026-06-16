import { generateGuidebookManifest } from "@/lib/guidebook-manifest";
import { PUBLIC_GUIDEBOOK_BASE_PATH } from "@/lib/guidebook-public-url";

type Params = { slug: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  return generateGuidebookManifest(slug, PUBLIC_GUIDEBOOK_BASE_PATH);
}
