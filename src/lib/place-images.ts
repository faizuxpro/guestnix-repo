const PLACE_IMAGE_TAG_KEYS = [
  "imageUrls",
  "placeImageUrls",
  "galleryImageUrls",
] as const;

type PlaceImageSource = {
  imageUrl?: string | null;
  tags?: Record<string, unknown> | null;
};

function toImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return null;
}

function urlsFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return toImageUrl(item);
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return (
        toImageUrl(record.url) ??
        toImageUrl(record.imageUrl) ??
        toImageUrl(record.src)
      );
    })
    .filter((url): url is string => Boolean(url));
}

export function normalizePlaceImageUrls(values: unknown[]): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const value of values) {
    const url = toImageUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls;
}

export function readPlaceImageUrls(place: PlaceImageSource): string[] {
  const values: unknown[] = [];
  const coverUrl = toImageUrl(place.imageUrl);
  if (coverUrl) values.push(coverUrl);

  const tags = place.tags ?? {};
  for (const key of PLACE_IMAGE_TAG_KEYS) {
    values.push(...urlsFromUnknown(tags[key]));
  }

  return normalizePlaceImageUrls(values);
}

export function mergePlaceImageTags(
  tags: Record<string, unknown> | null | undefined,
  imageUrls: unknown[]
): Record<string, unknown> {
  const next = { ...(tags ?? {}) };
  for (const key of PLACE_IMAGE_TAG_KEYS) {
    delete next[key];
  }

  const normalized = normalizePlaceImageUrls(imageUrls);
  if (normalized.length > 0) {
    next.imageUrls = normalized;
  }

  return next;
}
