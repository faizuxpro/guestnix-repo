"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { getMediaAssetUrl } from "@/lib/assets-hub";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { cn } from "@/lib/utils";
import { AssetsHubPickerButton } from "@/components/editor/assets/AssetsHubPickerButton";

type Props = {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  /** "cover" gives a 16:9 preview; "avatar" gives a square contained preview. */
  variant?: "cover" | "avatar";
  emptyText?: string;
  hint?: string;
  assetsHubLabel?: string;
  accept?: string;
  allowedExtensions?: string[];
  invalidFileMessage?: string;
};

export function ImageUploadField({
  label,
  value,
  onChange,
  variant = "cover",
  emptyText,
  hint,
  assetsHubLabel,
  accept = "image/*",
  allowedExtensions = [],
  invalidFileMessage = "Please choose an image file.",
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const allowedByExtension = allowedExtensions
      .map((item) => item.replace(/^\./, "").toLowerCase())
      .includes(extension);

    if (!file.type.startsWith("image/") && !allowedByExtension) {
      toast.error(invalidFileMessage);
      return;
    }
    setIsUploading(true);
    setUploadProgress(1);

    try {
      const result = await uploadMediaFile(file, {
        onProgress: setUploadProgress,
      });
      onChange(result.url);
      toast.success("Image uploaded to Media");
    } catch (err) {
      toast.error("Couldn't upload image", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsUploading(false);
      window.setTimeout(() => setUploadProgress(0), 400);
    }
  };

  const aspectClass =
    variant === "cover" ? "aspect-[16/9]" : "aspect-square max-w-[140px]";
  const previewObjectFit = variant === "cover" ? "object-cover" : "object-contain";
  const emptyMessage =
    emptyText ??
    (variant === "cover" ? "Drop a cover image here" : "Drop a logo here");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium leading-tight text-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1">
          {assetsHubLabel ? (
            <AssetsHubPickerButton
              assetType="media"
              label={assetsHubLabel}
              emptyText="No saved media matches this field yet."
              onSelect={(asset) => {
                const url = getMediaAssetUrl(asset);
                if (!url) {
                  toast.error("Saved media is missing a URL.");
                  return;
                }
                onChange(url);
                toast.success("Saved media applied");
              }}
            />
          ) : null}
          {value ? (
            <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-destructive/8 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
            </>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDragging) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "group relative block w-full overflow-hidden rounded-md border transition-all",
          aspectClass,
          value
            ? "border-border/60 bg-muted/15"
            : isDragging
              ? "border-primary/55 bg-primary/8 ring-2 ring-primary/25 ring-offset-2 ring-offset-background"
              : "border-dashed border-border/70 bg-muted/15 hover:border-primary/45 hover:bg-primary/5"
        )}
        aria-label={value ? `${label} — uploaded` : `Upload ${label.toLowerCase()}`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              className={cn("h-full w-full", previewObjectFit)}
            />
            {/* Hover overlay for "replace" affordance */}
            <span
              className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <span className="flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-md">
                <UploadCloud className="h-3.5 w-3.5" />
                Replace image
              </span>
            </span>
          </>
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
            <span
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full transition-colors",
                isDragging
                  ? "bg-primary/15 text-primary"
                  : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              )}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isDragging ? (
                <UploadCloud className="h-5 w-5" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </span>
            <span className="block">
              <span className="block text-[12px] font-semibold text-foreground">
                {isUploading
                  ? "Uploading…"
                  : isDragging
                    ? "Drop to upload"
                    : emptyMessage}
              </span>
              {!isUploading && !isDragging ? (
                <span className="block text-[10.5px] text-muted-foreground">
                  or <span className="underline underline-offset-2">click to browse</span>
                </span>
              ) : null}
            </span>
          </span>
        )}
        {/* Loading overlay when replacing */}
        {value && isUploading ? (
          <span className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </span>
        ) : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.currentTarget.value = "";
        }}
      />

      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
      {isUploading ? (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Saving to Media... {uploadProgress}%
          </p>
        </div>
      ) : null}
    </div>
  );
}
