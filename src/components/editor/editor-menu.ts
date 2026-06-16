"use client";

export type EditorPrimaryMenu = "content" | "design" | "settings";

export type EditorContentSubmenu = "guidebook" | "featured" | "navigation";
export type EditorDesignSubmenu =
  | "lucky"
  | "brand"
  | "typography"
  | "sizing";
export type EditorSettingsSubmenu =
  | "features"
  | "languages"
  | "loader";

export type EditorSubmenuState = {
  content: EditorContentSubmenu;
  design: EditorDesignSubmenu;
  settings: EditorSettingsSubmenu;
};

export const EDITOR_PRIMARY_MENU: Array<{
  id: EditorPrimaryMenu;
  label: string;
}> = [
  { id: "content", label: "Content" },
  { id: "design", label: "Design" },
  { id: "settings", label: "Settings" },
];

export const CONTENT_SUBMENU: Array<{
  id: EditorContentSubmenu;
  label: string;
}> = [
  { id: "guidebook", label: "Guide Sections" },
  { id: "featured", label: "Featured Pages" },
  { id: "navigation", label: "Navigation" },
];

export const DESIGN_SUBMENU: Array<{
  id: EditorDesignSubmenu;
  label: string;
}> = [
  { id: "lucky", label: "I'm Lucky" },
  { id: "brand", label: "Brand" },
  { id: "typography", label: "Typography" },
  { id: "sizing", label: "Sizing" },
];

export const SETTINGS_SUBMENU: Array<{
  id: EditorSettingsSubmenu;
  label: string;
}> = [
  { id: "features", label: "Features" },
  { id: "languages", label: "Languages" },
  { id: "loader", label: "Loader" },
];
