"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, ImageIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EditorSection } from "@/stores/editor-store";
import {
  SECTION_COVER_SETTINGS_KEY,
  normalizeSectionCoverSettings,
  type SectionCoverContentSettings,
  type SectionCoverSettings,
} from "@/lib/section-cover";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "./featured/ImageUploadField";
import { SettingsField } from "./featured/controls/SettingsField";
import { PremiumSlider } from "./featured/controls/PremiumSlider";

type Props = {
  section: EditorSection;
  guidebookSettings: Record<string, unknown>;
  onSectionChange: (
    id: string,
    patch: Partial<Pick<EditorSection, "itemSettings">>
  ) => void;
  onOpenSharedCoverSettings?: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function writeCoverContentSettings(
  section: EditorSection,
  cover: SectionCoverSettings,
  patch: Partial<SectionCoverContentSettings>
) {
  const current = isRecord(section.itemSettings[SECTION_COVER_SETTINGS_KEY])
    ? (section.itemSettings[SECTION_COVER_SETTINGS_KEY] as Record<string, unknown>)
    : {};

  return {
    ...section.itemSettings,
    [SECTION_COVER_SETTINGS_KEY]: {
      ...current,
      title_text: patch.title_text ?? cover.title_text,
      image_url:
        patch.image_url === undefined ? cover.image_url : patch.image_url,
      image_position: patch.image_position ?? cover.image_position,
    },
  };
}

export function SectionCoverEditor({
  section,
  guidebookSettings,
  onSectionChange,
  onOpenSharedCoverSettings,
}: Props) {
  const [open, setOpen] = useState(false);
  const cover = normalizeSectionCoverSettings(
    section.itemSettings,
    guidebookSettings
  );

  const patchContent = (patch: Partial<SectionCoverContentSettings>) => {
    onSectionChange(section.id, {
      itemSettings: writeCoverContentSettings(section, cover, patch),
    });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden rounded-md border border-border/70 bg-background shadow-sm">
        <div className="flex items-stretch">
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="group flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/35"
              />
            }
          >
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border/60 bg-muted/35 text-primary"
            >
              <ImageIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">
                Section cover
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {!cover.enabled
                  ? "Hidden by shared settings"
                  : cover.title_enabled
                  ? "Image, focal point, headline"
                  : "Image and focal point"}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground",
                open && "rotate-180"
              )}
            />
          </CollapsibleTrigger>

          {onOpenSharedCoverSettings ? (
            <div className="flex shrink-0 items-center pr-2">
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  aria-label="Open shared section cover settings"
                  onClick={onOpenSharedCoverSettings}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Open shared cover settings</TooltipContent>
              </Tooltip>
            </div>
          ) : null}
        </div>

        <CollapsibleContent className="border-t border-border/60 bg-background">
          <div className={cn("space-y-3 px-3 py-3", !cover.enabled && "opacity-50")}>
            {cover.title_enabled ? (
              <SettingsField
                label="Headline"
                hint="Leave blank to use the section name."
              >
                <Input
                  value={cover.title_text}
                  onChange={(event) =>
                    patchContent({ title_text: event.target.value })
                  }
                  placeholder={section.title || "Untitled section"}
                  maxLength={160}
                  className="h-9 text-sm"
                />
              </SettingsField>
            ) : null}
            <ImageUploadField
              label="Cover image"
              value={cover.image_url}
              onChange={(url) => patchContent({ image_url: url })}
              emptyText="Use the guide cover or add one"
              assetsHubLabel="Saved media"
            />
            <div className="grid grid-cols-2 gap-3">
              <PremiumSlider
                value={cover.image_position.x}
                min={0}
                max={100}
                step={1}
                label="Image X"
                format={(value) => `${value}%`}
                onChange={(x) =>
                  patchContent({
                    image_position: { ...cover.image_position, x },
                  })
                }
                marks={[
                  { value: 0, label: "L" },
                  { value: 50, label: "C" },
                  { value: 100, label: "R" },
                ]}
                showAllMarkLabels
              />
              <PremiumSlider
                value={cover.image_position.y}
                min={0}
                max={100}
                step={1}
                label="Image Y"
                format={(value) => `${value}%`}
                onChange={(y) =>
                  patchContent({
                    image_position: { ...cover.image_position, y },
                  })
                }
                marks={[
                  { value: 0, label: "T" },
                  { value: 50, label: "M" },
                  { value: 100, label: "B" },
                ]}
                showAllMarkLabels
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
