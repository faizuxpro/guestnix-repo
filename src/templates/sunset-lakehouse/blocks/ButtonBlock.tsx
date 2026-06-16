"use client";

import type { CSSProperties } from "react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars } from "@/lib/block-colors";
import { normalizeSafeUrl } from "@/lib/safe-url";
import type {
  ButtonAlign,
  ButtonAnimation,
  ButtonContent,
  ButtonIconPosition,
  ButtonSize,
  ButtonStyle,
  ButtonWidth,
  WidgetColorRole,
} from "../types";

const BUTTON_STYLES: ButtonStyle[] = [
  "primary",
  "outline",
  "ghost",
  "soft",
  "gradient",
  "pill",
  "split",
  "underline",
  "card",
  "brutalist",
];

const COLOR_ROLES: WidgetColorRole[] = ["primary", "secondary", "accent"];
const BUTTON_SIZES: ButtonSize[] = ["small", "medium", "large"];
const BUTTON_WIDTHS: ButtonWidth[] = ["auto", "full"];
const BUTTON_ALIGNS: ButtonAlign[] = ["left", "center", "right"];
const ICON_POSITIONS: ButtonIconPosition[] = ["left", "right"];
const BUTTON_ANIMATIONS: ButtonAnimation[] = [
  "style_default",
  "none",
  "lift",
  "pulse",
  "glow",
  "slide",
];

function coerce<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function actionHref(action: ButtonContent["action"] | undefined, raw: string) {
  if (!raw) return null;
  if (action === "phone") return normalizeSafeUrl(`tel:${raw}`);
  if (action === "email") return normalizeSafeUrl(`mailto:${raw}`);
  return normalizeSafeUrl(raw);
}

export function ButtonBlock({ content }: { content: Partial<ButtonContent> }) {
  const label = (content.label ?? "").trim();
  const action = content.action ?? "url";
  const raw = (content.value ?? "").trim();
  const style = coerce(content.style, BUTTON_STYLES, "primary");
  const icon = (content.icon ?? "").trim();
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = coerce(config?.accent_role, COLOR_ROLES, "primary");
  const size = coerce(config?.size, BUTTON_SIZES, "medium");
  const width = coerce(config?.width, BUTTON_WIDTHS, "auto");
  const align = coerce(config?.align, BUTTON_ALIGNS, "left");
  const iconPosition = coerce(config?.icon_position, ICON_POSITIONS, "left");
  const animation = coerce(
    config?.animation,
    BUTTON_ANIMATIONS,
    "style_default"
  );

  if (!label && !raw) return null;

  const href = actionHref(action, raw);
  const external = action === "url" && /^https?:\/\//i.test(href ?? "");
  const iconNode = icon ? (
    <span className="sl-action-button-icon" aria-hidden>
      <HostIcon value={icon} />
    </span>
  ) : null;

  return (
    <div
      className="sl-action-button-wrap"
      data-align={align}
      data-width={width}
    >
      <a
        href={href || "#"}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="sl-action-button"
        data-style={style}
        data-color-role={accentRole}
        data-size={size}
        data-animation={animation}
        data-icon-position={iconPosition}
        style={
          blockColorOverrideVars([
            {
              value: config?.accent_color,
              colorVar: "--sl-action-button-color",
              rgbVar: "--sl-action-button-color-rgb",
              contrastVar: "--sl-action-button-contrast",
            },
          ]) as CSSProperties
        }
      >
        {iconPosition === "left" ? iconNode : null}
        <span className="sl-action-button-label">{label || raw}</span>
        {iconPosition === "right" ? iconNode : null}
      </a>
    </div>
  );
}
