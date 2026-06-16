"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEditorStore } from "@/stores/editor-store";
import { cn, randomUUID } from "@/lib/utils";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { useFeedbackDialog } from "@/components/ui/feedback-dialog";
import {
  getReusableSectionBlocks,
  getReusableSectionIcon,
  getReusableSectionTitle,
} from "@/lib/assets-hub";
import { useAssetsHubSectionTemplates } from "@/hooks/use-assets-hub-content-blocks";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import { BlockList } from "./BlockList";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import { HostIcon } from "@/components/icons/HostIcon";
import { FeaturedNavCard } from "./featured/controls/PanelHeader";
import {
  SectionWideSettingsPanel,
  type SectionWideSettingsFocusTarget,
} from "./SectionWideSettingsPanel";
import {
  BLANK_SECTION_TEMPLATE,
  SECTION_TEMPLATES,
  type SectionTemplate,
} from "./section-templates";
import { QuickVariableInsertMenu } from "./shared/QuickVariableInsertMenu";

const SECTION_PREFIX = "section:";
const BLOCK_PREFIX = "block:";
const INSERT_PREFIX = "insert:";

const toSectionDragId = (id: string) => `${SECTION_PREFIX}${id}`;

const fromPrefixed = (value: string, prefix: string) =>
  value.startsWith(prefix) ? value.slice(prefix.length) : null;

function parseInsertTarget(value: string) {
  if (!value.startsWith(INSERT_PREFIX)) return null;
  const payload = value.slice(INSERT_PREFIX.length);
  const delimiterIndex = payload.lastIndexOf(":");
  if (delimiterIndex === -1) return null;

  const sectionId = payload.slice(0, delimiterIndex);
  const index = Number(payload.slice(delimiterIndex + 1));
  if (!sectionId || Number.isNaN(index)) return null;
  return { sectionId, index };
}

function SectionRow({
  id,
  index,
  title,
  icon,
  blockCount,
  selected,
  isVisible,
  onSelect,
  onToggleVisibility,
  onDelete,
}: {
  id: string;
  index: number;
  title: string;
  icon: string;
  blockCount: number;
  selected: boolean;
  isVisible: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: toSectionDragId(id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg border bg-background px-2 py-2 transition-colors",
        selected && "border-primary/50 bg-primary/5",
        isDragging && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1.5 py-1 text-left hover:bg-muted/40"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/30 text-primary">
          <HostIcon value={icon} className="text-xl" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {title || "Untitled section"}
          </span>
          <span className="block text-xs text-muted-foreground">
            #{index + 1} . {blockCount} block{blockCount === 1 ? "" : "s"}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1 pr-1">
        <Button
          variant={isVisible ? "secondary" : "outline"}
          size="icon-xs"
          onClick={onToggleVisibility}
          aria-label={isVisible ? "Hide section" : "Show section"}
        >
          {isVisible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          onClick={onDelete}
          aria-label="Delete section"
          className="text-muted-foreground hover:border-destructive/45 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Reorder section"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground hover:bg-muted/40"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

type EditorView = "list" | "editor" | "settings";
type SettingsReturnView = Exclude<EditorView, "settings">;

export function SectionList() {
  const sections = useEditorStore((s) => s.sections);
  const guidebookId = useEditorStore((s) => s.guidebookId);
  const reorderSections = useEditorStore((s) => s.reorderSections);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const addBlockLocal = useEditorStore((s) => s.addBlock);
  const deleteBlockLocal = useEditorStore((s) => s.deleteBlock);
  const updateSection = useEditorStore((s) => s.updateSection);
  const addSectionLocal = useEditorStore((s) => s.addSection);
  const deleteSectionLocal = useEditorStore((s) => s.deleteSection);
  const setActiveSection = useEditorStore((s) => s.setActiveSection);
  const setActivePreviewFocus = useEditorStore((s) => s.setActivePreviewFocus);
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock);
  const editorNavigationRequest = useEditorStore(
    (s) => s.editorNavigationRequest
  );
  const applyDraftTouch = useEditorStore((s) => s.applyDraftTouch);
  const { assets: savedSectionAssets } = useAssetsHubSectionTemplates();
  const { requestConfirmation } = useFeedbackDialog();

  const [openSectionId, setOpenSectionId] = useState<string | null>(
    sections[0]?.id ?? null
  );
  const [editorView, setEditorView] = useState<EditorView>("list");
  const [settingsReturnView, setSettingsReturnView] =
    useState<SettingsReturnView>("list");
  const [settingsFocusTarget, setSettingsFocusTarget] =
    useState<SectionWideSettingsFocusTarget | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const handledNavigationNonceRef = useRef(0);
  const [titleFocusNonce, setTitleFocusNonce] = useState(0);

  const savedSectionTemplates = useMemo<SectionTemplate[]>(
    () =>
      savedSectionAssets.map((asset) => ({
        id: `asset:${asset.id}`,
        name: asset.name,
        description: asset.description || "Saved reusable section",
        title: getReusableSectionTitle(asset),
        icon: getReusableSectionIcon(asset) || DEFAULT_ICONS.SECTION_DEFAULT,
        blocks: getReusableSectionBlocks(asset).map((block) => ({
          type: block.type,
          content: block.content,
        })),
      })),
    [savedSectionAssets]
  );

  useEffect(() => {
    if (sections.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenSectionId(null);
      setActiveSection(null);
      setEditorView("list");
      return;
    }

    if (!openSectionId || !sections.some((section) => section.id === openSectionId)) {
      const firstId = sections[0].id;
      setOpenSectionId(firstId);
    }
  }, [sections, openSectionId, setActiveSection]);

  useEffect(() => {
    if (editorView !== "editor") {
      setActiveSection(null);
      return;
    }
    if (openSectionId) {
      setActiveSection(openSectionId);
    }
  }, [editorView, openSectionId, setActiveSection]);

  const openSection = useMemo(
    () => sections.find((section) => section.id === openSectionId) ?? sections[0] ?? null,
    [sections, openSectionId]
  );

  useEffect(() => {
    if (editorView === "editor" && !openSection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditorView("list");
    }
  }, [editorView, openSection]);

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const openSectionWideSettings = useCallback((
    focusTarget: SectionWideSettingsFocusTarget | null = null,
    returnView: SettingsReturnView = "list"
  ) => {
    setSettingsFocusTarget(focusTarget);
    setSettingsReturnView(returnView);
    setEditorView("settings");
  }, []);

  useEffect(() => {
    if (!editorNavigationRequest) return;
    if (handledNavigationNonceRef.current === editorNavigationRequest.nonce) {
      return;
    }

    const target = editorNavigationRequest.target;
    if (
      target.kind !== "section" &&
      target.kind !== "section_index" &&
      target.kind !== "block"
    ) {
      return;
    }

    handledNavigationNonceRef.current = editorNavigationRequest.nonce;
    if (target.kind === "section_index") {
      const focus: SectionWideSettingsFocusTarget =
        target.focus === "intro"
          ? "section-index-intro"
          : target.focus === "layout"
          ? "section-index-layout"
          : "section-index-cards";
      const frame = window.requestAnimationFrame(() => {
        setActiveSection(null);
        setActiveBlock(null);
        openSectionWideSettings(focus, "list");
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const sectionId = target.sectionId;
    if (!sections.some((section) => section.id === sectionId)) return;

    const frame = window.requestAnimationFrame(() => {
      setOpenSectionId(sectionId);
      setActiveSection(sectionId);

      if (target.kind === "block") {
        setEditorView("editor");
        setActiveBlock(target.blockId);
        return;
      }

      setActiveBlock(null);
      if (
        target.focus === "cover" ||
        target.focus === "cover_image" ||
        target.focus === "cover_title"
      ) {
        openSectionWideSettings("section-cover", "editor");
        return;
      }

      if (
        target.focus === "header" ||
        target.focus === "header_back" ||
        target.focus === "header_share"
      ) {
        openSectionWideSettings("section-header", "editor");
        return;
      }

      setEditorView("editor");
      if (target.focus === "title") {
        setActivePreviewFocus({ kind: "section_title", sectionId });
        setTitleFocusNonce(editorNavigationRequest.nonce);
      } else {
        setActivePreviewFocus(null);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    editorNavigationRequest,
    sections,
    openSectionWideSettings,
    setActiveBlock,
    setActivePreviewFocus,
    setActiveSection,
  ]);

  useEffect(() => {
    if (!titleFocusNonce || editorView !== "editor") return;
    const frame = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorView, titleFocusNonce]);

  const persistReorder = async (orderedIds: string[]) => {
    if (!guidebookId) return;

    const payload = {
      sections: orderedIds.map((id, index) => ({ id, orderIndex: index })),
    };

    const result = await apiFetch(
      `/api/guidebooks/${guidebookId}/sections/reorder`,
      { method: "PATCH", body: payload }
    );
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't save section order",
        onRetry: () => void persistReorder(orderedIds),
      });
      return;
    }
    applyDraftTouch(result.data);
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeSectionId = fromPrefixed(String(active.id), SECTION_PREFIX);
    const overSectionId = fromPrefixed(String(over.id), SECTION_PREFIX);
    if (!activeSectionId || !overSectionId) return;

    const ids = sections.map((section) => section.id);
    const oldIdx = ids.indexOf(activeSectionId);
    const newIdx = ids.indexOf(overSectionId);
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;

    const next = arrayMove(ids, oldIdx, newIdx);
    reorderSections(next);

    void persistReorder(next);
  };

  const handleBlockDragEnd = (event: DragEndEvent) => {
    if (!openSection) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeBlockId = fromPrefixed(String(active.id), BLOCK_PREFIX);
    if (!activeBlockId) return;

    const overBlockId = fromPrefixed(String(over.id), BLOCK_PREFIX);
    if (overBlockId) {
      const targetIndex = openSection.blocks.findIndex((block) => block.id === overBlockId);
      if (targetIndex === -1) return;
      moveBlock(activeBlockId, openSection.id, targetIndex);
      return;
    }

    const insertTarget = parseInsertTarget(String(over.id));
    if (insertTarget && insertTarget.sectionId === openSection.id) {
      moveBlock(activeBlockId, insertTarget.sectionId, insertTarget.index);
    }
  };

  const handleAdd = (template: SectionTemplate) => {
    if (!guidebookId) return;

    const assetId = template.id.startsWith("asset:")
      ? template.id.slice("asset:".length)
      : null;
    const sectionId = randomUUID();
    const sectionOrderIndex = sections.length;
    const blockDrafts = template.blocks.map((block, index) => ({
      id: randomUUID(),
      sectionId,
      guidebookId,
      type: block.type,
      content: structuredClone(block.content) as Record<string, unknown>,
      orderIndex: index,
    }));

    addSectionLocal({
      id: sectionId,
      title: template.title,
      icon: template.icon,
      orderIndex: sectionOrderIndex,
      isVisible: true,
      kind: "guide",
      displayMode: "popup",
      itemSettings: {},
    });

    for (const draft of blockDrafts) {
      addBlockLocal(sectionId, {
        id: draft.id,
        type: draft.type,
        content: draft.content,
        orderIndex: draft.orderIndex,
        isVisible: true,
      });
    }

    setOpenSectionId(sectionId);
    setActiveSection(sectionId);
    setEditorView("editor");
    setAddOpen(false);

    void (async () => {
      const sectionResult = await apiFetch(
        `/api/guidebooks/${guidebookId}/sections`,
        {
          method: "POST",
          body: {
            id: sectionId,
            title: template.title,
            icon: template.icon,
            orderIndex: sectionOrderIndex,
          },
        }
      );

      if (!sectionResult.ok) {
        deleteSectionLocal(sectionId);
        const fallbackSectionId =
          useEditorStore
            .getState()
            .sections.find((section) => section.id !== sectionId)?.id ?? null;
        setOpenSectionId(fallbackSectionId);
        setActiveSection(fallbackSectionId);
        setEditorView("list");
        toastApiError(sectionResult.error, {
          title: "Couldn't add section",
        });
        return;
      }
      applyDraftTouch(sectionResult.data);

      const blockResults = await Promise.all(
        blockDrafts.map(async (draft) => {
          const result = await apiFetch("/api/blocks", {
            method: "POST",
            body: draft,
          });
          return {
            id: draft.id,
            ok: result.ok,
            data: result.ok ? result.data : null,
          };
        })
      );

      const failedBlockIds = blockResults.filter((result) => !result.ok);
      for (const failed of failedBlockIds) {
        deleteBlockLocal(failed.id);
      }
      for (const created of blockResults) {
        if (created.ok) applyDraftTouch(created.data);
      }

      if (failedBlockIds.length > 0) {
        toast.error(
          `Section added, but ${failedBlockIds.length} template block(s) could not be created.`
        );
        return;
      }

      if (assetId) {
        void apiFetch(`/api/assets-hub/${assetId}/use`, { method: "POST" });
      }

      toast.success(`${template.name} added`);
    })();
  };

  const handleDelete = async (id: string) => {
    if (!guidebookId) return;
    const section = sections.find((item) => item.id === id);
    const confirmed = await requestConfirmation({
      title: "Delete this section?",
      description: `${
        section?.title ? `"${section.title}" and all of its blocks` : "This section and all of its blocks"
      } will be removed permanently.`,
      confirmLabel: "Delete section",
      tone: "danger",
      busyLabel: "Deleting...",
    });
    if (!confirmed) {
      return;
    }

    const toastId = toast.loading("Deleting section...");
    const result = await apiFetch(
      `/api/guidebooks/${guidebookId}/sections/${id}`,
      { method: "DELETE" }
    );
    if (!result.ok) {
      toastApiError(result.error, {
        id: toastId,
        title: "Couldn't delete section",
        onRetry: () => void handleDelete(id),
      });
      return;
    }
    applyDraftTouch(result.data);
    deleteSectionLocal(id);
    const remaining = sections.filter((section) => section.id !== id);
    const nextId = remaining[0]?.id ?? null;
    setOpenSectionId(nextId);
    setActiveSection(nextId);
    setEditorView("list");
    toast.success("Section deleted", {
      id: toastId,
      description: "The guidebook structure has been updated.",
    });
  };

  if (editorView === "settings") {
    return (
      <SectionWideSettingsPanel
        focusTarget={settingsFocusTarget}
        previewSectionId={openSection?.id ?? null}
        onBack={() => {
          setSettingsFocusTarget(null);
          setEditorView(settingsReturnView);
        }}
      />
    );
  }

  if (editorView === "list" || !openSection) {
    return (
      <div className="flex h-full flex-col bg-muted/20">
        <div className="border-b bg-background px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Guide Sections</h2>
              <p className="text-xs text-muted-foreground">
                Choose a section to edit, then use back to return here.
              </p>
            </div>
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger
                render={
                  <Button size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add section
                  </Button>
                }
              />
              <PopoverContent className="w-80 p-2" align="end">
                <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                  Section templates
                </p>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {savedSectionTemplates.length > 0 ? (
                    <>
                      <div className="mb-1 px-1 pt-1 text-[11px] font-medium text-muted-foreground">
                        Saved from Assets Hub
                      </div>
                      {savedSectionTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          className="w-full rounded-md border px-2.5 py-2 text-left hover:bg-muted/40"
                          onClick={() => void handleAdd(template)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold">
                              {template.name}
                            </p>
                            <Badge variant="secondary" className="text-[10px]">
                              Assets Hub
                            </Badge>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                            {template.description}
                          </p>
                        </button>
                      ))}
                      <div className="my-2 h-px bg-border" />
                    </>
                  ) : null}

                  {SECTION_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="w-full rounded-md border px-2.5 py-2 text-left hover:bg-muted/40"
                      onClick={() => void handleAdd(template)}
                    >
                      <p className="text-xs font-semibold">{template.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="space-y-3">
            <FeaturedNavCard
              icon={<SlidersHorizontal className="h-4 w-4" />}
              title="Section-wide settings"
              accent="amber"
              onSelect={() => openSectionWideSettings()}
            />

            {sections.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed bg-background p-8 text-center">
                <p className="text-sm font-medium">No sections yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add your first section to start building this guidebook.
                </p>
                <Button
                  size="sm"
                  onClick={() => void handleAdd(BLANK_SECTION_TEMPLATE)}
                  className="mt-4"
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add section
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sectionSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSectionDragEnd}
              >
                <SortableContext
                  items={sections.map((section) => toSectionDragId(section.id))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {sections.map((section, index) => (
                      <SectionRow
                        key={section.id}
                        id={section.id}
                        index={index}
                        title={section.title}
                        icon={section.icon}
                        blockCount={section.blocks.length}
                        isVisible={section.isVisible}
                        selected={openSection?.id === section.id}
                        onSelect={() => {
                          setOpenSectionId(section.id);
                          setActiveSection(section.id);
                          setEditorView("editor");
                        }}
                        onToggleVisibility={() =>
                          updateSection(section.id, {
                            isVisible: !section.isVisible,
                          })
                        }
                        onDelete={() => void handleDelete(section.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border/70 bg-muted/20 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditorView("list")}
          className="h-8 px-2 text-xs"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to sections
        </Button>
      </div>

      <div className="border-b border-border/70 bg-muted/25 px-3 py-3">
        <div className="flex items-center gap-2">
          <IconifyPicker
            value={openSection.icon}
            onChange={(icon) => updateSection(openSection.id, { icon })}
            ariaLabel="Select section icon"
            triggerClassName="h-10 w-10 rounded-md border border-primary/45 bg-primary/5 text-primary hover:border-primary hover:bg-primary hover:text-primary-foreground"
            iconClassName="text-2xl"
          />
          <input
            ref={titleInputRef}
            value={openSection.title}
            onFocus={() =>
              setActivePreviewFocus({
                kind: "section_title",
                sectionId: openSection.id,
              })
            }
            onBlur={() => setActivePreviewFocus(null)}
            onChange={(event) =>
              updateSection(openSection.id, { title: event.target.value })
            }
            className="min-w-0 w-full border-0 border-b border-border/80 bg-transparent px-0 py-1 text-[1.65rem] font-semibold leading-tight outline-none transition-colors focus-visible:border-ring"
            aria-label="Section title"
            placeholder="Untitled section"
          />
          <QuickVariableInsertMenu
            onInsert={(token) => {
              const node = titleInputRef.current;
              const title = openSection.title;
              const start = node?.selectionStart ?? title.length;
              const end = node?.selectionEnd ?? start;
              const next = `${title.slice(0, start)}${token}${title.slice(end)}`;
              updateSection(openSection.id, { title: next });
              window.requestAnimationFrame(() => {
                node?.focus();
                const cursor = start + token.length;
                node?.setSelectionRange(cursor, cursor);
              });
            }}
          />
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            #{sections.findIndex((s) => s.id === openSection.id) + 1}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant={openSection.isVisible ? "secondary" : "outline"}
              size="icon-xs"
              onClick={() =>
                updateSection(openSection.id, {
                  isVisible: !openSection.isVisible,
                })
              }
              aria-label={openSection.isVisible ? "Hide section" : "Show section"}
            >
              {openSection.isVisible ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => void handleDelete(openSection.id)}
              aria-label="Delete section"
              className="text-muted-foreground hover:border-destructive/45 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={blockSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleBlockDragEnd}
      >
        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-3 py-3">
          <BlockList
            sectionId={openSection.id}
            onOpenSharedCoverSettings={() =>
              openSectionWideSettings("section-cover", "editor")
            }
          />
        </div>
      </DndContext>
    </div>
  );
}
