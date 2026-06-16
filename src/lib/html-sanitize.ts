import DOMPurify from "isomorphic-dompurify";

const COMMON_FORBID_TAGS = [
  "script",
  "object",
  "embed",
  "base",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "meta",
  "link",
];

const COMMON_FORBID_ATTR = [
  "onabort",
  "onblur",
  "onchange",
  "onclick",
  "onerror",
  "onfocus",
  "onload",
  "onmouseover",
  "onsubmit",
];

const URI_REGEXP =
  /^(?:(?:https?|mailto|tel):|\/(?!\/)|#|\?|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i;

const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    "a",
    "blockquote",
    "br",
    "code",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "li",
    "ol",
    "p",
    "pre",
    "s",
    "span",
    "strong",
    "u",
    "ul",
  ],
  ALLOWED_ATTR: ["href", "rel", "style", "target"],
  FORBID_TAGS: COMMON_FORBID_TAGS,
  FORBID_ATTR: COMMON_FORBID_ATTR,
  ALLOWED_URI_REGEXP: URI_REGEXP,
};

const CUSTOM_HTML_CONFIG = {
  ADD_TAGS: ["iframe"],
  ADD_ATTR: [
    "allow",
    "allowfullscreen",
    "class",
    "frameborder",
    "height",
    "loading",
    "referrerpolicy",
    "rel",
    "scrolling",
    "style",
    "target",
    "width",
  ],
  FORBID_TAGS: COMMON_FORBID_TAGS,
  FORBID_ATTR: COMMON_FORBID_ATTR,
  ALLOWED_URI_REGEXP: URI_REGEXP,
};

function sanitize(value: string, config: Record<string, unknown>) {
  return DOMPurify.sanitize(value, config) as unknown as string;
}

export function sanitizeRichTextHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return sanitize(value, RICH_TEXT_CONFIG);
}

export function sanitizeCustomHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return sanitize(value, CUSTOM_HTML_CONFIG);
}

export function sanitizeBlockContentHtml(
  blockType: string,
  content: Record<string, unknown>
): Record<string, unknown> {
  const visit = (value: unknown, key?: string): unknown => {
    if (typeof value === "string" && key === "html") {
      return blockType === "custom_html"
        ? sanitizeCustomHtml(value)
        : sanitizeRichTextHtml(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => visit(item));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(
          ([childKey, childValue]) => [childKey, visit(childValue, childKey)]
        )
      );
    }
    return value;
  };

  return visit(content) as Record<string, unknown>;
}
