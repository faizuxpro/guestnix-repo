"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  Folder,
  Image as ImageIcon,
  Loader2,
  Search,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMediaAssetFolder,
  getMediaAssetUrl,
  type HostAsset,
} from "@/lib/assets-hub";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { cn } from "@/lib/utils";
import { useAssetsHubAssets } from "@/hooks/use-assets-hub-content-blocks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  state: "uploading" | "done" | "error";
  error?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  selectLabel?: string;
  onSelect: (asset: HostAsset) => void;
};

const ALL_FOLDERS = "__all_media__";
const UNFILED_FOLDER = "Unfiled";

function uploadId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function fileSizeLabel(size: number | null) {
  if (!size || size <= 0) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function assetMatches(asset: HostAsset, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    asset.name.toLowerCase().includes(q) ||
    (asset.description?.toLowerCase().includes(q) ?? false) ||
    asset.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    getMediaAssetFolder(asset).toLowerCase().includes(q) ||
    (asset.fileName?.toLowerCase().includes(q) ?? false)
  );
}

function MediaTile({
  asset,
  selected,
  onSelect,
}: {
  asset: HostAsset;
  selected: boolean;
  onSelect: () => void;
}) {
  const url = getMediaAssetUrl(asset);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative overflow-hidden rounded-md border bg-background text-left transition",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border/70 hover:border-primary/45 hover:shadow-sm"
      )}
    >
      <span className="relative block aspect-[4/3] overflow-hidden bg-muted/30">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.025]"
          />
        ) : (
          <span className="grid h-full place-items-center text-muted-foreground">
            <ImageIcon className="h-7 w-7" />
          </span>
        )}
        {selected ? (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </span>
      <span className="block space-y-1 p-2">
        <span className="block truncate text-xs font-semibold">{asset.name}</span>
        <span className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{getMediaAssetFolder(asset)}</span>
          <span className="shrink-0">{fileSizeLabel(asset.fileSize)}</span>
        </span>
      </span>
    </button>
  );
}

function UploadQueue({ items }: { items: UploadItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2 rounded-md border bg-muted/15 p-2">
      {items.map((item) => (
        <div key={item.id} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate font-medium">{item.name}</span>
            <span
              className={cn(
                "shrink-0",
                item.state === "error" ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {item.state === "error" ? "Failed" : `${item.progress}%`}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                item.state === "error" ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${item.progress}%` }}
            />
          </div>
          {item.error ? (
            <p className="text-[11px] text-destructive">{item.error}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  title = "Media library",
  description = "Choose from your saved images or upload new media.",
  selectLabel = "Use image",
  onSelect,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { assets, loading, refetch } = useAssetsHubAssets("media");
  const [addedAssets, setAddedAssets] = useState<HostAsset[]>([]);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState(ALL_FOLDERS);
  const [uploadFolder, setUploadFolder] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);

  const allAssets = useMemo(() => {
    const seen = new Set<string>();
    return [...addedAssets, ...assets].filter((asset) => {
      if (seen.has(asset.id)) return false;
      seen.add(asset.id);
      return true;
    });
  }, [addedAssets, assets]);

  const folders = useMemo(() => {
    return Array.from(
      new Set(allAssets.map((asset) => getMediaAssetFolder(asset)))
    ).sort((a, b) => {
      if (a === UNFILED_FOLDER) return -1;
      if (b === UNFILED_FOLDER) return 1;
      return a.localeCompare(b);
    });
  }, [allAssets]);

  const visibleAssets = useMemo(() => {
    return allAssets.filter((asset) => {
      if (folder !== ALL_FOLDERS && getMediaAssetFolder(asset) !== folder) {
        return false;
      }
      return assetMatches(asset, query);
    });
  }, [allAssets, folder, query]);

  const selectedAsset = useMemo(
    () => allAssets.find((asset) => asset.id === selectedId) ?? null,
    [allAssets, selectedId]
  );

  async function uploadFiles(files: FileList | File[]) {
    const selected = Array.from(files);
    const imageFiles = selected.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Please choose image files.");
      return;
    }
    if (imageFiles.length !== selected.length) {
      toast.message("Only image files were added.");
    }

    for (const file of imageFiles) {
      const id = uploadId(file);
      setUploadItems((current) => [
        { id, name: file.name, progress: 1, state: "uploading" },
        ...current,
      ]);

      try {
        const uploaded = await uploadMediaFile(file, {
          folder: uploadFolder,
          onProgress: (progress) => {
            setUploadItems((current) =>
              current.map((item) =>
                item.id === id ? { ...item, progress } : item
              )
            );
          },
        });

        if (uploaded.asset) {
          setAddedAssets((current) => [uploaded.asset as HostAsset, ...current]);
          setSelectedId(uploaded.asset.id);
        }

        setUploadItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, progress: 100, state: "done" } : item
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed. Please try again.";
        setUploadItems((current) =>
          current.map((item) =>
            item.id === id
              ? { ...item, state: "error", progress: 100, error: message }
              : item
          )
        );
      }
    }

    void refetch();
  }

  function confirmSelection() {
    if (!selectedAsset) return;
    onSelect(selectedAsset);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-0 md:grid-cols-[190px_minmax(0,1fr)]">
          <aside className="border-b bg-muted/15 p-3 md:border-b-0 md:border-r">
            <div className="space-y-3">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Folders
                </p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setFolder(ALL_FOLDERS)}
                    className={cn(
                      "flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-xs transition",
                      folder === ALL_FOLDERS
                        ? "bg-background font-semibold text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/65 hover:text-foreground"
                    )}
                  >
                    <span>All media</span>
                    <Badge variant="outline">{allAssets.length}</Badge>
                  </button>
                  {folders.map((item) => {
                    const active = folder === item;
                    const count = allAssets.filter(
                      (asset) => getMediaAssetFolder(asset) === item
                    ).length;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setFolder(item)}
                        className={cn(
                          "flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-xs transition",
                          active
                            ? "bg-background font-semibold text-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-background/65 hover:text-foreground"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Folder className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{item}</span>
                        </span>
                        <Badge variant="outline">{count}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="media-upload-folder" className="text-[11px]">
                  Upload folder
                </Label>
                <Input
                  id="media-upload-folder"
                  value={uploadFolder}
                  onChange={(event) => setUploadFolder(event.target.value)}
                  placeholder="Unfiled"
                  className="h-8 text-xs"
                />
              </div>

              <UploadQueue items={uploadItems.slice(0, 4)} />
            </div>
          </aside>

          <section className="flex min-h-0 flex-col">
            <div className="flex flex-col gap-2 border-b p-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search media..."
                  className="h-9 pl-8 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                <UploadCloud className="mr-2 h-4 w-4" />
                Upload
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = event.currentTarget.files;
                  if (files) void uploadFiles(files);
                  event.currentTarget.value = "";
                }}
              />
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!isDragging) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                void uploadFiles(event.dataTransfer.files);
              }}
              className={cn(
                "min-h-[360px] flex-1 overflow-y-auto p-3 transition",
                isDragging && "bg-primary/5 ring-2 ring-inset ring-primary/30"
              )}
            >
              {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="aspect-[4/3] rounded-md" />
                  ))}
                </div>
              ) : visibleAssets.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleAssets.map((asset) => (
                    <MediaTile
                      key={asset.id}
                      asset={asset}
                      selected={asset.id === selectedId}
                      onSelect={() => setSelectedId(asset.id)}
                    />
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="grid min-h-[320px] w-full place-items-center rounded-md border border-dashed bg-muted/15 px-4 text-center transition hover:border-primary/45 hover:bg-primary/5"
                >
                  <span className="max-w-sm space-y-2">
                    <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                      {uploadItems.some((item) => item.state === "uploading") ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <UploadCloud className="h-5 w-5" />
                      )}
                    </span>
                    <span className="block text-sm font-semibold">
                      {query || folder !== ALL_FOLDERS
                        ? "No media matches this view"
                        : "Upload your first image"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Drop images here or click to browse.
                    </span>
                  </span>
                </button>
              )}
            </div>
          </section>
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          <div className="min-w-0 text-xs text-muted-foreground">
            {selectedAsset ? (
              <span className="truncate">
                Selected: <span className="font-medium text-foreground">{selectedAsset.name}</span>
              </span>
            ) : (
              <span>Select an image to continue.</span>
            )}
          </div>
          <Button type="button" onClick={confirmSelection} disabled={!selectedAsset}>
            {selectLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
