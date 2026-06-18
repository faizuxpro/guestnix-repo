"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { templates } from "@/templates/registry";
import { ExternalLink } from "lucide-react";

interface TemplateSelectorProps {
  value: string;
  onChange: (templateId: string) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const active = template.id === "sunset-lakehouse";
        return (
          <article
            key={template.id}
            className={cn(
              "relative flex flex-col items-start rounded-lg border p-4 text-left transition-colors",
              value === template.id
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border",
              active ? "hover:bg-muted/50" : "opacity-75"
            )}
          >
          <button
            type="button"
            disabled={!active}
            onClick={() => active && onChange(template.id)}
            className="flex w-full flex-1 flex-col items-start text-left disabled:cursor-not-allowed"
          >
          {/* Thumbnail placeholder */}
          <div
            className="mb-3 h-24 w-full rounded-md"
            style={{
              background: `linear-gradient(135deg, ${template.defaultColors.primary}, ${template.defaultColors.secondary})`,
            }}
          />
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{template.name}</p>
            {!active && (
              <Badge variant="outline" className="text-xs">
                Coming soon
              </Badge>
            )}
            {template.tier === "pro" && (
              <Badge variant="secondary" className="text-xs">
                Pro
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {template.description}
          </p>
          </button>
          {template.id === "sunset-lakehouse" ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              render={
                <a href="/demo/sunset-template" target="_blank" rel="noopener noreferrer" />
              }
            >
              <ExternalLink className="h-4 w-4" />
              Open demo
            </Button>
          ) : null}
        </article>
      );
      })}
    </div>
  );
}
