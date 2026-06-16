"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { EditorBlock } from "@/stores/editor-store";
import { PromptedInput } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

const COMMON_CURRENCIES: { code: string; name: string }[] = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "ZAR", name: "South African Rand" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "THB", name: "Thai Baht" },
  { code: "AED", name: "UAE Dirham" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "KRW", name: "South Korean Won" },
];

function readString(content: Record<string, unknown>, key: string) {
  const v = content[key];
  return typeof v === "string" ? v : "";
}

function readNumber(content: Record<string, unknown>, key: string, fallback: number) {
  const v = content[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function readTargets(content: Record<string, unknown>): string[] {
  const v = content.targets;
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

export function CurrencyBlockEditor({ block, onChange }: Props) {
  const base = readString(block.content, "base") || "USD";
  const targets = readTargets(block.content);
  const defaultAmount = readNumber(block.content, "default_amount", 1);

  const patch = (next: {
    base?: string;
    targets?: string[];
    default_amount?: number;
  }) => {
    onChange({
      base: next.base ?? base,
      targets: next.targets ?? targets,
      default_amount: next.default_amount ?? defaultAmount,
    });
  };

  const toggleTarget = (code: string) => {
    const has = targets.includes(code);
    patch({
      targets: has ? targets.filter((c) => c !== code) : [...targets, code],
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Base currency</Label>
          <Select value={base} onValueChange={(v) => v && patch({ base: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {COMMON_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} · {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <PromptedInput
          label="Default amount"
          value={String(defaultAmount)}
          onChange={(v) => {
            const n = Number(v);
            patch({ default_amount: Number.isFinite(n) ? n : 1 });
          }}
          placeholder="1"
          inputMode="decimal"
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Target currencies</Label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_CURRENCIES.filter((c) => c.code !== base).map((c) => {
            const has = targets.includes(c.code);
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => toggleTarget(c.code)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                  has
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                )}
              >
                {c.code}
              </button>
            );
          })}
        </div>
        <p className="text-[10.5px] leading-snug text-muted-foreground">
          Guests see {base} converted to each selected currency. Live rates via
          Frankfurter API.
        </p>
      </div>
    </div>
  );
}
