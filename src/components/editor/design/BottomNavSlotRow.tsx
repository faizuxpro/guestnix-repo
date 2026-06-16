"use client";

import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import {
  BOTTOM_NAV_BUILTIN_TYPES,
  type BottomNavBuiltinType,
  type BottomNavSlot,
} from "@/types/bottom-nav";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor-store";

export const DESTINATION_LABELS: Record<BottomNavSlot["type"], string> = {
  home: "Home",
  guide: "Guide",
  nearby: "Nearby",
  host: "Host",
  store: "Store",
  section: "Section",
  link: "External link",
};

const CUSTOM_DESTINATIONS = ["section", "link"] as const;
const NO_SECTION_VALUE = "__none";

type UsedBuiltins = Partial<Record<BottomNavBuiltinType, number>>;

type Props = {
  rowId: string;
  slot: BottomNavSlot;
  index: number;
  usedBuiltins: UsedBuiltins;
  onChange: (next: BottomNavSlot) => void;
  onRemove: () => void;
  canRemove: boolean;
};

function nextLabel(
  previous: BottomNavSlot,
  nextType: BottomNavSlot["type"]
) {
  const previousDefault = DESTINATION_LABELS[previous.type];
  const label = previous.label.trim();
  if (!label || label === previousDefault) return DESTINATION_LABELS[nextType];
  return previous.label;
}

export function createBottomNavSlot(
  type: BottomNavSlot["type"],
  previous: Pick<BottomNavSlot, "label" | "icon" | "type"> | null,
  firstSectionId = ""
): BottomNavSlot {
  const base = {
    label: previous ? nextLabel(previous as BottomNavSlot, type) : DESTINATION_LABELS[type],
    icon: previous?.icon ?? "",
  };

  if (type === "section") {
    return { ...base, type, sectionId: firstSectionId };
  }
  if (type === "link") {
    return { ...base, type, url: "" };
  }
  return { ...base, type };
}

export function BottomNavSlotRow({
  rowId,
  slot,
  index,
  usedBuiltins,
  onChange,
  onRemove,
  canRemove,
}: Props) {
  const sections = useEditorStore((s) => s.sections);
  const selectedSectionTitle =
    slot.type === "section"
      ? sections.find((section) => section.id === slot.sectionId)?.title
      : null;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const changeType = (type: BottomNavSlot["type"]) => {
    onChange(createBottomNavSlot(type, slot, sections[0]?.id ?? ""));
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border border-border/65 bg-muted/15 p-2 transition-colors",
        isDragging && "border-primary/45 bg-background opacity-70 shadow-sm"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder slot ${index + 1}`}
          className="inline-flex h-8 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="grid h-8 w-7 shrink-0 place-items-center rounded-md bg-background text-[11px] font-semibold text-muted-foreground ring-1 ring-inset ring-border/60">
          {index + 1}
        </span>

        <Select
          value={slot.type}
          onValueChange={(value) => {
            if (value) changeType(value as BottomNavSlot["type"]);
          }}
        >
          <SelectTrigger
            className="h-9 min-w-[128px] flex-[0_0_128px] rounded-md text-xs"
            aria-label={`Slot ${index + 1} destination`}
          >
            <SelectValue>
              {(value: BottomNavSlot["type"] | null) =>
                value ? DESTINATION_LABELS[value] : "Destination"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-64 min-w-64">
            {BOTTOM_NAV_BUILTIN_TYPES.map((type) => {
              const usedAt = usedBuiltins[type];
              const usedByOther =
                usedAt !== undefined && usedAt !== index && slot.type !== type;
              return (
                <SelectItem
                  key={type}
                  value={type}
                  disabled={usedByOther}
                  className="text-xs"
                >
                  {DESTINATION_LABELS[type]}
                </SelectItem>
              );
            })}
            {CUSTOM_DESTINATIONS.map((type) => (
              <SelectItem key={type} value={type}>
                {DESTINATION_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <IconifyPicker
          value={slot.icon}
          onChange={(icon) => onChange({ ...slot, icon })}
          ariaLabel={`Pick slot ${index + 1} icon`}
          triggerClassName="h-10 w-10 shrink-0 rounded-md border border-border/70 text-foreground [&_svg]:h-5 [&_svg]:w-5 [&_.host-icon]:text-xl"
        />

        <Input
          aria-label={`Slot ${index + 1} label`}
          className="h-9 min-w-0 flex-1 text-xs"
          placeholder="Label"
          value={slot.label}
          onChange={(event) => onChange({ ...slot, label: event.target.value })}
        />

        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Remove slot ${index + 1}`}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {slot.type === "section" ? (
        <div className="mt-2 pl-[74px]">
          <Select
            value={slot.sectionId || NO_SECTION_VALUE}
            onValueChange={(value) =>
              onChange({
                ...slot,
                type: "section",
                sectionId:
                  value === NO_SECTION_VALUE || value === null ? "" : value,
              })
            }
          >
            <SelectTrigger
              className="h-8 w-full rounded-md text-xs"
              aria-label={`Slot ${index + 1} target section`}
            >
              <SelectValue placeholder="Pick a section">
                {(value: string | null) => {
                  if (!value || value === NO_SECTION_VALUE) return "Pick a section";
                  return (
                    sections.find((section) => section.id === value)?.title ??
                    selectedSectionTitle ??
                    "Missing section"
                  );
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SECTION_VALUE} label="Pick a section">
                Pick a section
              </SelectItem>
              {sections.map((section) => (
                <SelectItem
                  key={section.id}
                  value={section.id}
                  label={section.title}
                >
                  {section.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {slot.type === "link" ? (
        <div className="mt-2 pl-[74px]">
          <Input
            aria-label={`Slot ${index + 1} URL`}
            className="h-8 text-xs"
            placeholder="https://..."
            value={slot.url}
            onChange={(event) =>
              onChange({ ...slot, type: "link", url: event.target.value })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
