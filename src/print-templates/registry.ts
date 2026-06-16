import type { ComponentType } from "react";
import type { PrintGuidebookDocument } from "@/lib/print/normalize";
import { ClassicPrintTemplate } from "./classic/ClassicPrintTemplate";

export type PrintTemplateProps = {
  document: PrintGuidebookDocument;
};

export type PrintTemplateConfig = {
  id: string;
  name: string;
  description: string;
  Component: ComponentType<PrintTemplateProps>;
};

export const printTemplates: PrintTemplateConfig[] = [
  {
    id: "classic",
    name: "Classic binder",
    description: "A clean printable guidebook with cover, sections, links, and QR codes.",
    Component: ClassicPrintTemplate,
  },
];

export function getPrintTemplate(id: string | null | undefined) {
  return (
    printTemplates.find((template) => template.id === id) ?? printTemplates[0]
  );
}
