import sunsetLakehouse from "./sunset-lakehouse";
import modernMinimal from "./modern-minimal";
import cozyCabin from "./cozy-cabin";
import type { TemplateConfig } from "./sunset-lakehouse/index";

export type { TemplateConfig };

export const templates: TemplateConfig[] = [
  sunsetLakehouse,
  modernMinimal,
  cozyCabin,
];

export const templateMap = new Map(templates.map((t) => [t.id, t]));

export function getTemplate(id: string): TemplateConfig | undefined {
  return templateMap.get(id);
}
