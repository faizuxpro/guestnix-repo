import Image from "next/image";
import { format } from "date-fns";
import type { ReactNode } from "react";

import type { Post } from "@/lib/blog/content";
import type { Author } from "@/lib/blog/authors";

import { CategoryChip } from "../CategoryChip";
import { TagChips } from "../TagChips";
import { Breadcrumbs } from "../Breadcrumbs";
import { ShareBar } from "../ShareBar";
import { AuthorCard } from "../AuthorCard";
import { RelatedPosts } from "../RelatedPosts";
import { getCategory } from "@/lib/blog/taxonomy";
import { CTA } from "../mdx/CTA";

export function ListiclePost({
  post,
  author,
  authors,
  relatedPosts,
  url,
  children,
}: {
  post: Post;
  author: Author;
  authors: Map<string, Author>;
  relatedPosts: Post[];
  url: string;
  children: ReactNode;
}) {
  const category = getCategory(post.category);
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

      <header className="mx-auto max-w-3xl px-6 pt-8 pb-10 text-center lg:px-8">
        <CategoryChip slug={post.category} className="mb-4" />
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
          <span>·</span>
          <span>{post.readingTime.minutes} min read</span>
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

      <div className="mx-auto mt-12 max-w-3xl px-6 lg:px-8">
        <div className="prose prose-neutral max-w-none blog-prose listicle-prose">{children}</div>
      </div>

      <div className="mx-auto mt-16 max-w-3xl space-y-12 px-6 lg:px-8">
        <TagChips tags={post.tags} />
        <div className="flex justify-center">
          <ShareBar url={url} title={post.title} />
        </div>
        <AuthorCard author={author} />
        <CTA
          heading="Your guidebook, built in minutes."
          body="Guestnix turns everything on this list into a beautiful digital guide your guests actually use."
          href="/signup"
          label="Start free"
          variant="gradient"
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <RelatedPosts posts={relatedPosts} authors={authors} />
      </div>
    </article>
  );
}
