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
import type { EditorBlock } from "@/stores/editor-store";
import { PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type Service =
  | "netflix"
  | "disney_plus"
  | "hulu"
  | "apple_tv"
  | "prime"
  | "hbo"
  | "spotify"
  | "youtube"
  | "other";

type LoginMode = "account" | "pairing_code" | "open" | "wifi_only";

type ServiceItem = {
  service: Service;
  login_mode: LoginMode;
  instructions: string;
};

const SERVICE_LABEL: Record<Service, string> = {
  netflix: "Netflix",
  disney_plus: "Disney+",
  hulu: "Hulu",
  apple_tv: "Apple TV+",
  prime: "Prime Video",
  hbo: "Max (HBO)",
  spotify: "Spotify",
  youtube: "YouTube",
  other: "Other",
};

const LOGIN_LABEL: Record<LoginMode, string> = {
  account: "Account already signed in",
  pairing_code: "Pairing code required",
  open: "Open / no login",
  wifi_only: "Wi-Fi only (use your own account)",
};

function readService(value: unknown): Service {
  if (typeof value !== "string") return "netflix";
  const allowed: readonly Service[] = [
    "netflix",
    "disney_plus",
    "hulu",
    "apple_tv",
    "prime",
    "hbo",
    "spotify",
    "youtube",
    "other",
  ];
  return (allowed as readonly string[]).includes(value) ? (value as Service) : "other";
}

function readLoginMode(value: unknown): LoginMode {
  if (
    value === "account" ||
    value === "pairing_code" ||
    value === "open" ||
    value === "wifi_only"
  ) {
    return value;
  }
  return "account";
}

function readServices(content: Record<string, unknown>): ServiceItem[] {
  const value = content.services;
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    return {
      service: readService(obj.service),
      login_mode: readLoginMode(obj.login_mode),
      instructions: typeof obj.instructions === "string" ? obj.instructions : "",
    };
  });
}

export function StreamingBlockEditor({ block, onChange }: Props) {
  const services = readServices(block.content);

  const patch = (next: ServiceItem[]) => onChange({ services: next });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= services.length) return;
    const next = [...services];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    patch(next);
  };

  return (
    <div className="editor-section">
      <div className="editor-section-header">
        <Label>Services</Label>
        <Button
          type="button"
          size="sm"
          className="editor-cta"
          onClick={() =>
            patch([
              ...services,
              { service: "netflix", login_mode: "account", instructions: "" },
            ])
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add service
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="editor-empty">
          No services added yet.
        </div>
      ) : (
        <div className="editor-list">
          {services.map((item, index) => (
            <div key={`${block.id}-svc-${index}`} className="editor-list-item">
              <div className="editor-item-toolbar">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move service up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => move(index, 1)}
                  disabled={index === services.length - 1}
                  aria-label="Move service down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    patch(services.filter((_, i) => i !== index))
                  }
                  aria-label="Remove service"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Service</Label>
                  <Select
                    value={item.service}
                    onValueChange={(v) => {
                      const next = [...services];
                      next[index] = { ...item, service: readService(v) };
                      patch(next);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SERVICE_LABEL) as Service[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {SERVICE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Login mode</Label>
                  <Select
                    value={item.login_mode}
                    onValueChange={(v) => {
                      const next = [...services];
                      next[index] = { ...item, login_mode: readLoginMode(v) };
                      patch(next);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LOGIN_LABEL) as LoginMode[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {LOGIN_LABEL[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-2">
                <PromptedTextarea
                  label="Instructions"
                  value={item.instructions}
                  onChange={(v) => {
                    const next = [...services];
                    next[index] = { ...item, instructions: v };
                    patch(next);
                  }}
                  placeholder="E.g. tap the Netflix app, the host account is already signed in."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
