"use client";

import type { EditorBlock } from "@/stores/editor-store";
import { PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

function readHtml(content: Record<string, unknown>) {
  return typeof content.html === "string" ? content.html : "";
}

export function CustomHtmlBlockEditor({ block, onChange }: Props) {
  const html = readHtml(block.content);

  return (
    <PromptedTextarea
      label="HTML"
      value={html}
      onChange={(value) => onChange({ html: value })}
      placeholder="<div>Custom HTML or embed code</div>"
      rows={10}
    />
  );
}
