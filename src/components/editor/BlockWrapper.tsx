"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Banknote,
  Copy,
  Clock,
  CloudSun,
  Code2,
  Contact,
  ExternalLink,
  FileText,
  Grid2X2,
  Eye,
  EyeOff,
  GripVertical,
  Heading1,
  Loader2,
  ListChecks,
  MoreHorizontal,
  Trash2,
  Image as ImageIcon,
  Wifi,
  Languages,
  LayoutGrid,
  Lock,
  MousePointer2,
  CircleHelp,
  PanelTop,
  PanelsTopLeft,
  Rows3,
  ShieldAlert,
  SplitSquareHorizontal,
  Table2,
  Tv,
  Video,
  Images,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useEditorStore, type EditorBlock } from "@/stores/editor-store";

type Props = {
  block: EditorBlock;
  sectionId: string;
  dragHandleProps?: Record<string, unknown>;
  accent?: BlockCardAccent;
  saving?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export type BlockCardAccent =
  | "ink"
  | "green"
  | "blue"
  | "teal"
  | "amber"
  | "orange"
  | "violet";

function prettyBlockType(type: string) {
  return type
    .split("_")
    .join(" ")
    .replace(/^\w/, (m) => m.toUpperCase());
}

const BLOCK_TYPE_LABEL: Record<string, string> = {
  text: "Text Block",
  heading: "Heading Block",
  image: "Image Block",
  wifi: "Wi-Fi Block",
  divider: "Divider Block",
  container: "Container Block",
  faq: "FAQ Block",
  video: "Video Block",
  gallery: "Gallery Block",
  icon_grid: "Icon Grid Block",
  image_cards: "Image Cards Block",
  tile_set: "Tile Set Block",
  custom_html: "HTML Code Block",
  button: "Button Block",
  booking_link: "Booking Link Block",
  streaming: "Streaming Block",
  world_clock: "World Clock Block",
  smart_lock: "Smart Lock Block",
  emergency_contacts: "Emergency Contacts Block",
  phrasebook: "Phrasebook Block",
  currency: "Currency Block",
  weather: "Weather Block",
};

function textVariantLabel(content: Record<string, unknown>): string {
  const variant = content.variant;
  if (variant === "callout") return "Info Card Block";
  if (variant === "checklist") return "List Block";
  if (variant === "card") return "Info Card Block";
  if (variant === "facts") return "Facts Grid Block";
  if (variant === "stack") return "Icon Stack Block";
  if (variant === "contacts") return "Contact Rows Block";
  if (variant === "alert") return "Alert Banner Block";
  return "Rich Text Block";
}

function BlockIcon({ block }: { block: EditorBlock }) {
  const className = "h-3.5 w-3.5";
  const textVariant =
    typeof block.content.variant === "string" ? block.content.variant : "";

  if (block.type === "text") {
    if (textVariant === "callout") {
      return <PanelTop className={className} aria-hidden />;
    }
    if (textVariant === "checklist") {
      return <ListChecks className={className} aria-hidden />;
    }
    if (textVariant === "card") {
      return <PanelTop className={className} aria-hidden />;
    }
    if (textVariant === "facts") {
      return <Table2 className={className} aria-hidden />;
    }
    if (textVariant === "stack") {
      return <Rows3 className={className} aria-hidden />;
    }
    if (textVariant === "contacts") {
      return <Contact className={className} aria-hidden />;
    }
    if (textVariant === "alert") {
      return <AlertTriangle className={className} aria-hidden />;
    }
    return <FileText className={className} aria-hidden />;
  }

  if (block.type === "heading") return <Heading1 className={className} aria-hidden />;
  if (block.type === "image") return <ImageIcon className={className} aria-hidden />;
  if (block.type === "wifi") return <Wifi className={className} aria-hidden />;
  if (block.type === "divider") {
    return <SplitSquareHorizontal className={className} aria-hidden />;
  }
  if (block.type === "container") {
    return <PanelsTopLeft className={className} aria-hidden />;
  }
  if (block.type === "button") {
    return <MousePointer2 className={className} aria-hidden />;
  }
  if (block.type === "booking_link") {
    return <ExternalLink className={className} aria-hidden />;
  }
  if (block.type === "streaming") return <Tv className={className} aria-hidden />;
  if (block.type === "world_clock") return <Clock className={className} aria-hidden />;
  if (block.type === "smart_lock") return <Lock className={className} aria-hidden />;
  if (block.type === "emergency_contacts") {
    return <ShieldAlert className={className} aria-hidden />;
  }
  if (block.type === "phrasebook") {
    return <Languages className={className} aria-hidden />;
  }
  if (block.type === "currency") return <Banknote className={className} aria-hidden />;
  if (block.type === "weather") return <CloudSun className={className} aria-hidden />;
  if (block.type === "video") return <Video className={className} aria-hidden />;
  if (block.type === "gallery") return <Images className={className} aria-hidden />;
  if (block.type === "faq") return <CircleHelp className={className} aria-hidden />;
  if (block.type === "icon_grid") {
    return <LayoutGrid className={className} aria-hidden />;
  }
  if (block.type === "image_cards") {
    return <PanelsTopLeft className={className} aria-hidden />;
  }
  if (block.type === "tile_set") return <Grid2X2 className={className} aria-hidden />;
  if (block.type === "custom_html") return <Code2 className={className} aria-hidden />;

  return <Info className={className} aria-hidden />;
}

export function BlockWrapper({
  block,
  sectionId,
  dragHandleProps,
  accent = "ink",
  saving = false,
  className,
  children,
}: Props) {
  const activeBlockId = useEditorStore((s) => s.activeBlockId);
  const setActiveBlock = useEditorStore((s) => s.setActiveBlock);
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const deleteBlock = useEditorStore((s) => s.deleteBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const reorderBlocks = useEditorStore((s) => s.reorderBlocks);
  const moveBlock = useEditorStore((s) => s.moveBlock);
  const setActiveSection = useEditorStore((s) => s.setActiveSection);
  const sections = useEditorStore((s) => s.sections);

  const blockIds = useMemo(() => {
    const section = sections.find((s) => s.id === sectionId);
    return section?.blocks.map((b) => b.id) ?? [];
  }, [sections, sectionId]);

  const index = blockIds.indexOf(block.id);
  const canMoveUp = index > 0;
  const canMoveDown = index !== -1 && index < blockIds.length - 1;
  const isActive = activeBlockId === block.id;
  const blockLabel =
    block.type === "text"
      ? textVariantLabel(block.content)
      : BLOCK_TYPE_LABEL[block.type] ?? `${prettyBlockType(block.type)} Block`;
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (!isActive) return;
    // Active blocks should reveal their editor, especially right after insert.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(false);
  }, [isActive]);

  const moveBy = (offset: -1 | 1) => {
    if (index === -1) return;
    const target = index + offset;
    if (target < 0 || target >= blockIds.length) return;
    const next = [...blockIds];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    reorderBlocks(sectionId, next);
  };

  return (
    <div
      data-active={isActive}
      data-collapsed={collapsed}
      data-accent={accent}
      data-saving={saving}
      className={cn(
        "block-card overflow-hidden transition-all",
        !isActive && "hover:bg-background",
        className
      )}
      onClick={() => setActiveBlock(block.id)}
    >
      <div
        className="block-card-header flex cursor-pointer items-center gap-1.5 px-2 py-1.5"
        onClick={() => {
          setActiveBlock(block.id);
          setCollapsed((prev) => !prev);
        }}
      >
        <button
          type="button"
          aria-label="Drag block"
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground active:cursor-grabbing"
          {...(dragHandleProps ?? {})}
        >
          <GripVertical className="h-3.5 w-3" />
        </button>

        <button
          type="button"
          aria-label={collapsed ? "Expand block" : "Collapse block"}
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((prev) => !prev);
          }}
          className="flex h-7 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>

        <span className="block-card-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
          <BlockIcon block={block} />
        </span>

        <div className="min-w-0">
          <p className="block-card-title truncate text-sm font-semibold">
            {blockLabel}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {saving ? (
            <span className="block-card-status inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Adding block...
            </span>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={saving}
            onClick={(e) => {
              e.stopPropagation();
              updateBlock(block.id, { isVisible: !block.isVisible });
            }}
            aria-label={block.isVisible ? "Hide block" : "Show block"}
            className="text-muted-foreground/80 hover:text-foreground"
          >
            {block.isVisible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={saving}
            onClick={(e) => {
              e.stopPropagation();
              deleteBlock(block.id);
            }}
            aria-label="Delete block"
            className="text-muted-foreground/80 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={saving}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Block actions"
                  className="text-muted-foreground hover:text-foreground"
                />
              }
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Display</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    updateBlock(block.id, { isVisible: !block.isVisible });
                  }}
                >
                  {block.isVisible ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {block.isVisible ? "Hide block" : "Show block"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuLabel>Reorder</DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={!canMoveUp}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBy(-1);
                  }}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!canMoveDown}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBy(1);
                  }}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Move down
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateBlock(block.id);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </DropdownMenuItem>

              {sections.filter((section) => section.id !== sectionId).length > 0 ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Move to section
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {sections
                      .filter((section) => section.id !== sectionId)
                      .map((section) => (
                        <DropdownMenuItem
                          key={section.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveBlock(block.id, section.id, section.blocks.length);
                            setActiveSection(section.id);
                          }}
                        >
                          {section.title}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ) : null}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBlock(block.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!collapsed ? (
        <div className="block-card-body editor-form px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}
