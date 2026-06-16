import Image from "next/image";
import { format } from "date-fns";
import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

import type { Post } from "@/lib/blog/content";
import type { Author } from "@/lib/blog/authors";

import { CategoryChip } from "../CategoryChip";
import { TagChips } from "../TagChips";
import { Breadcrumbs } from "../Breadcrumbs";
import { ShareBar } from "../ShareBar";
import { TableOfContents } from "../TableOfContents";
import { AuthorCard } from "../AuthorCard";
import { RelatedPosts } from "../RelatedPosts";
import { Schema } from "../Schema";
import { getCategory } from "@/lib/blog/taxonomy";
import { buildHowToJsonLd } from "@/lib/blog/jsonld";
import { CTA } from "../mdx/CTA";

export function GuidePost({
  post,
  author,
  authors,
  relatedPosts,
  url,
  headings,
  children,
}: {
  post: Post;
  author: Author;
  authors: Map<string, Author>;
  relatedPosts: Post[];
  url: string;
  headings: { name: string; text: string }[];
  children: ReactNode;
}) {
  const category = getCategory(post.category);
  const howTo = headings.length
    ? buildHowToJsonLd(
        post,
        headings.map((h) => ({ name: h.name, text: h.text })),
      )
    : null;

  return (
    <article className="pb-20">
      <div className="mx-auto max-w-4xl px-6 pt-8 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: category.name, href: `/blog/category/${post.category}` },
            { label: post.title },
          ]}
        />
      </div>

      <header className="mx-auto max-w-3xl px-6 pt-8 pb-6 text-center lg:px-8">
        <CategoryChip slug={post.category} className="mb-4" />
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--marketing-primary)]">
          <BookOpen className="h-4 w-4" />
          Guide · {post.readingTime.minutes} min read
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-neutral-900">
          {post.title}
        </h1>
        <p className="mt-4 text-xl text-neutral-600">{post.description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <Image
              src={author.avatar}
              alt={author.name}
              width={28}
              height={28}
              className="rounded-full"
            />
            <span className="font-medium text-neutral-800">{author.name}</span>
          </div>
          <span>·</span>
          <time dateTime={post.publishedAt.toISOString()}>
            {format(post.publishedAt, "MMM d, yyyy")}
          </time>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-neutral-100">
          <Image
            src={post.coverImage}
            alt={post.coverAlt}
            fill
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-12 px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-8">
            <TableOfContents />
            <div>
              <p className="mb-3 font-semibold uppercase tracking-wider text-xs text-neutral-500">
                Share
              </p>
              <ShareBar url={url} title={post.title} orientation="vertical" />
            </div>
          </div>
        </aside>
        <div className="prose prose-neutral max-w-none blog-prose">{children}</div>
      </div>

      <div className="mx-auto mt-16 max-w-3xl space-y-12 px-6 lg:px-8">
        <TagChips tags={post.tags} />
        <AuthorCard author={author} />
        <CTA
          heading="Ready to put this into practice?"
          body="Build your first guidebook in 10 minutes — free forever, no credit card."
          href="/signup"
          label="Start free"
          variant="gradient"
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <RelatedPosts posts={relatedPosts} authors={authors} />
      </div>

      {howTo && <Schema data={howTo} />}
    </article>
  );
}
