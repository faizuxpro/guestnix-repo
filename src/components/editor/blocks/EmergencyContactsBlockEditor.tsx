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
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import type { EditorBlock } from "@/stores/editor-store";
import { EMERGENCY_COUNTRIES } from "@/lib/emergency-numbers";
import { PromptedInput } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type CustomContact = { icon?: string; label: string; phone: string };

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readCustomContacts(content: Record<string, unknown>): CustomContact[] {
  const value = content.custom_contacts;
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return {
      icon: typeof obj.icon === "string" ? obj.icon : "",
      label: typeof obj.label === "string" ? obj.label : "",
      phone: typeof obj.phone === "string" ? obj.phone : "",
    };
  });
}

export function EmergencyContactsBlockEditor({ block, onChange }: Props) {
  const country = readString(block.content, "country") || "US";
  const custom = readCustomContacts(block.content);

  const patch = (next: { country?: string; custom_contacts?: CustomContact[] }) => {
    onChange({
      country: next.country ?? country,
      custom_contacts: next.custom_contacts ?? custom,
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= custom.length) return;
    const next = [...custom];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    patch({ custom_contacts: next });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-1.5">
        <Label>Country</Label>
        <Select value={country} onValueChange={(v) => v && patch({ country: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {EMERGENCY_COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10.5px] leading-snug text-muted-foreground">
          Country sets the default police / ambulance / fire numbers shown to guests.
        </p>
      </div>

      <div className="editor-section">
        <div className="editor-section-header">
          <Label>Custom contacts (optional)</Label>
          <Button
            type="button"
            size="sm"
            className="editor-cta"
            onClick={() =>
              patch({
                custom_contacts: [
                  ...custom,
                  { icon: "", label: "Host", phone: "" },
                ],
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add contact
          </Button>
        </div>

        {custom.length === 0 ? (
          <p className="editor-empty">
            Add personal contacts like the host phone or building security.
          </p>
        ) : (
          <div className="editor-list">
            {custom.map((c, index) => (
              <div key={`${block.id}-cc-${index}`} className="editor-list-item">
                <div className="editor-item-toolbar">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move contact up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(index, 1)}
                    disabled={index === custom.length - 1}
                    aria-label="Move contact down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      patch({
                        custom_contacts: custom.filter((_, i) => i !== index),
                      })
                    }
                    aria-label="Remove contact"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid gap-2">
                  <div className="grid gap-1.5">
                    <Label>Icon (optional)</Label>
                    <IconifyPicker
                      value={c.icon ?? ""}
                      onChange={(v) => {
                        const next = [...custom];
                        next[index] = { ...c, icon: v };
                        patch({ custom_contacts: next });
                      }}
                      ariaLabel="Select contact icon"
                      triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
                      iconClassName="text-base"
                    />
                  </div>

                  <PromptedInput
                    label="Label"
                    value={c.label}
                    onChange={(v) => {
                      const next = [...custom];
                      next[index] = { ...c, label: v };
                      patch({ custom_contacts: next });
                    }}
                    placeholder="Host phone"
                  />

                  <PromptedInput
                    label="Phone"
                    value={c.phone}
                    onChange={(v) => {
                      const next = [...custom];
                      next[index] = { ...c, phone: v };
                      patch({ custom_contacts: next });
                    }}
                    placeholder="+1 555 123 4567"
                    type="tel"
                    inputMode="tel"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
