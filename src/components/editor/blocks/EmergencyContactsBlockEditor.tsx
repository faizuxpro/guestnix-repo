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

type EmergencyContactEntry = { icon?: string; label: string; phone: string };

const MANUAL_COUNTRY_VALUE = "__manual__";

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readContactEntries(
  content: Record<string, unknown>,
  key: "custom_services" | "custom_contacts"
): EmergencyContactEntry[] {
  const value = content[key];
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
  const hasCountry = Object.prototype.hasOwnProperty.call(block.content, "country");
  const country = hasCountry ? readString(block.content, "country") : "US";
  const selectedCountry = country || MANUAL_COUNTRY_VALUE;
  const customServices = readContactEntries(block.content, "custom_services");
  const customContacts = readContactEntries(block.content, "custom_contacts");

  const patch = (next: {
    country?: string;
    custom_services?: EmergencyContactEntry[];
    custom_contacts?: EmergencyContactEntry[];
  }) => {
    onChange({
      ...block.content,
      country: next.country ?? country,
      custom_services: next.custom_services ?? customServices,
      custom_contacts: next.custom_contacts ?? customContacts,
    });
  };

  const moveService = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= customServices.length) return;
    const next = [...customServices];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    patch({ custom_services: next });
  };

  const moveContact = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= customContacts.length) return;
    const next = [...customContacts];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    patch({ custom_contacts: next });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-1.5">
        <Label>Country preset</Label>
        <Select
          value={selectedCountry}
          onValueChange={(v) =>
            v && patch({ country: v === MANUAL_COUNTRY_VALUE ? "" : v })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={MANUAL_COUNTRY_VALUE}>
              Manual cards only
            </SelectItem>
            {EMERGENCY_COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10.5px] leading-snug text-muted-foreground">
          Choose a preset or switch to manual-only emergency service cards.
        </p>
      </div>

      <div className="editor-section">
        <div className="editor-section-header">
          <Label>Manual emergency cards</Label>
          <Button
            type="button"
            size="sm"
            className="editor-cta"
            onClick={() =>
              patch({
                custom_services: [
                  ...customServices,
                  { icon: "", label: "Emergency service", phone: "" },
                ],
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add card
          </Button>
        </div>

        {customServices.length === 0 ? (
          <p className="editor-empty">
            Add extra 911 / 999 style service cards for this location.
          </p>
        ) : (
          <div className="editor-list">
            {customServices.map((c, index) => (
              <div key={`${block.id}-svc-${index}`} className="editor-list-item">
                <div className="editor-item-toolbar">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveService(index, -1)}
                    disabled={index === 0}
                    aria-label="Move emergency card up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveService(index, 1)}
                    disabled={index === customServices.length - 1}
                    aria-label="Move emergency card down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() =>
                      patch({
                        custom_services: customServices.filter((_, i) => i !== index),
                      })
                    }
                    aria-label="Remove emergency card"
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
                        const next = [...customServices];
                        next[index] = { ...c, icon: v };
                        patch({ custom_services: next });
                      }}
                      ariaLabel="Select emergency card icon"
                      triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
                      iconClassName="text-base"
                    />
                  </div>

                  <PromptedInput
                    label="Label"
                    value={c.label}
                    onChange={(v) => {
                      const next = [...customServices];
                      next[index] = { ...c, label: v };
                      patch({ custom_services: next });
                    }}
                    placeholder="Police"
                  />

                  <PromptedInput
                    label="Number"
                    value={c.phone}
                    onChange={(v) => {
                      const next = [...customServices];
                      next[index] = { ...c, phone: v };
                      patch({ custom_services: next });
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
                  ...customContacts,
                  { icon: "", label: "Host", phone: "" },
                ],
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add contact
          </Button>
        </div>

        {customContacts.length === 0 ? (
          <p className="editor-empty">
            Add personal contacts like the host phone or building security.
          </p>
        ) : (
          <div className="editor-list">
            {customContacts.map((c, index) => (
              <div key={`${block.id}-cc-${index}`} className="editor-list-item">
                <div className="editor-item-toolbar">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveContact(index, -1)}
                    disabled={index === 0}
                    aria-label="Move contact up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => moveContact(index, 1)}
                    disabled={index === customContacts.length - 1}
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
                        custom_contacts: customContacts.filter((_, i) => i !== index),
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
                        const next = [...customContacts];
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
                      const next = [...customContacts];
                      next[index] = { ...c, label: v };
                      patch({ custom_contacts: next });
                    }}
                    placeholder="Host phone"
                  />

                  <PromptedInput
                    label="Phone"
                    value={c.phone}
                    onChange={(v) => {
                      const next = [...customContacts];
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
