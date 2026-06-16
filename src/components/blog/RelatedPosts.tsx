import type { Post } from "@/lib/blog/content";
import type { Author } from "@/lib/blog/authors";
import { PostCard } from "./PostCard";

export function RelatedPosts({
  posts,
  authors,
}: {
  posts: Post[];
  authors: Map<string, Author>;
}) {
  if (!posts.length) return null;
  return (
    <section className="mt-16">
      <h2 className="mb-6 text-2xl font-bold tracking-tight text-neutral-900">
        Related reading
      </h2>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <PostCard key={p.slug} post={p} author={authors.get(p.author) ?? null} />
        ))}
      </div>
    </section>
  );
}
