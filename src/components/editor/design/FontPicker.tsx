"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search, Type, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  customToFontEntry,
  FONT_CATALOG,
  type CustomFont,
  type FontCategory,
  type FontEntry,
  resolveFontEntry,
} from "@/lib/fonts/catalog";
import { RuntimeFontLoader } from "@/components/fonts/RuntimeFontLoader";
import { AddFontDialog } from "./AddFontDialog";
import { useBranding } from "./_branding";

type Props = {
  value: string;
  onChange: (family: string) => void;
  /** Bias the recommended badge — heading vs body. */
  role?: "heading" | "body";
  /** Limit to a single category (e.g. only serifs). */
  category?: FontCategory;
  triggerClassName?: string;
};

const CATEGORY_ORDER: FontCategory[] = [
  "sans-serif",
  "serif",
  "display",
  "handwriting",
  "monospace",
];

export function FontPicker({
  value,
  onChange,
  role,
  category,
  triggerClassName,
}: Props) {
  const { branding, set } = useBranding();
  const customFonts = useMemo<CustomFont[]>(
    () => (Array.isArray(branding.custom_fonts) ? branding.custom_fonts : []),
    [branding.custom_fonts]
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<FontCategory | "all">(
    category ?? "all"
  );
  const [addOpen, setAddOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const filteredCustom = useMemo(() => {
    if (category) return []; // category-restricted picker → hide custom
    const q = query.trim().toLowerCase();
    if (!q) return customFonts;
    return customFonts.filter((f) => f.family.toLowerCase().includes(q));
  }, [customFonts, query, category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FONT_CATALOG.filter((f) => {
      if (category && f.category !== category) return false;
      if (activeCategory !== "all" && f.category !== activeCategory) return false;
      if (!q) return true;
      return f.family.toLowerCase().includes(q);
    });
  }, [query, activeCategory, category]);

  const grouped = useMemo(() => {
    const map = new Map<FontCategory, FontEntry[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const f of filtered) map.get(f.category)!.push(f);
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      label: CATEGORY_LABELS[cat],
      entries: map.get(cat) ?? [],
    })).filter((g) => g.entries.length > 0);
  }, [filtered]);

  // Load every font the picker can preview so the live samples render correctly.
  // Only loaded while the popover is open — otherwise we'd ship 60 stylesheets
  // on every editor mount.
  const previewFamilies = useMemo(
    () =>
      open
        ? [
            ...filteredCustom.map((f) => f.family),
            ...filtered.slice(0, 60).map((f) => f.family),
          ]
        : [],
    [filtered, filteredCustom, open]
  );

  useEffect(() => {
    if (!open) return;
    // Scroll the selected font into view when the popover opens.
    const node = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-family="${cssEscape(value)}"]`
    );
    node?.scrollIntoView({ block: "center" });
  }, [open, value]);

  const selectedEntry = resolveFontEntry(value, customFonts);

  const handleAddFont = (font: CustomFont) => {
    const next = [...customFonts, font];
    set({ custom_fonts: next });
    onChange(font.family);
  };

  const handleDeleteCustom = (family: string) => {
    const next = customFonts.filter((f) => f.family !== family);
    set({ custom_fonts: next });
    // If the deleted font was the active selection, fall back to the catalog
    // default for this role. Otherwise leave the selection untouched.
    if (value === family) {
      onChange(role === "heading" ? "Fraunces" : "Montserrat");
    }
  };

  return (
    <>
      <RuntimeFontLoader
        id={`picker-${role ?? "any"}`}
        fontFamilies={[value, ...previewFamilies]}
        customFonts={customFonts}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex h-9 w-full items-center justify-between gap-1.5 rounded-md border border-border/70 bg-background px-2.5 text-left text-xs font-medium shadow-none transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
                triggerClassName
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Type className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span
                  className="truncate text-xs font-medium"
                  style={{
                    fontFamily: selectedEntry
                      ? `"${selectedEntry.family}", ${selectedEntry.category}`
                      : undefined,
                  }}
                >
                  {value || "Pick a font"}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          }
        />
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[320px] p-0"
        >
          <div className="border-b border-border/70 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fonts"
                className="h-8 pl-7 text-[12px]"
              />
            </div>
            {category ? null : (
              <div className="mt-2 flex flex-wrap gap-1">
                <CategoryChip
                  active={activeCategory === "all"}
                  onClick={() => setActiveCategory("all")}
                  label="All"
                />
                {CATEGORY_ORDER.map((cat) => (
                  <CategoryChip
                    key={cat}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                    label={CATEGORY_LABELS[cat]}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            ref={listRef}
            className="max-h-[320px] overflow-y-auto p-1.5"
          >
            {filteredCustom.length > 0 ? (
              <div className="mb-2">
                <p className="px-1.5 pb-1 pt-2 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Custom
                </p>
                <div className="space-y-0.5">
                  {filteredCustom.map((font) => {
                    const selected = font.family === value;
                    const entry = customToFontEntry(font);
                    return (
                      <div
                        key={font.family}
                        className={cn(
                          "group flex items-center gap-1 rounded-md transition-colors",
                          selected
                            ? "bg-primary/8 ring-1 ring-inset ring-primary/30"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <button
                          type="button"
                          data-family={font.family}
                          onClick={() => {
                            onChange(font.family);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex min-w-0 flex-1 items-center justify-between gap-2 px-2 py-1.5 text-left",
                            selected ? "text-primary" : ""
                          )}
                        >
                          <span
                            className="truncate text-[14px]"
                            style={{
                              fontFamily: `"${entry.family}", ${entry.category}`,
                            }}
                          >
                            {font.family}
                          </span>
                          <span className="shrink-0 rounded-full bg-foreground/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {font.source === "upload" ? font.format ?? "file" : "google"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustom(font.family);
                          }}
                          aria-label={`Remove ${font.family}`}
                          className="mr-1 hidden h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {grouped.length === 0 && filteredCustom.length === 0 ? (
              <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                No fonts match.
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.cat} className="mb-2 last:mb-0">
                  <p className="px-1.5 pb-1 pt-2 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.entries.map((font) => {
                      const selected = font.family === value;
                      const recommended =
                        role &&
                        (font.recommend === role || font.recommend === "both");
                      return (
                        <button
                          key={font.family}
                          type="button"
                          data-family={font.family}
                          onClick={() => {
                            onChange(font.family);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                            selected
                              ? "bg-primary/8 text-primary ring-1 ring-inset ring-primary/30"
                              : "hover:bg-muted/40"
                          )}
                        >
                          <span
                            className="truncate text-[14px]"
                            style={{
                              fontFamily: `"${font.family}", ${font.category}`,
                            }}
                          >
                            {font.family}
                          </span>
                          {recommended ? (
                            <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700">
                              Rec.
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {category ? null : (
            <div className="border-t border-border/70 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setAddOpen(true);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-foreground/80 transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Google font or upload
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <AddFontDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingFamilies={[
          ...customFonts.map((f) => f.family),
          ...FONT_CATALOG.map((f) => f.family),
        ]}
        onAdd={handleAddFont}
      />
    </>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/8 text-primary"
          : "border-border/70 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function cssEscape(value: string): string {
  // Minimal escape for selector use — fonts only contain letters, spaces, digits.
  return value.replace(/"/g, '\\"');
}
