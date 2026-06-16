"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getMediaAssetUrl } from "@/lib/assets-hub";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AssetsHubPickerButton } from "@/components/editor/assets/AssetsHubPickerButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EditorBlock } from "@/stores/editor-store";
import { PromptedInput } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type GalleryLayout = "slider" | "grid" | "masonry";
type GalleryImage = {
  url: string;
  alt: string;
  caption: string;
};

function readLayout(content: Record<string, unknown>): GalleryLayout {
  const value = content.layout;
  if (value === "slider" || value === "masonry") return value;
  return "grid";
}

function readImages(content: Record<string, unknown>): GalleryImage[] {
  const value = content.images;
  if (!Array.isArray(value)) return [];

  return value
    .map((item): GalleryImage | null => {
      if (!item || typeof item !== "object") return null;
      const image = item as Record<string, unknown>;
      return {
        url: typeof image.url === "string" ? image.url : "",
        alt: typeof image.alt === "string" ? image.alt : "",
        caption: typeof image.caption === "string" ? image.caption : "",
      };
    })
    .filter((item): item is GalleryImage => Boolean(item));
}

export function GalleryBlockEditor({ block, onChange }: Props) {
  const layout = readLayout(block.content);
  const images = readImages(block.content);

  const patch = (next: { layout?: GalleryLayout; images?: GalleryImage[] }) => {
    onChange({
      layout: next.layout ?? layout,
      images: next.images ?? images,
    });
  };

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const uploadImage = async (index: number, file: File) => {
    setUploadingIndex(index);
    setUploadProgress((current) => ({ ...current, [index]: 1 }));

    try {
      const result = await uploadMediaFile(file, {
        onProgress: (progress) =>
          setUploadProgress((current) => ({ ...current, [index]: progress })),
      });
      const next = [...images];
      if (!next[index]) return;
      next[index] = { ...next[index], url: result.url };
      patch({ images: next });
      toast.success("Image uploaded to Media");
    } catch (err) {
      toast.error("Couldn't upload image", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploadingIndex(null);
      window.setTimeout(() => {
        setUploadProgress((current) => {
          const next = { ...current };
          delete next[index];
          return next;
        });
      }, 400);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    patch({ images: next });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-1.5">
        <Label>Layout</Label>
        <Select
          value={layout}
          onValueChange={(value) =>
            patch({
              layout:
                value === "slider" || value === "masonry" ? value : "grid",
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grid">Grid</SelectItem>
            <SelectItem value="masonry">Masonry</SelectItem>
            <SelectItem value="slider">Slider</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="editor-section">
        <div className="editor-section-header">
          <Label>Images</Label>
          <div className="flex flex-wrap justify-end gap-2">
            <AssetsHubPickerButton
              assetType="media"
              label="Add Assets Hub media"
              onSelect={(asset) => {
                const url = getMediaAssetUrl(asset);
                if (!url) {
                  toast.error("Saved media is missing a URL.");
                  return;
                }
                patch({
                  images: [
                    ...images,
                    {
                      url,
                      alt: asset.name,
                      caption: asset.description ?? "",
                    },
                  ],
                });
                toast.success("Saved media added");
              }}
            />
            <Button
              type="button"
              size="sm"
              className="editor-cta"
              onClick={() =>
                patch({
                  images: [...images, { url: "", alt: "", caption: "" }],
                })
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add image
            </Button>
          </div>
        </div>

        {images.length === 0 ? (
          <div className="editor-empty">
            Add images to build your gallery.
          </div>
        ) : (
          <div className="editor-list">
            {images.map((image, index) => (
              <div key={`${block.id}-gallery-${index}`} className="editor-list-item">
                <div className="editor-item-toolbar">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move image up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label="Move image down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      patch({
                        images: images.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                    aria-label="Remove image"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {image.url ? (
                  <div className="block-editor-preview mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.alt || "Gallery image preview"}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <input
                    ref={(node) => {
                      fileRefs.current[index] = node;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void uploadImage(index, file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="editor-cta"
                      disabled={uploadingIndex === index}
                      onClick={() => fileRefs.current[index]?.click()}
                    >
                      {uploadingIndex === index ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {uploadingIndex === index ? "Uploading..." : "Upload image"}
                    </Button>
                    {image.url ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const next = [...images];
                          next[index] = { ...image, url: "" };
                          patch({ images: next });
                        }}
                      >
                        Remove image
                      </Button>
                    ) : null}
                  </div>
                  {uploadProgress[index] ? (
                    <div className="space-y-1">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${uploadProgress[index]}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Saving to Media... {uploadProgress[index]}%
                      </p>
                    </div>
                  ) : null}

                  <PromptedInput
                    label="Image URL"
                    value={image.url}
                    onChange={(v) => {
                      const next = [...images];
                      next[index] = { ...image, url: v };
                      patch({ images: next });
                    }}
                    placeholder="https://..."
                    type="url"
                    inputMode="url"
                  />
                  <PromptedInput
                    label="Alt Text"
                    value={image.alt}
                    onChange={(v) => {
                      const next = [...images];
                      next[index] = { ...image, alt: v };
                      patch({ images: next });
                    }}
                    placeholder="Describe this image"
                  />
                  <PromptedInput
                    label="Caption"
                    value={image.caption}
                    onChange={(v) => {
                      const next = [...images];
                      next[index] = { ...image, caption: v };
                      patch({ images: next });
                    }}
                    placeholder="Optional caption"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
