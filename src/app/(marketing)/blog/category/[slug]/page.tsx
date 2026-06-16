import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPostsByCategory } from "@/lib/blog/content";
import { getAllAuthors } from "@/lib/blog/authors";
import {
  CATEGORIES,
  CATEGORY_SLUGS,
  getCategory,
  isCategorySlug,
} from "@/lib/blog/taxonomy";
import { SITE } from "@/lib/seo/site";
import { buildBreadcrumbJsonLd, buildCollectionJsonLd } from "@/lib/blog/jsonld";

import { BlogSubNav } from "@/components/blog/BlogSubNav";
import { PostGrid } from "@/components/blog/PostGrid";
import { Pagination } from "@/components/blog/Pagination";
import { Breadcrumbs } from "@/components/blog/Breadcrumbs";
import { Schema } from "@/components/blog/Schema";

export const revalidate = 3600;
const POSTS_PER_PAGE = 12;

export async function generateStaticParams() {
  return CATEGORY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isCategorySlug(slug)) return {};
  const c = CATEGORIES[slug];
  return {
    title: c.name,
    description: c.description,
    alternates: { canonical: `/blog/category/${slug}` },
    openGraph: {
      type: "website",
      url: `${SITE.url}/blog/category/${slug}`,
      title: `${c.name} | ${SITE.name} Blog`,
      description: c.description,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  if (!isCategorySlug(slug)) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1"));

  const category = getCategory(slug);
  const [posts, authorsList] = await Promise.all([
    getPostsByCategory(slug),
    getAllAuthors(),
  ]);
  const authors = new Map(authorsList.map((a) => [a.slug, a]));

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const start = (page - 1) * POSTS_PER_PAGE;
  const pagePosts = posts.slice(start, start + POSTS_PER_PAGE);

  const url = `${SITE.url}/blog/category/${slug}`;
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE.url },
    { name: "Blog", url: `${SITE.url}/blog` },
    { name: category.name, url },
  ]);
  const collection = buildCollectionJsonLd({
    url,
    name: category.name,
    description: category.description,
    posts,
  });

  return (
    <>
      <BlogSubNav />
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: category.name },
          ]}
        />
        <header className="mt-6 mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900">
            {category.name}
          </h1>
          <p className="mt-2 text-lg text-neutral-600">{category.description}</p>
        </header>
        <PostGrid posts={pagePosts} authors={authors} />
        <Pagination
          basePath={`/blog/category/${slug}`}
          page={page}
          totalPages={totalPages}
        />
      </div>
      <Schema data={breadcrumb} />
      <Schema data={collection} />
    </>
  );
}
