"use client";

import type { GalleryContent } from "../types";

type GalleryLayout = "slider" | "grid" | "masonry";

type GalleryImage = {
  url: string;
  alt: string;
  caption: string;
};

function readLayout(content: Partial<GalleryContent>): GalleryLayout {
  if (content.layout === "slider" || content.layout === "masonry") {
    return content.layout;
  }
  return "grid";
}

function readImages(content: Partial<GalleryContent>): GalleryImage[] {
  const source = Array.isArray(content.images) ? content.images : [];
  return source
    .map((item) => ({
      url: typeof item?.url === "string" ? item.url : "",
      alt: typeof item?.alt === "string" ? item.alt : "",
      caption: typeof item?.caption === "string" ? item.caption : "",
    }))
    .filter((image) => Boolean(image.url));
}

export function GalleryBlock({ content }: { content: Partial<GalleryContent> }) {
  const images = readImages(content);
  if (images.length === 0) return null;

  const layout = readLayout(content);

  if (layout === "slider") {
    return (
      <div className="sl-gallery-slider">
        {images.map((image, index) => (
          <figure key={`${image.url}-${index}`} className="sl-gallery-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt || ""} loading="lazy" />
            {image.caption ? <figcaption>{image.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    );
  }

  if (layout === "masonry") {
    return (
      <div className="sl-gallery-masonry">
        {images.map((image, index) => (
          <figure key={`${image.url}-${index}`} className="sl-gallery-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt || ""} loading="lazy" />
            {image.caption ? <figcaption>{image.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    );
  }

  return (
    <div className="sl-gallery-grid">
      {images.map((image, index) => (
        <figure key={`${image.url}-${index}`} className="sl-gallery-item">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.alt || ""} loading="lazy" />
          {image.caption ? <figcaption>{image.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

