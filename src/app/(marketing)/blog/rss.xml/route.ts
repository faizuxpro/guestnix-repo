import { getAllPosts } from "@/lib/blog/content";
import { getAllAuthors } from "@/lib/blog/authors";
import { SITE } from "@/lib/seo/site";
import { getCategory } from "@/lib/blog/taxonomy";

export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [posts, authorsList] = await Promise.all([
    getAllPosts(),
    getAllAuthors(),
  ]);
  const authors = new Map(authorsList.map((a) => [a.slug, a]));
  const feedPosts = posts.slice(0, 20);

  const items = feedPosts
    .map((p) => {
      const author = authors.get(p.author);
      const category = getCategory(p.category);
      const url = `${SITE.url}/blog/${p.slug}`;
      return `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${p.publishedAt.toUTCString()}</pubDate>
      <dc:creator><![CDATA[${author?.name ?? "Guestnix"}]]></dc:creator>
      <category>${escapeXml(category.name)}</category>
      <description>${escapeXml(p.description)}</description>
      <enclosure url="${SITE.url}${p.coverImage}" type="image/jpeg" length="0" />
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)} Blog</title>
    <link>${SITE.url}/blog</link>
    <atom:link href="${SITE.url}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Hosting tips, product updates, and guides from the ${escapeXml(SITE.name)} team.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
