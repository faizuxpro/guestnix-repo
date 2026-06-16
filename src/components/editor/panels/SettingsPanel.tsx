"use client";

import { FeaturesPanel } from "../settings/FeaturesPanel";
import { LanguagesPanel } from "../settings/LanguagesPanel";
import { LoaderPanel } from "../settings/LoaderPanel";
import type { EditorSettingsSubmenu } from "../editor-menu";

type Props = {
  mode: EditorSettingsSubmenu;
};

export function SettingsPanel({ mode }: Props) {
  return (
    <>
      {mode === "features" && <FeaturesPanel />}
      {mode === "languages" && <LanguagesPanel />}
      {mode === "loader" && <LoaderPanel />}
    </>
  );
}
