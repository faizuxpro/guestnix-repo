import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import type { Post } from "@/lib/blog/content";
import type { Author } from "@/lib/blog/authors";
import { CategoryChip } from "./CategoryChip";

export function FeaturedHero({ post, author }: { post: Post; author: Author | null }) {
  return (
    <article className="grid gap-8 lg:grid-cols-5 items-center">
      <Link
        href={`/blog/${post.slug}`}
        className="lg:col-span-3 relative aspect-[16/9] overflow-hidden rounded-2xl bg-neutral-100 group"
      >
        <Image
          src={post.coverImage}
          alt={post.coverAlt}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="lg:col-span-2 space-y-4">
        <CategoryChip slug={post.category} />
        <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-neutral-900">
          <Link href={`/blog/${post.slug}`} className="hover:underline">
            {post.title}
          </Link>
        </h2>
        <p className="text-lg text-neutral-600">{post.description}</p>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          {author && (
            <div className="flex items-center gap-2">
              <Image
                src={author.avatar}
                alt={author.name}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="font-medium text-neutral-700">{author.name}</span>
            </div>
          )}
          <span>·</span>
          <time dateTime={post.publishedAt.toISOString()}>
            {format(post.publishedAt, "MMM d, yyyy")}
          </time>
          <span>·</span>
          <span>{post.readingTime.minutes} min read</span>
        </div>
      </div>
    </article>
  );
}
