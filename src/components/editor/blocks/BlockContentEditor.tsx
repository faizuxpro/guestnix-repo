"use client";

import { AlertCircle } from "lucide-react";
import type { EditorBlock } from "@/stores/editor-store";
import { AddPlacesBlockEditor } from "./AddPlacesBlockEditor";
import { BookingLinkBlockEditor } from "./BookingLinkBlockEditor";
import { ButtonBlockEditor } from "./ButtonBlockEditor";
import { ContainerBlockEditor } from "./ContainerBlockEditor";
import { CustomHtmlBlockEditor } from "./CustomHtmlBlockEditor";
import { CurrencyBlockEditor } from "./CurrencyBlockEditor";
import { DividerBlockEditor } from "./DividerBlockEditor";
import { EmergencyContactsBlockEditor } from "./EmergencyContactsBlockEditor";
import { FaqBlockEditor } from "./FaqBlockEditor";
import { GalleryBlockEditor } from "./GalleryBlockEditor";
import { HeadingBlockEditor } from "./HeadingBlockEditor";
import { IconGridBlockEditor } from "./IconGridBlockEditor";
import { ImageBlockEditor } from "./ImageBlockEditor";
import { ImageCardsBlockEditor } from "./ImageCardsBlockEditor";
import { PhrasebookBlockEditor } from "./PhrasebookBlockEditor";
import { SmartLockBlockEditor } from "./SmartLockBlockEditor";
import { StreamingBlockEditor } from "./StreamingBlockEditor";
import { TextBlockEditor } from "./TextBlockEditor";
import { TileSetBlockEditor } from "./TileSetBlockEditor";
import { VideoBlockEditor } from "./VideoBlockEditor";
import { WeatherBlockEditor } from "./WeatherBlockEditor";
import { WifiBlockEditor } from "./WifiBlockEditor";
import { WorldClockBlockEditor } from "./WorldClockBlockEditor";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

export function BlockContentEditor({ block, onChange }: Props) {
  if (block.type === "text") {
    return <TextBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "heading") {
    return <HeadingBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "image") {
    return <ImageBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "wifi") {
    return <WifiBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "divider") {
    return <DividerBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "container") {
    return (
      <ContainerBlockEditor
        block={block}
        onChange={onChange}
        renderChildEditor={(childBlock, onChildChange) => (
          <BlockContentEditor block={childBlock} onChange={onChildChange} />
        )}
      />
    );
  }

  if (block.type === "faq") {
    return <FaqBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "icon_grid") {
    return <IconGridBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "image_cards") {
    return <ImageCardsBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "tile_set") {
    return <TileSetBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "custom_html") {
    return <CustomHtmlBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "video") {
    return <VideoBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "gallery") {
    return <GalleryBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "button") {
    return <ButtonBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "booking_link") {
    return <BookingLinkBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "streaming") {
    return <StreamingBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "world_clock") {
    return <WorldClockBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "smart_lock") {
    return <SmartLockBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "emergency_contacts") {
    return <EmergencyContactsBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "phrasebook") {
    return <PhrasebookBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "currency") {
    return <CurrencyBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "weather") {
    return <WeatherBlockEditor block={block} onChange={onChange} />;
  }

  if (block.type === "add_places") {
    return <AddPlacesBlockEditor block={block} onChange={onChange} />;
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-dashed px-2.5 py-2 text-xs text-muted-foreground">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        Editor for <strong>{block.type}</strong> is not implemented yet.
      </p>
    </div>
  );
}
