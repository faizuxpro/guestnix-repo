"use client";

import { useId, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import { blockColorOverrideVars } from "@/lib/block-colors";
import type { FaqContent } from "../types";

type FaqStyle = NonNullable<FaqContent["style"]>;
type FaqColorRole = NonNullable<
  NonNullable<FaqContent["config"]>["accent_role"]
>;

const FAQ_STYLES: FaqStyle[] = [
  "basic",
  "elevated_minimalist",
  "left_icon_grid",
  "detached_card",
  "side_split",
  "layered_offset",
  "popout_focus",
  "connected_timeline",
  "editorial_magazine",
  "conversation_bubbles",
  "folder_tab",
];

const FAQ_COLOR_ROLES: FaqColorRole[] = [
  "primary",
  "secondary",
  "accent",
  "ink",
  "muted",
  "border",
];

function readFaqStyle(value: unknown): FaqStyle {
  return FAQ_STYLES.includes(value as FaqStyle) ? (value as FaqStyle) : "basic";
}

function readFaqColorRole(
  value: unknown,
  fallback: FaqColorRole
): FaqColorRole {
  return FAQ_COLOR_ROLES.includes(value as FaqColorRole)
    ? (value as FaqColorRole)
    : fallback;
}

export function FaqBlock({ content }: { content: Partial<FaqContent> }) {
  const faqId = useId().replace(/:/g, "-");
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
  const items = content.items?.filter((i) => i?.question?.trim()) ?? [];
  if (items.length === 0) return null;
  const style = readFaqStyle(content.style);
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = readFaqColorRole(config?.accent_role, "secondary");

  return (
    <div
      className="sl-faq"
      data-faq-style={style}
      data-color-role={accentRole}
      style={
        blockColorOverrideVars([
          {
            value: config?.accent_color,
            colorVar: "--sl-faq-color",
            contrastVar: "--sl-faq-contrast",
          },
        ]) as CSSProperties
      }
    >
      {items.map((item, i) => {
        const isOpen = Boolean(openItems[i]);
        const panelId = `${faqId}-sl-faq-panel-${i}`;

        if (style === "elevated_minimalist") {
          return (
            <div
              key={i}
              className="sl-faq-item"
              data-open={isOpen ? "true" : "false"}
            >
              <button
                type="button"
                className="sl-faq-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setOpenItems((current) => ({
                    ...current,
                    [i]: !current[i],
                  }))
                }
              >
                <span className="sl-faq-question">{item.question}</span>
                <span className="sl-faq-chevron" aria-hidden>
                  <ChevronDown />
                </span>
              </button>
              <div
                id={panelId}
                className="sl-faq-panel"
                aria-hidden={!isOpen}
              >
                <div className="sl-faq-panel-inner">
                  {item.answer ? <div className="ans">{item.answer}</div> : null}
                </div>
              </div>
            </div>
          );
        }

        return (
          <details key={i} className="sl-faq-item">
            <summary>{item.question}</summary>
            {item.answer && <div className="ans">{item.answer}</div>}
          </details>
        );
      })}
    </div>
  );
}
