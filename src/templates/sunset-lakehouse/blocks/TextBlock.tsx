"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars, normalizeHexColor } from "@/lib/block-colors";
import { sanitizeRichTextHtml } from "@/lib/html-sanitize";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import type { TextContent } from "../types";

type TextVariant = NonNullable<TextContent["variant"]>;

type TextFact = {
  label: string;
  value: string;
  note: string;
  icon: string;
  image_url: string;
  badge: string;
};

type TextStackItem = {
  icon: string;
  title: string;
  description: string;
};

type TextContact = {
  icon: string;
  label: string;
  value: string;
  href: string;
};

type TextAlert = {
  label: string;
  value: string;
  icon: string;
  href: string;
};

type TextChecklistItem = {
  icon: string;
  text: string;
  note: string;
};

type FactsGridStyle =
  | "basic"
  | "cinematic_banner"
  | "spinning_gradient_border"
  | "folded_ribbon"
  | "neumorphic_soft"
  | "image_top_card"
  | "dark_frosted_glass"
  | "morphing_icon"
  | "split_pill"
  | "blueprint_grid"
  | "boarding_pass"
  | "polaroid_snapshot"
  | "flip_secret"
  | "light_frosted_glass"
  | "brutalist_press"
  | "split_ticket"
  | "origami_fold";

type TextFactsConfig = {
  iconSize: number;
  accentRole: CalloutColorRole;
  accentColor: string;
};

type CalloutCardStyle =
  | "simple"
  | "hover_elevation"
  | "watermark_scale"
  | "overlapping_badge"
  | "kinetic_border"
  | "split_pane"
  | "brutalist_press"
  | "serif_shift"
  | "radar_notification"
  | "minimalist_inline"
  | "icon_box";

type CalloutColorRole =
  | "primary"
  | "secondary"
  | "accent"
  | "ink"
  | "muted"
  | "border";

type ContactRowsStyle =
  | "clean_cards"
  | "compact_list"
  | "accent_rail"
  | "split_panel"
  | "directory_grid"
  | "ticket_cards"
  | "floating_chips"
  | "brutalist_stamp";

type AlertBannerStyle =
  | "classic"
  | "soft_callout"
  | "solid"
  | "side_rail"
  | "top_tape"
  | "glass"
  | "ticker"
  | "brutalist"
  | "outline";

type TextContactConfig = {
  style: ContactRowsStyle;
  iconSize: number;
  accentRole: CalloutColorRole;
  accentColor: string;
};

type TextAlertConfig = {
  style: AlertBannerStyle;
  iconSize: number;
  accentRole: CalloutColorRole;
  accentColor: string;
};

type ChecklistColorRole = CalloutColorRole;

type ChecklistStyle =
  | "interactive_checklist"
  | "floating_cards"
  | "watermark_numbers"
  | "soft_icon_bullets"
  | "pill_checklist"
  | "brutalist_index"
  | "blur_focus"
  | "morphing_icon"
  | "swipe_fill"
  | "bookmark_ribbon"
  | "node_timeline"
  | "background_icon";

type ChecklistNumberFont = "playfair" | "theme";

type TextChecklistConfig = {
  style: ChecklistStyle;
  icon: string;
  iconSize: number;
  labelEnabled: boolean;
  headingEnabled: boolean;
  heading: string;
  accentRole: ChecklistColorRole;
  accentColor: string;
  numberFont: ChecklistNumberFont;
};

type TextCallout = {
  eyebrow: string;
  icon: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  actionHref: string;
  ctaEnabled: boolean;
  cardStyle: CalloutCardStyle;
  bodyEnabled: boolean;
  iconSize: number;
  mobileStack: boolean;
  accentRole: CalloutColorRole;
  accentColor: string;
};

type CalloutStylePresetContent = {
  icon?: string;
  ctaEnabled?: boolean;
  cardStyle?: CalloutCardStyle;
  bodyEnabled?: boolean;
  iconSize?: number;
  mobileStack?: boolean;
  accentRole?: CalloutColorRole;
  accentColor?: string;
};

type CalloutStylePreset = {
  id: string;
  name: string;
  content: Partial<CalloutStylePresetContent>;
};

const CALLOUT_STYLE_SETTINGS_KEY = "callout_card_styles";
const CALLOUT_STYLE_DEFAULT_KEY = "callout_card_style_default_id";

const CALLOUT_CARD_STYLES: CalloutCardStyle[] = [
  "simple",
  "hover_elevation",
  "watermark_scale",
  "overlapping_badge",
  "kinetic_border",
  "split_pane",
  "brutalist_press",
  "serif_shift",
  "radar_notification",
  "minimalist_inline",
  "icon_box",
];

const CALLOUT_COLOR_ROLES: CalloutColorRole[] = [
  "primary",
  "secondary",
  "accent",
  "ink",
  "muted",
  "border",
];

const CONTACT_ROW_STYLES: ContactRowsStyle[] = [
  "clean_cards",
  "compact_list",
  "accent_rail",
  "split_panel",
  "directory_grid",
  "ticket_cards",
  "floating_chips",
  "brutalist_stamp",
];

const ALERT_BANNER_STYLES: AlertBannerStyle[] = [
  "classic",
  "soft_callout",
  "solid",
  "side_rail",
  "top_tape",
  "glass",
  "ticker",
  "brutalist",
  "outline",
];

const CHECKLIST_STYLES: ChecklistStyle[] = [
  "interactive_checklist",
  "floating_cards",
  "watermark_numbers",
  "soft_icon_bullets",
  "pill_checklist",
  "brutalist_index",
  "blur_focus",
  "morphing_icon",
  "swipe_fill",
  "bookmark_ribbon",
  "node_timeline",
  "background_icon",
];

const FACTS_GRID_STYLES: FactsGridStyle[] = [
  "basic",
  "cinematic_banner",
  "spinning_gradient_border",
  "folded_ribbon",
  "neumorphic_soft",
  "image_top_card",
  "dark_frosted_glass",
  "morphing_icon",
  "split_pill",
  "blueprint_grid",
  "boarding_pass",
  "polaroid_snapshot",
  "flip_secret",
  "light_frosted_glass",
  "brutalist_press",
  "split_ticket",
  "origami_fold",
];

function readVariant(content: Partial<TextContent>): TextVariant {
  if (
    content.variant === "card" ||
    content.variant === "facts" ||
    content.variant === "stack" ||
    content.variant === "contacts" ||
    content.variant === "alert" ||
    content.variant === "checklist" ||
    content.variant === "callout"
  ) {
    return content.variant;
  }
  return "prose";
}

function readHtml(content: Partial<TextContent>): string {
  return typeof content.html === "string" ? content.html.trim() : "";
}

function hasMeaningfulHtml(value: string): boolean {
  const plain = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 0;
}

function readLabel(content: Partial<TextContent>): string {
  return typeof content.label === "string" ? content.label.trim() : "";
}

function readFacts(content: Partial<TextContent>): TextFact[] {
  const source = Array.isArray(content.facts) ? content.facts : [];
  return source
    .map((item) => ({
      label: typeof item?.label === "string" ? item.label.trim() : "",
      value: typeof item?.value === "string" ? item.value.trim() : "",
      note: typeof item?.note === "string" ? item.note.trim() : "",
      icon: typeof item?.icon === "string" ? item.icon.trim() : "",
      image_url:
        typeof item?.image_url === "string" ? item.image_url.trim() : "",
      badge: typeof item?.badge === "string" ? item.badge.trim() : "",
    }))
    .filter(
      (item) =>
        item.label ||
        item.value ||
        item.note ||
        item.icon ||
        item.image_url ||
        item.badge
    );
}

function readFactsGridStyle(value: unknown): FactsGridStyle {
  if (FACTS_GRID_STYLES.includes(value as FactsGridStyle)) {
    return value as FactsGridStyle;
  }
  return "basic";
}

function readItems(content: Partial<TextContent>): TextStackItem[] {
  const source = Array.isArray(content.items) ? content.items : [];
  return source
    .map((item) => ({
      icon: typeof item?.icon === "string" ? item.icon.trim() : "",
      title: typeof item?.title === "string" ? item.title.trim() : "",
      description:
        typeof item?.description === "string" ? item.description.trim() : "",
    }))
    .filter((item) => item.title || item.description);
}

function isEmailLike(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

function isPhoneLike(value: string): boolean {
  return /^[+()\-.\s0-9]{6,}$/.test(value);
}

function normalizeHref(rawHref: string, fallbackValue: string): string {
  const href = rawHref.trim();
  if (href) {
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#") ||
      href.startsWith("/") ||
      href.startsWith("?")
    ) {
      return href;
    }
    return `https://${href}`;
  }

  const fallback = fallbackValue.trim();
  if (!fallback) return "";
  if (isEmailLike(fallback)) return `mailto:${fallback}`;
  if (isPhoneLike(fallback)) return `tel:${fallback.replace(/\s+/g, "")}`;
  if (fallback.startsWith("http://") || fallback.startsWith("https://")) {
    return fallback;
  }
  return `https://${fallback}`;
}

function readContacts(content: Partial<TextContent>): TextContact[] {
  const source = Array.isArray(content.contacts) ? content.contacts : [];
  return source
    .map((item) => {
      const value = typeof item?.value === "string" ? item.value.trim() : "";
      const href = normalizeHref(
        typeof item?.href === "string" ? item.href : "",
        value
      );
      return {
        icon: typeof item?.icon === "string" ? item.icon.trim() : "",
        label: typeof item?.label === "string" ? item.label.trim() : "",
        value,
        href,
      };
    })
    .filter((item) => item.label || item.value);
}

function readAlert(content: Partial<TextContent>): TextAlert {
  const alert =
    typeof content.alert === "object" && content.alert !== null
      ? content.alert
      : {};
  const value =
    typeof alert.value === "string" ? alert.value.trim() : "";
  const href = normalizeHref(
    typeof alert.href === "string" ? alert.href : "",
    value
  );
  return {
    label: typeof alert.label === "string" ? alert.label.trim() : "",
    value,
    icon: typeof alert.icon === "string" ? alert.icon.trim() : "",
    href,
  };
}

function readChecklistItems(content: Partial<TextContent>): TextChecklistItem[] {
  const source = Array.isArray(content.checklist_items)
    ? content.checklist_items
    : [];
  return source
    .map((item) => ({
      icon: typeof item?.icon === "string" ? item.icon.trim() : "",
      text: typeof item?.text === "string" ? item.text.trim() : "",
      note: typeof item?.note === "string" ? item.note.trim() : "",
    }))
    .filter((item) => item.text || item.note);
}

function readCalloutCardStyle(value: unknown): CalloutCardStyle {
  if (value === "continuous_pulse") return "radar_notification";
  if (CALLOUT_CARD_STYLES.includes(value as CalloutCardStyle)) {
    return value as CalloutCardStyle;
  }
  return "hover_elevation";
}

function readCalloutIconSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.75, numeric));
}

function sanitizeCalloutStyleContent(
  content: Partial<CalloutStylePresetContent>
): Partial<CalloutStylePresetContent> {
  return {
    icon: typeof content.icon === "string" ? content.icon : "",
    ctaEnabled: content.ctaEnabled === true,
    cardStyle: readCalloutCardStyle(content.cardStyle),
    bodyEnabled: content.bodyEnabled === true,
    iconSize: readCalloutIconSize(content.iconSize),
    mobileStack: content.mobileStack === true,
    accentRole: readCalloutColorRole(content.accentRole, "secondary"),
    accentColor: normalizeHexColor(content.accentColor),
  };
}

function readCalloutColorRole(
  value: unknown,
  fallback: CalloutColorRole
): CalloutColorRole {
  if (CALLOUT_COLOR_ROLES.includes(value as CalloutColorRole)) {
    return value as CalloutColorRole;
  }
  return fallback;
}

function readDecorIconSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.7, numeric));
}

function readContactRowsStyle(value: unknown): ContactRowsStyle {
  if (CONTACT_ROW_STYLES.includes(value as ContactRowsStyle)) {
    return value as ContactRowsStyle;
  }
  return "clean_cards";
}

function readAlertBannerStyle(value: unknown): AlertBannerStyle {
  if (ALERT_BANNER_STYLES.includes(value as AlertBannerStyle)) {
    return value as AlertBannerStyle;
  }
  return "classic";
}

function readContactConfig(content: Partial<TextContent>): TextContactConfig {
  const raw =
    typeof content.contacts_config === "object" &&
    content.contacts_config !== null
      ? (content.contacts_config as Record<string, unknown>)
      : {};
  return {
    style: readContactRowsStyle(content.contacts_style),
    iconSize: readDecorIconSize(raw.icon_size),
    accentRole: readCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function readAlertConfig(content: Partial<TextContent>): TextAlertConfig {
  const raw =
    typeof content.alert_config === "object" && content.alert_config !== null
      ? (content.alert_config as Record<string, unknown>)
      : {};
  return {
    style: readAlertBannerStyle(content.alert_style),
    iconSize: readDecorIconSize(raw.icon_size),
    accentRole: readCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function readFactsIconSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.7, numeric));
}

function readFactsConfig(content: Partial<TextContent>): TextFactsConfig {
  const raw =
    typeof content.facts_config === "object" && content.facts_config !== null
      ? (content.facts_config as Record<string, unknown>)
      : {};
  return {
    iconSize: readFactsIconSize(raw.icon_size),
    accentRole: readCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function readChecklistStyle(value: unknown): ChecklistStyle {
  if (CHECKLIST_STYLES.includes(value as ChecklistStyle)) {
    return value as ChecklistStyle;
  }
  return "soft_icon_bullets";
}

function readChecklistNumberFont(value: unknown): ChecklistNumberFont {
  return value === "theme" ? "theme" : "playfair";
}

function readChecklistIconSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.7, numeric));
}

function readChecklistConfig(
  content: Partial<TextContent>
): TextChecklistConfig {
  const raw =
    typeof content.checklist === "object" && content.checklist !== null
      ? (content.checklist as Record<string, unknown>)
      : {};
  return {
    style: readChecklistStyle(raw.style),
    icon: typeof raw.icon === "string" ? raw.icon.trim() : "",
    iconSize: readChecklistIconSize(raw.icon_size),
    labelEnabled: raw.label_enabled === true,
    headingEnabled: raw.heading_enabled === true,
    heading: typeof raw.heading === "string" ? raw.heading.trim() : "",
    accentRole: readCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
    numberFont: readChecklistNumberFont(raw.number_font),
  };
}

function readCalloutStylePresets(
  settings?: Record<string, unknown>
): CalloutStylePreset[] {
  const value = settings?.[CALLOUT_STYLE_SETTINGS_KEY];
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const name = typeof record.name === "string" ? record.name : "";
    const content =
      record.content && typeof record.content === "object"
        ? (record.content as Partial<CalloutStylePresetContent>)
        : null;
    if (!id || !name || !content) return [];
    return [{ id, name, content }];
  });
}

function resolveCalloutRaw(
  raw: Record<string, unknown>,
  guidebookSettings?: Record<string, unknown>
): Record<string, unknown> {
  if (raw.style_customized === true) return raw;
  const presets = readCalloutStylePresets(guidebookSettings);
  const defaultStyleId =
    typeof guidebookSettings?.[CALLOUT_STYLE_DEFAULT_KEY] === "string"
      ? guidebookSettings[CALLOUT_STYLE_DEFAULT_KEY]
      : "";
  const blockPresetId = typeof raw.style_id === "string" ? raw.style_id : "";
  const preset = blockPresetId
    ? presets.find((item) => item.id === blockPresetId)
    : presets.find((item) => item.id === defaultStyleId);

  if (!preset) return raw;

  const styleContent = sanitizeCalloutStyleContent(preset.content);
  return {
    ...raw,
    icon: styleContent.icon,
    card_style: styleContent.cardStyle,
    icon_size: styleContent.iconSize,
    mobile_stack: styleContent.mobileStack,
    accent_role: styleContent.accentRole,
    accent_color: styleContent.accentColor,
    body_enabled: styleContent.bodyEnabled,
    cta_enabled: styleContent.ctaEnabled,
  };
}

function readCallout(
  content: Partial<TextContent>,
  guidebookSettings?: Record<string, unknown>
): TextCallout {
  const rawSource =
    typeof content.callout === "object" && content.callout !== null
      ? content.callout
      : {};
  const raw = resolveCalloutRaw(
    rawSource as Record<string, unknown>,
    guidebookSettings
  );
  const actionLabel =
    typeof raw.action_label === "string" ? raw.action_label.trim() : "";
  const actionHref = normalizeHref(
    typeof raw.action_href === "string" ? raw.action_href : "",
    ""
  );
  const hasActionFields = Boolean(actionLabel || actionHref);
  return {
    eyebrow:
      typeof raw.eyebrow === "string"
        ? raw.eyebrow.trim()
        : typeof content.label === "string"
        ? content.label.trim()
        : "",
    icon: typeof raw.icon === "string" ? raw.icon.trim() : "",
    title: typeof raw.title === "string" ? raw.title.trim() : "",
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle.trim() : "",
    actionLabel,
    actionHref,
    ctaEnabled:
      typeof raw.cta_enabled === "boolean"
        ? raw.cta_enabled
        : hasActionFields,
    cardStyle: readCalloutCardStyle(raw.card_style),
    bodyEnabled:
      typeof raw.body_enabled === "boolean"
        ? raw.body_enabled
        : hasMeaningfulHtml(readHtml(content)),
    iconSize: readCalloutIconSize(raw.icon_size),
    mobileStack: raw.mobile_stack === true,
    accentRole: readCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function CalloutMedia({
  callout,
}: {
  callout: TextCallout;
}) {
  const icon = callout.icon || DEFAULT_ICONS.BLOCK_CALLOUT;

  if (callout.cardStyle === "watermark_scale") {
    return (
      <span className="sl-callout-watermark" aria-hidden>
        <HostIcon value={icon} />
      </span>
    );
  }

  if (callout.cardStyle === "serif_shift") {
    return (
      <span className="sl-callout-serif-icon" aria-hidden>
        <HostIcon value={icon} />
      </span>
    );
  }

  if (callout.cardStyle === "overlapping_badge") {
    return (
      <span className="sl-callout-badge" aria-hidden>
        <HostIcon value={icon} />
      </span>
    );
  }

  if (callout.cardStyle === "split_pane") {
    return (
      <span className="sl-callout-pane" aria-hidden>
        <HostIcon value={icon} />
      </span>
    );
  }

  if (callout.cardStyle === "radar_notification") {
    return (
      <span className="sl-callout-radar" aria-hidden>
        <span className="sl-callout-ping" />
        <span className="sl-callout-icon">
          <HostIcon value={icon} />
        </span>
      </span>
    );
  }

  return (
    <span className="sl-callout-icon" aria-hidden>
      <HostIcon value={icon} />
    </span>
  );
}

function checklistStyleIsInteractive(style: ChecklistStyle) {
  return style === "interactive_checklist" || style === "pill_checklist";
}

function checklistStyleUsesIcon(style: ChecklistStyle) {
  return (
    style === "floating_cards" ||
    style === "soft_icon_bullets" ||
    style === "morphing_icon" ||
    style === "background_icon"
  );
}

function checklistItemKey(item: TextChecklistItem, index: number) {
  return `${index}:${item.text}:${item.note}`;
}

function ChecklistMarker({
  style,
  icon,
}: {
  style: ChecklistStyle;
  icon: string;
}) {
  if (checklistStyleUsesIcon(style)) {
    return (
      <span className="tick" aria-hidden>
        <HostIcon value={icon || DEFAULT_ICONS.BLOCK_RULE} />
      </span>
    );
  }

  return (
    <span className="tick" aria-hidden>
      <Check />
    </span>
  );
}

function ChecklistText({ item }: { item: TextChecklistItem }) {
  return (
    <span className="txt">
      {item.text ? <span className="sl-checklist-title">{item.text}</span> : null}
      <span className="leader" aria-hidden />
      {item.note ? <small>{item.note}</small> : null}
    </span>
  );
}

function ChecklistBlock({
  content,
  label,
  blockId,
}: {
  content: Partial<TextContent>;
  label: string;
  blockId?: string;
}) {
  const items = readChecklistItems(content);
  const checklist = readChecklistConfig(content);
  const showLabel = checklist.labelEnabled && Boolean(label);
  const showHeading = checklist.headingEnabled && Boolean(checklist.heading);
  const isInteractive = checklistStyleIsInteractive(checklist.style);
  const storageKey = useMemo(
    () => (blockId ? `guestnix:checklist:${blockId}` : ""),
    [blockId]
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    if (!isInteractive || !storageKey || typeof window === "undefined") {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, boolean>;
      }
    } catch {
      return {};
    }
    return {};
  });

  if (items.length === 0) return null;

  const toggleItem = (key: string, checked: boolean) => {
    const next = { ...checkedItems, [key]: checked };
    setCheckedItems(next);
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Local progress is a convenience only; rendering should never depend on it.
    }
  };

  return (
    <div
      className="sl-card sl-checklist-card"
      data-list-style={checklist.style}
      data-color-role={checklist.accentRole}
      data-number-font={checklist.numberFont}
      style={
        {
          "--sl-list-icon-scale": checklist.iconSize,
          ...blockColorOverrideVars([
            {
              value: checklist.accentColor,
              colorVar: "--sl-list-color",
              contrastVar: "--sl-list-contrast",
            },
          ]),
        } as CSSProperties
      }
    >
      {showLabel ? <div className="sl-label">{label}</div> : null}
      {showHeading ? (
        <h3 className="sl-checklist-heading">{checklist.heading}</h3>
      ) : null}

      <ul className="sl-checklist">
        {items.map((item, index) => {
          const itemKey = checklistItemKey(item, index);
          const checked = Boolean(checkedItems[itemKey]);
          const marker = (
            <ChecklistMarker
              style={checklist.style}
              icon={item.icon || checklist.icon}
            />
          );
          const text = <ChecklistText item={item} />;
          const backgroundIcon =
            checklist.style === "background_icon" ? (
              <span className="bg-icon" aria-hidden>
                <HostIcon
                  value={item.icon || checklist.icon || DEFAULT_ICONS.BLOCK_RULE}
                />
              </span>
            ) : null;

          if (isInteractive) {
            return (
              <li
                key={`checklist-${index}-${item.text}`}
                data-checked={checked ? "true" : "false"}
              >
                <label className="sl-checklist-choice">
                  <input
                    className="sl-checklist-input"
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => toggleItem(itemKey, event.target.checked)}
                  />
                  {marker}
                  {text}
                </label>
              </li>
            );
          }

          return (
            <li key={`checklist-${index}-${item.text}`}>
              {backgroundIcon}
              {marker}
              {text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function factStyleUsesIcon(style: FactsGridStyle) {
  return (
    style === "morphing_icon" ||
    style === "split_pill" ||
    style === "flip_secret" ||
    style === "brutalist_press"
  );
}

function FactPhoto({ fact }: { fact: TextFact }) {
  if (!fact.image_url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="sl-fact-photo" src={fact.image_url} alt="" />
  );
}

function FactIcon({
  fact,
  style,
}: {
  fact: TextFact;
  style: FactsGridStyle;
}) {
  if (!fact.icon && !factStyleUsesIcon(style)) return null;
  return (
    <span className="sl-fact-icon" aria-hidden>
      <HostIcon value={fact.icon || DEFAULT_ICONS.BLOCK_STACK_ITEM} />
    </span>
  );
}

function FactCopy({
  fact,
  showLabel = true,
}: {
  fact: TextFact;
  showLabel?: boolean;
}) {
  return (
    <div className="sl-fact-copy">
      {showLabel && fact.label ? <div className="lbl">{fact.label}</div> : null}
      {fact.value ? <div className="time">{fact.value}</div> : null}
      {fact.note ? <div className="sl-checkin-note">{fact.note}</div> : null}
    </div>
  );
}

function FactCard({
  fact,
  index,
  style,
}: {
  fact: TextFact;
  index: number;
  style: FactsGridStyle;
}) {
  const key = `fact-${index}-${fact.label}-${fact.value}`;
  const badge = fact.badge ? (
    <div className="sl-fact-badge">{fact.badge}</div>
  ) : null;

  if (style === "flip_secret") {
    const ariaLabel = [fact.label, fact.value, fact.note].filter(Boolean).join(" ");
    return (
      <div
        key={key}
        className="sl-checkin-cell"
        tabIndex={0}
        aria-label={ariaLabel || undefined}
      >
        <div className="sl-fact-flip-inner">
          <div className="sl-fact-face sl-fact-face-front">
            <FactIcon fact={fact} style={style} />
            {badge}
            {fact.label ? <div className="lbl">{fact.label}</div> : null}
          </div>
          <div className="sl-fact-face sl-fact-face-back">
            <FactCopy fact={fact} showLabel={false} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={key} className="sl-checkin-cell">
      <FactPhoto fact={fact} />
      {badge}
      <FactIcon fact={fact} style={style} />
      <FactCopy fact={fact} />
      {style === "boarding_pass" ? (
        <span className="sl-fact-barcode" aria-hidden />
      ) : null}
    </div>
  );
}

export function TextBlock({
  content,
  blockId,
  guidebookSettings,
}: {
  content: Partial<TextContent>;
  blockId?: string;
  guidebookSettings?: Record<string, unknown>;
}) {
  const variant = readVariant(content);
  const html = sanitizeRichTextHtml(readHtml(content));
  const label = readLabel(content);

  if (variant === "facts") {
    const facts = readFacts(content);
    const factsStyle = readFactsGridStyle(content.facts_style);
    const factsConfig = readFactsConfig(content);
    if (facts.length === 0) return null;
    return (
      <div
        className="sl-checkin-grid"
        data-facts-style={factsStyle}
        data-color-role={factsConfig.accentRole}
        style={
          {
            "--sl-fact-icon-scale": factsConfig.iconSize,
            ...blockColorOverrideVars([
              {
                value: factsConfig.accentColor,
                colorVar: "--sl-fact-color",
                contrastVar: "--sl-fact-contrast",
              },
            ]),
          } as CSSProperties
        }
      >
        {facts.map((fact, index) => (
          <FactCard
            key={`fact-${index}-${fact.label}-${fact.value}`}
            fact={fact}
            index={index}
            style={factsStyle}
          />
        ))}
      </div>
    );
  }

  if (variant === "stack") {
    const items = readItems(content);
    if (items.length === 0) return null;
    return (
      <div className="sl-stack">
        {items.map((item, index) => (
          <div key={`stack-${index}-${item.title}`} className="sl-stack-item">
            <span className="ic">
              <HostIcon value={item.icon || DEFAULT_ICONS.BLOCK_STACK_ITEM} />
            </span>
            <div>
              {item.title ? <div className="t">{item.title}</div> : null}
              {item.description ? <div className="d">{item.description}</div> : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "contacts") {
    const contacts = readContacts(content);
    const contactConfig = readContactConfig(content);
    if (contacts.length === 0) return null;
    return (
      <div
        className="sl-contact-list"
        data-contact-style={contactConfig.style}
        data-color-role={contactConfig.accentRole}
        style={
          {
            "--sl-contact-icon-scale": contactConfig.iconSize,
            ...blockColorOverrideVars([
              {
                value: contactConfig.accentColor,
                colorVar: "--sl-contact-color",
                contrastVar: "--sl-contact-contrast",
              },
            ]),
          } as CSSProperties
        }
      >
        {contacts.map((contact, index) => {
          const body = (
            <>
              <span className="sl-contact-icon" aria-hidden>
                <HostIcon value={contact.icon || DEFAULT_ICONS.BLOCK_CONTACT} />
              </span>
              <div>
                {contact.label ? <div className="label">{contact.label}</div> : null}
                <div className="value">{contact.value}</div>
              </div>
            </>
          );

          return contact.href ? (
            <a
              key={`contact-${index}-${contact.label}-${contact.value}`}
              className="sl-contact-row"
              href={contact.href}
              target={contact.href.startsWith("http") ? "_blank" : undefined}
              rel={contact.href.startsWith("http") ? "noreferrer noopener" : undefined}
            >
              {body}
            </a>
          ) : (
            <div key={`contact-${index}-${contact.label}-${contact.value}`} className="sl-contact-row">
              {body}
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === "checklist") {
    return <ChecklistBlock content={content} label={label} blockId={blockId} />;
  }

  if (variant === "callout") {
    const callout = readCallout(content, guidebookSettings);
    const showHtml =
      callout.bodyEnabled && Boolean(html) && hasMeaningfulHtml(html);
    const hasAction = Boolean(
      callout.ctaEnabled && callout.actionLabel && callout.actionHref
    );
    const hasBody =
      callout.eyebrow || callout.title || callout.subtitle || showHtml || hasAction;
    if (!hasBody) return null;
    const bodyNode = showHtml ? (
      <div
        className="sl-prose sl-callout-prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    ) : null;
    const actionNode = hasAction ? (
      <a
        className="sl-callout-action"
        href={callout.actionHref}
        target={callout.actionHref.startsWith("http") ? "_blank" : undefined}
        rel={callout.actionHref.startsWith("http") ? "noreferrer noopener" : undefined}
      >
        {callout.actionLabel}
      </a>
    ) : null;
    const isSplitPane = callout.cardStyle === "split_pane";
    const isSimple = callout.cardStyle === "simple";

    return (
      <div
        className="sl-callout"
        data-card-style={callout.cardStyle}
        data-color-role={callout.accentRole}
        data-has-action={hasAction ? "true" : "false"}
        data-has-body={showHtml ? "true" : "false"}
        data-mobile-stack={callout.mobileStack ? "true" : "false"}
        style={
          {
            "--sl-callout-icon-scale": callout.iconSize,
            ...blockColorOverrideVars([
              {
                value: callout.accentColor,
                colorVar: "--sl-callout-color",
                contrastVar: "--sl-callout-contrast",
              },
            ]),
          } as CSSProperties
        }
      >
        {!isSimple ? <CalloutMedia callout={callout} /> : null}

        <div className="sl-callout-content">
          {callout.eyebrow ? (
            <div className="sl-callout-eyebrow">{callout.eyebrow}</div>
          ) : null}
          {callout.title ? (
            <div className="sl-callout-title">{callout.title}</div>
          ) : null}
          {callout.subtitle ? (
            <div className="sl-callout-subtitle">{callout.subtitle}</div>
          ) : null}

          {!isSplitPane ? bodyNode : null}
        </div>

        {actionNode}
        {isSplitPane ? bodyNode : null}
      </div>
    );
  }

  if (variant === "alert") {
    const alert = readAlert(content);
    const alertConfig = readAlertConfig(content);
    const hasAlertBody = alert.value || alert.label;
    if (!hasAlertBody) return null;

    const alertBody = (
      <>
        <div>
          <div className="lbl">{alert.label || "Alert"}</div>
          <div className="big">{alert.value || "Important info"}</div>
        </div>
        <span className="sl-alert-icon" aria-hidden>
          <HostIcon value={alert.icon || DEFAULT_ICONS.BLOCK_ALERT} />
        </span>
      </>
    );
    const alertProps = {
      className: "sl-emergency-banner",
      "data-alert-style": alertConfig.style,
      "data-color-role": alertConfig.accentRole,
      style: {
        "--sl-alert-icon-scale": alertConfig.iconSize,
        ...blockColorOverrideVars([
          {
            value: alertConfig.accentColor,
            colorVar: "--sl-contact-color",
            contrastVar: "--sl-contact-contrast",
          },
        ]),
        textDecoration: "none",
      } as CSSProperties,
    };

    return alert.href ? (
      <a href={alert.href} {...alertProps}>
        {alertBody}
      </a>
    ) : (
      <div {...alertProps}>
        {alertBody}
      </div>
    );
  }

  if (variant === "card") {
    if (!html && !label) return null;
    return (
      <div className="sl-card">
        {label ? <div className="sl-label">{label}</div> : null}
        {html ? (
          <div
            className="sl-prose"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
      </div>
    );
  }

  if (!html) return null;
  return <div className="sl-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
