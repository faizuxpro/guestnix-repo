import { generateGuidebookManifest } from "@/lib/guidebook-manifest";
import { isDemoGuidebookSlug } from "@/lib/guidebook-demo-access";
import { DEMO_GUIDEBOOK_BASE_PATH } from "@/lib/guidebook-public-url";

type Params = { slug: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  if (!(await isDemoGuidebookSlug(slug))) {
    return new Response("Not Found", { status: 404 });
  }

  return generateGuidebookManifest(slug, DEMO_GUIDEBOOK_BASE_PATH);
}
