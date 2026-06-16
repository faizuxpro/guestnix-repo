"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LibraryBig, Plus } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import {
  getAssetBlockContent,
  getAssetBlockType,
} from "@/lib/assets-hub";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, randomUUID } from "@/lib/utils";
import { useAssetsHubContentBlocks } from "@/hooks/use-assets-hub-content-blocks";
import { useEditorStore, type EditorBlock } from "@/stores/editor-store";
import { BLOCK_OPTIONS, type BlockOption } from "./AddBlockMenu";
import {
  BlockPickerCommand,
  groupBlockOptions,
  type GroupedBlockOptions,
} from "./BlockOptionPicker";
import { BlockWrapper, type BlockCardAccent } from "./BlockWrapper";
import { BlockContentEditor } from "./blocks/BlockContentEditor";
import { SectionCoverEditor } from "./SectionCoverEditor";

type Props = {
  sectionId: string;
  onOpenSharedCoverSettings?: () => void;
};

const INSERT_PREFIX = "insert:";
const MOBILE_PICKER_QUERY = "(max-width: 640px)";
const ADDING_STATE_MIN_MS = 700;
const EMPTY_BLOCKS: EditorBlock[] = [];
const BLOCK_CARD_ACCENTS = [
  "ink",
  "green",
  "blue",
  "teal",
  "amber",
  "orange",
  "violet",
] as const satisfies readonly BlockCardAccent[];

function subscribeMobilePicker(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(MOBILE_PICKER_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getMobilePickerSnapshot() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(MOBILE_PICKER_QUERY).matches
  );
}

function useMobilePicker() {
  return useSyncExternalStore(
    subscribeMobilePicker,
    getMobilePickerSnapshot,
    () => false
  );
}

function waitForMinimumState(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function escapeEditorSelector(value: string) {
  return typeof globalThis.CSS !== "undefined" &&
    typeof globalThis.CSS.escape === "function"
    ? globalThis.CSS.escape(value)
    : value.replace(/["\\]/g, "\\$&");
}

function ContentEditor({ block }: { block: EditorBlock }) {
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const setContent = (content: Record<string, unknown>) =>
    updateBlock(block.id, { content });

  return <BlockContentEditor block={block} onChange={setContent} />;
}

function SortableBlock({
  block,
  sectionId,
  accent,
  saving,
  recentlyAdded,
}: {
  block: EditorBlock;
  sectionId: string;
  accent: BlockCardAccent;
  saving: boolean;
  recentlyAdded: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `block:${block.id}`,
      data: { type: "block", blockId: block.id, sectionId },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-editor-block-id={block.id}
      className={isDragging ? "opacity-60" : undefined}
    >
      <BlockWrapper
        block={block}
        sectionId={sectionId}
        accent={accent}
        saving={saving}
        dragHandleProps={{ ...attributes, ...listeners }}
        className={recentlyAdded ? "block-card--new" : undefined}
      >
        <ContentEditor block={block} />
      </BlockWrapper>
    </div>
  );
}

function InsertRailContent({
  open,
  empty,
}: {
  open: boolean;
  empty: boolean;
}) {
  return (
    <>
      <span className="editor-insert-line" />
      <span className="editor-insert-chip">
        <Plus className="h-3.5 w-3.5" />
        <span className="editor-insert-label">
          {empty ? "Add first block" : open ? "Choose block" : "Add block here"}
        </span>
      </span>
    </>
  );
}

function InsertRow({
  sectionId,
  index,
  open,
  empty,
  useSheetPicker,
  onOpenChange,
  onAdd,
  creating,
  options,
}: {
  sectionId: string;
  index: number;
  open: boolean;
  empty: boolean;
  useSheetPicker: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (index: number, option: BlockOption) => Promise<void>;
  creating: boolean;
  options: GroupedBlockOptions;
}) {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: `${INSERT_PREFIX}${sectionId}:${index}`,
  });
  const draggingBlock = String(active?.id ?? "").startsWith("block:");
  const isDropTarget = isOver && draggingBlock;

  const rowClassName = cn(
    "editor-insert-row",
    isDropTarget && "editor-insert-row--drop"
  );

  const railButtonClassName = "editor-insert-trigger";

  const row = (
    <div
      ref={setNodeRef}
      className={rowClassName}
      data-open={open}
      data-empty={empty}
    >
      {useSheetPicker ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className={railButtonClassName}
          aria-label={`Add block at position ${index + 1}`}
        >
          <InsertRailContent open={open} empty={empty} />
        </button>
      ) : (
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={railButtonClassName}
                aria-label={`Add block at position ${index + 1}`}
              />
            }
          >
            <InsertRailContent open={open} empty={empty} />
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(30rem,calc(100vw-2rem))] p-1.5"
            align="center"
            sideOffset={6}
          >
            <BlockPickerCommand
              options={options}
              creating={creating}
              onAdd={(option) => void onAdd(index, option)}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );

  return row;
}

export function BlockList({ sectionId, onOpenSharedCoverSettings }: Props) {
  const sections = useEditorStore((s) => s.sections);
  const guidebookId = useEditorStore((s) => s.guidebookId);
  const addBlockLocal = useEditorStore((s) => s.addBlock);
  const deleteBlockLocal = useEditorStore((s) => s.deleteBlock);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const updateSection = useEditorStore((s) => s.updateSection);
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const activeBlockId = useEditorStore((s) => s.activeBlockId);
  const applyDraftTouch = useEditorStore((s) => s.applyDraftTouch);
  const { assets: savedContentBlocks } = useAssetsHubContentBlocks();
  const useSheetPicker = useMobilePicker();

  const section = sections.find((s) => s.id === sectionId);
  const blocks = section?.blocks ?? EMPTY_BLOCKS;

  const [openInsertIndex, setOpenInsertIndex] = useState<number | null>(null);
  const [recentlyAddedBlockId, setRecentlyAddedBlockId] = useState<string | null>(
    null
  );
  const [addingBlockId, setAddingBlockId] = useState<string | null>(null);
  const recentTimerRef = useRef<number | null>(null);
  const lastAutoScrolledBlockRef = useRef<{
    blockId: string | null;
    sectionId: string | null;
    completed: boolean;
  }>({ blockId: null, sectionId: null, completed: false });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    return () => {
      if (recentTimerRef.current) {
        window.clearTimeout(recentTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeBlockId || !blocks.some((block) => block.id === activeBlockId)) {
      lastAutoScrolledBlockRef.current = {
        blockId: null,
        sectionId: null,
        completed: false,
      };
      return;
    }

    const scrollKey = { blockId: activeBlockId, sectionId };
    const lastScroll = lastAutoScrolledBlockRef.current;
    if (
      lastScroll.blockId === scrollKey.blockId &&
      lastScroll.sectionId === scrollKey.sectionId &&
      lastScroll.completed
    ) {
      return;
    }

    lastAutoScrolledBlockRef.current = { ...scrollKey, completed: false };

    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-editor-block-id="${escapeEditorSelector(activeBlockId)}"]`
      );
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        lastAutoScrolledBlockRef.current = { ...scrollKey, completed: true };
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeBlockId, blocks, sectionId]);

  const savedOptions = useMemo<BlockOption[]>(
    () =>
      savedContentBlocks.map((asset) => ({
        id: `asset:${asset.id}`,
        type: getAssetBlockType(asset),
        label: asset.name,
        category: "Content",
        icon: LibraryBig,
        defaultContent: getAssetBlockContent(asset),
        source: "assets_hub",
        assetId: asset.id,
      })),
    [savedContentBlocks]
  );

  const groupedOptions = useMemo(
    () => groupBlockOptions([...savedOptions, ...BLOCK_OPTIONS]),
    [savedOptions]
  );

  const showAddedPulse = (blockId: string) => {
    setRecentlyAddedBlockId(blockId);
    if (recentTimerRef.current) {
      window.clearTimeout(recentTimerRef.current);
    }
    recentTimerRef.current = window.setTimeout(() => {
      setRecentlyAddedBlockId((current) =>
        current === blockId ? null : current
      );
      recentTimerRef.current = null;
    }, 1400);
  };

  const createBlockAt = async (insertIndex: number, option: BlockOption) => {
    if (!guidebookId || !section || creating) return;

    const blockId = randomUUID();
    addBlockLocal(section.id, {
      id: blockId,
      type: option.type,
      content: structuredClone(option.defaultContent) as Record<string, unknown>,
      orderIndex: blocks.length,
      isVisible: true,
    });
    if (insertIndex < blocks.length) {
      moveBlock(blockId, section.id, insertIndex);
    }
    setOpenInsertIndex(null);
    setAddingBlockId(blockId);
    const minimumAddingState = waitForMinimumState(ADDING_STATE_MIN_MS);
    window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-editor-block-id="${blockId}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    setCreating(true);
    const result = await apiFetch<EditorBlock>("/api/blocks", {
      method: "POST",
      body: {
        id: blockId,
        sectionId: section.id,
        guidebookId,
        type: option.type,
        content: option.defaultContent,
        orderIndex: insertIndex,
      },
    });
    await minimumAddingState;
    setCreating(false);

    if (!result.ok) {
      setAddingBlockId((current) => (current === blockId ? null : current));
      deleteBlockLocal(blockId);
      toastApiError(result.error, {
        title: "Couldn't add block",
        onRetry: () => void createBlockAt(insertIndex, option),
      });
      return;
    }
    setAddingBlockId((current) => (current === blockId ? null : current));
    showAddedPulse(blockId);
    applyDraftTouch(result.data);

    if (option.assetId) {
      void apiFetch(`/api/assets-hub/${option.assetId}/use`, { method: "POST" });
    }
  };

  const closePicker = () => setOpenInsertIndex(null);
  const openPickerAt = (index: number) => setOpenInsertIndex(index);
  const selectedInsertIndex = openInsertIndex ?? 0;

  return (
    <div className="editor-blocks-root space-y-1">
      {section ? (
        <SectionCoverEditor
          section={section}
          guidebookSettings={guidebookSettings}
          onSectionChange={updateSection}
          onOpenSharedCoverSettings={onOpenSharedCoverSettings}
        />
      ) : null}

      <SortableContext
        items={blocks.map((b) => `block:${b.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <InsertRow
          sectionId={sectionId}
          index={0}
          open={openInsertIndex === 0}
          empty={blocks.length === 0}
          useSheetPicker={useSheetPicker}
          onOpenChange={(next) => (next ? openPickerAt(0) : closePicker())}
          onAdd={createBlockAt}
          creating={creating}
          options={groupedOptions}
        />

        {blocks.map((block, index) => {
          const insertIndex = index + 1;
          return (
            <div key={block.id} className="space-y-1">
              <SortableBlock
                block={block}
                sectionId={sectionId}
                accent={BLOCK_CARD_ACCENTS[index % BLOCK_CARD_ACCENTS.length]}
                saving={addingBlockId === block.id}
                recentlyAdded={recentlyAddedBlockId === block.id}
              />

              <InsertRow
                sectionId={sectionId}
                index={insertIndex}
                open={openInsertIndex === insertIndex}
                empty={false}
                useSheetPicker={useSheetPicker}
                onOpenChange={(next) =>
                  next ? openPickerAt(insertIndex) : closePicker()
                }
                onAdd={createBlockAt}
                creating={creating}
                options={groupedOptions}
              />
            </div>
          );
        })}
      </SortableContext>

      {useSheetPicker ? (
        <Sheet
          open={openInsertIndex !== null}
          onOpenChange={(open) => {
            if (!open) closePicker();
          }}
        >
          <SheetContent
            side="bottom"
            className="max-h-[82vh] gap-0 rounded-t-2xl p-0"
          >
            <SheetHeader className="border-b border-border/70 px-4 py-3">
              <SheetTitle>Add block</SheetTitle>
              <SheetDescription>
                Inserts at position {selectedInsertIndex + 1}.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 overflow-y-auto p-2">
              <BlockPickerCommand
                options={groupedOptions}
                creating={creating}
                onAdd={(option) => void createBlockAt(selectedInsertIndex, option)}
              />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
