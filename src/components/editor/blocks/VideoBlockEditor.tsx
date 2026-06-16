"use client";

import { Link2, UploadCloud } from "lucide-react";
import type { EditorBlock } from "@/stores/editor-store";
import { PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

export function VideoBlockEditor({ block, onChange }: Props) {
  const videoValue = readString(block.content, "url");

  const patchVideoValue = (url: string) => {
    const remainingContent = { ...block.content };
    delete remainingContent.provider;
    delete remainingContent.title;

    onChange({
      ...remainingContent,
      source: "service",
      url,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex min-h-16 items-center gap-2 rounded-md border border-primary/35 bg-primary/10 px-3 py-2 text-left text-primary">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-background/80">
            <Link2 className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight">Video link</p>
            <p className="mt-0.5 text-[11px] leading-snug text-primary/80">
              Paste a video URL or iframe embed code
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="flex min-h-16 cursor-not-allowed items-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-left opacity-70"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-background text-muted-foreground">
            <UploadCloud className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold leading-tight text-foreground">
              Upload own video
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
              Currently unavailable
            </span>
          </span>
        </button>
      </div>

      <PromptedTextarea
        label="Video URL or embed code"
        value={videoValue}
        onChange={patchVideoValue}
        placeholder='<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/..." allowfullscreen></iframe>'
        rows={4}
      />
    </div>
  );
}
