"use client";

import type { CSSProperties } from "react";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import { blockColorOverrideVars } from "@/lib/block-colors";
import { sanitizeSvg } from "@/lib/icons/sanitize";
import { normalizeSafeUrl } from "@/lib/safe-url";
import type {
  ImageCardsAnimation,
  ImageCardsColorRole,
  ImageCardsContent,
  ImageCardsImageFit,
  ImageCardsImagePlacement,
  ImageCardsImagePosition,
  ImageCardsStyle,
} from "../types";

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

const IMAGE_CARD_STYLES: ImageCardsStyle[] = [
  "classic",
  "horizontal_list",
  "cinematic_overlay",
  "offset_float",
  "inset_minimal",
  "organic_icon_mask",
  "diagonal_slant",
  "wave_reveal",
  "hex_intersect",
];

const IMAGE_CARD_COLOR_ROLES: ImageCardsColorRole[] = [
  "primary",
  "secondary",
  "accent",
];

const IMAGE_CARD_ANIMATIONS: ImageCardsAnimation[] = [
  "style_default",
  "none",
  "lift",
  "zoom",
  "reveal",
  "float",
  "rotate",
  "glow",
];

const IMAGE_CARD_FITS: ImageCardsImageFit[] = ["cover", "contain", "natural"];

const IMAGE_CARD_POSITIONS: ImageCardsImagePosition[] = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
];

const IMAGE_CARD_PLACEMENTS: ImageCardsImagePlacement[] = [
  "style_default",
  "top",
  "bottom",
  "left",
  "right",
];

const IMAGE_CARD_POSITION_VALUES: Record<ImageCardsImagePosition, string> = {
  center: "center",
  top: "center top",
  bottom: "center bottom",
  left: "left center",
  right: "right center",
};

type ImageCardGridStyle = CSSProperties & {
  "--sl-image-card-fit"?: "cover" | "contain";
  "--sl-image-card-position"?: string;
  "--sl-image-card-title-scale"?: number;
  "--sl-image-card-description-scale"?: number;
  "--sl-image-card-media-share"?: string;
  "--sl-image-card-text-share"?: string;
  "--sl-image-card-media-height"?: string;
};

type ImageCardItemStyle = CSSProperties & {
  "--sl-image-card-icon-mask"?: string;
};

function readCards(content: Partial<ImageCardsContent>): ImageCard[] {
  const source = Array.isArray(content.cards) ? content.cards : [];
  return source
    .map((card) => ({
      image_url: typeof card?.image_url === "string" ? card.image_url.trim() : "",
      alt: typeof card?.alt === "string" ? card.alt.trim() : "",
      title: typeof card?.title === "string" ? card.title.trim() : "",
      description:
        typeof card?.description === "string" ? card.description.trim() : "",
      icon: typeof card?.icon === "string" ? card.icon.trim() : "",
      cta_enabled:
        typeof card?.cta_enabled === "boolean" ? card.cta_enabled : false,
      cta_label:
        typeof card?.cta_label === "string" ? card.cta_label.trim() : "",
      cta_href:
        typeof card?.cta_href === "string" ? card.cta_href.trim() : "",
    }))
    .filter((card) => card.image_url || card.title || card.description);
}

function readImageCardsStyle(value: unknown): ImageCardsStyle {
  return IMAGE_CARD_STYLES.includes(value as ImageCardsStyle)
    ? (value as ImageCardsStyle)
    : "classic";
}

function readImageCardsColorRole(
  value: unknown,
  fallback: ImageCardsColorRole
): ImageCardsColorRole {
  return IMAGE_CARD_COLOR_ROLES.includes(value as ImageCardsColorRole)
    ? (value as ImageCardsColorRole)
    : fallback;
}

function readImageCardsAnimation(value: unknown): ImageCardsAnimation {
  return IMAGE_CARD_ANIMATIONS.includes(value as ImageCardsAnimation)
    ? (value as ImageCardsAnimation)
    : "style_default";
}

function readImageCardsFit(value: unknown): ImageCardsImageFit {
  return IMAGE_CARD_FITS.includes(value as ImageCardsImageFit)
    ? (value as ImageCardsImageFit)
    : "cover";
}

function readImageCardsPosition(value: unknown): ImageCardsImagePosition {
  return IMAGE_CARD_POSITIONS.includes(value as ImageCardsImagePosition)
    ? (value as ImageCardsImagePosition)
    : "center";
}

function readImageCardsPlacement(value: unknown): ImageCardsImagePlacement {
  return IMAGE_CARD_PLACEMENTS.includes(value as ImageCardsImagePlacement)
    ? (value as ImageCardsImagePlacement)
    : "style_default";
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function svgToMaskUrl(svg: string) {
  const normalized = svg
    .replace(/\s+/g, " ")
    .replace(/currentColor/g, "black")
    .replace(/"/g, "'");
  return `url("data:image/svg+xml,${encodeURIComponent(normalized)}")`;
}

export function ImageCardsBlock({
  content,
}: {
  content: Partial<ImageCardsContent>;
}) {
  const cards = readCards(content);
  if (cards.length === 0) return null;
  const style = readImageCardsStyle(content.style);
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = readImageCardsColorRole(config?.accent_role, "primary");
  const animation = readImageCardsAnimation(config?.animation);
  const imageFit = readImageCardsFit(config?.image_fit);
  const imagePosition = readImageCardsPosition(config?.image_position);
  const imagePlacement = readImageCardsPlacement(config?.image_placement);
  const imageShare = readNumber(config?.image_share, 42, 25, 75);
  const titleSize = readNumber(config?.title_size, 100, 70, 160);
  const descriptionSize = readNumber(config?.description_size, 100, 70, 150);
  const gridStyle: ImageCardGridStyle = {
    "--sl-image-card-fit": imageFit === "natural" ? "contain" : imageFit,
    "--sl-image-card-position": IMAGE_CARD_POSITION_VALUES[imagePosition],
    "--sl-image-card-title-scale": titleSize / 100,
    "--sl-image-card-description-scale": descriptionSize / 100,
    "--sl-image-card-media-share": `${imageShare}%`,
    "--sl-image-card-text-share": `${100 - imageShare}%`,
    "--sl-image-card-media-height": `${8 + (imageShare - 25) * 0.16}rem`,
    ...blockColorOverrideVars([
      {
        value: config?.accent_color,
        colorVar: "--sl-image-card-color",
        rgbVar: "--sl-image-card-color-rgb",
        contrastVar: "--sl-image-card-contrast",
      },
    ]),
  };

  return (
    <div
      className="sl-image-card-grid"
      data-image-card-style={style}
      data-color-role={accentRole}
      data-animation={animation}
      data-image-fit={imageFit}
      data-image-placement={imagePlacement}
      style={gridStyle}
    >
      {cards.map((card, index) => {
        const ctaHref = card.cta_enabled
          ? normalizeSafeUrl(card.cta_href)
          : null;
        const ctaLabel = card.cta_label || "Learn more";
        const maskIcon = sanitizeSvg(card.icon) || DEFAULT_ICONS.BLOCK_AMENITY;
        const itemStyle: ImageCardItemStyle = {
          "--sl-image-card-icon-mask": svgToMaskUrl(maskIcon),
        };

        return (
          <article
            key={`image-card-${index}-${card.title}`}
            className="sl-image-card"
            data-has-cta={ctaHref ? "true" : "false"}
            style={itemStyle}
          >
            {card.image_url ? (
              <div className="sl-image-card-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.image_url} alt={card.alt || card.title || ""} />
              </div>
            ) : null}
            <div className="sl-image-card-copy">
              {card.title ? <h3>{card.title}</h3> : null}
              {card.description ? <p>{card.description}</p> : null}
              {ctaHref ? (
                <a
                  className="sl-image-card-cta"
                  href={ctaHref}
                  target={isExternalHref(ctaHref) ? "_blank" : undefined}
                  rel={isExternalHref(ctaHref) ? "noopener noreferrer" : undefined}
                >
                  {ctaLabel}
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
