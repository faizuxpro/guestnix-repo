"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Blocks,
  BookMarked,
  Brush,
  Home,
  Image as ImageIcon,
  LibraryBig,
  LayoutTemplate,
  Loader2,
  MapPin,
  MapPinned,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { PLACE_CATEGORIES } from "@/lib/constants";
import type { HostAsset, HostAssetType } from "@/lib/assets-hub";
import {
  ASSET_TYPE_LABELS,
  getAssetBlockContent,
  getAssetBlockType,
  getMediaAssetFolder,
  getRecommendationGroupKey,
  getRecommendationGroupLabel,
  getReusableSectionBlocks,
  getReusableSectionIcon,
  getReusableSectionTitle,
} from "@/lib/assets-hub";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { nearbyCategoryLabel } from "@/lib/nearby-categories";
import { cn, randomUUID } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFeedbackDialog } from "@/components/ui/feedback-dialog";
import { HostIcon } from "@/components/icons/HostIcon";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import { AssetsHubRecommendationsDialog } from "@/components/dashboard/assets-hub/AssetsHubRecommendationsDialog";
import { BLOCK_OPTIONS, type BlockOption } from "@/components/editor/AddBlockMenu";
import {
  BlockPickerCommand,
  groupBlockOptions,
  sortBlockOptionsByUsage,
  type GroupedBlockOptions,
} from "@/components/editor/BlockOptionPicker";
import { BlockContentEditor } from "@/components/editor/blocks/BlockContentEditor";
import { useAssetsHubContentBlocks } from "@/hooks/use-assets-hub-content-blocks";
import type { EditorBlock } from "@/stores/editor-store";
import { BlockRenderer } from "@/templates/sunset-lakehouse/blocks";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import type { TemplateBlock } from "@/templates/sunset-lakehouse/types";
import "@/templates/sunset-lakehouse/styles.css";

type HubTab =
  | "content_block"
  | "media"
  | "brand_kit"
  | "property_host_profile"
  | "local_recommendation";

type HubTabAccent = {
  bg: string;
  color: string;
};

type CreateAssetKind = HubTab | "section_template";
type RecommendationsInitialMode = "browse" | "add-by-map";

type AssetPayload = {
  assetType: HostAssetType;
  name: string;
  description?: string | null;
  content: Record<string, unknown>;
  fileUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  tags?: string[];
};

type SubmitMode = "create" | "edit";

const TABS: Array<{
  value: HubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: HubTabAccent;
}> = [
  {
    value: "content_block",
    label: "Knowledge Base",
    icon: BookMarked,
    accent: { bg: "#EEF4FF", color: "#4D7CFF" },
  },
  {
    value: "media",
    label: "Media",
    icon: ImageIcon,
    accent: { bg: "#FFF8E8", color: "#FFB020" },
  },
  {
    value: "brand_kit",
    label: "Brand Kit",
    icon: Brush,
    accent: { bg: "#F3F0FF", color: "#7C5CFF" },
  },
  {
    value: "property_host_profile",
    label: "Property & Host",
    icon: Home,
    accent: { bg: "#ECFFF5", color: "#1FBF8F" },
  },
  {
    value: "local_recommendation",
    label: "Local Recommendations",
    icon: MapPin,
    accent: { bg: "#FFF3EE", color: "#FF6B3D" },
  },
];

const DEFAULT_COUNTS: Record<HubTab, number> = {
  content_block: 0,
  media: 0,
  brand_kit: 0,
  property_host_profile: 0,
  local_recommendation: 0,
};

const PROPERTY_HOST_TYPES = new Set<HostAssetType>([
  "host_profile",
  "property_asset",
  "property_host_profile",
]);

function tabAccentStyle(accent: HubTabAccent, active: boolean) {
  if (!active) return undefined;

  return {
    backgroundColor: accent.bg,
    borderColor: `${accent.color}33`,
    color: accent.color,
  };
}

const BLOCK_OPTION_BY_ID = new Map(BLOCK_OPTIONS.map((option) => [option.id, option]));

function cloneRecord(value: Record<string, unknown>) {
  return structuredClone(value) as Record<string, unknown>;
}

function blockOptionLabel(type: string) {
  const option = BLOCK_OPTIONS.find((item) => item.type === type);
  return option?.label ?? type.replaceAll("_", " ");
}

function assetTab(asset: HostAsset): HubTab {
  if (PROPERTY_HOST_TYPES.has(asset.assetType)) return "property_host_profile";
  if (asset.assetType === "section_template") return "content_block";
  return asset.assetType as HubTab;
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function tagsToInput(tags: string[] | null | undefined) {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

function textValue(
  content: Record<string, unknown> | undefined,
  key: string,
  fallback = ""
) {
  const value = content?.[key];
  return typeof value === "string" ? value : fallback;
}

function numberValue(
  content: Record<string, unknown> | undefined,
  key: string,
  fallback = 0
) {
  const value = content?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function recommendationSourceFields(content: Record<string, unknown>) {
  const fields: Record<string, unknown> = {};
  for (const key of ["sourceQuery", "sourceLocation", "sourceCategory"]) {
    const value = content[key];
    if (typeof value === "string" && value.trim()) fields[key] = value;
  }
  for (const key of ["sourceLat", "sourceLng", "sourceRadiusMiles"]) {
    const value = content[key];
    if (typeof value === "number" && Number.isFinite(value)) fields[key] = value;
  }
  return fields;
}

function nestedRecord(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function rawAssetBlockContent(asset: HostAsset, fallback: BlockOption) {
  const raw = asset.content?.blockContent;
  return typeof raw === "object" && raw !== null && !Array.isArray(raw)
    ? cloneRecord(raw as Record<string, unknown>)
    : defaultBlockContent(fallback);
}

function makeEditorBlock(
  id: string,
  type: string,
  content: Record<string, unknown>,
  orderIndex = 0
): EditorBlock {
  return {
    id,
    type,
    content,
    orderIndex,
    isVisible: true,
  };
}

function defaultBlockContent(option: BlockOption) {
  return cloneRecord(option.defaultContent);
}

function CountPill({ count, active }: { count: number; active: boolean }) {
  return (
    <span
      className={cn(
        "ml-1 rounded-full px-1.5 text-[11px] font-medium tabular-nums",
        active
          ? "bg-white/70 text-current ring-1 ring-black/5"
          : "bg-muted-foreground/15"
      )}
    >
      {count}
    </span>
  );
}

function EmptyPanel({ tab }: { tab: HubTab }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-16 text-center">
      <Blocks className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
      <p className="text-sm font-medium">
        No {ASSET_TYPE_LABELS[tab].toLowerCase()} yet
      </p>
    </div>
  );
}

function BlockPreview({
  type,
  content,
  compact = false,
}: {
  type: string;
  content: Record<string, unknown>;
  compact?: boolean;
}) {
  const block = useMemo<TemplateBlock>(
    () => ({
      id: "asset-preview",
      type,
      content,
      isVisible: true,
      orderIndex: 0,
    }),
    [content, type]
  );

  return (
    <div
      className={cn(
        "tpl-sunset h-full w-full overflow-hidden rounded-md bg-[#faf6ef] text-left",
        compact ? "h-44 p-3" : "min-h-[180px] p-4"
      )}
    >
      <div className={compact ? "scale-[0.82] origin-top-left" : undefined}>
        <BlockRenderer block={block} />
      </div>
    </div>
  );
}

function SectionAssetPreview({ asset }: { asset: HostAsset }) {
  const blocks = getReusableSectionBlocks(asset).slice(0, 3);
  if (blocks.length === 0) {
    return (
      <div className="grid h-44 place-items-center rounded-md bg-muted/30 text-xs text-muted-foreground">
        Empty section
      </div>
    );
  }

  return (
    <div className="tpl-sunset h-44 overflow-hidden rounded-md bg-[#faf6ef] p-4">
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <BlockRenderer
            key={`${block.type}-${index}`}
            block={{
              id: `${asset.id}-${index}`,
              type: block.type,
              content: block.content,
              isVisible: true,
              orderIndex: index,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function categoryCounts(assets: HostAsset[]) {
  const counts = new Map<string, number>();
  for (const asset of assets) {
    const category = textValue(asset.content, "category", "other");
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return Array.from(counts.entries());
}

function AssetVisual({ asset }: { asset: HostAsset }) {
  const content = asset.content ?? {};

  if (asset.assetType === "content_block") {
    return (
      <BlockPreview
        type={getAssetBlockType(asset)}
        content={getAssetBlockContent(asset)}
        compact
      />
    );
  }

  if (asset.assetType === "section_template") {
    return <SectionAssetPreview asset={asset} />;
  }

  if (asset.assetType === "media") {
    return asset.fileUrl ? (
      <div
        className="h-44 rounded-md border bg-muted bg-cover bg-center"
        style={{ backgroundImage: `url(${asset.fileUrl})` }}
      />
    ) : (
      <div className="grid h-44 place-items-center rounded-md border bg-muted/30">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (asset.assetType === "brand_kit") {
    const colors = [
      textValue(content, "primary_color", "#0f766e"),
      textValue(content, "secondary_color", "#d4a23a"),
      textValue(content, "accent_color", "#111827"),
    ];
    return (
      <div className="h-44 overflow-hidden rounded-md border bg-background">
        <div className="flex h-24">
          {colors.map((color) => (
            <span key={color} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
        <div className="space-y-1 p-3">
          <p className="truncate text-sm font-semibold">
            {textValue(content, "heading_font", "Heading font")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {textValue(content, "body_font", "Body font")}
          </p>
        </div>
      </div>
    );
  }

  if (asset.assetType === "property_host_profile") {
    const property = nestedRecord(content, "property");
    const host = nestedRecord(content, "host");
    return (
      <div className="grid h-44 gap-2 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center gap-3 rounded-md bg-background p-2">
          <Home className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {textValue(property, "name", "Property")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {textValue(property, "city") || textValue(property, "address")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md bg-background p-2">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {textValue(host, "name", "Host")}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {textValue(host, "email") || textValue(host, "phone")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (asset.assetType === "host_profile" || asset.assetType === "property_asset") {
    return (
      <div className="grid h-44 place-items-center rounded-md border bg-muted/20 p-4 text-center">
        {asset.fileUrl ? (
          <div
            className={cn(
              "h-24 w-24 border bg-muted bg-cover bg-center",
              asset.assetType === "host_profile" ? "rounded-full" : "rounded-md"
            )}
            style={{ backgroundImage: `url(${asset.fileUrl})` }}
          />
        ) : asset.assetType === "host_profile" ? (
          <UserRound className="h-9 w-9 text-muted-foreground" />
        ) : (
          <Home className="h-9 w-9 text-muted-foreground" />
        )}
      </div>
    );
  }

  if (asset.assetType === "local_recommendation") {
    const category = textValue(content, "category", "other");
    return (
      <div className="flex h-44 flex-col justify-between rounded-md border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{nearbyCategoryLabel(category)}</Badge>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="line-clamp-2 text-lg font-semibold">{asset.name}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {textValue(content, "address") || asset.description || "Saved place"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-44 place-items-center rounded-md border bg-muted/20">
      <Blocks className="h-8 w-8 text-muted-foreground" />
    </div>
  );
}

function AssetLibraryCard({
  asset,
  deletingId,
  onEdit,
  onDelete,
}: {
  asset: HostAsset;
  deletingId: string | null;
  onEdit: (asset: HostAsset) => void;
  onDelete: (asset: HostAsset) => void;
}) {
  const blockCount =
    asset.assetType === "section_template"
      ? getReusableSectionBlocks(asset).length
      : null;
  const typeLabel =
    asset.assetType === "content_block"
      ? blockOptionLabel(getAssetBlockType(asset))
      : ASSET_TYPE_LABELS[asset.assetType];

  return (
    <article className="group flex min-h-full flex-col rounded-lg border bg-background p-3 shadow-sm transition hover:border-primary/35 hover:shadow-md">
      <div className="relative">
        <AssetVisual asset={asset} />
        <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition group-hover:opacity-100">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={() => onEdit(asset)}
            aria-label={`Edit ${asset.name}`}
            className="bg-background/95"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            onClick={() => onDelete(asset)}
            disabled={deletingId === asset.id}
            aria-label={`Delete ${asset.name}`}
            className="bg-background/95 text-muted-foreground hover:text-destructive"
          >
            {deletingId === asset.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{asset.name}</h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {asset.assetType === "media"
                ? getMediaAssetFolder(asset)
                : asset.description || typeLabel}
            </p>
          </div>
          {asset.usageCount > 0 ? (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              Used {asset.usageCount}x
            </Badge>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {typeLabel}
          </Badge>
          {asset.assetType === "media" ? (
            <Badge variant="outline" className="text-[10px]">
              {getMediaAssetFolder(asset)}
            </Badge>
          ) : null}
          {blockCount !== null ? (
            <Badge variant="outline" className="text-[10px]">
              {blockCount} block{blockCount === 1 ? "" : "s"}
            </Badge>
          ) : null}
          {asset.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </article>
  );
}

function AssetGrid({
  assets,
  deletingId,
  onEdit,
  onDelete,
}: {
  assets: HostAsset[];
  deletingId: string | null;
  onEdit: (asset: HostAsset) => void;
  onDelete: (asset: HostAsset) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((asset) => (
        <AssetLibraryCard
          key={asset.id}
          asset={asset}
          deletingId={deletingId}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function groupRecommendationAssets(assets: HostAsset[]) {
  const groups = new Map<
    string,
    { key: string; label: string; assets: HostAsset[] }
  >();

  for (const asset of assets) {
    const key = getRecommendationGroupKey(asset);
    const existing = groups.get(key);
    if (existing) {
      existing.assets.push(asset);
    } else {
      groups.set(key, {
        key,
        label: getRecommendationGroupLabel(asset),
        assets: [asset],
      });
    }
  }

  return Array.from(groups.values());
}

function GroupedRecommendationAssetList({
  assets,
  deletingId,
  onEdit,
  onDelete,
}: {
  assets: HostAsset[];
  deletingId: string | null;
  onEdit: (asset: HostAsset) => void;
  onDelete: (asset: HostAsset) => void;
}) {
  const groups = groupRecommendationAssets(assets);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key} className="space-y-3 rounded-lg border bg-muted/15 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-background text-muted-foreground">
                <MapPinned className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">{group.label}</h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {categoryCounts(group.assets).slice(0, 5).map(([category, count]) => (
                    <Badge key={category} variant="outline" className="bg-background text-[10px]">
                      {nearbyCategoryLabel(category)} {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {group.assets.length} place{group.assets.length === 1 ? "" : "s"}
            </Badge>
          </div>
          <AssetGrid
            assets={group.assets}
            deletingId={deletingId}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </section>
      ))}
    </div>
  );
}

function AssetList({
  assets,
  tab,
  deletingId,
  onEdit,
  onDelete,
}: {
  assets: HostAsset[];
  tab: HubTab;
  deletingId: string | null;
  onEdit: (asset: HostAsset) => void;
  onDelete: (asset: HostAsset) => void;
}) {
  if (assets.length === 0) return <EmptyPanel tab={tab} />;

  if (tab === "local_recommendation") {
    return (
      <GroupedRecommendationAssetList
        assets={assets}
        deletingId={deletingId}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }

  return (
    <AssetGrid
      assets={assets}
      deletingId={deletingId}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

function KnowledgeBaseForm({
  saving,
  asset,
  mode = "create",
  onSubmit,
}: {
  saving: boolean;
  asset?: HostAsset | null;
  mode?: SubmitMode;
  onSubmit: (payload: AssetPayload) => Promise<void>;
}) {
  const [name, setName] = useState(asset?.name ?? "");
  const [description, setDescription] = useState(asset?.description ?? "");
  const initialBlockType = textValue(asset?.content, "blockType", "text");
  const initialOption =
    BLOCK_OPTIONS.find(
      (option) => option.id === textValue(asset?.content, "blockOptionId")
    ) ?? BLOCK_OPTIONS.find((option) => option.type === initialBlockType) ?? BLOCK_OPTIONS[0];
  const [blockOptionId, setBlockOptionId] = useState(initialOption.id);
  const [blockContent, setBlockContent] = useState<Record<string, unknown>>(
    asset ? rawAssetBlockContent(asset, initialOption) : defaultBlockContent(initialOption)
  );
  const [tags, setTags] = useState(tagsToInput(asset?.tags));
  const selectedOption = BLOCK_OPTION_BY_ID.get(blockOptionId) ?? BLOCK_OPTIONS[0];
  const orderedBlockOptions = useMemo(
    () => sortBlockOptionsByUsage(BLOCK_OPTIONS),
    []
  );
  const editorBlock = useMemo(
    () => makeEditorBlock("asset-kb-block", selectedOption.type, blockContent),
    [blockContent, selectedOption.type]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      assetType: "content_block",
      name: name.trim(),
      description: description.trim() || null,
      content: {
        blockType: selectedOption.type,
        blockOptionId: selectedOption.id,
        blockContent,
      },
      tags: parseTags(tags),
    });
    if (mode === "create") {
      setName("");
      setDescription("");
      setTags("");
      setBlockOptionId(BLOCK_OPTIONS[0].id);
      setBlockContent(defaultBlockContent(BLOCK_OPTIONS[0]));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-kb-name`}>Block name</Label>
          <Input
            id={`${mode}-kb-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="House rules intro"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>Block</Label>
          <Select
            value={blockOptionId}
            onValueChange={(value) => {
              const nextOption =
                BLOCK_OPTION_BY_ID.get(value ?? "") ?? BLOCK_OPTIONS[0];
              setBlockOptionId(nextOption.id);
              setBlockContent(defaultBlockContent(nextOption));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {orderedBlockOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TextareaField
        id={`${mode}-kb-description`}
        label="Internal description"
        value={description}
        onChange={setDescription}
        rows={2}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-1.5">
          <Label>Block fields</Label>
          <div className="rounded-lg border bg-muted/10 p-3">
            <BlockContentEditor
              key={selectedOption.id}
              block={editorBlock}
              onChange={setBlockContent}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Preview</Label>
          <BlockPreview type={selectedOption.type} content={blockContent} />
        </div>
      </div>

      <TagsField value={tags} onChange={setTags} id={`${mode}-kb-tags`} />
      <Button type="submit" disabled={saving || !name.trim()}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        {mode === "edit" ? "Save changes" : "Save block"}
      </Button>
    </form>
  );
}

function MediaForm({
  saving,
  asset,
  mode = "create",
  onSubmit,
  onUploadedAsset,
}: {
  saving: boolean;
  asset?: HostAsset | null;
  mode?: SubmitMode;
  onSubmit: (payload: AssetPayload) => Promise<void>;
  onUploadedAsset?: (asset: HostAsset) => void;
}) {
  const [name, setName] = useState(asset?.name ?? "");
  const [folder, setFolder] = useState(textValue(asset?.content, "folder"));
  const [tags, setTags] = useState(tagsToInput(asset?.tags));
  const [fileUrl, setFileUrl] = useState(asset?.fileUrl ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    let uploadedUrl = fileUrl;
    let fileName = asset?.fileName ?? null;
    let mimeType = asset?.mimeType ?? null;
    let fileSize = asset?.fileSize ?? null;
    const parsedTags = parseTags(tags);
    let content: Record<string, unknown> = { folder: folder.trim() || null };

    if (file) {
      setIsUploading(true);
      setUploadProgress(1);
      try {
        const uploaded = await uploadMediaFile(file, {
          name: name.trim() || file.name,
          folder,
          tags: parsedTags,
          assetId: mode === "edit" ? asset?.id : null,
          onProgress: setUploadProgress,
        });
        uploadedUrl = uploaded.url;
        fileName = file.name;
        mimeType = file.type;
        fileSize = file.size;
        if (uploaded.asset) {
          content = uploaded.asset.content;
        }

        if (mode === "create" && uploaded.asset && onUploadedAsset) {
          onUploadedAsset(uploaded.asset);
          setName("");
          setTags("");
          setFolder("");
          setFileUrl("");
          setFile(null);
          toast.success("Media saved");
          return;
        }
      } catch (err) {
        toast.error("Couldn't upload media", {
          description: err instanceof Error ? err.message : undefined,
        });
        return;
      } finally {
        setIsUploading(false);
        window.setTimeout(() => setUploadProgress(0), 400);
      }
    }

    if (!uploadedUrl) {
      toast.error("Add a file or media URL first.");
      return;
    }

    await onSubmit({
      assetType: "media",
      name: name.trim() || file?.name || asset?.name || "Media asset",
      content,
      fileUrl: uploadedUrl,
      fileName,
      mimeType,
      fileSize,
      tags: parsedTags,
    });

    if (mode === "create") {
      setName("");
      setTags("");
      setFolder("");
      setFileUrl("");
      setFile(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-media-name`}>Asset name</Label>
          <Input
            id={`${mode}-media-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pool at sunset"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-media-folder`}>Folder</Label>
          <Input
            id={`${mode}-media-folder`}
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="Unfiled"
          />
        </div>
      </div>
      <div className="rounded-lg border border-dashed bg-muted/20 p-4">
        <Label htmlFor={`${mode}-media-file`} className="mb-2 flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload image
        </Label>
        <Input
          id={`${mode}-media-file`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required={mode === "create" && !fileUrl}
        />
        {isUploading ? (
          <div className="mt-3 space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Saving to Media... {uploadProgress}%
            </p>
          </div>
        ) : file ? (
          <p className="mt-2 truncate text-[11px] text-muted-foreground">
            Ready: {file.name}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-media-url`}>Media URL</Label>
        <Input
          id={`${mode}-media-url`}
          type="url"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <TagsField value={tags} onChange={setTags} id={`${mode}-media-tags`} />
      <Button type="submit" disabled={saving || isUploading || (!file && !fileUrl)}>
        {saving || isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        {isUploading ? "Saving..." : mode === "edit" ? "Save changes" : "Save media"}
      </Button>
    </form>
  );
}

function BrandKitForm({
  saving,
  asset,
  mode = "create",
  onSubmit,
}: {
  saving: boolean;
  asset?: HostAsset | null;
  mode?: SubmitMode;
  onSubmit: (payload: AssetPayload) => Promise<void>;
}) {
  const [name, setName] = useState(asset?.name ?? "Default brand");
  const [primary, setPrimary] = useState(textValue(asset?.content, "primary_color", "#0f766e"));
  const [secondary, setSecondary] = useState(textValue(asset?.content, "secondary_color", "#d4a23a"));
  const [accent, setAccent] = useState(textValue(asset?.content, "accent_color", "#111827"));
  const [headingFont, setHeadingFont] = useState(textValue(asset?.content, "heading_font", "Fraunces"));
  const [bodyFont, setBodyFont] = useState(textValue(asset?.content, "body_font", "Montserrat"));
  const [logoUrl, setLogoUrl] = useState(asset?.fileUrl ?? textValue(asset?.content, "logo_url"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      assetType: "brand_kit",
      name,
      content: {
        primary_color: primary,
        secondary_color: secondary,
        accent_color: accent,
        heading_font: headingFont,
        body_font: bodyFont,
        logo_url: logoUrl || null,
      },
      fileUrl: logoUrl || null,
      tags: asset?.tags?.length ? asset.tags : ["brand"],
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-brand-name`}>Kit name</Label>
        <Input
          id={`${mode}-brand-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Primary", primary, setPrimary],
          ["Secondary", secondary, setSecondary],
          ["Accent", accent, setAccent],
        ].map(([label, value, setter]) => (
          <div key={label as string} className="space-y-1.5">
            <Label>{label as string}</Label>
            <Input
              type="color"
              value={value as string}
              onChange={(e) => (setter as (next: string) => void)(e.target.value)}
              className="h-10 p-1"
            />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id={`${mode}-heading-font`} label="Heading font" value={headingFont} onChange={setHeadingFont} />
        <TextField id={`${mode}-body-font`} label="Body font" value={bodyFont} onChange={setBodyFont} />
      </div>
      <TextField id={`${mode}-logo-url`} label="Logo URL" value={logoUrl} onChange={setLogoUrl} type="url" />
      <Button type="submit" disabled={saving || !name.trim()}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        {mode === "edit" ? "Save changes" : "Save kit"}
      </Button>
    </form>
  );
}

function PropertyHostForm({
  saving,
  asset,
  mode = "create",
  onSubmit,
}: {
  saving: boolean;
  asset?: HostAsset | null;
  mode?: SubmitMode;
  onSubmit: (payload: AssetPayload) => Promise<void>;
}) {
  const assetContent = asset?.content ?? {};
  const initialProperty =
    asset?.assetType === "property_host_profile"
      ? nestedRecord(assetContent, "property")
      : asset?.assetType === "property_asset"
        ? assetContent
        : {};
  const initialHost =
    asset?.assetType === "property_host_profile"
      ? nestedRecord(assetContent, "host")
      : asset?.assetType === "host_profile"
        ? assetContent
        : {};

  const [profileName, setProfileName] = useState(asset?.name ?? "");
  const [propertyName, setPropertyName] = useState(textValue(initialProperty, "name"));
  const [address, setAddress] = useState(textValue(initialProperty, "address"));
  const [city, setCity] = useState(textValue(initialProperty, "city"));
  const [state, setState] = useState(textValue(initialProperty, "state"));
  const [country, setCountry] = useState(textValue(initialProperty, "country"));
  const [photoUrl, setPhotoUrl] = useState(
    asset?.assetType === "property_asset" ? asset.fileUrl ?? "" : textValue(initialProperty, "photo_url")
  );
  const [hostName, setHostName] = useState(textValue(initialHost, "name"));
  const [email, setEmail] = useState(textValue(initialHost, "email"));
  const [phone, setPhone] = useState(textValue(initialHost, "phone"));
  const [languages, setLanguages] = useState(textValue(initialHost, "languages"));
  const [avatarUrl, setAvatarUrl] = useState(
    asset?.assetType === "host_profile" ? asset.fileUrl ?? "" : textValue(initialHost, "avatar_url")
  );
  const [bio, setBio] = useState(asset?.assetType === "host_profile" ? asset.description ?? "" : textValue(initialHost, "bio"));
  const [tags, setTags] = useState(tagsToInput(asset?.tags));

  const propertyContent = {
    name: propertyName,
    address,
    city,
    state,
    country,
    photo_url: photoUrl || null,
  };
  const hostContent = {
    name: hostName,
    email,
    phone,
    languages,
    bio,
    avatar_url: avatarUrl || null,
  };

  const baseName = profileName.trim() || propertyName || hostName || "Property & host profile";

  async function saveCombined() {
    await onSubmit({
      assetType: "property_host_profile",
      name: baseName,
      description: [propertyName, hostName].filter(Boolean).join(" / "),
      content: { property: propertyContent, host: hostContent },
      fileUrl: photoUrl || avatarUrl || null,
      tags: parseTags(tags.length ? tags : "property, host"),
    });
  }

  async function savePropertyOnly() {
    if (!propertyName.trim()) {
      toast.error("Property name is required.");
      return;
    }
    await onSubmit({
      assetType: "property_asset",
      name: propertyName,
      content: propertyContent,
      fileUrl: photoUrl || null,
      tags: parseTags(tags.length ? tags : "property"),
    });
  }

  async function saveHostOnly() {
    if (!hostName.trim()) {
      toast.error("Host name is required.");
      return;
    }
    await onSubmit({
      assetType: "host_profile",
      name: hostName,
      description: bio,
      content: hostContent,
      fileUrl: avatarUrl || null,
      tags: parseTags(tags.length ? tags : "host"),
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "edit") {
      if (asset?.assetType === "host_profile") return saveHostOnly();
      if (asset?.assetType === "property_asset") return savePropertyOnly();
    }
    return saveCombined();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <TextField
        id={`${mode}-profile-name`}
        label="Combined profile name"
        value={profileName}
        onChange={setProfileName}
        placeholder="Beach house with Faiz"
      />

      <div className="rounded-lg border p-3">
        <h3 className="mb-3 text-sm font-semibold">Property</h3>
        <div className="grid gap-3">
          <TextField id={`${mode}-property-name`} label="Property name" value={propertyName} onChange={setPropertyName} />
          <TextField id={`${mode}-property-address`} label="Address" value={address} onChange={setAddress} />
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField id={`${mode}-property-city`} label="City" value={city} onChange={setCity} />
            <TextField id={`${mode}-property-state`} label="State / Region" value={state} onChange={setState} />
            <TextField id={`${mode}-property-country`} label="Country" value={country} onChange={setCountry} />
          </div>
          <TextField id={`${mode}-property-photo`} label="Property photo URL" value={photoUrl} onChange={setPhotoUrl} type="url" />
        </div>
      </div>

      <div className="rounded-lg border p-3">
        <h3 className="mb-3 text-sm font-semibold">Host</h3>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField id={`${mode}-host-name`} label="Host name" value={hostName} onChange={setHostName} />
            <TextField id={`${mode}-host-languages`} label="Languages" value={languages} onChange={setLanguages} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField id={`${mode}-host-email`} label="Email" value={email} onChange={setEmail} type="email" />
            <TextField id={`${mode}-host-phone`} label="Phone" value={phone} onChange={setPhone} />
          </div>
          <TextField id={`${mode}-host-avatar`} label="Host photo URL" value={avatarUrl} onChange={setAvatarUrl} type="url" />
          <TextareaField id={`${mode}-host-bio`} label="Bio" value={bio} onChange={setBio} rows={4} />
        </div>
      </div>

      <TagsField value={tags} onChange={setTags} id={`${mode}-profile-tags`} />

      {mode === "create" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving || (!propertyName.trim() && !hostName.trim())}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Save combined
          </Button>
          <Button type="button" variant="outline" disabled={saving || !propertyName.trim()} onClick={() => void savePropertyOnly()}>
            Save property only
          </Button>
          <Button type="button" variant="outline" disabled={saving || !hostName.trim()} onClick={() => void saveHostOnly()}>
            Save host only
          </Button>
        </div>
      ) : (
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Save changes
        </Button>
      )}
    </form>
  );
}

function RecommendationForm({
  saving,
  asset,
  mode = "create",
  onSubmit,
}: {
  saving: boolean;
  asset?: HostAsset | null;
  mode?: SubmitMode;
  onSubmit: (payload: AssetPayload) => Promise<void>;
}) {
  const content = asset?.content ?? {};
  const [name, setName] = useState(textValue(content, "name", asset?.name ?? ""));
  const [category, setCategory] = useState(textValue(content, "category", "restaurant"));
  const [description, setDescription] = useState(asset?.description ?? textValue(content, "description"));
  const [address, setAddress] = useState(textValue(content, "address"));
  const [lat, setLat] = useState(String(numberValue(content, "lat", 0)));
  const [lng, setLng] = useState(String(numberValue(content, "lng", 0)));
  const [phone, setPhone] = useState(textValue(content, "phone"));
  const [website, setWebsite] = useState(textValue(content, "website"));
  const [email, setEmail] = useState(textValue(content, "email"));
  const [imageUrl, setImageUrl] = useState(asset?.fileUrl ?? textValue(content, "imageUrl"));
  const [openingHours, setOpeningHours] = useState(textValue(content, "openingHours"));
  const [tags, setTags] = useState(tagsToInput(asset?.tags));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Place name is required.");
      return;
    }
    const latNumber = Number(lat);
    const lngNumber = Number(lng);
    await onSubmit({
      assetType: "local_recommendation",
      name,
      description: description || null,
      content: {
        name,
        category,
        description,
        address,
        lat: Number.isFinite(latNumber) ? latNumber : 0,
        lng: Number.isFinite(lngNumber) ? lngNumber : 0,
        phone,
        website,
        email,
        imageUrl,
        openingHours,
        tags: {},
        ...recommendationSourceFields(content),
      },
      fileUrl: imageUrl || null,
      tags: parseTags(tags),
    });
    if (mode === "create") {
      setName("");
      setDescription("");
      setAddress("");
      setLat("0");
      setLng("0");
      setPhone("");
      setWebsite("");
      setEmail("");
      setImageUrl("");
      setOpeningHours("");
      setTags("");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <TextField id={`${mode}-place-name`} label="Place name" value={name} onChange={setName} required />
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(value) => setCategory(value ?? "other")}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLACE_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {nearbyCategoryLabel(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <TextareaField id={`${mode}-place-desc`} label="Description" value={description} onChange={setDescription} rows={4} />
      <TextField id={`${mode}-place-address`} label="Address" value={address} onChange={setAddress} />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id={`${mode}-place-lat`} label="Latitude" value={lat} onChange={setLat} />
        <TextField id={`${mode}-place-lng`} label="Longitude" value={lng} onChange={setLng} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id={`${mode}-place-phone`} label="Phone" value={phone} onChange={setPhone} />
        <TextField id={`${mode}-place-website`} label="Website" value={website} onChange={setWebsite} type="url" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField id={`${mode}-place-email`} label="Email" value={email} onChange={setEmail} type="email" />
        <TextField id={`${mode}-place-hours`} label="Opening hours" value={openingHours} onChange={setOpeningHours} />
      </div>
      <TextField id={`${mode}-place-image`} label="Image URL" value={imageUrl} onChange={setImageUrl} type="url" />
      <TagsField value={tags} onChange={setTags} id={`${mode}-place-tags`} />
      <Button type="submit" disabled={saving || !name.trim()}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
        {mode === "edit" ? "Save changes" : "Save recommendation"}
      </Button>
    </form>
  );
}

type SectionDraftBlock = {
  id: string;
  optionId: string;
  label: string;
  type: string;
  content: Record<string, unknown>;
};

function makeSectionDraftBlock(option: BlockOption): SectionDraftBlock {
  return {
    id: randomUUID(),
    optionId: option.id,
    label: option.label,
    type: option.type,
    content: defaultBlockContent(option),
  };
}

function draftBlockLabel(block: SectionDraftBlock) {
  return (
    block.label ||
    BLOCK_OPTION_BY_ID.get(block.optionId)?.label ||
    BLOCK_OPTIONS.find((option) => option.type === block.type)?.label ||
    blockOptionLabel(block.type)
  );
}

function AssetBlockInsertRow({
  index,
  open,
  onToggle,
  onAdd,
  options,
}: {
  index: number;
  open: boolean;
  onToggle: () => void;
  onAdd: (index: number, option: BlockOption) => void;
  options: GroupedBlockOptions;
}) {
  return (
    <div className={cn("py-1.5", open && "editor-insert-open")}>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "group relative flex w-full items-center justify-center py-0.5",
          open ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border/70" />
        <span
          className={cn(
            "relative z-10 inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1 text-[11px] font-medium transition-colors",
            open
              ? "border-primary/35 bg-primary/8 text-primary"
              : "border-border/70 text-muted-foreground group-hover:border-border group-hover:text-foreground"
          )}
        >
          <Plus className="h-3 w-3" />
          {open ? "Choose block" : "Add"}
        </span>
      </button>

      {open ? (
        <div className="editor-insert-popover mt-2 p-1.5">
          <BlockPickerCommand
            options={options}
            onAdd={(option) => onAdd(index, option)}
            listClassName="max-h-[min(24rem,calc(100vh-14rem))]"
          />
        </div>
      ) : null}
    </div>
  );
}

function SectionTemplateForm({
  saving,
  asset,
  mode = "create",
  onSubmit,
}: {
  saving: boolean;
  asset?: HostAsset | null;
  mode?: SubmitMode;
  onSubmit: (payload: AssetPayload) => Promise<void>;
}) {
  const initialBlocks = asset
    ? getReusableSectionBlocks(asset).map((block, index) => ({
        id: `${asset.id}-${index}`,
        optionId:
          BLOCK_OPTIONS.find((option) => option.type === block.type)?.id ??
          BLOCK_OPTIONS[0].id,
        label: blockOptionLabel(block.type),
        type: block.type,
        content: block.content,
      }))
    : [
        makeSectionDraftBlock(
          BLOCK_OPTIONS.find((option) => option.type === "heading") ??
            BLOCK_OPTIONS[0]
        ),
        makeSectionDraftBlock(BLOCK_OPTIONS[0]),
      ];

  const [name, setName] = useState(asset?.name ?? "");
  const [title, setTitle] = useState(
    asset ? getReusableSectionTitle(asset) : "New reusable section"
  );
  const [description, setDescription] = useState(asset?.description ?? "");
  const [icon, setIcon] = useState(
    asset ? getReusableSectionIcon(asset) : DEFAULT_ICONS.SECTION_DEFAULT
  );
  const [tags, setTags] = useState(tagsToInput(asset?.tags));
  const [blocks, setBlocks] = useState<SectionDraftBlock[]>(initialBlocks);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(
    initialBlocks[0]?.id ?? null
  );
  const [openInsertIndex, setOpenInsertIndex] = useState<number | null>(
    initialBlocks.length === 0 ? 0 : null
  );
  const { assets: savedContentBlocks } = useAssetsHubContentBlocks();

  const savedBlockOptions = useMemo<BlockOption[]>(
    () =>
      savedContentBlocks.map((contentAsset) => ({
        id: `asset:${contentAsset.id}`,
        type: getAssetBlockType(contentAsset),
        label: contentAsset.name,
        category: "Content",
        icon: LibraryBig,
        defaultContent: getAssetBlockContent(contentAsset),
        source: "assets_hub",
        assetId: contentAsset.id,
      })),
    [savedContentBlocks]
  );

  const groupedOptions = useMemo(
    () => groupBlockOptions([...savedBlockOptions, ...BLOCK_OPTIONS]),
    [savedBlockOptions]
  );

  function insertBlock(index: number, option: BlockOption) {
    const block = makeSectionDraftBlock(option);
    setBlocks((current) => {
      const next = [...current];
      next.splice(index, 0, block);
      return next;
    });
    setActiveBlockId(block.id);
    setOpenInsertIndex(null);
  }

  function removeBlock(id: string) {
    setBlocks((current) => current.filter((block) => block.id !== id));
    setActiveBlockId((current) => {
      if (current !== id) return current;
      const remaining = blocks.filter((block) => block.id !== id);
      return remaining[0]?.id ?? null;
    });
  }

  function moveBlock(id: string, direction: -1 | 1) {
    setBlocks((current) => {
      const index = current.findIndex((block) => block.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }

  function updateDraftBlockContent(id: string, content: Record<string, unknown>) {
    setBlocks((current) =>
      current.map((block) => (block.id === id ? { ...block, content } : block))
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Section name is required.");
      return;
    }
    await onSubmit({
      assetType: "section_template",
      name: name.trim(),
      description: description.trim() || null,
      content: {
        title: title.trim() || name.trim(),
        icon,
        blocks: blocks.map((block) => ({
          type: block.type,
          content: block.content,
        })),
      },
      tags: parseTags(tags),
    });

    if (mode === "create") {
      setName("");
      setDescription("");
      setTags("");
      setTitle("New reusable section");
      setIcon(DEFAULT_ICONS.SECTION_DEFAULT);
      setBlocks([]);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <IconifyPicker
                value={icon}
                onChange={setIcon}
                ariaLabel="Select section icon"
                triggerClassName="h-10 w-10 rounded-md border bg-background"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                id={`${mode}-section-name`}
                label="Asset name"
                value={name}
                onChange={setName}
                placeholder="Arrival section"
                required
              />
              <TextField
                id={`${mode}-section-title`}
                label="Section title"
                value={title}
                onChange={setTitle}
                placeholder="Arrival"
              />
            </div>
          </div>

          <TextareaField
            id={`${mode}-section-description`}
            label="Internal description"
            value={description}
            onChange={setDescription}
            rows={2}
          />

          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <Label>Section blocks</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add and configure blocks the same way they work in the editor.
                </p>
              </div>
              <Badge variant="secondary">
                {blocks.length} block{blocks.length === 1 ? "" : "s"}
              </Badge>
            </div>

            <AssetBlockInsertRow
              index={0}
              open={openInsertIndex === 0}
              onToggle={() => setOpenInsertIndex((current) => (current === 0 ? null : 0))}
              onAdd={insertBlock}
              options={groupedOptions}
            />

            {blocks.length === 0 && openInsertIndex !== 0 ? (
              <div className="rounded-md border border-dashed bg-background p-5 text-center text-xs text-muted-foreground">
                Add blocks to build this reusable section.
              </div>
            ) : (
              <div className="space-y-1">
                {blocks.map((block, index) => (
                  <div key={block.id} className="space-y-2">
                    <div className="rounded-md border bg-background">
                      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveBlockId((current) =>
                              current === block.id ? null : block.id
                            )
                          }
                          className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1 text-left hover:bg-muted/40"
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted/50 text-xs font-semibold text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {draftBlockLabel(block)}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {block.type}
                            </span>
                          </span>
                        </button>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => moveBlock(block.id, -1)}
                            disabled={index === 0}
                            aria-label="Move block up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => moveBlock(block.id, 1)}
                            disabled={index === blocks.length - 1}
                            aria-label="Move block down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeBlock(block.id)}
                            aria-label="Remove block"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {activeBlockId === block.id ? (
                        <div className="border-t bg-muted/10 p-3">
                          <BlockContentEditor
                            key={`${block.id}-${block.type}`}
                            block={makeEditorBlock(
                              block.id,
                              block.type,
                              block.content,
                              index
                            )}
                            onChange={(content) =>
                              updateDraftBlockContent(block.id, content)
                            }
                          />
                        </div>
                      ) : null}
                    </div>

                    <AssetBlockInsertRow
                      index={index + 1}
                      open={openInsertIndex === index + 1}
                      onToggle={() =>
                        setOpenInsertIndex((current) =>
                          current === index + 1 ? null : index + 1
                        )
                      }
                      onAdd={insertBlock}
                      options={groupedOptions}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <TagsField value={tags} onChange={setTags} id={`${mode}-section-tags`} />
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LayoutTemplate className="mr-2 h-4 w-4" />
            )}
            {mode === "edit" ? "Save changes" : "Save section"}
          </Button>
        </div>

        <aside className="space-y-1.5 xl:sticky xl:top-3 xl:self-start">
          <Label>Section preview</Label>
          <div className="tpl-sunset max-h-[72vh] overflow-y-auto rounded-lg border bg-[#faf6ef] p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-white/70">
                <HostIcon value={icon} className="text-xl" />
              </span>
              <h3 className="text-lg font-semibold">{title || name || "Section"}</h3>
            </div>
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <BlockRenderer
                  key={`${block.id}-preview`}
                  block={{
                    id: block.id,
                    type: block.type,
                    content: block.content,
                    isVisible: true,
                    orderIndex: index,
                  }}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

function TagsField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Tags</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="rules, welcome, checkout"
      />
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function TextareaField({
  id,
  label,
  value,
  onChange,
  rows = 5,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
      />
    </div>
  );
}

function createTitle(tab: CreateAssetKind) {
  if (tab === "content_block") return "New reusable block";
  if (tab === "media") return "New media asset";
  if (tab === "brand_kit") return "New brand kit";
  if (tab === "property_host_profile") return "New property & host profile";
  if (tab === "section_template") return "New reusable section";
  return "New local recommendation";
}

function createActionLabel(tab: CreateAssetKind) {
  if (tab === "content_block") return "Add block";
  if (tab === "media") return "Add media";
  if (tab === "brand_kit") return "Create brand kit";
  if (tab === "property_host_profile") return "Add profile";
  if (tab === "section_template") return "Create section";
  return "Add manually";
}

function CreateAssetDialog({
  tab,
  saving,
  onCreate,
  onMediaUploaded,
  open,
  onOpenChange,
}: {
  tab: CreateAssetKind;
  saving: boolean;
  onCreate: (payload: AssetPayload) => Promise<void>;
  onMediaUploaded?: (asset: HostAsset) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{createTitle(tab)}</DialogTitle>
        </DialogHeader>
        {tab === "content_block" && (
          <KnowledgeBaseForm saving={saving} onSubmit={onCreate} />
        )}
        {tab === "media" && (
          <MediaForm
            saving={saving}
            onSubmit={onCreate}
            onUploadedAsset={onMediaUploaded}
          />
        )}
        {tab === "brand_kit" && <BrandKitForm saving={saving} onSubmit={onCreate} />}
        {tab === "property_host_profile" && (
          <PropertyHostForm saving={saving} onSubmit={onCreate} />
        )}
        {tab === "section_template" && (
          <SectionTemplateForm saving={saving} onSubmit={onCreate} />
        )}
        {tab === "local_recommendation" && (
          <RecommendationForm saving={saving} onSubmit={onCreate} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditAssetDialog({
  asset,
  saving,
  onOpenChange,
  onUpdate,
}: {
  asset: HostAsset | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (asset: HostAsset, payload: AssetPayload) => Promise<void>;
}) {
  if (!asset) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }

  const submit = (payload: AssetPayload) => onUpdate(asset, payload);

  return (
    <Dialog open={Boolean(asset)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit {asset.name}</DialogTitle>
        </DialogHeader>
        {asset.assetType === "content_block" && (
          <KnowledgeBaseForm asset={asset} mode="edit" saving={saving} onSubmit={submit} />
        )}
        {asset.assetType === "media" && (
          <MediaForm asset={asset} mode="edit" saving={saving} onSubmit={submit} />
        )}
        {asset.assetType === "brand_kit" && (
          <BrandKitForm asset={asset} mode="edit" saving={saving} onSubmit={submit} />
        )}
        {PROPERTY_HOST_TYPES.has(asset.assetType) && (
          <PropertyHostForm asset={asset} mode="edit" saving={saving} onSubmit={submit} />
        )}
        {asset.assetType === "section_template" && (
          <SectionTemplateForm asset={asset} mode="edit" saving={saving} onSubmit={submit} />
        )}
        {asset.assetType === "local_recommendation" && (
          <RecommendationForm asset={asset} mode="edit" saving={saving} onSubmit={submit} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AssetsHubPage() {
  const [assets, setAssets] = useState<HostAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<HostAssetType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<HostAsset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tab, setTab] = useState<HubTab>("content_block");
  const [query, setQuery] = useState("");
  const [creatingTab, setCreatingTab] = useState<CreateAssetKind | null>(null);
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);
  const [recommendationsInitialMode, setRecommendationsInitialMode] =
    useState<RecommendationsInitialMode>("browse");
  const { requestConfirmation } = useFeedbackDialog();

  const fetchAssets = useCallback(async () => {
    const result = await apiFetch<HostAsset[]>("/api/assets-hub");
    setLoading(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load assets",
      });
      return;
    }

    setAssets(result.data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAssets();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchAssets]);

  const counts = useMemo(() => {
    return assets.reduce<Record<HubTab, number>>(
      (acc, asset) => {
        acc[assetTab(asset)] += 1;
        return acc;
      },
      { ...DEFAULT_COUNTS }
    );
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (assetTab(asset) !== tab) return false;
      const recommendationGroup =
        assetTab(asset) === "local_recommendation"
          ? getRecommendationGroupLabel(asset).toLowerCase()
          : "";
      const mediaFolder =
        asset.assetType === "media" ? getMediaAssetFolder(asset).toLowerCase() : "";
      if (!q) return true;
      return (
        asset.name.toLowerCase().includes(q) ||
        (asset.description?.toLowerCase().includes(q) ?? false) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        recommendationGroup.includes(q) ||
        mediaFolder.includes(q)
      );
    });
  }, [assets, query, tab]);

  async function createAsset(payload: AssetPayload) {
    setSavingType(payload.assetType);

    const result = await apiFetch<HostAsset>("/api/assets-hub", {
      method: "POST",
      body: payload as Record<string, unknown>,
    });

    setSavingType(null);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't save asset",
        onRetry: () => void createAsset(payload),
      });
      return;
    }

    setAssets((current) => [result.data, ...current]);
    setTab(assetTab(result.data));
    setCreatingTab(null);
    toast.success("Asset saved");
  }

  async function updateAsset(asset: HostAsset, payload: AssetPayload) {
    setIsEditing(true);
    const result = await apiFetch<HostAsset>(`/api/assets-hub/${asset.id}`, {
      method: "PATCH",
      body: payload as Record<string, unknown>,
    });
    setIsEditing(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't update asset",
        onRetry: () => void updateAsset(asset, payload),
      });
      return;
    }

    setAssets((current) =>
      current.map((item) => (item.id === result.data.id ? result.data : item))
    );
    setEditingAsset(null);
    setTab(assetTab(result.data));
    toast.success("Asset updated");
  }

  async function deleteAsset(asset: HostAsset) {
    const confirmed = await requestConfirmation({
      title: `Delete "${asset.name}"?`,
      description:
        "This removes the saved asset from Assets Hub. Guidebooks already using copied content are not changed.",
      confirmLabel: "Delete asset",
      tone: "danger",
      busyLabel: "Deleting...",
    });
    if (!confirmed) return;

    setDeletingId(asset.id);
    const toastId = toast.loading("Deleting asset...");
    const result = await apiFetch(`/api/assets-hub/${asset.id}`, {
      method: "DELETE",
      parseJson: false,
    });
    setDeletingId(null);

    if (!result.ok) {
      toastApiError(result.error, {
        id: toastId,
        title: "Couldn't delete asset",
        onRetry: () => void deleteAsset(asset),
      });
      return;
    }

    setAssets((current) => current.filter((item) => item.id !== asset.id));
    toast.success("Asset deleted", {
      id: toastId,
      description: "The asset was removed from Assets Hub.",
    });
  }

  const handleDialogAssetCreated = useCallback((asset: HostAsset) => {
    setAssets((current) => [
      asset,
      ...current.filter((item) => item.id !== asset.id),
    ]);
    setTab(assetTab(asset));
  }, []);

  const handleDialogAssetUpdated = useCallback((asset: HostAsset) => {
    setAssets((current) =>
      current.map((item) => (item.id === asset.id ? asset : item))
    );
    setTab(assetTab(asset));
  }, []);

  const handleDialogAssetDeleted = useCallback((assetId: string) => {
    setAssets((current) => current.filter((item) => item.id !== assetId));
  }, []);

  const openRecommendationsDialog = useCallback(
    (mode: RecommendationsInitialMode) => {
      setRecommendationsInitialMode(mode);
      setRecommendationsOpen(true);
    },
    []
  );

  useEffect(() => {
    const openFromHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (
        hash === "#local-places" ||
        hash === "#local-places-discover" ||
        hash === "#local-recommendations" ||
        hash === "#local-recommendations-discover"
      ) {
        setTab("local_recommendation");
      }
      if (
        hash === "#local-places-discover" ||
        hash === "#local-recommendations-discover"
      ) {
        openRecommendationsDialog("browse");
      }
    };

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [openRecommendationsDialog]);

  const handleRecommendationsOpenChange = useCallback((open: boolean) => {
    setRecommendationsOpen(open);
    if (!open) setRecommendationsInitialMode("browse");
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-9 w-full max-w-3xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Skeleton className="h-[520px] rounded-xl" />
          <Skeleton className="h-[520px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets Hub</h1>
          <p className="text-muted-foreground">
            {assets.length} reusable {assets.length === 1 ? "asset" : "assets"}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {tab === "local_recommendation" ? (
              <Button
                type="button"
                onClick={() => openRecommendationsDialog("browse")}
              >
                <MapPinned className="mr-2 h-4 w-4" />
                Discover places
              </Button>
            ) : null}
            {tab === "content_block" ? (
              <>
                <Button
                  type="button"
                  onClick={() => setCreatingTab("content_block")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add block
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreatingTab("section_template")}
                >
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  Add section
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant={tab === "local_recommendation" ? "outline" : "default"}
                onClick={() => {
                  if (tab === "local_recommendation") {
                    openRecommendationsDialog("add-by-map");
                    return;
                  }
                  setCreatingTab(tab);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {createActionLabel(tab)}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as HubTab)} className="gap-5">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="shrink-0 overflow-x-auto pb-1">
            <TabsList className="w-max justify-start gap-1 bg-transparent p-0">
              {TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.value;
                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="border border-border/60 bg-background/80 px-2.5 data-active:shadow-none"
                    style={tabAccentStyle(item.accent, active)}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    <CountPill count={counts[item.value]} active={active} />
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets..."
              className="pl-8"
            />
          </div>
        </div>

        {TABS.map((item) => {
          return (
          <TabsContent key={item.value} value={item.value} className="m-0">
            <AssetList
              tab={item.value}
              assets={filteredAssets}
              deletingId={deletingId}
              onEdit={setEditingAsset}
              onDelete={deleteAsset}
            />
          </TabsContent>
          );
        })}
      </Tabs>

      {creatingTab ? (
        <CreateAssetDialog
          tab={creatingTab}
          saving={savingType !== null}
          open={Boolean(creatingTab)}
          onOpenChange={(open) => {
            if (!open) setCreatingTab(null);
          }}
          onCreate={createAsset}
          onMediaUploaded={(asset) => {
            handleDialogAssetCreated(asset);
            setCreatingTab(null);
          }}
        />
      ) : null}

      <EditAssetDialog
        asset={editingAsset}
        saving={isEditing}
        onOpenChange={(open) => {
          if (!open) setEditingAsset(null);
        }}
        onUpdate={updateAsset}
      />
      <AssetsHubRecommendationsDialog
        open={recommendationsOpen}
        onOpenChange={handleRecommendationsOpenChange}
        initialMode={recommendationsInitialMode}
        assets={assets}
        onAssetCreated={handleDialogAssetCreated}
        onAssetUpdated={handleDialogAssetUpdated}
        onAssetDeleted={handleDialogAssetDeleted}
      />
    </div>
  );
}
