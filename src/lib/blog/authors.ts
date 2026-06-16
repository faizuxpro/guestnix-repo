import fs from "node:fs/promises";
import path from "node:path";
import { AuthorFrontmatterSchema, type AuthorFrontmatter } from "./schema";
import { parseFrontmatter } from "./frontmatter";

const AUTHORS_DIR = path.join(process.cwd(), "content", "authors");

export type Author = AuthorFrontmatter & {
  slug: string;
  bodyMdx: string;
};

async function readAuthorFile(slug: string): Promise<Author | null> {
  const filePath = path.join(AUTHORS_DIR, `${slug}.mdx`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  const { data, content } = parseFrontmatter(raw);
  const parsed = AuthorFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid author frontmatter in ${filePath}: ${parsed.error.message}`,
    );
  }
  return { ...parsed.data, slug, bodyMdx: content };
}

let cache: Map<string, Author> | null = null;

async function loadAllAuthors(): Promise<Map<string, Author>> {
  if (cache) return cache;
  const map = new Map<string, Author>();
  let entries: string[];
  try {
    entries = await fs.readdir(AUTHORS_DIR);
  } catch {
    cache = map;
    return map;
  }
  for (const entry of entries) {
    if (!entry.endsWith(".mdx")) continue;
    const slug = entry.replace(/\.mdx$/, "");
    const author = await readAuthorFile(slug);
    if (author) map.set(slug, author);
  }
  cache = map;
  return map;
}

export async function getAuthor(slug: string): Promise<Author | null> {
  const all = await loadAllAuthors();
  return all.get(slug) ?? null;
}

export async function getAllAuthors(): Promise<Author[]> {
  const all = await loadAllAuthors();
  return [...all.values()];
}

export async function requireAuthor(slug: string): Promise<Author> {
  const author = await getAuthor(slug);
  if (!author) throw new Error(`Author not found: ${slug}`);
  return author;
}
