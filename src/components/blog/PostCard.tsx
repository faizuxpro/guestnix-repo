import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import type { Post } from "@/lib/blog/content";
import type { Author } from "@/lib/blog/authors";
import { CategoryChip } from "./CategoryChip";

export function PostCard({ post, author }: { post: Post; author: Author | null }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:border-neutral-300 hover:shadow-sm">
      <Link
        href={`/blog/${post.slug}`}
        className="block relative aspect-[16/9] overflow-hidden bg-neutral-100"
      >
        <Image
          src={post.coverImage}
          alt={post.coverAlt}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <CategoryChip slug={post.category} />
        </div>
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-neutral-900">
          <Link href={`/blog/${post.slug}`} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-neutral-600">{post.description}</p>
        <div className="mt-auto flex items-center gap-3 text-xs text-neutral-500">
          {author && (
            <div className="flex items-center gap-2">
              <Image
                src={author.avatar}
                alt={author.name}
                width={20}
                height={20}
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
