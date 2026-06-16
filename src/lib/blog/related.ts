import type { Post } from "./content";
import { getPostsByCategory } from "./content";

export async function getRelatedPosts(post: Post, count = 3): Promise<Post[]> {
  const sameCategory = await getPostsByCategory(post.category);
  return sameCategory.filter((p) => p.slug !== post.slug).slice(0, count);
}
