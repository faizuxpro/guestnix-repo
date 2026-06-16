const ICONIFY_API = "https://api.iconify.design";

export type IconifySearchResult = {
  icons: string[];
  total: number;
  limit: number;
  start: number;
  collections: Record<string, IconifyCollectionSummary>;
};

export type IconifyCollectionSummary = {
  name: string;
  total?: number;
  author?: { name: string; url?: string };
  license?: { title: string; spdx?: string; url?: string };
  samples?: string[];
  category?: string;
  palette?: boolean;
  height?: number;
};

export type IconifyCollectionsMap = Record<string, IconifyCollectionSummary>;

export async function searchIconify(params: {
  query: string;
  limit?: number;
  start?: number;
  prefixes?: string[];
  signal?: AbortSignal;
}): Promise<IconifySearchResult> {
  const { query, limit = 64, start = 0, prefixes, signal } = params;
  const url = new URL(`${ICONIFY_API}/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  if (start > 0) url.searchParams.set("start", String(start));
  if (prefixes && prefixes.length > 0) {
    url.searchParams.set("prefixes", prefixes.join(","));
  }

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Iconify search failed (${res.status})`);
  return (await res.json()) as IconifySearchResult;
}

export async function listIconifyCollections(signal?: AbortSignal): Promise<IconifyCollectionsMap> {
  const res = await fetch(`${ICONIFY_API}/collections`, { signal });
  if (!res.ok) throw new Error(`Iconify collections failed (${res.status})`);
  return (await res.json()) as IconifyCollectionsMap;
}

export type IconifyCollection = {
  prefix: string;
  total: number;
  title: string;
  /** All icon names in the set (flat list — uncategorized + categories merged). */
  icons: string[];
  /** Category → icon names. Empty if the set has no categories. */
  categories: Record<string, string[]>;
};

type RawCollectionResponse = {
  prefix?: string;
  total?: number;
  title?: string;
  uncategorized?: string[];
  categories?: Record<string, string[]>;
  hidden?: string[];
};

/**
 * Fetch the full icon list for a single Iconify set. Lets callers browse every
 * icon in (e.g.) Phosphor's ~9,000 icons rather than the ~999 search cap.
 */
export async function fetchIconifyCollection(
  prefix: string,
  signal?: AbortSignal
): Promise<IconifyCollection> {
  const url = new URL(`${ICONIFY_API}/collection`);
  url.searchParams.set("prefix", prefix);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Iconify collection fetch failed (${res.status})`);
  const data = (await res.json()) as RawCollectionResponse;

  const categories = data.categories ?? {};
  const seen = new Set<string>();
  const flat: string[] = [];
  const push = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    flat.push(name);
  };
  if (Array.isArray(data.uncategorized)) data.uncategorized.forEach(push);
  for (const list of Object.values(categories)) list.forEach(push);

  return {
    prefix,
    title: data.title ?? prefix,
    total: data.total ?? flat.length,
    icons: flat,
    categories,
  };
}

export async function fetchIconifySvg(id: string, signal?: AbortSignal): Promise<string> {
  const [prefix, name] = id.split(":");
  if (!prefix || !name) throw new Error(`Invalid icon id: ${id}`);
  const url = `${ICONIFY_API}/${prefix}/${name}.svg?color=currentColor`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Iconify svg fetch failed (${res.status})`);
  const text = await res.text();
  return injectIconifyMeta(text, id);
}

export function injectIconifyMeta(svg: string, iconifyId: string): string {
  if (!svg.startsWith("<svg")) return svg;
  const end = svg.indexOf(">");
  if (end === -1) return svg;
  const head = svg.slice(0, end);
  if (head.includes("data-iconify=")) return svg;
  return `${head} data-iconify="${iconifyId}" data-source="iconify"${svg.slice(end)}`;
}

export function getIconifyMeta(svg: string): { iconifyId: string | null; source: string | null } {
  const idMatch = svg.match(/data-iconify="([^"]+)"/);
  const srcMatch = svg.match(/data-source="([^"]+)"/);
  return {
    iconifyId: idMatch ? idMatch[1] : null,
    source: srcMatch ? srcMatch[1] : null,
  };
}
