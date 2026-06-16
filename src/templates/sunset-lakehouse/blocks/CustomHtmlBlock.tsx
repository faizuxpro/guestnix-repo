"use client";

import { useMemo } from "react";
import { sanitizeCustomHtml } from "@/lib/html-sanitize";
import type { CustomHtmlContent } from "../types";

function readHtml(content: Partial<CustomHtmlContent>): string {
  return typeof content.html === "string" ? content.html.trim() : "";
}

export function CustomHtmlBlock({
  content,
}: {
  content: Partial<CustomHtmlContent>;
}) {
  const html = readHtml(content);
  const clean = useMemo(
    () => sanitizeCustomHtml(html),
    [html]
  );

  if (!clean) return null;

  return (
    <div
      className="sl-custom-html"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
