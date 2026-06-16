"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getMediaAssetUrl } from "@/lib/assets-hub";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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

type ImageFit = "cover" | "contain";
type ImageFrame = "none" | "card" | "soft";
type ImageRatio = "auto" | "16/9" | "4/3" | "3/2" | "1/1";

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readFit(content: Record<string, unknown>): ImageFit {
  const value = content.fit;
  return value === "contain" ? "contain" : "cover";
}

function readFrame(content: Record<string, unknown>): ImageFrame {
  const value = content.frame;
  if (value === "none" || value === "soft") return value;
  return "card";
}

function readRatio(content: Record<string, unknown>): ImageRatio {
  const value = content.ratio;
  if (
    value === "auto" ||
    value === "16/9" ||
    value === "4/3" ||
    value === "3/2" ||
    value === "1/1"
  ) {
    return value;
  }
  return "4/3";
}

export function ImageBlockEditor({ block, onChange }: Props) {
  const url = readString(block.content, "url");
  const alt = readString(block.content, "alt");
  const caption = readString(block.content, "caption");
  const fit = readFit(block.content);
  const frame = readFrame(block.content);
  const ratio = readRatio(block.content);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const patch = (next: {
    url?: string;
    alt?: string;
    caption?: string;
    fit?: ImageFit;
    frame?: ImageFrame;
    ratio?: ImageRatio;
  }) => {
    onChange({
      url: next.url ?? url,
      alt: next.alt ?? alt,
      caption: next.caption ?? caption,
      fit: next.fit ?? fit,
      frame: next.frame ?? frame,
      ratio: next.ratio ?? ratio,
    });
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(1);

    try {
      const result = await uploadMediaFile(file, {
        onProgress: setUploadProgress,
      });
      patch({ url: result.url });
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

  return (
    <div className="space-y-3">
      <div className="grid gap-1.5">
        <Label>Image</Label>
        {url ? (
          <div
            className={`block-editor-preview ${
              frame === "none"
                ? "rounded-none"
                : frame === "soft"
                  ? "rounded-2xl"
                  : "rounded-md"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt || "Uploaded image preview"}
              className={fit === "cover" ? "w-full object-cover" : "w-full object-contain"}
              style={ratio === "auto" ? { maxHeight: "18rem" } : { aspectRatio: ratio }}
            />
          </div>
        ) : (
          <div className="editor-empty flex h-32 items-center justify-center">
            <div className="flex items-center gap-2 text-sm">
              <ImagePlus className="h-4 w-4" />
              No image uploaded
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void uploadImage(file);
              }
              e.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            className="editor-cta"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            {isUploading ? "Uploading..." : "Upload image"}
          </Button>
          <AssetsHubPickerButton
            assetType="media"
            label="Use Assets Hub media"
            onSelect={(asset) => {
              const nextUrl = getMediaAssetUrl(asset);
              if (!nextUrl) {
                toast.error("Saved media is missing a URL.");
                return;
              }
              patch({
                url: nextUrl,
                alt: alt || asset.name,
                caption: caption || asset.description || "",
              });
              toast.success("Saved media applied");
            }}
          />
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => patch({ url: "" })}
            >
              Remove
            </Button>
          ) : null}
        </div>
        {isUploading ? (
          <div className="space-y-1">
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
        ) : null}
      </div>

      <PromptedInput
        label="Alt text"
        value={alt}
        onChange={(v) => patch({ alt: v })}
        placeholder="Describe this image for accessibility"
      />

      <PromptedInput
        label="Caption"
        value={caption}
        onChange={(v) => patch({ caption: v })}
        placeholder="Optional caption"
      />

      <div className="grid gap-1.5">
        <Label>Fit</Label>
        <Select
          value={fit}
          onValueChange={(value) =>
            patch({ fit: value === "contain" ? "contain" : "cover" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Frame</Label>
          <Select
            value={frame}
            onValueChange={(value) =>
              patch({
                frame: value === "none" || value === "soft" ? value : "card",
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="soft">Soft</SelectItem>
              <SelectItem value="none">Edge to edge</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Aspect Ratio</Label>
          <Select
            value={ratio}
            onValueChange={(value) =>
              patch({
                ratio:
                  value === "auto" ||
                  value === "16/9" ||
                  value === "4/3" ||
                  value === "3/2" ||
                  value === "1/1"
                    ? value
                    : "4/3",
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="16/9">16:9</SelectItem>
              <SelectItem value="4/3">4:3</SelectItem>
              <SelectItem value="3/2">3:2</SelectItem>
              <SelectItem value="1/1">1:1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
