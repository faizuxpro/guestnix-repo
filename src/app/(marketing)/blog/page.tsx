import type { Metadata } from "next";

import { getAllPosts, getFeaturedPost } from "@/lib/blog/content";
import { getAllAuthors } from "@/lib/blog/authors";
import { SITE } from "@/lib/seo/site";
import { buildBreadcrumbJsonLd, buildCollectionJsonLd } from "@/lib/blog/jsonld";

import { BlogSubNav } from "@/components/blog/BlogSubNav";
import { FeaturedHero } from "@/components/blog/FeaturedHero";
import { PostGrid } from "@/components/blog/PostGrid";
import { Pagination } from "@/components/blog/Pagination";
import { Schema } from "@/components/blog/Schema";
import { NewsletterSignup } from "@/components/blog/mdx/NewsletterSignup";

export const revalidate = 3600;

const POSTS_PER_PAGE = 12;

export const metadata: Metadata = {
  title: "Blog",
  description: "Hosting tips, product updates, and guides from the Guestnix team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: `${SITE.url}/blog`,
    title: `${SITE.name} Blog`,
    description: "Hosting tips, product updates, and guides from the Guestnix team.",
  },
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1"));

  const [allPosts, featured, authorsList] = await Promise.all([
    getAllPosts(),
    getFeaturedPost(),
    getAllAuthors(),
  ]);
  const authors = new Map(authorsList.map((a) => [a.slug, a]));

  const remaining = featured ? allPosts.filter((p) => p.slug !== featured.slug) : allPosts;

  const totalPages = Math.max(1, Math.ceil(remaining.length / POSTS_PER_PAGE));
  const start = (page - 1) * POSTS_PER_PAGE;
  const pagePosts = remaining.slice(start, start + POSTS_PER_PAGE);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE.url },
    { name: "Blog", url: `${SITE.url}/blog` },
  ]);
  const collection = buildCollectionJsonLd({
    url: `${SITE.url}/blog`,
    name: `${SITE.name} Blog`,
    description: "Hosting tips, product updates, and guides.",
    posts: allPosts,
  });

  return (
    <>
      <BlogSubNav />
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {page === 1 && featured && (
          <section className="mb-16">
            <FeaturedHero post={featured} author={authors.get(featured.author) ?? null} />
          </section>
        )}

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-neutral-900">
            {page === 1 ? "Latest posts" : `Page ${page}`}
          </h2>
          <PostGrid posts={pagePosts} authors={authors} />
          <Pagination basePath="/blog" page={page} totalPages={totalPages} />
        </section>

        <section className="my-20">
          <NewsletterSignup />
        </section>
      </div>

      <Schema data={breadcrumb} />
      <Schema data={collection} />
    </>
  );
}
