"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars } from "@/lib/block-colors";
import {
  getPhrasebookLanguage,
  type Phrase,
  type PhrasebookCategory,
} from "@/lib/phrasebook";
import type {
  PhrasebookContent,
  PhrasebookLayout,
  PhrasebookStyle,
  WidgetAnimation,
  WidgetColorRole,
} from "../types";

type PhraseRow = Phrase & { source?: "built_in" | "custom" };
type PhraseSection = {
  key: string;
  label: string;
  phrases: PhraseRow[];
};

const CATEGORY_LABEL: Record<PhrasebookCategory, string> = {
  greetings: "Greetings",
  dining: "Dining",
  transport: "Transport",
  directions: "Directions",
  emergency: "Emergency",
  shopping: "Shopping",
};

const CATEGORY_ORDER: PhrasebookCategory[] = [
  "greetings",
  "dining",
  "directions",
  "transport",
  "shopping",
  "emergency",
];

const PHRASEBOOK_STYLES: PhrasebookStyle[] = [
  "accordion",
  "phrase_cards",
  "travel_deck",
  "compact_table",
  "dark_panel",
  "glass",
  "brutalist",
];

const COLOR_ROLES: WidgetColorRole[] = ["primary", "secondary", "accent"];
const LAYOUTS: PhrasebookLayout[] = ["accordion", "grid", "list"];
const ANIMATIONS: WidgetAnimation[] = [
  "style_default",
  "none",
  "lift",
  "glow",
  "pulse",
];

function coerce<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function slugCategory(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function titleize(value: string): string {
  const clean = value.trim().replace(/[_-]+/g, " ");
  if (!clean) return "Custom";
  return clean.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildSections(content: Partial<PhrasebookContent>): PhraseSection[] {
  const language = (content.language ?? "es").toLowerCase();
  const requested: PhrasebookCategory[] = Array.isArray(content.categories)
    ? (content.categories as PhrasebookCategory[])
    : (["greetings", "dining"] as PhrasebookCategory[]);
  const lang = getPhrasebookLanguage(language);
  const sections = new Map<string, PhraseSection>();

  if (lang) {
    for (const cat of CATEGORY_ORDER) {
      const phrases = requested.includes(cat) ? lang.categories?.[cat] ?? [] : [];
      if (phrases.length === 0) continue;
      sections.set(cat, {
        key: cat,
        label: CATEGORY_LABEL[cat],
        phrases: phrases.map((phrase) => ({ ...phrase, source: "built_in" })),
      });
    }
  }

  for (const phrase of content.custom_phrases ?? []) {
    const en = phrase.en?.trim() || "";
    const local = phrase.local?.trim() || "";
    const pronunciation = phrase.pronunciation?.trim() || "";
    if (!en && !local && !pronunciation) continue;
    const rawCategory = phrase.category?.trim() || "Custom";
    const key = slugCategory(rawCategory) || "custom";
    const builtInKey = CATEGORY_ORDER.includes(key as PhrasebookCategory)
      ? (key as PhrasebookCategory)
      : null;
    const sectionKey = builtInKey ?? key;
    const existing = sections.get(sectionKey);
    if (existing) {
      existing.phrases.push({ en, local, pronunciation, source: "custom" });
    } else {
      sections.set(sectionKey, {
        key: sectionKey,
        label: builtInKey ? CATEGORY_LABEL[builtInKey] : titleize(rawCategory),
        phrases: [{ en, local, pronunciation, source: "custom" }],
      });
    }
  }

  return Array.from(sections.values()).filter((section) => section.phrases.length > 0);
}

export function PhrasebookBlock({
  content,
}: {
  content: Partial<PhrasebookContent>;
}) {
  const language = (content.language ?? "es").toLowerCase();
  const lang = getPhrasebookLanguage(language);
  const title =
    content.title?.trim() ||
    (lang ? `${lang.name} phrasebook` : "Phrasebook");
  const subtitle =
    content.subtitle?.trim() ||
    (lang ? lang.endonym : "Useful local phrases");
  const icon = content.icon?.trim() || "ph:translate-fill";
  const style = coerce(content.style, PHRASEBOOK_STYLES, "accordion");
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = coerce(config?.accent_role, COLOR_ROLES, "accent");
  const layout = coerce(config?.layout, LAYOUTS, "accordion");
  const animation = coerce(config?.animation, ANIMATIONS, "style_default");
  const showPronunciation =
    typeof config?.show_pronunciation === "boolean"
      ? config.show_pronunciation
      : true;
  const showCategoryCounts =
    typeof config?.show_category_counts === "boolean"
      ? config.show_category_counts
      : true;
  const sections = useMemo(() => buildSections(content), [content]);
  const [openCat, setOpenCat] = useState<string | null>(
    sections[0]?.key ?? null
  );
  const isAccordion = layout === "accordion";
  const activeOpenCat = sections.some((section) => section.key === openCat)
    ? openCat
    : sections[0]?.key ?? null;

  if (sections.length === 0) return null;

  return (
    <div
      className="sl-phrasebook"
      data-style={style}
      data-color-role={accentRole}
      data-layout={layout}
      data-animation={animation}
      style={
        blockColorOverrideVars([
          {
            value: config?.accent_color,
            colorVar: "--sl-phrasebook-color",
            rgbVar: "--sl-phrasebook-color-rgb",
            contrastVar: "--sl-phrasebook-contrast",
          },
        ]) as CSSProperties
      }
    >
      <header className="sl-phrasebook-head">
        <span className="sl-phrasebook-head-icon" aria-hidden>
          <HostIcon value={icon} />
        </span>
        <span className="sl-phrasebook-head-copy">
          <span className="sl-phrasebook-eyebrow">Phrasebook</span>
          <span className="sl-phrasebook-title">{title}</span>
          {subtitle ? <span className="sl-phrasebook-subtitle">{subtitle}</span> : null}
        </span>
      </header>

      <div className="sl-phrasebook-sections">
        {sections.map((section) => {
          const isOpen = !isAccordion || activeOpenCat === section.key;
          return (
            <section
              key={section.key}
              className="sl-phrasebook-section"
              data-open={isOpen ? "true" : "false"}
            >
              <button
                type="button"
                onClick={() =>
                  isAccordion
                    ? setOpenCat(isOpen ? null : section.key)
                    : undefined
                }
                className="sl-phrasebook-section-trigger"
                aria-expanded={isOpen}
                disabled={!isAccordion}
              >
                <span>{section.label}</span>
                <span className="sl-phrasebook-section-meta">
                  {showCategoryCounts ? section.phrases.length : ""}
                  {isAccordion ? (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  ) : null}
                </span>
              </button>

              {isOpen ? (
                <ul className="sl-phrasebook-list">
                  {section.phrases.map((phrase, i) => (
                    <li
                      key={`${section.key}-${phrase.en}-${i}`}
                      className="sl-phrasebook-phrase"
                      data-source={phrase.source ?? "built_in"}
                    >
                      <span className="sl-phrasebook-en">{phrase.en}</span>
                      <span className="sl-phrasebook-local">
                        {phrase.local || phrase.en}
                      </span>
                      {showPronunciation && phrase.pronunciation ? (
                        <span className="sl-phrasebook-pronunciation">
                          {phrase.pronunciation}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
