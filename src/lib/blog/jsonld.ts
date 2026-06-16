import { SITE } from "@/lib/seo/site";
import { getOrganizationJsonLd } from "@/lib/seo/organization";
import { getCategory } from "./taxonomy";
import type { Post } from "./content";
import type { Author } from "./authors";

type Crumb = { name: string; url: string };

export function buildBreadcrumbJsonLd(trail: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function buildPersonJsonLd(author: Author) {
  const sameAs: string[] = [];
  if (author.twitter) sameAs.push(`https://twitter.com/${author.twitter}`);
  if (author.linkedin) sameAs.push(`https://www.linkedin.com/in/${author.linkedin}`);
  if (author.website) sameAs.push(author.website);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE.url}/blog/author/${author.slug}`,
    name: author.name,
    jobTitle: author.role,
    image: `${SITE.url}${author.avatar}`,
    description: author.bio,
    url: `${SITE.url}/blog/author/${author.slug}`,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function buildArticleJsonLd(post: Post, author: Author) {
  const category = getCategory(post.category);
  const url = `${SITE.url}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: [`${SITE.url}${post.coverImage}`, `${url}/opengraph-image`],
    datePublished: post.publishedAt.toISOString(),
    dateModified: (post.updatedAt ?? post.publishedAt).toISOString(),
    author: buildPersonJsonLd(author),
    publisher: getOrganizationJsonLd(),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: category.name,
    keywords: post.tags,
    wordCount: post.readingTime.words,
    url,
  };
}

export function buildCollectionJsonLd(params: {
  url: string;
  name: string;
  description: string;
  posts: Post[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: params.name,
    description: params.description,
    url: params.url,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: params.posts.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE.url}/blog/${p.slug}`,
        name: p.title,
      })),
    },
  };
}

export function buildFaqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

export function buildHowToJsonLd(post: Post, steps: { name: string; text: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: post.title,
    description: post.description,
    image: `${SITE.url}${post.coverImage}`,
    totalTime: `PT${post.readingTime.minutes}M`,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
