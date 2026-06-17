import type { BottomNavSlot } from "@/types/bottom-nav";
import { sunsetLakehouseV57SeedData } from "./v57-seed-data";

export type SeedBlock = {
  type: string;
  content: Record<string, unknown>;
  isVisible?: boolean;
};

export type SeedSection = {
  title: string;
  icon: string;
  isVisible?: boolean;
  kind?: "guide" | "featured";
  displayMode?: "popup" | "full_page" | "inline" | "drawer";
  itemSettings?: Record<string, unknown>;
  blocks: SeedBlock[];
};

export type SeedGuidebook = {
  branding: Record<string, unknown>;
  heroData?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  bottomNav: BottomNavSlot[];
  sections: SeedSection[];
};

export function buildSeedGuidebookSettings(
  seed: SeedGuidebook,
  sectionIds: string[],
  baseSettings: Record<string, unknown> = {}
): Record<string, unknown> {
  const contentUnits = seed.sections.reduce<Record<string, unknown>>(
    (acc, section, index) => {
      const sectionId = sectionIds[index];
      if (!sectionId) return acc;

      acc[sectionId] = {
        kind: section.kind ?? "guide",
        displayMode: section.displayMode ?? "popup",
        itemSettings: section.itemSettings ?? {},
      };

      return acc;
    },
    {}
  );

  return {
    ...baseSettings,
    ...(seed.settings ?? {}),
    content_units: contentUnits,
  };
}

export const sunsetLakehouseSeed =
  sunsetLakehouseV57SeedData as unknown as SeedGuidebook;

export const SEEDS_BY_TEMPLATE: Record<string, SeedGuidebook> = {
  "sunset-lakehouse": sunsetLakehouseSeed,
};
