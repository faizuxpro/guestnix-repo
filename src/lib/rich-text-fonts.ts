const GENERIC_FONT_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
]);

const FONT_FAMILY_DECLARATION =
  /font-family\s*:\s*((?:"[^"]*"|'[^']*'|&quot;[^;]*?&quot;|[^;])+)/gi;

export function extractFontFamiliesFromHtml(html: string | null | undefined) {
  if (!html) return [];

  const families = new Set<string>();
  const matches = html.matchAll(FONT_FAMILY_DECLARATION);

  for (const match of matches) {
    const family = firstCssFontFamily(decodeHtmlEntities(match[1]));
    if (family && !GENERIC_FONT_FAMILIES.has(family.toLowerCase())) {
      families.add(family);
    }
  }

  return [...families];
}

export function extractFontFamiliesFromBlocks(
  blocks: Array<{ content?: Record<string, unknown> | null }>
) {
  const families = new Set<string>();

  for (const block of blocks) {
    const html = block.content?.html;
    if (typeof html !== "string") continue;
    for (const family of extractFontFamiliesFromHtml(html)) {
      families.add(family);
    }
  }

  return [...families];
}

function firstCssFontFamily(value: string) {
  const first = value.split(",")[0]?.trim() ?? "";
  return first.replace(/^["']|["']$/g, "").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&");
}
