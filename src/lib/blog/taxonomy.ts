export const CATEGORIES = {
  "hosting-tips": {
    name: "Hosting Tips",
    description: "Practical advice for short-term rental hosts.",
    accent: "#131b2e",
  },
  "product": {
    name: "Product",
    description: "Guestnix updates, releases, and behind-the-scenes.",
    accent: "#b90538",
  },
  "guides": {
    name: "Guides",
    description: "Step-by-step tutorials for better guest experiences.",
    accent: "#565e74",
  },
  "case-studies": {
    name: "Case Studies",
    description: "Real stories from real hosts using Guestnix.",
    accent: "#2d3133",
  },
} as const;

export type CategorySlug = keyof typeof CATEGORIES;
export const CATEGORY_SLUGS = Object.keys(CATEGORIES) as CategorySlug[];

export function isCategorySlug(slug: string): slug is CategorySlug {
  return slug in CATEGORIES;
}

export function getCategory(slug: CategorySlug) {
  return CATEGORIES[slug];
}
