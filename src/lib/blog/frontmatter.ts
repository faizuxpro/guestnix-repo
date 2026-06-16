import { load as loadYaml } from "js-yaml";

export type FrontmatterResult = {
  data: unknown;
  content: string;
};

const FRONTMATTER_BOUNDARY = /^\uFEFF?\s*---\s*\r?\n/;

export function parseFrontmatter(raw: string): FrontmatterResult {
  if (!FRONTMATTER_BOUNDARY.test(raw)) {
    return { data: {}, content: raw };
  }

  const bodyStart = raw.match(FRONTMATTER_BOUNDARY)?.[0].length ?? 0;
  const closingMatch = /\r?\n---\s*(?:\r?\n|$)/.exec(raw.slice(bodyStart));
  if (!closingMatch) {
    return { data: {}, content: raw };
  }

  const frontmatter = raw.slice(bodyStart, bodyStart + closingMatch.index);
  const contentStart = bodyStart + closingMatch.index + closingMatch[0].length;
  return {
    data: loadYaml(frontmatter) ?? {},
    content: raw.slice(contentStart),
  };
}
