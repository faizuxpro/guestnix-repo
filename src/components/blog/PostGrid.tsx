import type { Post } from "@/lib/blog/content";
import type { Author } from "@/lib/blog/authors";
import { PostCard } from "./PostCard";

export function PostGrid({
  posts,
  authors,
}: {
  posts: Post[];
  authors: Map<string, Author>;
}) {
  if (!posts.length) {
    return (
      <p className="py-12 text-center text-neutral-500">No posts yet. Check back soon.</p>
    );
  }
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <PostCard key={p.slug} post={p} author={authors.get(p.author) ?? null} />
      ))}
    </div>
  );
}
