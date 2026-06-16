"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { BlockOption } from "./AddBlockMenu";

export type GroupedBlockOptions = {
  assetsHub: BlockOption[];
  standard: BlockOption[];
  widgets: BlockOption[];
};

const BLOCK_USAGE_ORDER = new Map<string, number>(
  [
    "text-rich",
    "heading",
    "text-info-card",
    "text-list",
    "faq",
    "image-photo",
    "gallery",
    "text-alert",
    "text-contacts",
    "text-facts",
    "icon-grid",
    "image-cards",
    "tile-set",
    "button",
    "video",
    "divider",
    "custom-html",
    "container",
    "wifi",
    "smart_lock",
    "emergency_contacts",
    "weather",
    "add-places",
    "streaming",
    "booking_link",
    "currency",
    "phrasebook",
    "world_clock",
  ].map((id, index) => [id, index] as const)
);

const BLOCK_DESCRIPTIONS: Record<string, string> = {
  "text-rich": "Flexible copy, links, and formatted guest notes.",
  heading: "Structure a section with a styled title.",
  "text-info-card": "Highlight an important detail in a compact card.",
  "text-list": "Steps, rules, supplies, or quick checks.",
  faq: "Collapsible answers for common guest questions.",
  "image-photo": "A single photo with alt text and caption support.",
  gallery: "A photo set for rooms, views, or local spots.",
  "text-alert": "A prominent note for time-sensitive details.",
  "text-contacts": "Phone, email, address, or support rows.",
  "text-facts": "Quick specs like parking, beds, and amenities.",
  "icon-grid": "Feature grid with icons and short descriptions.",
  "image-cards": "Visual cards for amenities, steps, or offers.",
  "tile-set": "Compact amenity tiles for fast scanning.",
  video: "Paste a video URL or iframe embed code.",
  divider: "Separate content with a styled break or spacer.",
  "custom-html": "Embed advanced markup or custom widgets.",
  container: "Group multiple blocks inside one styled parent.",
  wifi: "Network details with optional QR code.",
  smart_lock: "Door code details with reveal timing.",
  emergency_contacts: "Country defaults and custom emergency contacts.",
  button: "A clear link or call-to-action for guests.",
  weather: "Forecast for the property location.",
  "add-places": "Show saved Local Places as section cards.",
  streaming: "Streaming services and TV instructions.",
  booking_link: "Promote a return stay or direct booking.",
  currency: "Quick conversion for travel spending.",
  phrasebook: "Common local phrases for guests.",
  world_clock: "Useful time zones for international guests.",
};

function optionRank(option: BlockOption, index: number) {
  if (option.source === "assets_hub") return index - 1000;
  return BLOCK_USAGE_ORDER.get(option.id) ?? index + 1000;
}

export function sortBlockOptionsByUsage(items: BlockOption[]) {
  return [...items].sort((a, b) => {
    const rankA = optionRank(a, items.indexOf(a));
    const rankB = optionRank(b, items.indexOf(b));
    return rankA - rankB;
  });
}

export function groupBlockOptions(items: BlockOption[]): GroupedBlockOptions {
  const ordered = sortBlockOptionsByUsage(items);

  return {
    assetsHub: ordered.filter((option) => option.source === "assets_hub"),
    standard: ordered.filter(
      (option) =>
        option.category !== "Widgets" && option.source !== "assets_hub"
    ),
    widgets: ordered.filter((option) => option.category === "Widgets"),
  };
}

function optionDescription(option: BlockOption) {
  if (option.source === "assets_hub") return "Reusable block from Assets Hub.";
  return BLOCK_DESCRIPTIONS[option.id] ?? `${option.category} block.`;
}

function optionMeta(option: BlockOption) {
  if (option.source === "assets_hub") return "Saved";
  return option.category;
}

function PickerSection({
  label,
  items,
  creating,
  onAdd,
}: {
  label: string;
  items: BlockOption[];
  creating: boolean;
  onAdd: (option: BlockOption) => void;
}) {
  if (items.length === 0) return null;

  return (
    <CommandGroup
      heading={label}
      className={cn(
        "px-0 pb-2 pt-1",
        "[&_[cmdk-group-heading]]:px-1.5 [&_[cmdk-group-heading]]:py-2",
        "[&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold",
        "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em]",
        "[&_[cmdk-group-heading]]:text-muted-foreground",
        "[&_[cmdk-group-items]]:grid [&_[cmdk-group-items]]:grid-cols-2 [&_[cmdk-group-items]]:gap-2"
      )}
    >
      {items.map((option) => (
        <CommandItem
          key={option.id}
          value={`${option.label} ${option.type} ${option.category} ${optionDescription(option)}`}
          disabled={creating}
          onSelect={() => onAdd(option)}
          className={cn(
            "min-h-[4.85rem] cursor-pointer items-start gap-2.5 rounded-lg border",
            "border-border/70 bg-card/85 p-2.5 text-left shadow-sm transition-colors",
            "data-selected:border-primary/45 data-selected:bg-primary/5",
            "[&>svg:last-child]:hidden"
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
              "border-border/70 bg-muted/45 text-muted-foreground transition-colors",
              "group-data-selected/command-item:border-primary/30",
              "group-data-selected/command-item:bg-primary/10",
              "group-data-selected/command-item:text-primary"
            )}
          >
            <option.icon className="size-4" />
          </span>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="flex min-w-0 items-start justify-between gap-1.5">
              <span className="truncate text-[13px] font-semibold leading-5">
                {option.label}
              </span>
              <span className="shrink-0 rounded-full border border-border/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {optionMeta(option)}
              </span>
            </span>
            <span className="block text-[11px] leading-4 text-muted-foreground">
              {optionDescription(option)}
            </span>
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

export function BlockPickerCommand({
  options,
  onAdd,
  creating = false,
  className,
  listClassName,
}: {
  options: GroupedBlockOptions;
  onAdd: (option: BlockOption) => void;
  creating?: boolean;
  className?: string;
  listClassName?: string;
}) {
  return (
    <Command className={cn("rounded-lg p-0", className)}>
      <CommandInput placeholder="Search blocks..." />
      <CommandList
        className={cn(
          "max-h-[min(28rem,calc(100vh-12rem))] px-1 py-1.5",
          listClassName
        )}
      >
        <CommandEmpty>No matching blocks.</CommandEmpty>
        <PickerSection
          label="Assets Hub"
          items={options.assetsHub}
          creating={creating}
          onAdd={onAdd}
        />
        <PickerSection
          label="Standard blocks"
          items={options.standard}
          creating={creating}
          onAdd={onAdd}
        />
        <PickerSection
          label="Widgets"
          items={options.widgets}
          creating={creating}
          onAdd={onAdd}
        />
      </CommandList>
    </Command>
  );
}
