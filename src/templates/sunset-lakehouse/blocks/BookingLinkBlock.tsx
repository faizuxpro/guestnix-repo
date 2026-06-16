"use client";

import type { CSSProperties } from "react";
import { ExternalLink } from "lucide-react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars } from "@/lib/block-colors";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import { normalizeSafeUrl } from "@/lib/safe-url";
import type {
  BookingLinkContent,
  BookingLinkLayout,
  BookingLinkStyle,
  WidgetAnimation,
  WidgetColorRole,
} from "../types";

type Platform = NonNullable<BookingLinkContent["platform"]>;
type BookingAccentRole = WidgetColorRole | "platform";

const PLATFORM_LABELS: Record<Platform, string> = {
  airbnb: "Airbnb",
  vrbo: "Vrbo",
  booking: "Booking.com",
  direct: "Direct",
  other: "Link",
};

const PLATFORM_DOT: Record<Platform, string> = {
  airbnb: "#ff5a5f",
  vrbo: "#3b5998",
  booking: "#003580",
  direct: "var(--primary,#0a2321)",
  other: "var(--primary,#0a2321)",
};

const PLATFORM_ICON: Record<Platform, string> = {
  airbnb: "ph:house-line-fill",
  vrbo: "ph:suitcase-rolling-fill",
  booking: "ph:calendar-check-fill",
  direct: "ph:globe-hemisphere-west-fill",
  other: "ph:arrow-square-out-fill",
};

const BOOKING_STYLES: BookingLinkStyle[] = [
  "clean_card",
  "brand_banner",
  "split_panel",
  "minimal_row",
  "ticket",
  "glass",
  "brutalist",
];

const BOOKING_LAYOUTS: BookingLinkLayout[] = [
  "horizontal",
  "stacked",
  "compact",
];

const COLOR_ROLES: BookingAccentRole[] = [
  "platform",
  "primary",
  "secondary",
  "accent",
];

const ANIMATIONS: WidgetAnimation[] = [
  "style_default",
  "none",
  "lift",
  "glow",
  "pulse",
];

function coerce<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function platformColor(platform: unknown): string {
  const value = coerce(
    platform,
    ["airbnb", "vrbo", "booking", "direct", "other"] as const,
    "direct"
  );
  return PLATFORM_DOT[value];
}

function normalizeBookingUrl(value: string | null | undefined) {
  const safe = normalizeSafeUrl(value, {
    allowRelative: false,
    protocols: new Set(["http:", "https:"]),
  });
  if (safe) return safe;

  const trimmed = value?.trim();
  if (!trimmed || /\s/.test(trimmed) || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return null;
  }

  if (/^[\w.-]+\.[a-z]{2,}(?::\d+)?(?:[/?#].*)?$/i.test(trimmed)) {
    return normalizeSafeUrl(`https://${trimmed}`, {
      allowRelative: false,
      protocols: new Set(["http:", "https:"]),
    });
  }

  return null;
}

export function BookingLinkBlock({
  content,
}: {
  content: Partial<BookingLinkContent>;
}) {
  const label = (content.label ?? "").trim();
  const url = normalizeBookingUrl(content.url);
  const platform = coerce(
    content.platform,
    ["airbnb", "vrbo", "booking", "direct", "other"] as const,
    "direct"
  );
  const subtitle = (content.subtitle ?? "").trim();
  const style = coerce(content.style, BOOKING_STYLES, "clean_card");
  const icon = (content.icon ?? "").trim() || PLATFORM_ICON[platform];
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = coerce(config?.accent_role, COLOR_ROLES, "platform");
  const layout = coerce(config?.layout, BOOKING_LAYOUTS, "horizontal");
  const animation = coerce(config?.animation, ANIMATIONS, "style_default");
  const showPlatform =
    typeof config?.show_platform === "boolean" ? config.show_platform : true;
  const showIcon = typeof config?.show_icon === "boolean" ? config.show_icon : true;

  const hasUrl = Boolean(url);
  const external = /^https?:\/\//i.test(url ?? "");
  const customStyle =
    accentRole === "platform"
      ? ({
          "--sl-booking-link-color": platformColor(platform),
        } as CSSProperties)
      : {};
  const sharedProps = {
    className: "sl-booking-link",
    "data-style": style,
    "data-color-role": accentRole,
    "data-layout": layout,
    "data-animation": animation,
    "data-missing-url": hasUrl ? "false" : "true",
    style: {
      ...customStyle,
      ...blockColorOverrideVars([
        {
          value: config?.accent_color,
          colorVar: "--sl-booking-link-color",
          rgbVar: "--sl-booking-link-color-rgb",
          contrastVar: "--sl-booking-link-contrast",
        },
      ]),
    } as CSSProperties,
  };
  const children = (
    <>
      {showIcon ? (
        <span className="sl-booking-link-icon" aria-hidden>
          <HostIcon value={icon || DEFAULT_ICONS.BLOCK_CALLOUT} />
        </span>
      ) : null}
      <span className="sl-booking-link-copy">
        {showPlatform ? (
          <span className="sl-booking-link-platform">
            {PLATFORM_LABELS[platform]}
          </span>
        ) : null}
        <span className="sl-booking-link-label">
          {label || "Book your next stay"}
        </span>
        {subtitle ? (
          <span className="sl-booking-link-subtitle">{subtitle}</span>
        ) : null}
      </span>
      <ExternalLink className="sl-booking-link-arrow" aria-hidden />
    </>
  );

  if (!url) {
    return (
      <div {...sharedProps} aria-label="Booking link preview. Add a URL to activate it.">
        {children}
      </div>
    );
  }

  return (
    <a
      href={url}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      {...sharedProps}
    >
      {children}
    </a>
  );
}
