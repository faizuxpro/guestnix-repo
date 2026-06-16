import { generateGuidebookIcon } from "./_icon";

export const runtime = "nodejs";
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

type Params = { slug: string };

export default async function Icon({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return generateGuidebookIcon(slug, 192);
}
