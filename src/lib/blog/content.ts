import fs from "node:fs/promises";
import path from "node:path";
import { PostFrontmatterSchema, type PostFrontmatter } from "./schema";
import { computeReadingTime, type ReadingTimeResult } from "./reading-time";
import type { CategorySlug } from "./taxonomy";
import { parseFrontmatter } from "./frontmatter";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");
const FILENAME_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

export type Post = PostFrontmatter & {
  slug: string;
  bodyMdx: string;
  readingTime: ReadingTimeResult;
};

let cache: Map<string, Post> | null = null;

async function readPostFile(fileName: string): Promise<Post | null> {
  const filePath = path.join(POSTS_DIR, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  const { data, content } = parseFrontmatter(raw);
  const parsed = PostFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid post frontmatter in ${filePath}: ${parsed.error.message}`,
    );
  }
  const derivedSlug = fileName.replace(/\.mdx$/, "").replace(FILENAME_DATE_PREFIX, "");
  const slug = parsed.data.slug ?? derivedSlug;
  return {
    ...parsed.data,
    slug,
    bodyMdx: content,
    readingTime: computeReadingTime(content),
  };
}

function isPublished(post: Post, now = new Date()): boolean {
  if (post.draft) return false;
  return post.publishedAt.getTime() <= now.getTime();
}

async function loadAllPosts(): Promise<Map<string, Post>> {
  if (cache) return cache;
  const map = new Map<string, Post>();
  let entries: string[];
  try {
    entries = await fs.readdir(POSTS_DIR);
  } catch {
    cache = map;
    return map;
  }
  for (const entry of entries) {
    if (!entry.endsWith(".mdx")) continue;
    const post = await readPostFile(entry);
    if (!post) continue;
    if (map.has(post.slug)) {
      throw new Error(`Duplicate post slug: ${post.slug}`);
    }
    map.set(post.slug, post);
  }
  cache = map;
  return map;
}

export async function getAllPosts(options: { includeDrafts?: boolean } = {}): Promise<Post[]> {
  const all = await loadAllPosts();
  const posts = [...all.values()];
  const filtered = options.includeDrafts ? posts : posts.filter((p) => isPublished(p));
  return filtered.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
}

export async function getPost(slug: string): Promise<Post | null> {
  const all = await loadAllPosts();
  const post = all.get(slug);
  if (!post || !isPublished(post)) return null;
  return post;
}

export async function getPostsByCategory(category: CategorySlug): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.category === category);
}

export async function getPostsByAuthor(authorSlug: string): Promise<Post[]> {
  const posts = await getAllPosts();
  return posts.filter((p) => p.author === authorSlug);
}

export async function getFeaturedPost(): Promise<Post | null> {
  const posts = await getAllPosts();
  const featured = posts.filter((p) => p.featured);
  return featured[0] ?? posts[0] ?? null;
}

export async function getAllPostSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  return posts.map((p) => p.slug);
}
