import { z } from "zod";
import { CATEGORY_SLUGS, type CategorySlug } from "./taxonomy";

const SLUG_REGEX = /^[a-z0-9-]+$/;

export const PostTemplateSchema = z.enum(["standard", "guide", "listicle", "case-study"]);
export type PostTemplate = z.infer<typeof PostTemplateSchema>;

export const PostFrontmatterSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(200),
  slug: z.string().regex(SLUG_REGEX).optional(),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  author: z.string().regex(SLUG_REGEX),
  category: z.enum(CATEGORY_SLUGS as [CategorySlug, ...CategorySlug[]]),
  tags: z.array(z.string()).default([]),
  coverImage: z.string().startsWith("/"),
  coverAlt: z.string().min(1),
  template: PostTemplateSchema.default("standard"),
  draft: z.boolean().default(false),
  featured: z.boolean().default(false),
});

export type PostFrontmatter = z.infer<typeof PostFrontmatterSchema>;

export const AuthorFrontmatterSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  avatar: z.string().startsWith("/"),
  bio: z.string().min(1).max(500),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().url().optional(),
});

export type AuthorFrontmatter = z.infer<typeof AuthorFrontmatterSchema>;
