"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { getMediaAssetUrl } from "@/lib/assets-hub";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AssetsHubPickerButton } from "@/components/editor/assets/AssetsHubPickerButton";
import { normalizeHexColor } from "@/lib/block-colors";
import type { EditorBlock } from "@/stores/editor-store";
import type {
  ImageCardsAnimation,
  ImageCardsColorRole,
  ImageCardsImageFit,
  ImageCardsImagePosition,
  ImageCardsStyle,
} from "@/types/blocks";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput, PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type ImageCard = {
  image_url: string;
  alt: string;
  title: string;
  description: string;
  icon: string;
  cta_enabled: boolean;
  cta_label: string;
  cta_href: string;
};

type ImageCardsConfig = {
  accentRole: ImageCardsColorRole;
  accentColor: string;
  animation: ImageCardsAnimation;
  imageFit: ImageCardsImageFit;
  imagePosition: ImageCardsImagePosition;
};

const IMAGE_CARD_STYLES: Array<{ value: ImageCardsStyle; label: string }> = [
  { value: "classic", label: "Classic Compact" },
  { value: "horizontal_list", label: "01. Horizontal List" },
  { value: "cinematic_overlay", label: "02. Cinematic Overlay" },
  { value: "offset_float", label: "03. Offset Floating" },
  { value: "inset_minimal", label: "04. Inset Minimal" },
  { value: "organic_icon_mask", label: "05. Organic Icon Mask" },
  { value: "diagonal_slant", label: "06. Diagonal Slant" },
  { value: "wave_reveal", label: "07. Wave Reveal" },
  { value: "hex_intersect", label: "08. Icon Intersect" },
];

const IMAGE_CARD_STYLE_VALUES = IMAGE_CARD_STYLES.map((style) => style.value);

const IMAGE_CARD_COLOR_ROLES: Array<{
  value: ImageCardsColorRole;
  label: string;
}> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const IMAGE_CARD_COLOR_ROLE_VALUES = IMAGE_CARD_COLOR_ROLES.map(
  (role) => role.value
);

const IMAGE_CARD_ANIMATIONS: Array<{
  value: ImageCardsAnimation;
  label: string;
}> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "zoom", label: "Image zoom" },
  { value: "reveal", label: "Reveal copy" },
  { value: "float", label: "Soft float" },
  { value: "rotate", label: "Rotate shape" },
  { value: "glow", label: "Accent glow" },
];

const IMAGE_CARD_ANIMATION_VALUES = IMAGE_CARD_ANIMATIONS.map(
  (animation) => animation.value
);

const IMAGE_CARD_FITS: Array<{ value: ImageCardsImageFit; label: string }> = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
];

const IMAGE_CARD_FIT_VALUES = IMAGE_CARD_FITS.map((fit) => fit.value);

const IMAGE_CARD_POSITIONS: Array<{
  value: ImageCardsImagePosition;
  label: string;
}> = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const IMAGE_CARD_POSITION_VALUES = IMAGE_CARD_POSITIONS.map(
  (position) => position.value
);

function readCards(content: Record<string, unknown>): ImageCard[] {
  const value = content.cards;
  if (!Array.isArray(value)) return [];
  return value
    .map((item): ImageCard | null => {
      if (!item || typeof item !== "object") return null;
      const card = item as Record<string, unknown>;
      return {
        image_url: typeof card.image_url === "string" ? card.image_url : "",
        alt: typeof card.alt === "string" ? card.alt : "",
        title: typeof card.title === "string" ? card.title : "",
        description: typeof card.description === "string" ? card.description : "",
        icon: typeof card.icon === "string" ? card.icon : "",
        cta_enabled:
          typeof card.cta_enabled === "boolean" ? card.cta_enabled : false,
        cta_label:
          typeof card.cta_label === "string" ? card.cta_label : "Learn more",
        cta_href: typeof card.cta_href === "string" ? card.cta_href : "",
      };
    })
    .filter((item): item is ImageCard => Boolean(item));
}

function coerceImageCardsStyle(value: unknown): ImageCardsStyle {
  if (IMAGE_CARD_STYLE_VALUES.includes(value as ImageCardsStyle)) {
    return value as ImageCardsStyle;
  }
  return "classic";
}

function coerceImageCardsColorRole(
  value: unknown,
  fallback: ImageCardsColorRole
): ImageCardsColorRole {
  if (IMAGE_CARD_COLOR_ROLE_VALUES.includes(value as ImageCardsColorRole)) {
    return value as ImageCardsColorRole;
  }
  return fallback;
}

function coerceImageCardsAnimation(value: unknown): ImageCardsAnimation {
  if (IMAGE_CARD_ANIMATION_VALUES.includes(value as ImageCardsAnimation)) {
    return value as ImageCardsAnimation;
  }
  return "style_default";
}

function coerceImageCardsFit(value: unknown): ImageCardsImageFit {
  if (IMAGE_CARD_FIT_VALUES.includes(value as ImageCardsImageFit)) {
    return value as ImageCardsImageFit;
  }
  return "cover";
}

function coerceImageCardsPosition(value: unknown): ImageCardsImagePosition {
  if (IMAGE_CARD_POSITION_VALUES.includes(value as ImageCardsImagePosition)) {
    return value as ImageCardsImagePosition;
  }
  return "center";
}

function readConfig(content: Record<string, unknown>): ImageCardsConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};

  return {
    accentRole: coerceImageCardsColorRole(raw.accent_role, "primary"),
    accentColor: normalizeHexColor(raw.accent_color),
    animation: coerceImageCardsAnimation(raw.animation),
    imageFit: coerceImageCardsFit(raw.image_fit),
    imagePosition: coerceImageCardsPosition(raw.image_position),
  };
}

export function ImageCardsBlockEditor({ block, onChange }: Props) {
  const cards = readCards(block.content);
  const style = coerceImageCardsStyle(block.content.style);
  const config = readConfig(block.content);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchCards = (next: ImageCard[]) => patch({ cards: next });

  const patchConfig = (next: Partial<ImageCardsConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        animation: merged.animation,
        image_fit: merged.imageFit,
        image_position: merged.imagePosition,
      },
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= cards.length) return;
    const next = [...cards];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    patchCards(next);
  };

  const uploadImage = async (index: number, file: File) => {
    setUploadingIndex(index);
    setUploadProgress((current) => ({ ...current, [index]: 1 }));

    try {
      const result = await uploadMediaFile(file, {
        onProgress: (progress) =>
          setUploadProgress((current) => ({ ...current, [index]: progress })),
      });
      const next = [...cards];
      if (!next[index]) return;
      next[index] = { ...next[index], image_url: result.url };
      patchCards(next);
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

  return (
    <div className="editor-section">
      <div className="grid gap-1.5">
        <Label>Card Style</Label>
        <Select
          value={style}
          onValueChange={(value) =>
            patch({ style: coerceImageCardsStyle(value) })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_CARD_STYLES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <BlockColorControls
          label="Element Color"
          role={config.accentRole}
          customColor={config.accentColor}
          options={IMAGE_CARD_COLOR_ROLES}
          onChange={({ role, customColor }) =>
            patchConfig({ accentRole: role, accentColor: customColor })
          }
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Animation</Label>
        <Select
          value={config.animation}
          onValueChange={(value) =>
            patchConfig({ animation: coerceImageCardsAnimation(value) })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {IMAGE_CARD_ANIMATIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Image fit</Label>
          <Select
            value={config.imageFit}
            onValueChange={(value) =>
              patchConfig({ imageFit: coerceImageCardsFit(value) })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_CARD_FITS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Image position</Label>
          <Select
            value={config.imagePosition}
            onValueChange={(value) =>
              patchConfig({
                imagePosition: coerceImageCardsPosition(value),
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_CARD_POSITIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="editor-section-header">
        <Label>Cards</Label>
        <Button
          type="button"
          size="sm"
          className="editor-cta"
          onClick={() =>
            patchCards([
              ...cards,
              {
                image_url: "",
                alt: "",
                title: "Card title",
                description: "Short supporting description.",
                icon: "",
                cta_enabled: false,
                cta_label: "Learn more",
                cta_href: "",
              },
            ])
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add card
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="editor-empty">
          Add image cards with a photo, title, and description.
        </div>
      ) : (
        <div className="editor-list">
          {cards.map((card, index) => (
            <div key={`${block.id}-image-card-${index}`} className="editor-list-item">
              <div className="editor-item-toolbar">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move card up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, 1)}
                  disabled={index === cards.length - 1}
                  aria-label="Move card down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    patchCards(
                      cards.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  aria-label="Remove card"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {card.image_url ? (
                <div className="block-editor-preview mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image_url}
                    alt={card.alt || "Image card preview"}
                    className={`h-36 w-full ${
                      config.imageFit === "contain"
                        ? "bg-muted object-contain"
                        : "object-cover"
                    }`}
                    style={{
                      objectPosition:
                        config.imagePosition === "top"
                          ? "center top"
                          : config.imagePosition === "bottom"
                            ? "center bottom"
                            : config.imagePosition === "left"
                              ? "left center"
                              : config.imagePosition === "right"
                                ? "right center"
                                : "center",
                    }}
                  />
                </div>
              ) : (
                <div className="editor-empty mb-3 flex h-28 items-center justify-center">
                  <div className="flex items-center gap-2 text-xs">
                    <ImagePlus className="h-4 w-4" />
                    No image selected
                  </div>
                </div>
              )}

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
              <div className="mb-3 flex flex-wrap gap-2">
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
                <AssetsHubPickerButton
                  assetType="media"
                  label="Use Assets Hub media"
                  onSelect={(asset) => {
                    const url = getMediaAssetUrl(asset);
                    if (!url) {
                      toast.error("Saved media is missing a URL.");
                      return;
                    }
                    const next = [...cards];
                    next[index] = {
                      ...card,
                      image_url: url,
                      alt: card.alt || asset.name,
                    };
                    patchCards(next);
                    toast.success("Saved media applied");
                  }}
                />
                {card.image_url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const next = [...cards];
                      next[index] = { ...card, image_url: "" };
                      patchCards(next);
                    }}
                  >
                    Remove image
                  </Button>
                ) : null}
              </div>
              {uploadProgress[index] ? (
                <div className="mb-3 space-y-1">
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

              {style === "organic_icon_mask" || style === "hex_intersect" ? (
                <div className="mb-3 grid gap-1.5">
                  <Label>Mask icon</Label>
                  <IconifyPicker
                    value={card.icon}
                    onChange={(icon) => {
                      const next = [...cards];
                      next[index] = { ...card, icon };
                      patchCards(next);
                    }}
                    ariaLabel="Select image card mask icon"
                    triggerClassName="h-10 w-10 rounded-md border border-border/70 text-foreground"
                    iconClassName="text-lg"
                  />
                </div>
              ) : null}

              <div className="grid gap-2">
                <PromptedInput
                  label="Image URL"
                  value={card.image_url}
                  onChange={(value) => {
                    const next = [...cards];
                    next[index] = { ...card, image_url: value };
                    patchCards(next);
                  }}
                  placeholder="https://..."
                  type="url"
                  inputMode="url"
                />
                <PromptedInput
                  label="Alt text"
                  value={card.alt}
                  onChange={(value) => {
                    const next = [...cards];
                    next[index] = { ...card, alt: value };
                    patchCards(next);
                  }}
                  placeholder="Describe this image"
                />
                <PromptedInput
                  label="Title"
                  value={card.title}
                  onChange={(value) => {
                    const next = [...cards];
                    next[index] = { ...card, title: value };
                    patchCards(next);
                  }}
                  placeholder="Card title"
                />
                <PromptedTextarea
                  label="Description"
                  value={card.description}
                  onChange={(value) => {
                    const next = [...cards];
                    next[index] = { ...card, description: value };
                    patchCards(next);
                  }}
                  placeholder="Short supporting description"
                  rows={3}
                />
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted/25 px-2.5 py-2">
                  <Label htmlFor={`${block.id}-image-card-cta-${index}`}>
                    CTA
                  </Label>
                  <Switch
                    id={`${block.id}-image-card-cta-${index}`}
                    checked={card.cta_enabled}
                    onCheckedChange={(checked) => {
                      const next = [...cards];
                      next[index] = { ...card, cta_enabled: checked };
                      patchCards(next);
                    }}
                    size="sm"
                  />
                </div>
                {card.cta_enabled ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <PromptedInput
                      label="CTA label"
                      value={card.cta_label}
                      onChange={(value) => {
                        const next = [...cards];
                        next[index] = { ...card, cta_label: value };
                        patchCards(next);
                      }}
                      placeholder="Learn more"
                    />
                    <PromptedInput
                      label="CTA URL"
                      value={card.cta_href}
                      onChange={(value) => {
                        const next = [...cards];
                        next[index] = { ...card, cta_href: value };
                        patchCards(next);
                      }}
                      placeholder="https://..."
                      type="url"
                      inputMode="url"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
