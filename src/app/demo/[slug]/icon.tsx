import { generateGuidebookIcon } from "@/app/g/[slug]/_icon";
import { isDemoGuidebookSlug } from "@/lib/guidebook-demo-access";

export const runtime = "nodejs";
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

type Params = { slug: string };

export default async function Icon({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!(await isDemoGuidebookSlug(slug))) {
    return new Response("Not Found", { status: 404 });
  }

  return generateGuidebookIcon(slug, 192);
}
