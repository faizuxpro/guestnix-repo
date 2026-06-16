import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getAllAuthors, getAuthor } from "@/lib/blog/authors";
import { getPostsByAuthor } from "@/lib/blog/content";
import { SITE } from "@/lib/seo/site";
import {
  buildBreadcrumbJsonLd,
  buildCollectionJsonLd,
  buildPersonJsonLd,
} from "@/lib/blog/jsonld";

import { BlogSubNav } from "@/components/blog/BlogSubNav";
import { PostGrid } from "@/components/blog/PostGrid";
import { Pagination } from "@/components/blog/Pagination";
import { Breadcrumbs } from "@/components/blog/Breadcrumbs";
import { Schema } from "@/components/blog/Schema";

export const revalidate = 3600;
const POSTS_PER_PAGE = 12;

export async function generateStaticParams() {
  const authors = await getAllAuthors();
  return authors.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return {};
  return {
    title: author.name,
    description: author.bio,
    alternates: { canonical: `/blog/author/${slug}` },
    openGraph: {
      type: "profile",
      url: `${SITE.url}/blog/author/${slug}`,
      title: `${author.name} | ${SITE.name} Blog`,
      description: author.bio,
      images: [{ url: `${SITE.url}${author.avatar}` }],
    },
  };
}

export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1"));

  const [posts, authorsList] = await Promise.all([
    getPostsByAuthor(slug),
    getAllAuthors(),
  ]);
  const authors = new Map(authorsList.map((a) => [a.slug, a]));

  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const start = (page - 1) * POSTS_PER_PAGE;
  const pagePosts = posts.slice(start, start + POSTS_PER_PAGE);

  const url = `${SITE.url}/blog/author/${slug}`;
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE.url },
    { name: "Blog", url: `${SITE.url}/blog` },
    { name: author.name, url },
  ]);
  const person = buildPersonJsonLd(author);
  const collection = buildCollectionJsonLd({
    url,
    name: `Posts by ${author.name}`,
    description: author.bio,
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
            { label: author.name },
          ]}
        />
        <header className="mt-6 mb-12 flex flex-col items-center text-center">
          <Image
            src={author.avatar}
            alt={author.name}
            width={96}
            height={96}
            className="rounded-full"
          />
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-neutral-900">
            {author.name}
          </h1>
          <p className="text-neutral-500">{author.role}</p>
          <p className="mt-4 max-w-2xl text-neutral-700">{author.bio}</p>
        </header>
        <PostGrid posts={pagePosts} authors={authors} />
        <Pagination
          basePath={`/blog/author/${slug}`}
          page={page}
          totalPages={totalPages}
        />
      </div>
      <Schema data={breadcrumb} />
      <Schema data={person} />
      <Schema data={collection} />
    </>
  );
}
