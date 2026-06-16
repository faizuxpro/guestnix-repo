"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
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
import { normalizeHexColor } from "@/lib/block-colors";
import { cn } from "@/lib/utils";
import {
  PHRASEBOOK_LANGUAGES,
  type PhrasebookCategory,
} from "@/lib/phrasebook";
import type { EditorBlock } from "@/stores/editor-store";
import type {
  PhrasebookCustomPhrase,
  PhrasebookLayout,
  PhrasebookStyle,
  WidgetAnimation,
  WidgetColorRole,
} from "@/types/blocks";
import { ToggleRow } from "../settings-ui";
import { PromptedInput } from "../shared/PromptedField";
import { BlockColorControls } from "./BlockColorControls";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type PhrasebookConfig = {
  accentRole: WidgetColorRole;
  accentColor: string;
  layout: PhrasebookLayout;
  showPronunciation: boolean;
  showCategoryCounts: boolean;
  animation: WidgetAnimation;
};

const ALL_CATEGORIES: { value: PhrasebookCategory; label: string }[] = [
  { value: "greetings", label: "Greetings" },
  { value: "dining", label: "Dining" },
  { value: "transport", label: "Transport" },
  { value: "directions", label: "Directions" },
  { value: "emergency", label: "Emergency" },
  { value: "shopping", label: "Shopping" },
];

const PHRASEBOOK_STYLES: Array<{ value: PhrasebookStyle; label: string }> = [
  { value: "accordion", label: "Accordion" },
  { value: "phrase_cards", label: "Phrase Cards" },
  { value: "travel_deck", label: "Travel Deck" },
  { value: "compact_table", label: "Compact Table" },
  { value: "dark_panel", label: "Dark Panel" },
  { value: "glass", label: "Glass" },
  { value: "brutalist", label: "Bold Block" },
];

const COLOR_ROLES: Array<{ value: WidgetColorRole; label: string }> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
];

const LAYOUTS: Array<{ value: PhrasebookLayout; label: string }> = [
  { value: "accordion", label: "Accordion" },
  { value: "grid", label: "Grid" },
  { value: "list", label: "List" },
];

const ANIMATIONS: Array<{ value: WidgetAnimation; label: string }> = [
  { value: "style_default", label: "Style default" },
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "glow", label: "Glow" },
  { value: "pulse", label: "Pulse" },
];

const STYLE_VALUES = PHRASEBOOK_STYLES.map((item) => item.value);
const COLOR_ROLE_VALUES = COLOR_ROLES.map((item) => item.value);
const LAYOUT_VALUES = LAYOUTS.map((item) => item.value);
const ANIMATION_VALUES = ANIMATIONS.map((item) => item.value);

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readLanguage(content: Record<string, unknown>): string {
  const v = content.language;
  return typeof v === "string" ? v : "es";
}

function readCategories(content: Record<string, unknown>): PhrasebookCategory[] {
  const v = content.categories;
  if (!Array.isArray(v)) return ["greetings", "dining"];
  return v.filter((x): x is PhrasebookCategory =>
    ALL_CATEGORIES.some((c) => c.value === x)
  );
}

function coerceStyle(value: unknown): PhrasebookStyle {
  return STYLE_VALUES.includes(value as PhrasebookStyle)
    ? (value as PhrasebookStyle)
    : "accordion";
}

function coerceColorRole(value: unknown): WidgetColorRole {
  return COLOR_ROLE_VALUES.includes(value as WidgetColorRole)
    ? (value as WidgetColorRole)
    : "accent";
}

function coerceLayout(value: unknown): PhrasebookLayout {
  return LAYOUT_VALUES.includes(value as PhrasebookLayout)
    ? (value as PhrasebookLayout)
    : "accordion";
}

function coerceAnimation(value: unknown): WidgetAnimation {
  return ANIMATION_VALUES.includes(value as WidgetAnimation)
    ? (value as WidgetAnimation)
    : "style_default";
}

function readCustomPhrases(
  content: Record<string, unknown>
): PhrasebookCustomPhrase[] {
  const raw = content.custom_phrases;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): PhrasebookCustomPhrase | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        category: typeof row.category === "string" ? row.category : "",
        en: typeof row.en === "string" ? row.en : "",
        local: typeof row.local === "string" ? row.local : "",
        pronunciation:
          typeof row.pronunciation === "string" ? row.pronunciation : "",
      };
    })
    .filter((item): item is PhrasebookCustomPhrase => Boolean(item));
}

function readConfig(content: Record<string, unknown>): PhrasebookConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};
  return {
    accentRole: coerceColorRole(raw.accent_role),
    accentColor: normalizeHexColor(raw.accent_color),
    layout: coerceLayout(raw.layout),
    showPronunciation:
      typeof raw.show_pronunciation === "boolean"
        ? raw.show_pronunciation
        : true,
    showCategoryCounts:
      typeof raw.show_category_counts === "boolean"
        ? raw.show_category_counts
        : true,
    animation: coerceAnimation(raw.animation),
  };
}

export function PhrasebookBlockEditor({ block, onChange }: Props) {
  const language = readLanguage(block.content);
  const categories = readCategories(block.content);
  const title = readString(block.content, "title");
  const subtitle = readString(block.content, "subtitle");
  const icon = readString(block.content, "icon");
  const style = coerceStyle(block.content.style);
  const config = readConfig(block.content);
  const customPhrases = readCustomPhrases(block.content);
  const lang = PHRASEBOOK_LANGUAGES.find((l) => l.code === language);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchConfig = (next: Partial<PhrasebookConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
        layout: merged.layout,
        show_pronunciation: merged.showPronunciation,
        show_category_counts: merged.showCategoryCounts,
        animation: merged.animation,
      },
    });
  };

  const patchCustomPhrases = (next: PhrasebookCustomPhrase[]) => {
    patch({ custom_phrases: next });
  };

  const toggle = (cat: PhrasebookCategory) => {
    const has = categories.includes(cat);
    patch({
      categories: has
        ? categories.filter((c) => c !== cat)
        : [...categories, cat],
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= customPhrases.length) return;
    const next = [...customPhrases];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    patchCustomPhrases(next);
  };

  return (
    <div className="editor-section">
      <div className="grid gap-2 sm:grid-cols-2">
        <PromptedInput
          label="Title"
          value={title}
          onChange={(v) => patch({ title: v })}
          placeholder={lang ? `${lang.name} phrasebook` : "Phrasebook"}
        />
        <PromptedInput
          label="Subtitle"
          value={subtitle}
          onChange={(v) => patch({ subtitle: v })}
          placeholder="Helpful phrases for guests"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Language</Label>
          <Select
            value={language}
            onValueChange={(v) => v && patch({ language: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHRASEBOOK_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.name} - {l.endonym}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Header icon</Label>
          <IconifyPicker
            value={icon}
            onChange={(v) => patch({ icon: v })}
            ariaLabel="Select phrasebook icon"
            triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
            iconClassName="text-base"
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Block style</Label>
          <Select value={style} onValueChange={(v) => patch({ style: coerceStyle(v) })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHRASEBOOK_STYLES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Layout</Label>
          <Select
            value={config.layout}
            onValueChange={(v) => patchConfig({ layout: coerceLayout(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAYOUTS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <BlockColorControls
        label="Accent Color"
        role={config.accentRole}
        customColor={config.accentColor}
        options={COLOR_ROLES}
        onChange={({ role, customColor }) =>
          patchConfig({ accentRole: role, accentColor: customColor })
        }
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Animation</Label>
          <Select
            value={config.animation}
            onValueChange={(v) => patchConfig({ animation: coerceAnimation(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIMATIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-md border border-border/60 px-3 py-1">
          <ToggleRow
            label="Show pronunciation"
            checked={config.showPronunciation}
            onCheckedChange={(checked) =>
              patchConfig({ showPronunciation: checked })
            }
          />
          <ToggleRow
            label="Show category counts"
            checked={config.showCategoryCounts}
            onCheckedChange={(checked) =>
              patchConfig({ showCategoryCounts: checked })
            }
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Built-in categories</Label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_CATEGORIES.map((c) => {
            const has = categories.includes(c.value);
            const available = lang?.categories?.[c.value]?.length ?? 0;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggle(c.value)}
                disabled={available === 0}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                  has
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                  available === 0 && "opacity-40"
                )}
                title={available === 0 ? "Not available for this language" : undefined}
              >
                {c.label}
                {available > 0 ? (
                  <span className="ml-1 opacity-60">({available})</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="text-[10.5px] leading-snug text-muted-foreground">
          Pick curated sets, then add host-specific phrases below.
        </p>
      </div>

      <div className="editor-section-header">
        <Label>Manual phrases</Label>
        <Button
          type="button"
          size="sm"
          className="editor-cta"
          onClick={() =>
            patchCustomPhrases([
              ...customPhrases,
              { category: "Local tips", en: "", local: "", pronunciation: "" },
            ])
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add phrase
        </Button>
      </div>

      {customPhrases.length === 0 ? (
        <div className="editor-empty">
          Add custom phrases for house rules, transport, greetings, or local tips.
        </div>
      ) : (
        <div className="editor-list">
          {customPhrases.map((phrase, index) => (
            <div key={`${block.id}-phrase-${index}`} className="editor-list-item">
              <div className="editor-item-toolbar">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move phrase up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, 1)}
                  disabled={index === customPhrases.length - 1}
                  aria-label="Move phrase down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    patchCustomPhrases(
                      customPhrases.filter((_, itemIndex) => itemIndex !== index)
                    )
                  }
                  aria-label="Remove phrase"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <PromptedInput
                  label="Category"
                  value={phrase.category ?? ""}
                  onChange={(value) => {
                    const next = [...customPhrases];
                    next[index] = { ...phrase, category: value };
                    patchCustomPhrases(next);
                  }}
                  placeholder="Local tips"
                />
                <PromptedInput
                  label="English"
                  value={phrase.en}
                  onChange={(value) => {
                    const next = [...customPhrases];
                    next[index] = { ...phrase, en: value };
                    patchCustomPhrases(next);
                  }}
                  placeholder="Where is the entrance?"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <PromptedInput
                  label="Local phrase"
                  value={phrase.local}
                  onChange={(value) => {
                    const next = [...customPhrases];
                    next[index] = { ...phrase, local: value };
                    patchCustomPhrases(next);
                  }}
                  placeholder="Phrase in the guest language"
                />
                <PromptedInput
                  label="Pronunciation"
                  value={phrase.pronunciation ?? ""}
                  onChange={(value) => {
                    const next = [...customPhrases];
                    next[index] = { ...phrase, pronunciation: value };
                    patchCustomPhrases(next);
                  }}
                  placeholder="Optional phonetic hint"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
