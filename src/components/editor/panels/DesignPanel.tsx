"use client";

import { BrandTab } from "../design/BrandTab";
import { TypographyTab } from "../design/TypographyTab";
import { SizingTab } from "../design/SizingTab";
import { LuckyTab } from "../design/LuckyTab";
import type { EditorDesignSubmenu } from "../editor-menu";

type Props = {
  mode: EditorDesignSubmenu;
};

export function DesignPanel({ mode }: Props) {
  return (
    <>
      {mode === "lucky" && <LuckyTab />}
      {mode === "brand" && <BrandTab />}
      {mode === "typography" && <TypographyTab />}
      {mode === "sizing" && <SizingTab />}
    </>
  );
}
