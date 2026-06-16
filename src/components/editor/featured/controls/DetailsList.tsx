"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type DetailsItem<K extends string> = {
  key: K;
  label: string;
  icon: React.ReactNode;
};

type Props<K extends string> = {
  items: ReadonlyArray<DetailsItem<K>>;
  values: Record<K, boolean>;
  onToggle: (key: K, next: boolean) => void;
};

/**
 * Flat two-column toggle list for show/hide flags. Each row is a click
 * target with a muted icon, label, and inline switch — no borders, no
 * card chrome. Active rows simply brighten the label and icon color.
 */
export function DetailsList<K extends string>({
  items,
  values,
  onToggle,
}: Props<K>) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
      {items.map((item) => {
        const active = values[item.key];
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggle(item.key, !active)}
            className="group flex items-center gap-2 rounded px-1 py-1 text-left transition-colors hover:bg-muted/30"
          >
            <span
              className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-colors [&_svg]:!h-3.5 [&_svg]:!w-3.5",
                active ? "text-foreground" : "text-muted-foreground/60"
              )}
            >
              {item.icon}
            </span>
            <span
              className={cn(
                "flex-1 truncate text-[11.5px] leading-tight transition-colors",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
            <Switch
              checked={active}
              onCheckedChange={(checked) => onToggle(item.key, checked)}
              onClick={(e) => e.stopPropagation()}
              aria-label={item.label}
              size="sm"
            />
          </button>
        );
      })}
    </div>
  );
}
