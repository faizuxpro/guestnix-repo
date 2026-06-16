"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Copy, Lock, LockKeyhole } from "lucide-react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars } from "@/lib/block-colors";
import type {
  SmartLockAccessItem,
  SmartLockAccessType,
  SmartLockCodeDisplay,
  SmartLockContent,
  SmartLockLayout,
  SmartLockStyle,
  WidgetAnimation,
  WidgetColorRole,
} from "../types";

const SMART_LOCK_STYLES: SmartLockStyle[] = [
  "secure_card",
  "access_stack",
  "split_panel",
  "minimal",
  "dark_panel",
  "ticket",
  "brutalist",
];

const COLOR_ROLES: WidgetColorRole[] = ["primary", "secondary", "accent"];
const LAYOUTS: SmartLockLayout[] = ["stacked", "grid", "compact"];
const CODE_DISPLAYS: SmartLockCodeDisplay[] = ["large_code", "masked", "chips"];
const ANIMATIONS: WidgetAnimation[] = [
  "style_default",
  "none",
  "lift",
  "glow",
  "pulse",
];

const TYPE_ICON: Record<SmartLockAccessType, string> = {
  door: "ph:door-open-fill",
  gate: "ph:fence-fill",
  garage: "ph:garage-fill",
  lockbox: "ph:lock-key-fill",
  alarm: "ph:shield-check-fill",
  wifi: "ph:wifi-high-fill",
  other: "ph:key-fill",
};

function coerce<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function isReadyToReveal(revealAt: string | null | undefined): boolean {
  if (!revealAt) return true;
  const t = new Date(revealAt).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() >= t;
}

function formatReveal(revealAt: string): string {
  try {
    const d = new Date(revealAt);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return revealAt;
  }
}

function readItems(content: Partial<SmartLockContent>): SmartLockAccessItem[] {
  if (Array.isArray(content.items) && content.items.length > 0) {
    return content.items
      .map((item) => ({
        type: coerce(
          item.type,
          ["door", "gate", "garage", "lockbox", "alarm", "wifi", "other"] as const,
          "door"
        ),
        label: item.label?.trim() || "Access item",
        code: item.code?.trim() || "",
        reveal_at:
          typeof item.reveal_at === "string" ? item.reveal_at : content.reveal_at,
        instructions: item.instructions?.trim() || "",
        icon: item.icon?.trim() || "",
      }))
      .filter((item) => item.label || item.code || item.instructions || item.icon);
  }

  const code = content.code?.trim() || "";
  const instructions = content.instructions?.trim() || "";
  const label = content.title?.trim() || "Door code";
  if (!code && !instructions && !label) return [];
  return [
    {
      type: "door",
      label,
      code,
      reveal_at: content.reveal_at ?? null,
      instructions,
      icon: "",
    },
  ];
}

function renderCode(value: string, mode: SmartLockCodeDisplay) {
  if (!value) return <span className="sl-smart-lock-empty-code">Not set yet</span>;
  if (mode === "masked") return <span aria-label="Hidden code">******</span>;
  if (mode === "chips") {
    return (
      <span className="sl-smart-lock-code-chips">
        {Array.from(value.replace(/\s+/g, "") || value).map((char, index) => (
          <span key={`${char}-${index}`}>{char}</span>
        ))}
      </span>
    );
  }
  return <span>{value}</span>;
}

export function SmartLockBlock({
  content,
}: {
  content: Partial<SmartLockContent>;
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const title = content.title?.trim() || "Access details";
  const subtitle = content.subtitle?.trim() || "";
  const icon = content.icon?.trim() || "ph:lock-key-fill";
  const style = coerce(content.style, SMART_LOCK_STYLES, "secure_card");
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = coerce(config?.accent_role, COLOR_ROLES, "primary");
  const layout = coerce(config?.layout, LAYOUTS, "stacked");
  const codeDisplay = coerce(config?.code_display, CODE_DISPLAYS, "large_code");
  const animation = coerce(config?.animation, ANIMATIONS, "style_default");
  const showCopy = typeof config?.show_copy === "boolean" ? config.show_copy : true;
  const items = useMemo(() => readItems(content), [content]);

  useEffect(() => {
    const hasUpcoming = items.some((item) => !isReadyToReveal(item.reveal_at));
    if (!hasUpcoming) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [items]);

  const copy = async (code: string, index: number) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      /* ignore */
    }
  };

  if (items.length === 0) return null;

  return (
    <div
      className="sl-smart-lock"
      data-style={style}
      data-color-role={accentRole}
      data-layout={layout}
      data-code-display={codeDisplay}
      data-animation={animation}
      style={
        blockColorOverrideVars([
          {
            value: config?.accent_color,
            colorVar: "--sl-smart-lock-color",
            rgbVar: "--sl-smart-lock-color-rgb",
            contrastVar: "--sl-smart-lock-contrast",
          },
        ]) as CSSProperties
      }
    >
      <header className="sl-smart-lock-head">
        <span className="sl-smart-lock-head-icon" aria-hidden>
          <HostIcon value={icon} />
        </span>
        <span className="sl-smart-lock-head-copy">
          <span className="sl-smart-lock-eyebrow">Secure access</span>
          <span className="sl-smart-lock-title">{title}</span>
          {subtitle ? <span className="sl-smart-lock-subtitle">{subtitle}</span> : null}
        </span>
      </header>

      <div className="sl-smart-lock-items">
        {items.map((item, index) => {
          const ready = isReadyToReveal(item.reveal_at);
          const itemType = coerce(
            item.type,
            ["door", "gate", "garage", "lockbox", "alarm", "wifi", "other"] as const,
            "door"
          );
          const itemIcon = item.icon?.trim() || TYPE_ICON[itemType];
          return (
            <article
              key={`${item.label}-${index}`}
              className="sl-smart-lock-item"
              data-ready={ready ? "true" : "false"}
            >
              <div className="sl-smart-lock-item-head">
                <span className="sl-smart-lock-item-icon" aria-hidden>
                  <HostIcon value={itemIcon} />
                </span>
                <span className="sl-smart-lock-item-title">
                  {item.label || "Access item"}
                </span>
                <span className="sl-smart-lock-state" aria-hidden>
                  {ready ? (
                    <LockKeyhole className="h-3.5 w-3.5" />
                  ) : (
                    <Lock className="h-3.5 w-3.5" />
                  )}
                </span>
              </div>

              {ready ? (
                <div className="sl-smart-lock-code-row">
                  <p className="sl-smart-lock-code">
                    {renderCode(item.code, codeDisplay)}
                  </p>
                  {showCopy && item.code ? (
                    <button
                      type="button"
                      className="sl-smart-lock-copy"
                      onClick={() => copy(item.code, index)}
                      aria-label={`Copy ${item.label || "access"} code`}
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      {copiedIndex === index ? "Copied" : "Copy"}
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="sl-smart-lock-reveal">
                  Available {item.reveal_at ? formatReveal(item.reveal_at) : "soon"}
                </p>
              )}

              {ready && item.instructions ? (
                <p className="sl-smart-lock-instructions">{item.instructions}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
