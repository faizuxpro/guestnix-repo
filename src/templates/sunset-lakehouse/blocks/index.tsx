"use client";

import type { TemplateBlock, TemplatePlace } from "../types";
import { TextBlock } from "./TextBlock";
import { HeadingBlock } from "./HeadingBlock";
import { ImageBlock } from "./ImageBlock";
import { WifiBlock } from "./WifiBlock";
import { ContainerBlock } from "./ContainerBlock";
import { FaqBlock } from "./FaqBlock";
import { IconGridBlock } from "./IconGridBlock";
import { ImageCardsBlock } from "./ImageCardsBlock";
import { TileSetBlock } from "./TileSetBlock";
import { CustomHtmlBlock } from "./CustomHtmlBlock";
import { DividerBlock } from "./DividerBlock";
import { VideoBlock } from "./VideoBlock";
import { GalleryBlock } from "./GalleryBlock";
import { ButtonBlock } from "./ButtonBlock";
import { BookingLinkBlock } from "./BookingLinkBlock";
import { StreamingBlock } from "./StreamingBlock";
import { WorldClockBlock } from "./WorldClockBlock";
import { SmartLockBlock } from "./SmartLockBlock";
import { EmergencyContactsBlock } from "./EmergencyContactsBlock";
import { PhrasebookBlock } from "./PhrasebookBlock";
import { CurrencyBlock } from "./CurrencyBlock";
import { WeatherBlock } from "./WeatherBlock";
import { AddPlacesBlock } from "./AddPlacesBlock";

type Props = {
  block: TemplateBlock;
  places?: TemplatePlace[];
  guidebookSettings?: Record<string, unknown>;
};

export function BlockRenderer({ block, places, guidebookSettings }: Props) {
  if (!block.isVisible) return null;

  switch (block.type) {
    // Content / Media / Layout
    case "text":
      return (
        <TextBlock
          content={block.content}
          blockId={block.id}
          guidebookSettings={guidebookSettings}
        />
      );
    case "heading":
      return (
        <HeadingBlock
          content={block.content}
          guidebookSettings={guidebookSettings}
        />
      );
    case "image":
      return <ImageBlock content={block.content} />;
    case "video":
      return <VideoBlock content={block.content} />;
    case "gallery":
      return <GalleryBlock content={block.content} />;
    case "faq":
      return <FaqBlock content={block.content} />;
    case "icon_grid":
      return <IconGridBlock content={block.content} />;
    case "image_cards":
      return <ImageCardsBlock content={block.content} />;
    case "tile_set":
      return <TileSetBlock content={block.content} />;
    case "custom_html":
      return <CustomHtmlBlock content={block.content} />;
    case "divider":
      return <DividerBlock content={block.content} />;
    // Widgets
    case "wifi":
      return <WifiBlock content={block.content} />;
    case "container":
      return (
        <ContainerBlock
          content={block.content}
          renderChild={(childBlock) => (
            <BlockRenderer
              block={childBlock}
              places={places}
              guidebookSettings={guidebookSettings}
            />
          )}
        />
      );
    case "button":
      return <ButtonBlock content={block.content} />;
    case "booking_link":
      return <BookingLinkBlock content={block.content} />;
    case "streaming":
      return <StreamingBlock content={block.content} />;
    case "world_clock":
      return <WorldClockBlock content={block.content} />;
    case "smart_lock":
      return <SmartLockBlock content={block.content} />;
    case "emergency_contacts":
      return <EmergencyContactsBlock content={block.content} />;
    case "phrasebook":
      return <PhrasebookBlock content={block.content} />;
    case "currency":
      return <CurrencyBlock content={block.content} />;
    case "weather":
      return <WeatherBlock content={block.content} />;
    case "add_places":
      return <AddPlacesBlock content={block.content} places={places} />;
    default:
      return null;
  }
}
