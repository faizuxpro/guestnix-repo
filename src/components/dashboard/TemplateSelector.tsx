"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { templates } from "@/templates/registry";

interface TemplateSelectorProps {
  value: string;
  onChange: (templateId: string) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onChange(template.id)}
          className={cn(
            "relative flex flex-col items-start rounded-lg border p-4 text-left transition-colors",
            value === template.id
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border hover:bg-muted/50"
          )}
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
      ))}
    </div>
  );
}
