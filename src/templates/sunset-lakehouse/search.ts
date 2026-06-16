"use client";

import { formatFullAddress } from "@/lib/hero-data";
import { nearbyCategoryMeta } from "@/lib/nearby-categories";
import {
  extractNearbyEnrichedData,
  mergePlaceContact,
} from "@/lib/nearby-enriched";
import { formatStoreMoney, getPublicStorefrontItems } from "@/lib/store/public";
import type { SnapshotStorefront } from "@/lib/store/types";
import type {
  TemplateBlock,
  TemplateGuidebook,
  TemplatePlace,
  TemplateSection,
} from "./types";

export type GuidebookSearchTargetType =
  | "home"
  | "host"
  | "section"
  | "block"
  | "place"
  | "store";

export type GuidebookSearchItem = {
  id: string;
  type: GuidebookSearchTargetType;
  title: string;
  subtitle: string;
  text: string;
  sectionId?: string;
  blockId?: string;
  placeId?: string;
  storeItemId?: string;
};

export type GuidebookSearchResult = GuidebookSearchItem & {
  snippet: string;
  score: number;
};

type BuildInput = {
  guidebook: TemplateGuidebook;
  sections: TemplateSection[];
  places: TemplatePlace[];
  storefront?: SnapshotStorefront | null;
};

const MEDIA_KEYS = new Set([
  "url",
  "image_url",
  "imageUrl",
  "cover_image_url",
  "avatar_url",
  "logo_url",
]);

export function buildGuidebookSearchItems({
  guidebook,
  sections,
  places,
  storefront,
}: BuildInput): GuidebookSearchItem[] {
  const items: GuidebookSearchItem[] = [];
  const hero = guidebook.heroData;
  const propertyAddress = formatFullAddress(hero.property);

  const homeParts = cleanParts([
    hero.property.name,
    hero.home.show.subtitle ? hero.property.tagline : "",
    hero.home.show.host_name && hero.host.name
      ? `${hero.home.host_label || "Hosted by"} ${hero.host.name}`
      : "",
    hero.home.show.phone ? hero.host.phone : "",
    hero.home.show.email ? hero.host.email : "",
    hero.home.show.address ? propertyAddress : "",
    hero.home.show.times
      ? `Check-in ${hero.home.times.checkin_time || "4:00 PM"} Check-out ${
          hero.home.times.checkout_time || "11:00 AM"
        }`
      : "",
  ]);

  if (homeParts.length > 0) {
    items.push({
      id: "home",
      type: "home",
      title: "Home",
      subtitle: "Welcome screen",
      text: homeParts.join(" "),
    });
  }

  const hostSocial = hero.host_page.show.social
    ? hero.host.social.flatMap((social) => [social.label, social.url])
    : [];
  const hostParts = cleanParts([
    hero.host.name,
    hero.host_page.show.bio ? hero.host.bio : "",
    hero.host_page.show.languages ? hero.host.languages : "",
    hero.host_page.show.superhost && hero.host.superhost ? "Superhost" : "",
    hero.host_page.show.phone ? hero.host.phone : "",
    hero.host_page.show.email ? hero.host.email : "",
    hero.host_page.show.address ? propertyAddress : "",
    ...hostSocial,
  ]);

  if (hostParts.length > 0) {
    items.push({
      id: "host",
      type: "host",
      title: "Meet Host",
      subtitle: "Host page",
      text: hostParts.join(" "),
    });
  }

  for (const section of sections) {
    if (!section.isVisible) continue;

    const title = section.title?.trim() || "Untitled section";
    items.push({
      id: `section-${section.id}`,
      type: "section",
      title,
      subtitle: "Guide section",
      text: title,
      sectionId: section.id,
    });

    for (const block of section.blocks) {
      if (!block.isVisible) continue;
      const parts = cleanParts(collectBlockSearchText(block.content));
      if (parts.length === 0) continue;

      const blockLabel = getBlockLabel(block, parts);
      items.push({
        id: `block-${block.id}`,
        type: "block",
        title: blockLabel ? `${title}: ${blockLabel}` : title,
        subtitle: "Guide content",
        text: `${title} ${parts.join(" ")}`,
        sectionId: section.id,
        blockId: block.id,
      });
    }
  }

  for (const place of places) {
    const enriched = extractNearbyEnrichedData(place.tags);
    const merged = mergePlaceContact(place, enriched);
    const categoryLabel = nearbyCategoryMeta(place.category).label;
    const placeParts = cleanParts([
      place.name,
      categoryLabel,
      place.category,
      place.description,
      merged.address,
      merged.phone,
      merged.email,
      merged.website,
      merged.openingHours,
      enriched.cuisine,
      ...enriched.extraInfo.map((item) => item.text),
      ...enriched.tags,
      ...collectSearchText(place.tags),
    ]);

    if (placeParts.length === 0) continue;
    items.push({
      id: `place-${place.id}`,
      type: "place",
      title: place.name || "Nearby place",
      subtitle: `Nearby - ${categoryLabel}`,
      text: placeParts.join(" "),
      placeId: place.id,
    });
  }

  const storeItems = getPublicStorefrontItems(storefront);
  if (storeItems.length > 0) {
    const intro = storefront?.intro;
    const introParts = cleanParts(
      intro?.enabled
        ? [intro.eyebrow, intro.title, intro.subtitle]
        : []
    );

    if (introParts.length > 0) {
      items.push({
        id: "store",
        type: "store",
        title: intro?.title?.trim() || "Store",
        subtitle: "Store page",
        text: `Store ${introParts.join(" ")}`,
      });
    }

    for (const item of storeItems) {
      const priceLabel = formatStoreMoney(item.priceCents, item.currency);
      const storeParts = cleanParts([
        item.name,
        item.description,
        item.category,
        item.itemType,
        item.unitLabel,
        priceLabel,
        item.currency,
        item.maxQuantity ? `Limit ${item.maxQuantity}` : "",
      ]);

      if (storeParts.length === 0) continue;
      items.push({
        id: `store-item-${item.id}`,
        type: "store",
        title: item.name || "Store item",
        subtitle: item.category ? `Store - ${item.category}` : "Store item",
        text: `Store ${storeParts.join(" ")}`,
        storeItemId: item.id,
      });
    }
  }

  return dedupeSearchItems(items);
}

function collectBlockSearchText(content: Record<string, unknown>): string[] {
  if (content.variant !== "callout") return collectSearchText(content);

  const callout =
    typeof content.callout === "object" && content.callout !== null
      ? (content.callout as Record<string, unknown>)
      : {};
  const html = typeof content.html === "string" ? content.html : "";
  const bodyEnabled =
    typeof callout.body_enabled === "boolean"
      ? callout.body_enabled
      : html.trim().length > 0;
  const actionEnabled =
    typeof callout.cta_enabled === "boolean"
      ? callout.cta_enabled
      : typeof callout.action_label === "string" &&
        callout.action_label.trim().length > 0;

  return [
    ...collectSearchText(callout.title),
    ...collectSearchText(callout.subtitle),
    ...(actionEnabled ? collectSearchText(callout.action_label) : []),
    ...(bodyEnabled ? collectSearchText(html) : []),
  ];
}

export function searchGuidebookItems(
  items: GuidebookSearchItem[],
  query: string,
  limit = 10
): GuidebookSearchResult[] {
  const q = normalizeSearchText(query);
  if (q.length < 2) return [];

  const terms = q.split(/\s+/).filter(Boolean);
  const results: GuidebookSearchResult[] = [];

  for (const item of items) {
    const title = normalizeSearchText(item.title);
    const subtitle = normalizeSearchText(item.subtitle);
    const text = normalizeSearchText(item.text);
    const haystack = `${title} ${subtitle} ${text}`;
    const phraseIndex = haystack.indexOf(q);
    const termMatchCount = terms.filter((term) => haystack.includes(term)).length;
    const matches = phraseIndex !== -1 || termMatchCount === terms.length;
    if (!matches) continue;

    const titleMatch = title.includes(q);
    const subtitleMatch = subtitle.includes(q);
    const score =
      (titleMatch ? 80 : 0) +
      (subtitleMatch ? 24 : 0) +
      (phraseIndex !== -1 ? 40 : termMatchCount * 8) -
      Math.min(20, Math.max(0, phraseIndex));

    results.push({
      ...item,
      snippet: getContextSnippet(item.text, query, terms, 108),
      score,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

function collectSearchText(value: unknown, key?: string): string[] {
  if (value == null) return [];
  if (key && MEDIA_KEYS.has(key)) return [];

  if (typeof value === "string") {
    if (value.length > 400 && looksLikeMediaUrl(value)) return [];
    return [stripHtml(value)];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSearchText(item));
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([childKey, childValue]) => collectSearchText(childValue, childKey)
    );
  }

  return [];
}

function getBlockLabel(block: TemplateBlock, fallbackParts: string[]) {
  const content = block.content ?? {};
  const preferred = [
    content.text,
    content.label,
    content.title,
    content.question,
    Array.isArray(content.items) &&
    typeof content.items[0] === "object" &&
    content.items[0] !== null
      ? (content.items[0] as Record<string, unknown>).question
      : "",
    fallbackParts[0],
  ];

  const label = preferred.find((part) => typeof part === "string" && part.trim());
  return truncate(String(label ?? ""), 42);
}

function getContextSnippet(
  text: string,
  query: string,
  terms: string[],
  maxLength: number
): string {
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);
  const firstTerm = terms.find((term) => normalizedText.includes(term)) ?? "";
  const match = normalizedText.indexOf(normalizedQuery);
  const index = match >= 0 ? match : normalizedText.indexOf(firstTerm);

  if (index < 0) return truncate(text, maxLength);

  const half = Math.floor(maxLength / 2);
  const start = Math.max(0, index - half);
  const end = Math.min(text.length, index + normalizedQuery.length + half);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function cleanParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const part of parts) {
    const value = String(part ?? "").replace(/\s+/g, " ").trim();
    if (!value) continue;
    const normalized = normalizeSearchText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    clean.push(value);
  }

  return clean;
}

function dedupeSearchItems(items: GuidebookSearchItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}:${item.sectionId ?? ""}:${item.blockId ?? ""}:${
      item.placeId ?? ""
    }:${item.storeItemId ?? ""}:${normalizeSearchText(
      item.title
    )}:${normalizeSearchText(item.text)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearchText(value: string) {
  return stripHtml(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeMediaUrl(value: string) {
  return (
    /^data:image\//i.test(value) ||
    /\.(avif|gif|jpe?g|png|svg|webp)(\?|#|$)/i.test(value)
  );
}

function truncate(value: string, maxLength: number) {
  const clean = stripHtml(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}
