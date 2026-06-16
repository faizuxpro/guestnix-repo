import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  getAllPosts,
  getAllPostSlugs,
  getPost,
  type Post,
} from "@/lib/blog/content";
import { getAllAuthors, requireAuthor } from "@/lib/blog/authors";
import { getRelatedPosts } from "@/lib/blog/related";
import { compilePostMdx } from "@/lib/blog/mdx";
import {
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  buildPersonJsonLd,
} from "@/lib/blog/jsonld";
import { SITE } from "@/lib/seo/site";
import { getCategory } from "@/lib/blog/taxonomy";

import { BlogSubNav } from "@/components/blog/BlogSubNav";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { Schema } from "@/components/blog/Schema";

import { StandardPost } from "@/components/blog/templates/StandardPost";
import { GuidePost } from "@/components/blog/templates/GuidePost";
import { ListiclePost } from "@/components/blog/templates/ListiclePost";
import { CaseStudyPost } from "@/components/blog/templates/CaseStudyPost";
import type { PostTemplate } from "@/lib/blog/schema";

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const author = await requireAuthor(post.author);
  const url = `${SITE.url}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: (post.updatedAt ?? post.publishedAt).toISOString(),
      authors: [`${SITE.url}/blog/author/${post.author}`],
      tags: post.tags,
      images: [{ url: `${url}/opengraph-image`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      creator: author.twitter ? `@${author.twitter}` : undefined,
    },
    other: {
      citation_author: author.name,
      citation_title: post.title,
      citation_publication_date: post.publishedAt.toISOString().slice(0, 10),
    },
  };
}

function extractGuideSteps(markdown: string): { name: string; text: string }[] {
  const lines = markdown.split("\n");
  const steps: { name: string; text: string }[] = [];
  let current: { name: string; text: string } | null = null;
  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      if (current) steps.push(current);
      current = { name: m[1].trim(), text: "" };
    } else if (current) {
      if (line.trim()) current.text += (current.text ? " " : "") + line.trim();
    }
  }
  if (current) steps.push(current);
  return steps.slice(0, 20);
}

type TemplateComponent = typeof StandardPost;
const TEMPLATES: Record<PostTemplate, TemplateComponent> = {
  standard: StandardPost,
  guide: GuidePost as TemplateComponent,
  listicle: ListiclePost,
  "case-study": CaseStudyPost,
};

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const [author, authorsList] = await Promise.all([
    requireAuthor(post.author),
    getAllAuthors(),
  ]);
  await getAllPosts();
  const authors = new Map(authorsList.map((a) => [a.slug, a]));
  const relatedPosts = await getRelatedPosts(post as Post, 3);

  const url = `${SITE.url}/blog/${post.slug}`;
  const category = getCategory(post.category);

  const content = await compilePostMdx(post.bodyMdx);

  const article = buildArticleJsonLd(post as Post, author);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE.url },
    { name: "Blog", url: `${SITE.url}/blog` },
    { name: category.name, url: `${SITE.url}/blog/category/${post.category}` },
    { name: post.title, url },
  ]);
  const person = buildPersonJsonLd(author);

  const Template = TEMPLATES[post.template];

  const sharedProps = {
    post: post as Post,
    author,
    authors,
    relatedPosts,
    url,
  };

  return (
    <>
      <ReadingProgress />
      <BlogSubNav />
      {post.template === "guide" ? (
        <GuidePost {...sharedProps} headings={extractGuideSteps(post.bodyMdx)}>
          {content}
        </GuidePost>
      ) : (
        <Template {...sharedProps}>{content}</Template>
      )}
      <Schema data={article} />
      <Schema data={breadcrumb} />
      <Schema data={person} />
    </>
  );
}
