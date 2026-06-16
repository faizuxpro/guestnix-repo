import { generateGuidebookIcon } from "@/app/g/[slug]/_icon";
import { isDemoGuidebookSlug } from "@/lib/guidebook-demo-access";

export const runtime = "nodejs";

type Params = { slug: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  if (!(await isDemoGuidebookSlug(slug))) {
    return new Response("Not Found", { status: 404 });
  }

  return generateGuidebookIcon(slug, 512);
}
