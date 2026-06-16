import DOMPurify from "isomorphic-dompurify";

const SVG_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_ATTR: ["data-iconify", "data-source"],
  // Keep SMIL animation tags so animated icons (line-md, svg-spinners, eos-icons,
  // material-symbols, etc.) stay animated after sanitization.
  ADD_TAGS: ["animate", "animateMotion", "animateTransform", "set", "mpath", "discard"],
  FORBID_TAGS: ["script", "foreignObject", "iframe", "object", "embed"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
  KEEP_CONTENT: false,
  RETURN_TRUSTED_TYPE: false,
};

export function sanitizeSvg(input: string): string {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed.startsWith("<svg")) return "";

  const clean = DOMPurify.sanitize(trimmed, SVG_CONFIG) as unknown as string;
  if (!clean.startsWith("<svg")) return "";
  return clean;
}

export function isSvgMarkup(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.trim().startsWith("<svg");
}
