export const EDITOR_INSPECT_TARGET_ATTRIBUTE = "data-editor-inspect-target";
export const EDITOR_INSPECT_LABEL_ATTRIBUTE = "data-editor-inspect-label";

export type HomeInspectFocus =
  | "background"
  | "container"
  | "logo"
  | "title"
  | "tagline"
  | "host"
  | "button"
  | "contact"
  | "times";

export type FeaturedInspectView = "home" | "host" | "nearby" | "store";
export type FeaturedInspectFocus =
  | "page"
  | "intro"
  | "title"
  | "photo"
  | "bio"
  | "contact"
  | "map"
  | "places"
  | "items"
  | "layout"
  | "setup";
export type SectionInspectFocus =
  | "card"
  | "card_icon"
  | "title"
  | "settings"
  | "cover"
  | "cover_image"
  | "cover_title"
  | "header"
  | "header_back"
  | "header_share";
export type SectionIndexInspectFocus = "intro" | "layout" | "cards";
export type NavigationInspectFocus =
  | "bottom_nav"
  | "header"
  | "header_brand"
  | "page_name"
  | "search"
  | "share";
export type DesignInspectFocus =
  | "app_background"
  | "topbar_background"
  | "section_background";
export type SettingsInspectFocus = "languages";

export type EditorInspectTarget =
  | { kind: "home"; focus: HomeInspectFocus }
  | {
      kind: "featured";
      view: FeaturedInspectView;
      focus?: FeaturedInspectFocus;
    }
  | { kind: "section"; sectionId: string; focus: SectionInspectFocus }
  | { kind: "section_index"; focus: SectionIndexInspectFocus }
  | { kind: "block"; sectionId: string; blockId: string }
  | { kind: "navigation"; focus: NavigationInspectFocus }
  | { kind: "design"; focus: DesignInspectFocus }
  | { kind: "settings"; focus: SettingsInspectFocus };

export type EditorNavigationRequest = {
  target: EditorInspectTarget;
  nonce: number;
};

const TARGET_SEPARATOR = "|";

function encodePart(value: string) {
  return encodeURIComponent(value);
}

function decodePart(value: string | undefined) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export function serializeEditorInspectTarget(target: EditorInspectTarget) {
  if (target.kind === "home") {
    return ["home", target.focus].map(encodePart).join(TARGET_SEPARATOR);
  }

  if (target.kind === "featured") {
    return ["featured", target.view, target.focus ?? ""]
      .map(encodePart)
      .join(TARGET_SEPARATOR);
  }

  if (target.kind === "section") {
    return ["section", target.sectionId, target.focus]
      .map(encodePart)
      .join(TARGET_SEPARATOR);
  }

  if (target.kind === "block") {
    return ["block", target.sectionId, target.blockId]
      .map(encodePart)
      .join(TARGET_SEPARATOR);
  }

  if (target.kind === "section_index") {
    return ["section_index", target.focus].map(encodePart).join(TARGET_SEPARATOR);
  }

  if (target.kind === "navigation") {
    return ["navigation", target.focus].map(encodePart).join(TARGET_SEPARATOR);
  }

  if (target.kind === "design") {
    return ["design", target.focus].map(encodePart).join(TARGET_SEPARATOR);
  }

  return ["settings", target.focus].map(encodePart).join(TARGET_SEPARATOR);
}

export function parseEditorInspectTarget(value: string): EditorInspectTarget | null {
  const [kindRaw, firstRaw, secondRaw] = value.split(TARGET_SEPARATOR);
  const kind = decodePart(kindRaw);
  const first = decodePart(firstRaw);
  const second = decodePart(secondRaw);

  if (kind === "home" && isHomeFocus(first)) {
    return { kind, focus: first };
  }

  if (kind === "featured" && isFeaturedView(first)) {
    return isFeaturedFocus(second) || second === ""
      ? { kind, view: first, ...(second ? { focus: second } : {}) }
      : { kind, view: first };
  }

  if (kind === "section" && first && isSectionFocus(second)) {
    return { kind, sectionId: first, focus: second };
  }

  if (kind === "block" && first && second) {
    return { kind, sectionId: first, blockId: second };
  }

  if (kind === "section_index" && isSectionIndexFocus(first)) {
    return { kind, focus: first };
  }

  if (kind === "navigation" && isNavigationFocus(first)) {
    return { kind, focus: first };
  }

  if (kind === "design" && isDesignFocus(first)) {
    return { kind, focus: first };
  }

  if (kind === "settings" && isSettingsFocus(first)) {
    return { kind, focus: first };
  }

  return null;
}

export function editorInspectAttributes(
  target: EditorInspectTarget,
  label?: string
) {
  return {
    [EDITOR_INSPECT_TARGET_ATTRIBUTE]: serializeEditorInspectTarget(target),
    [EDITOR_INSPECT_LABEL_ATTRIBUTE]: label ?? describeEditorInspectTarget(target),
  };
}

export function describeEditorInspectTarget(target: EditorInspectTarget) {
  if (target.kind === "home") {
    const labels: Record<HomeInspectFocus, string> = {
      background: "Edit background",
      container: "Edit splash layout",
      logo: "Edit logo",
      title: "Edit property name",
      tagline: "Edit tagline",
      host: "Edit host name",
      button: "Edit enter button",
      contact: "Edit contact info",
      times: "Edit stay times",
    };
    return labels[target.focus];
  }

  if (target.kind === "featured") {
    const viewLabels: Record<FeaturedInspectView, string> = {
      home: "Edit home page",
      host: "Edit host page",
      nearby: "Edit nearby page",
      store: "Edit store page",
    };
    if (!target.focus || target.focus === "page") return viewLabels[target.view];
    const focusLabels: Record<FeaturedInspectFocus, string> = {
      page: viewLabels[target.view],
      intro: "Edit page intro",
      title: "Edit page title",
      photo: "Edit photo",
      bio: "Edit bio",
      contact: "Edit contact info",
      map: "Edit map",
      places: "Edit places",
      items: "Edit items",
      layout: "Edit layout",
      setup: "Edit setup",
    };
    return focusLabels[target.focus];
  }

  if (target.kind === "section") {
    if (target.focus === "card_icon") return "Edit section icon";
    if (target.focus === "title") return "Edit section title";
    if (target.focus === "cover" || target.focus === "cover_image") {
      return "Edit section cover";
    }
    if (target.focus === "cover_title") return "Edit cover title";
    if (target.focus === "header") return "Edit section header";
    if (target.focus === "header_back") return "Edit back icon";
    if (target.focus === "header_share") return "Edit section share";
    if (target.focus === "settings") return "Edit section settings";
    return "Edit section";
  }

  if (target.kind === "section_index") {
    const labels: Record<SectionIndexInspectFocus, string> = {
      intro: "Edit guide intro",
      layout: "Edit section layout",
      cards: "Edit section cards",
    };
    return labels[target.focus];
  }

  if (target.kind === "block") {
    return "Edit block";
  }

  if (target.kind === "navigation") {
    const labels: Record<NavigationInspectFocus, string> = {
      bottom_nav: "Edit bottom navigation",
      header: "Edit header",
      header_brand: "Edit header brand",
      page_name: "Edit page name",
      search: "Edit search",
      share: "Edit share",
    };
    return labels[target.focus];
  }

  if (target.kind === "design") {
    const labels: Record<DesignInspectFocus, string> = {
      app_background: "Edit app background",
      topbar_background: "Edit header background",
      section_background: "Edit section background",
    };
    return labels[target.focus];
  }

  return "Edit languages";
}

function isHomeFocus(value: string): value is HomeInspectFocus {
  return [
    "background",
    "container",
    "logo",
    "title",
    "tagline",
    "host",
    "button",
    "contact",
    "times",
  ].includes(value);
}

function isFeaturedView(value: string): value is FeaturedInspectView {
  return ["home", "host", "nearby", "store"].includes(value);
}

function isFeaturedFocus(value: string): value is FeaturedInspectFocus {
  return [
    "page",
    "intro",
    "title",
    "photo",
    "bio",
    "contact",
    "map",
    "places",
    "items",
    "layout",
    "setup",
  ].includes(value);
}

function isSectionFocus(value: string): value is SectionInspectFocus {
  return [
    "card",
    "card_icon",
    "title",
    "settings",
    "cover",
    "cover_image",
    "cover_title",
    "header",
    "header_back",
    "header_share",
  ].includes(value);
}

function isSectionIndexFocus(value: string): value is SectionIndexInspectFocus {
  return ["intro", "layout", "cards"].includes(value);
}

function isNavigationFocus(value: string): value is NavigationInspectFocus {
  return [
    "bottom_nav",
    "header",
    "header_brand",
    "page_name",
    "search",
    "share",
  ].includes(value);
}

function isDesignFocus(value: string): value is DesignInspectFocus {
  return [
    "app_background",
    "topbar_background",
    "section_background",
  ].includes(value);
}

function isSettingsFocus(value: string): value is SettingsInspectFocus {
  return ["languages"].includes(value);
}
