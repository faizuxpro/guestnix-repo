"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
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
import type { EditorBlock } from "@/stores/editor-store";
import { BlockColorControls } from "./BlockColorControls";
import { PromptedInput, PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type FaqItem = {
  question: string;
  answer: string;
};

type FaqStyle =
  | "basic"
  | "elevated_minimalist"
  | "left_icon_grid"
  | "detached_card"
  | "side_split"
  | "layered_offset"
  | "popout_focus"
  | "connected_timeline"
  | "editorial_magazine"
  | "conversation_bubbles"
  | "folder_tab";

type FaqColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "ink"
  | "muted"
  | "border";

type FaqConfig = {
  accentRole: FaqColorRole;
  accentColor: string;
};

const FAQ_STYLES: Array<{ value: FaqStyle; label: string }> = [
  { value: "basic", label: "Basic Accordion" },
  { value: "elevated_minimalist", label: "01. Elevated Minimalist" },
  { value: "left_icon_grid", label: "02. Premium Left Icon" },
  { value: "detached_card", label: "03. Detached Floating Card" },
  { value: "side_split", label: "04. Side Split Layout" },
  { value: "layered_offset", label: "05. Layered Offset Card" },
  { value: "popout_focus", label: "06. Pop-out Focus" },
  { value: "connected_timeline", label: "07. Connected Timeline" },
  { value: "editorial_magazine", label: "08. Editorial Magazine" },
  { value: "conversation_bubbles", label: "09. Conversation Bubbles" },
  { value: "folder_tab", label: "10. Folder Tab" },
];

const FAQ_STYLE_VALUES = FAQ_STYLES.map((style) => style.value);

const FAQ_COLOR_ROLES: Array<{ value: FaqColorRole; label: string }> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
  { value: "ink", label: "Guide text" },
  { value: "muted", label: "Guide muted" },
  { value: "border", label: "Guide border" },
];

const FAQ_COLOR_ROLE_VALUES = FAQ_COLOR_ROLES.map((role) => role.value);

function readItems(content: Record<string, unknown>): FaqItem[] {
  const value = content.items;
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    if (!item || typeof item !== "object") {
      return { question: "", answer: "" };
    }
    const faq = item as Record<string, unknown>;
    return {
      question: typeof faq.question === "string" ? faq.question : "",
      answer: typeof faq.answer === "string" ? faq.answer : "",
    };
  });
}

function coerceFaqStyle(value: unknown): FaqStyle {
  if (FAQ_STYLE_VALUES.includes(value as FaqStyle)) {
    return value as FaqStyle;
  }
  return "basic";
}

function coerceFaqColorRole(
  value: unknown,
  fallback: FaqColorRole
): FaqColorRole {
  if (FAQ_COLOR_ROLE_VALUES.includes(value as FaqColorRole)) {
    return value as FaqColorRole;
  }
  return fallback;
}

function readConfig(content: Record<string, unknown>): FaqConfig {
  const raw =
    typeof content.config === "object" && content.config !== null
      ? (content.config as Record<string, unknown>)
      : {};
  return {
    accentRole: coerceFaqColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

export function FaqBlockEditor({ block, onChange }: Props) {
  const items = readItems(block.content);
  const style = coerceFaqStyle(block.content.style);
  const config = readConfig(block.content);

  const patch = (next: Record<string, unknown>) => {
    onChange({ ...block.content, ...next });
  };

  const patchItems = (nextItems: FaqItem[]) => {
    patch({ items: nextItems });
  };

  const patchConfig = (next: Partial<FaqConfig>) => {
    const merged = { ...config, ...next };
    patch({
      config: {
        accent_role: merged.accentRole,
        accent_color: merged.accentColor || undefined,
      },
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    patchItems(next);
  };

  return (
    <div className="editor-section">
      <div className="grid gap-1.5">
        <Label>Accordion Style</Label>
        <Select
          value={style}
          onValueChange={(value) => patch({ style: coerceFaqStyle(value) })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FAQ_STYLES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <BlockColorControls
          label="Element Color"
          role={config.accentRole}
          customColor={config.accentColor}
          options={FAQ_COLOR_ROLES}
          onChange={({ role, customColor }) =>
            patchConfig({ accentRole: role, accentColor: customColor })
          }
        />
      </div>

      <div className="editor-section-header">
        <Label>FAQ Items</Label>
        <Button
          type="button"
          size="sm"
          className="editor-cta"
          onClick={() =>
            patchItems([...items, { question: "New question", answer: "" }])
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Q&A
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="editor-empty">
          No FAQ items yet.
        </div>
      ) : (
        <div className="editor-list">
          {items.map((item, index) => (
            <div key={`${block.id}-faq-${index}`} className="editor-list-item">
              <div className="editor-item-toolbar">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move FAQ up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                  aria-label="Move FAQ down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    patchItems(items.filter((_, itemIndex) => itemIndex !== index))
                  }
                  aria-label="Remove FAQ item"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid gap-2">
                <PromptedInput
                  label="Question"
                  value={item.question}
                  onChange={(v) => {
                    const next = [...items];
                    next[index] = { ...item, question: v };
                    patchItems(next);
                  }}
                  placeholder="What is the Wi-Fi password?"
                />

                <PromptedTextarea
                  label="Answer"
                  value={item.answer}
                  onChange={(v) => {
                    const next = [...items];
                    next[index] = { ...item, answer: v };
                    patchItems(next);
                  }}
                  placeholder="You can find it in the Wi-Fi section of this guide."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
