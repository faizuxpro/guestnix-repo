import { create } from "zustand";
import { parseStoredSlots } from "@/lib/bottom-nav";
import {
  DEFAULT_SECTION_COVER_DESIGN_SETTINGS,
  SECTION_COVER_DESIGN_SETTINGS_KEY,
} from "@/lib/section-cover";
import {
  DEFAULT_SECTION_HEADER_SETTINGS,
  SECTION_HEADER_SETTINGS_KEY,
} from "@/lib/section-header";
import {
  DEFAULT_SECTION_INDEX_SETTINGS,
  SECTION_INDEX_SETTINGS_KEY,
} from "@/lib/section-settings";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { randomUUID } from "@/lib/utils";
import type { BottomNavSlot } from "@/types/bottom-nav";
import {
  normalizeHeroData,
  type HeroData,
} from "@/lib/hero-data";
import type {
  EditorInspectTarget,
  EditorNavigationRequest,
} from "@/lib/editor-inspect";

export type BlockContent = Record<string, unknown>;

export type EditorBlock = {
  id: string;
  type: string;
  content: BlockContent;
  orderIndex: number;
  isVisible: boolean;
};

export type CopiedBlock = Pick<EditorBlock, "type" | "content" | "isVisible">;

export type EditorSection = {
  id: string;
  title: string;
  icon: string;
  orderIndex: number;
  isVisible: boolean;
  kind: "guide" | "featured";
  displayMode: "popup" | "full_page" | "inline" | "drawer";
  itemSettings: Record<string, unknown>;
  blocks: EditorBlock[];
};

export type GuidebookMeta = {
  id: string;
  title: string;
  slug: string;
  status: string;
  accessRole: "owner" | "editor";
  templateId: string;
  branding: Record<string, unknown>;
  settings: Record<string, unknown>;
  heroData: HeroData;
  bottomNav: BottomNavSlot[];
  draftRevision: number;
  /**
   * ISO timestamp of the most recent successful Publish, or null if the
   * guidebook has never been published. Compared against `updatedAt` to
   * decide whether the host has unpublished draft changes.
   */
  publishedAt: string | null;
  /**
   * ISO timestamp of the last draft mutation persisted to the DB. Touched
   * on every save and on every publish (publish resets it to the publish
   * time, so `updatedAt === publishedAt` immediately after publish).
   */
  updatedAt: string;
};

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type DraftTouchPayload =
  | {
      draftRevision?: number;
      updatedAt?: string;
      _draft?: {
        draftRevision?: number;
        updatedAt?: string;
      } | null;
    }
  | null
  | undefined;

export type EditorPreviewFocus = {
  kind: "section_title";
  sectionId: string;
  nonce: number;
};

type Snapshot = {
  sections: EditorSection[];
  branding: Record<string, unknown>;
  guidebookSettings: Record<string, unknown>;
  heroData: HeroData | null;
  bottomNav: BottomNavSlot[];
  guidebookMeta: Pick<GuidebookMeta, "title" | "slug"> | null;
};

const HISTORY_CAP = 100;
export const EDITOR_BLOCK_CLIPBOARD_STORAGE_KEY =
  "guestnix.editor.blockClipboard.v1";

type LoadInput = {
  guidebook: GuidebookMeta;
  sections: EditorSection[];
};

type HeroDataPatch = {
  property?: Partial<HeroData["property"]>;
  host?: Partial<HeroData["host"]>;
  home?: Partial<
    Omit<
      HeroData["home"],
      | "show"
      | "times"
      | "logo"
      | "solid_background_color"
      | "glass_shadow"
      | "overlay_container"
      | "background"
    >
  > & {
    show?: Partial<HeroData["home"]["show"]>;
    times?: Partial<HeroData["home"]["times"]>;
    logo?: Partial<HeroData["home"]["logo"]>;
    solid_background_color?: Partial<HeroData["home"]["solid_background_color"]>;
    glass_shadow?: Partial<HeroData["home"]["glass_shadow"]>;
    overlay_container?: Partial<HeroData["home"]["overlay_container"]>;
    background?: Partial<HeroData["home"]["background"]>;
  };
  host_page?: Partial<Omit<HeroData["host_page"], "show">> & {
    show?: Partial<HeroData["host_page"]["show"]>;
  };
};

interface EditorState {
  guidebookId: string | null;
  guidebook: GuidebookMeta | null;
  sections: EditorSection[];
  placesVersion: number;
  guidebookSettings: Record<string, unknown>;
  branding: Record<string, unknown>;
  bottomNav: BottomNavSlot[];
  activeSectionId: string | null;
  activeBlockId: string | null;
  copiedBlock: CopiedBlock | null;
  activePreviewFocus: EditorPreviewFocus | null;
  activeFeaturedView: "home" | "host" | "nearby" | "store" | null;
  editorNavigationRequest: EditorNavigationRequest | null;
  isDirty: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  saveError: string | null;
  history: { past: Snapshot[]; future: Snapshot[] };

  loadGuidebook: (data: LoadInput) => void;
  reset: () => void;

  addSection: (section: {
    id: string;
    title: string;
    icon: string;
    orderIndex: number;
    isVisible: boolean;
    kind?: "guide" | "featured";
    displayMode?: "popup" | "full_page" | "inline" | "drawer";
    itemSettings?: Record<string, unknown>;
  }) => void;
  updateSection: (
    id: string,
    patch: Partial<
      Pick<
        EditorSection,
        "title" | "icon" | "isVisible" | "kind" | "displayMode" | "itemSettings"
      >
    >
  ) => void;
  setAllSectionsDisplayMode: (displayMode: "popup" | "full_page") => void;
  resetSectionWideSettings: () => void;
  deleteSection: (id: string) => void;
  reorderSections: (orderedIds: string[]) => void;
  setActiveSection: (id: string | null) => void;
  setActivePreviewFocus: (
    target: Omit<EditorPreviewFocus, "nonce"> | null
  ) => void;
  setActiveFeaturedView: (
    view: "home" | "host" | "nearby" | "store" | null
  ) => void;
  requestEditorNavigation: (target: EditorInspectTarget) => void;

  addBlock: (sectionId: string, block: EditorBlock) => void;
  updateBlock: (
    blockId: string,
    patch: Partial<Pick<EditorBlock, "content" | "isVisible">>
  ) => void;
  deleteBlock: (blockId: string) => void;
  reorderBlocks: (sectionId: string, orderedIds: string[]) => void;
  moveBlock: (blockId: string, toSectionId: string, toIndex: number) => void;
  duplicateBlock: (blockId: string) => void;
  copyBlock: (blockId: string) => void;
  pasteBlock: (sectionId: string, insertIndex: number) => string | null;
  canPasteBlock: () => boolean;
  hydrateCopiedBlock: () => void;
  setActiveBlock: (id: string | null) => void;

  updateGuidebookMeta: (patch: Partial<GuidebookMeta>) => void;
  updateGuidebookSettings: (patch: Record<string, unknown>) => void;
  updateBranding: (patch: Record<string, unknown>) => void;
  updateHeroData: (patch: HeroDataPatch) => void;
  setBottomNav: (slots: BottomNavSlot[]) => void;
  bumpPlacesVersion: () => void;

  setSaveStatus: (status: SaveStatus, error?: string | null) => void;
  markSaved: (data?: { draftRevision?: number; updatedAt?: string }) => void;
  applyDraftTouch: (data?: unknown) => void;
  markPublished: (publishedAt: string) => void;
  markUnpublished: () => void;
  save: () => Promise<void>;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function cloneSections(sections: EditorSection[]): EditorSection[] {
  return structuredClone(sections);
}

function cloneBlockContentForPaste(content: BlockContent): BlockContent {
  const copy = structuredClone(content);
  if (!Array.isArray(copy.children)) return copy;

  copy.children = copy.children.map((child, index) => {
    if (!child || typeof child !== "object") return child;
    const row = child as Record<string, unknown>;
    return {
      ...row,
      id: randomUUID(),
      content:
        typeof row.content === "object" && row.content !== null
          ? cloneBlockContentForPaste(row.content as BlockContent)
          : {},
      orderIndex: index,
    };
  });

  return copy;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCopiedBlockFromStorage(): CopiedBlock | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(EDITOR_BLOCK_CLIPBOARD_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== 1 || !isRecord(parsed.block)) {
      return null;
    }

    const block = parsed.block;
    if (
      typeof block.type !== "string" ||
      !isRecord(block.content) ||
      typeof block.isVisible !== "boolean"
    ) {
      return null;
    }

    return {
      type: block.type,
      content: block.content,
      isVisible: block.isVisible,
    };
  } catch {
    return null;
  }
}

function writeCopiedBlockToStorage(block: CopiedBlock) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    EDITOR_BLOCK_CLIPBOARD_STORAGE_KEY,
    JSON.stringify({ version: 1, block })
  );
}

function readDraftTouch(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const nested = record._draft;
  const payload =
    nested && typeof nested === "object"
      ? (nested as Record<string, unknown>)
      : record;
  const draftRevision =
    typeof payload.draftRevision === "number" ? payload.draftRevision : undefined;
  const updatedAt =
    typeof payload.updatedAt === "string" ? payload.updatedAt : undefined;

  if (draftRevision === undefined && updatedAt === undefined) return null;
  return { draftRevision, updatedAt };
}

function writeContentUnitSettings(
  settings: Record<string, unknown>,
  sections: EditorSection[]
) {
  const contentUnits = sections.reduce<Record<string, unknown>>((acc, section) => {
    acc[section.id] = {
      kind: section.kind,
      displayMode: section.displayMode,
      itemSettings: section.itemSettings,
    };
    return acc;
  }, {});

  return {
    ...settings,
    content_units: contentUnits,
  };
}

const EDITOR_SETTINGS_KEYS = [
  "pwa_enabled",
  "ai_chat_enabled",
  "chat_widget",
  "loading_screen",
  "languages",
  "nearby",
  "store",
  "content_units",
  "favicon",
  "topbar",
  "heading_styles",
  "heading_style_default_id",
  "callout_card_styles",
  "callout_card_style_default_id",
  "bottom_nav_design",
  "section_cover_design",
  "section_header",
  "section_index",
] as const;

function pickEditorSettings(settings: Record<string, unknown>) {
  const next: Record<string, unknown> = {};
  for (const key of EDITOR_SETTINGS_KEYS) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      next[key] = settings[key];
    }
  }
  return next;
}

function pushHistory(state: EditorState): Partial<EditorState> {
  const snapshot = takeSnapshot(state);
  const past = [...state.history.past, snapshot];
  if (past.length > HISTORY_CAP) past.shift();
  return { history: { past, future: [] } };
}

function takeSnapshot(state: EditorState): Snapshot {
  return {
    sections: cloneSections(state.sections),
    branding: structuredClone(state.branding),
    guidebookSettings: structuredClone(state.guidebookSettings),
    heroData: state.guidebook
      ? structuredClone(state.guidebook.heroData)
      : null,
    bottomNav: structuredClone(state.bottomNav),
    guidebookMeta: state.guidebook
      ? { title: state.guidebook.title, slug: state.guidebook.slug }
      : null,
  };
}

function applySnapshot(state: EditorState, snap: Snapshot): Partial<EditorState> {
  return {
    sections: cloneSections(snap.sections),
    branding: structuredClone(snap.branding),
    guidebookSettings: structuredClone(snap.guidebookSettings),
    bottomNav: structuredClone(snap.bottomNav),
    guidebook:
      state.guidebook && snap.heroData && snap.guidebookMeta
        ? {
            ...state.guidebook,
            title: snap.guidebookMeta.title,
            slug: snap.guidebookMeta.slug,
            heroData: structuredClone(snap.heroData),
          }
        : state.guidebook,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  guidebookId: null,
  guidebook: null,
  sections: [],
  placesVersion: 0,
  guidebookSettings: {},
  branding: {},
  bottomNav: [],
  activeSectionId: null,
  activeBlockId: null,
  copiedBlock: null,
  activePreviewFocus: null,
  activeFeaturedView: null,
  editorNavigationRequest: null,
  isDirty: false,
  saveStatus: "idle",
  lastSavedAt: null,
  saveError: null,
  history: { past: [], future: [] },

  loadGuidebook: ({ guidebook, sections }) => {
    const contentUnitsRaw =
      typeof guidebook.settings?.content_units === "object" &&
      guidebook.settings?.content_units !== null
        ? (guidebook.settings.content_units as Record<
            string,
            Record<string, unknown>
          >)
        : {};

    const hydratedSections = cloneSections(sections).map((section) => {
      const meta = contentUnitsRaw[section.id] ?? {};
      const kind: EditorSection["kind"] =
        meta.kind === "featured" ? "featured" : "guide";
      const displayMode: EditorSection["displayMode"] =
        meta.displayMode === "full_page" ||
        meta.displayMode === "inline" ||
        meta.displayMode === "drawer"
          ? (meta.displayMode as EditorSection["displayMode"])
          : "popup";
      const itemSettings =
        typeof meta.itemSettings === "object" && meta.itemSettings !== null
          ? (meta.itemSettings as Record<string, unknown>)
          : {};

      return {
        ...section,
        kind,
        displayMode,
        itemSettings,
      };
    });

    set({
      guidebookId: guidebook.id,
      guidebook: {
        ...guidebook,
        heroData: normalizeHeroData(guidebook.heroData),
      },
      sections: hydratedSections,
      placesVersion: 0,
      guidebookSettings: guidebook.settings ?? {},
      branding: guidebook.branding ?? {},
      bottomNav: parseStoredSlots(guidebook.bottomNav),
      activeSectionId: hydratedSections[0]?.id ?? null,
      activeBlockId: null,
      copiedBlock: readCopiedBlockFromStorage(),
      activePreviewFocus: null,
      activeFeaturedView: null,
      editorNavigationRequest: null,
      isDirty: false,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null,
      history: { past: [], future: [] },
    });
  },

  reset: () => {
    set({
      guidebookId: null,
      guidebook: null,
      sections: [],
      placesVersion: 0,
      guidebookSettings: {},
      branding: {},
      bottomNav: [],
      activeSectionId: null,
      activeBlockId: null,
      copiedBlock: readCopiedBlockFromStorage(),
      activePreviewFocus: null,
      activeFeaturedView: null,
      editorNavigationRequest: null,
      isDirty: false,
      saveStatus: "idle",
      lastSavedAt: null,
      saveError: null,
      history: { past: [], future: [] },
    });
  },

  addSection: (section) => {
    const state = get();
    const nextSection: EditorSection = {
      ...section,
      kind: section.kind ?? "guide",
      displayMode: section.displayMode ?? "popup",
      itemSettings: section.itemSettings ?? {},
      blocks: [],
    };
    const nextSections = [...state.sections, nextSection];
    set({
      ...pushHistory(state),
      sections: nextSections,
      guidebookSettings: writeContentUnitSettings(
        state.guidebookSettings,
        nextSections
      ),
      activeSectionId: section.id,
      isDirty: true,
    });
  },

  updateSection: (id, patch) => {
    const state = get();
    const idx = state.sections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const next = [...state.sections];
    next[idx] = { ...next[idx], ...patch };
    set({
      ...pushHistory(state),
      sections: next,
      guidebookSettings: writeContentUnitSettings(state.guidebookSettings, next),
      isDirty: true,
    });
  },

  setAllSectionsDisplayMode: (displayMode) => {
    const state = get();
    if (state.sections.length === 0) return;
    const alreadySet = state.sections.every(
      (section) => section.displayMode === displayMode
    );
    if (alreadySet) return;

    const next = state.sections.map((section) => ({
      ...section,
      displayMode,
    }));

    set({
      ...pushHistory(state),
      sections: next,
      guidebookSettings: writeContentUnitSettings(state.guidebookSettings, next),
      isDirty: true,
    });
  },

  resetSectionWideSettings: () => {
    const state = get();
    const nextSections = state.sections.map((section) => ({
      ...section,
      displayMode: "popup" as const,
    }));
    const resetGuidebookSettings = {
      ...state.guidebookSettings,
      [SECTION_INDEX_SETTINGS_KEY]: structuredClone(DEFAULT_SECTION_INDEX_SETTINGS),
      [SECTION_HEADER_SETTINGS_KEY]: structuredClone(DEFAULT_SECTION_HEADER_SETTINGS),
      [SECTION_COVER_DESIGN_SETTINGS_KEY]: structuredClone(
        DEFAULT_SECTION_COVER_DESIGN_SETTINGS
      ),
    };

    set({
      ...pushHistory(state),
      sections: nextSections,
      guidebookSettings: writeContentUnitSettings(
        resetGuidebookSettings,
        nextSections
      ),
      isDirty: true,
    });
  },

  deleteSection: (id) => {
    const state = get();
    const next = state.sections.filter((s) => s.id !== id);
    set({
      ...pushHistory(state),
      sections: next,
      guidebookSettings: writeContentUnitSettings(state.guidebookSettings, next),
      activeSectionId:
        state.activeSectionId === id ? next[0]?.id ?? null : state.activeSectionId,
      isDirty: true,
    });
  },

  reorderSections: (orderedIds) => {
    const state = get();
    const bySection = new Map(state.sections.map((s) => [s.id, s]));
    const next: EditorSection[] = [];
    orderedIds.forEach((id, i) => {
      const s = bySection.get(id);
      if (s) next.push({ ...s, orderIndex: i });
    });
    if (next.length !== state.sections.length) return;
    set({
      ...pushHistory(state),
      sections: next,
      isDirty: true,
    });
  },

  setActiveSection: (id) =>
    set((state) => ({
      activeSectionId: id,
      activeFeaturedView: id ? null : state.activeFeaturedView,
    })),
  setActivePreviewFocus: (target) =>
    set((state) => ({
      activePreviewFocus: target
        ? state.activePreviewFocus?.kind === target.kind &&
          state.activePreviewFocus.sectionId === target.sectionId
          ? state.activePreviewFocus
          : {
              ...target,
              nonce: (state.activePreviewFocus?.nonce ?? 0) + 1,
            }
        : null,
      activeBlockId: target ? null : state.activeBlockId,
    })),
  setActiveFeaturedView: (view) =>
    set((state) => ({
      activeFeaturedView: view,
      activeSectionId: view ? null : state.activeSectionId,
      activePreviewFocus: view ? null : state.activePreviewFocus,
    })),
  requestEditorNavigation: (target) =>
    set((state) => ({
      editorNavigationRequest: {
        target,
        nonce: (state.editorNavigationRequest?.nonce ?? 0) + 1,
      },
    })),

  addBlock: (sectionId, block) => {
    const state = get();
    const idx = state.sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const next = [...state.sections];
    next[idx] = {
      ...next[idx],
      blocks: [...next[idx].blocks, block],
    };
    set({
      ...pushHistory(state),
      sections: next,
      activeBlockId: block.id,
      activePreviewFocus: null,
      isDirty: true,
    });
  },

  updateBlock: (blockId, patch) => {
    const state = get();
    let changed = false;
    const next = state.sections.map((s) => {
      const bIdx = s.blocks.findIndex((b) => b.id === blockId);
      if (bIdx === -1) return s;
      changed = true;
      const blocks = [...s.blocks];
      blocks[bIdx] = { ...blocks[bIdx], ...patch };
      return { ...s, blocks };
    });
    if (!changed) return;
    set({
      ...pushHistory(state),
      sections: next,
      isDirty: true,
    });
  },

  deleteBlock: (blockId) => {
    const state = get();
    let changed = false;
    const next = state.sections.map((s) => {
      const has = s.blocks.some((b) => b.id === blockId);
      if (!has) return s;
      changed = true;
      return { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) };
    });
    if (!changed) return;
    set({
      ...pushHistory(state),
      sections: next,
      activeBlockId:
        state.activeBlockId === blockId ? null : state.activeBlockId,
      isDirty: true,
    });
  },

  reorderBlocks: (sectionId, orderedIds) => {
    const state = get();
    const idx = state.sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return;
    const section = state.sections[idx];
    const byId = new Map(section.blocks.map((b) => [b.id, b]));
    const reordered: EditorBlock[] = [];
    orderedIds.forEach((id, i) => {
      const b = byId.get(id);
      if (b) reordered.push({ ...b, orderIndex: i });
    });
    if (reordered.length !== section.blocks.length) return;
    const next = [...state.sections];
    next[idx] = { ...section, blocks: reordered };
    set({
      ...pushHistory(state),
      sections: next,
      guidebookSettings: writeContentUnitSettings(state.guidebookSettings, next),
      isDirty: true,
    });
  },

  moveBlock: (blockId, toSectionId, toIndex) => {
    const state = get();
    const fromSectionIndex = state.sections.findIndex((section) =>
      section.blocks.some((block) => block.id === blockId)
    );
    if (fromSectionIndex === -1) return;

    const toSectionIndex = state.sections.findIndex(
      (section) => section.id === toSectionId
    );
    if (toSectionIndex === -1) return;

    const fromSection = state.sections[fromSectionIndex];
    const fromBlockIndex = fromSection.blocks.findIndex(
      (block) => block.id === blockId
    );
    if (fromBlockIndex === -1) return;

    const movingBlock = fromSection.blocks[fromBlockIndex];
    const clampedToIndex = Math.max(0, toIndex);

    if (fromSectionIndex === toSectionIndex && fromBlockIndex === clampedToIndex) {
      return;
    }

    const next = [...state.sections];
    const nextFromBlocks = [...fromSection.blocks];
    nextFromBlocks.splice(fromBlockIndex, 1);

    if (fromSectionIndex === toSectionIndex) {
      const insertAt = Math.min(clampedToIndex, nextFromBlocks.length);
      nextFromBlocks.splice(insertAt, 0, movingBlock);
      next[fromSectionIndex] = {
        ...fromSection,
        blocks: nextFromBlocks.map((block, index) => ({
          ...block,
          orderIndex: index,
        })),
      };
    } else {
      const toSection = state.sections[toSectionIndex];
      const nextToBlocks = [...toSection.blocks];
      const insertAt = Math.min(clampedToIndex, nextToBlocks.length);
      nextToBlocks.splice(insertAt, 0, movingBlock);

      next[fromSectionIndex] = {
        ...fromSection,
        blocks: nextFromBlocks.map((block, index) => ({
          ...block,
          orderIndex: index,
        })),
      };
      next[toSectionIndex] = {
        ...toSection,
        blocks: nextToBlocks.map((block, index) => ({
          ...block,
          orderIndex: index,
        })),
      };
    }

    set({
      ...pushHistory(state),
      sections: next,
      activeSectionId: toSectionId,
      activeBlockId: blockId,
      activePreviewFocus: null,
      isDirty: true,
    });
  },

  duplicateBlock: (blockId) => {
    const state = get();
    let changed = false;
    const next = state.sections.map((s) => {
      const bIdx = s.blocks.findIndex((b) => b.id === blockId);
      if (bIdx === -1) return s;
      changed = true;
      const src = s.blocks[bIdx];
      const copy: EditorBlock = {
        ...src,
        id: randomUUID(),
        orderIndex: src.orderIndex + 1,
        content: cloneBlockContentForPaste(src.content),
      };
      const blocks = [...s.blocks];
      blocks.splice(bIdx + 1, 0, copy);
      blocks.forEach((b, i) => (b.orderIndex = i));
      return { ...s, blocks };
    });
    if (!changed) return;
    set({
      ...pushHistory(state),
      sections: next,
      isDirty: true,
    });
  },

  copyBlock: (blockId) => {
    const block = get()
      .sections.flatMap((section) => section.blocks)
      .find((item) => item.id === blockId);
    if (!block) return;

    set({
      copiedBlock: {
        type: block.type,
        content: structuredClone(block.content),
        isVisible: block.isVisible,
      },
    });
    writeCopiedBlockToStorage({
      type: block.type,
      content: structuredClone(block.content),
      isVisible: block.isVisible,
    });
  },

  pasteBlock: (sectionId, insertIndex) => {
    const state = get();
    const copiedBlock = state.copiedBlock ?? readCopiedBlockFromStorage();
    if (!copiedBlock) return null;

    const idx = state.sections.findIndex((section) => section.id === sectionId);
    if (idx === -1) return null;

    const section = state.sections[idx];
    const insertAt = Math.min(Math.max(0, insertIndex), section.blocks.length);
    const blockId = randomUUID();
    const nextBlock: EditorBlock = {
      id: blockId,
      type: copiedBlock.type,
      content: cloneBlockContentForPaste(copiedBlock.content),
      orderIndex: insertAt,
      isVisible: copiedBlock.isVisible,
    };

    const blocks = [...section.blocks];
    blocks.splice(insertAt, 0, nextBlock);
    const next = [...state.sections];
    next[idx] = {
      ...section,
      blocks: blocks.map((block, index) => ({ ...block, orderIndex: index })),
    };

    set({
      ...pushHistory(state),
      sections: next,
      activeSectionId: sectionId,
      activeBlockId: blockId,
      activePreviewFocus: null,
      isDirty: true,
    });

    return blockId;
  },

  canPasteBlock: () =>
    get().copiedBlock !== null || readCopiedBlockFromStorage() !== null,

  hydrateCopiedBlock: () => {
    set({ copiedBlock: readCopiedBlockFromStorage() });
  },

  setActiveBlock: (id) => set({ activeBlockId: id, activePreviewFocus: null }),

  updateGuidebookMeta: (patch) => {
    const state = get();
    if (!state.guidebook) return;
    const titleChanged = patch.title !== undefined && patch.title !== state.guidebook.title;
    const slugChanged = patch.slug !== undefined && patch.slug !== state.guidebook.slug;
    const trackable = titleChanged || slugChanged;
    set({
      ...(trackable ? pushHistory(state) : {}),
      guidebook: { ...state.guidebook, ...patch },
      isDirty: true,
    });
  },

  updateGuidebookSettings: (patch) => {
    const state = get();
    set({
      ...pushHistory(state),
      guidebookSettings: { ...state.guidebookSettings, ...patch },
      isDirty: true,
    });
  },

  updateBranding: (patch) => {
    const state = get();
    set({
      ...pushHistory(state),
      branding: { ...state.branding, ...patch },
      isDirty: true,
    });
  },

  updateHeroData: (patch) => {
    const state = get();
    if (!state.guidebook) return;
    const current = state.guidebook.heroData;
    const next: HeroData = {
      property: { ...current.property, ...(patch.property ?? {}) },
      host: { ...current.host, ...(patch.host ?? {}) },
      home: {
        ...current.home,
        ...(patch.home ?? {}),
        show: { ...current.home.show, ...(patch.home?.show ?? {}) },
        times: { ...current.home.times, ...(patch.home?.times ?? {}) },
        logo: { ...current.home.logo, ...(patch.home?.logo ?? {}) },
        solid_background_color: {
          ...current.home.solid_background_color,
          ...(patch.home?.solid_background_color ?? {}),
        },
        glass_shadow: {
          ...current.home.glass_shadow,
          ...(patch.home?.glass_shadow ?? {}),
        },
        overlay_container: {
          ...current.home.overlay_container,
          ...(patch.home?.overlay_container ?? {}),
        },
        background: {
          ...current.home.background,
          ...(patch.home?.background ?? {}),
        },
      },
      host_page: {
        ...current.host_page,
        ...(patch.host_page ?? {}),
        show: { ...current.host_page.show, ...(patch.host_page?.show ?? {}) },
      },
    };
    set({
      ...pushHistory(state),
      guidebook: { ...state.guidebook, heroData: next },
      isDirty: true,
    });
  },

  setBottomNav: (slots) => {
    const state = get();
    set({
      ...pushHistory(state),
      bottomNav: slots,
      isDirty: true,
    });
  },
  bumpPlacesVersion: () =>
    set((s) => ({
      placesVersion: s.placesVersion + 1,
      isDirty: true,
    })),

  setSaveStatus: (status, error = null) =>
    set({ saveStatus: status, saveError: error }),

  markSaved: (data) => {
    const state = get();
    const touch = readDraftTouch(data);
    const now = touch?.updatedAt ?? new Date().toISOString();
    set({
      isDirty: false,
      saveStatus: "saved",
      lastSavedAt: Date.now(),
      saveError: null,
      guidebook: state.guidebook
        ? {
            ...state.guidebook,
            updatedAt: now,
            draftRevision:
              touch?.draftRevision ?? state.guidebook.draftRevision,
          }
        : state.guidebook,
    });
  },

  applyDraftTouch: (data) => {
    const touch = readDraftTouch(data);
    if (!touch) return;

    set((state) => ({
      guidebook: state.guidebook
        ? {
            ...state.guidebook,
            draftRevision:
              touch.draftRevision ?? state.guidebook.draftRevision,
            updatedAt: touch.updatedAt ?? state.guidebook.updatedAt,
          }
        : state.guidebook,
    }));
  },

  markPublished: (publishedAt) => {
    const state = get();
    if (!state.guidebook) return;
    set({
      guidebook: {
        ...state.guidebook,
        status: "published",
        publishedAt,
        // Publish writes a snapshot from the current draft, so the draft
        // is effectively in sync with the live version — pin updatedAt to
        // the publish time so the toolbar reads "no unpublished changes".
        updatedAt: publishedAt,
      },
    });
  },

  markUnpublished: () => {
    const state = get();
    if (!state.guidebook) return;
    set({
      guidebook: {
        ...state.guidebook,
        status: "draft",
        publishedAt: null,
      },
    });
  },

  save: async () => {
    const state = get();
    if (!state.guidebookId) return;
    if (state.saveStatus === "saving") return;

    const payload = {
      draftRevision: state.guidebook?.draftRevision,
      settings: pickEditorSettings(state.guidebookSettings),
      branding: state.branding,
      bottomNav: state.bottomNav,
      heroData: state.guidebook?.heroData,
      sections: state.sections.map((s) => ({
        id: s.id,
        title: s.title,
        icon: s.icon,
        orderIndex: s.orderIndex,
        isVisible: s.isVisible,
        blocks: s.blocks.map((b) => ({
          id: b.id,
          type: b.type,
          content: b.content,
          orderIndex: b.orderIndex,
          isVisible: b.isVisible,
        })),
      })),
    };

    set({ saveStatus: "saving", saveError: null });

    const result = await apiFetch<{
      success: true;
      draftRevision?: number;
      updatedAt?: string;
    }>(`/api/guidebooks/${state.guidebookId}/save`, {
      method: "POST",
      body: payload,
    });

    if (result.ok) {
      get().markSaved(result.data);
      return;
    }

    set({
      saveStatus: "error",
      saveError: result.error.message,
    });
    toastApiError(result.error, {
      title: "Couldn't save your changes",
      onRetry: () => void get().save(),
    });
  },

  undo: () => {
    const state = get();
    const prev = state.history.past[state.history.past.length - 1];
    if (!prev) return;
    const past = state.history.past.slice(0, -1);
    const future = [takeSnapshot(state), ...state.history.future];
    set({
      ...applySnapshot(state, prev),
      history: { past, future },
      isDirty: true,
    });
  },

  redo: () => {
    const state = get();
    const next = state.history.future[0];
    if (!next) return;
    const future = state.history.future.slice(1);
    const past = [...state.history.past, takeSnapshot(state)];
    if (past.length > HISTORY_CAP) past.shift();
    set({
      ...applySnapshot(state, next),
      history: { past, future },
      isDirty: true,
    });
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,
}));
