import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import type { ReactElement } from "react";

import { mdxComponents } from "@/components/blog/mdx/registry";

export async function compilePostMdx(source: string): Promise<ReactElement> {
  const { content } = await compileMDX<Record<string, never>>({
    source,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "append",
              properties: { className: ["anchor"], ariaLabel: "Link to section" },
            },
          ],
          [
            rehypePrettyCode,
            { theme: "github-light", keepBackground: false },
          ],
        ],
      },
    },
    components: mdxComponents,
  });
  return content;
}
