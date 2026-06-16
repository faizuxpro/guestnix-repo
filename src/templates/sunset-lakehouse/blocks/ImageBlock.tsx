"use client";

import type { ImageContent } from "../types";

function readFrame(content: Partial<ImageContent>): "none" | "card" | "soft" {
  if (content.frame === "none" || content.frame === "soft") {
    return content.frame;
  }
  return "card";
}

function readRatio(
  content: Partial<ImageContent>
): "auto" | "16/9" | "4/3" | "3/2" | "1/1" {
  const ratio = content.ratio;
  if (
    ratio === "auto" ||
    ratio === "16/9" ||
    ratio === "3/2" ||
    ratio === "1/1"
  ) {
    return ratio;
  }
  return "4/3";
}

export function ImageBlock({ content }: { content: Partial<ImageContent> }) {
  const url = content.url;
  if (!url) return null;
  const fit = content.fit ?? "cover";
  const frame = readFrame(content);
  const ratio = readRatio(content);

  return (
    <figure className="sl-image" data-frame={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={content.alt || ""}
        style={{
          objectFit: fit,
          ...(ratio !== "auto" ? { aspectRatio: ratio } : {}),
        }}
      />
      {content.caption && <figcaption>{content.caption}</figcaption>}
    </figure>
  );
}
