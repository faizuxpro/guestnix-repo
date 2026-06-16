import { generateGuidebookIcon } from "../_icon";

export const runtime = "nodejs";

type Params = { slug: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  return generateGuidebookIcon(slug, 192);
}
