import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog/content";
import { getAllAuthors } from "@/lib/blog/authors";
import { CATEGORY_SLUGS } from "@/lib/blog/taxonomy";
import { SITE } from "@/lib/seo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, authors] = await Promise.all([
    getAllPosts(),
    getAllAuthors(),
  ]);

  const base = SITE.url;
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, priority: 1.0 },
    { url: `${base}/pricing`, lastModified: now, priority: 0.9 },
    { url: `${base}/blog`, lastModified: now, priority: 0.9 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((c) => ({
    url: `${base}/blog/category/${c}`,
    lastModified: now,
    priority: 0.6,
  }));

  const authorEntries: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${base}/blog/author/${a.slug}`,
    lastModified: now,
    priority: 0.5,
  }));

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updatedAt ?? p.publishedAt,
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries, ...categoryEntries, ...authorEntries];
}
