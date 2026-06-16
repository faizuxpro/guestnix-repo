"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-text-style/font-family";
import FontSize from "@tiptap/extension-text-style/font-size";
import Color from "@tiptap/extension-color";
import type { Editor as TiptapEditor } from "@tiptap/core";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  BookmarkPlus,
  Bold,
  Check,
  Code,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  Save,
  Sparkles,
  Strikethrough,
  Trash2,
  Unlink,
  Undo2,
  Underline as UnderlineIcon,
  Upload,
} from "lucide-react";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import { RuntimeFontLoader } from "@/components/fonts/RuntimeFontLoader";
import { toast } from "sonner";
import { getMediaAssetUrl } from "@/lib/assets-hub";
import { uploadMediaFile } from "@/lib/media-upload-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeedbackDialog } from "@/components/ui/feedback-dialog";
import { AssetsHubPickerButton } from "@/components/editor/assets/AssetsHubPickerButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FontPicker } from "@/components/editor/design/FontPicker";
import {
  DEFAULTS,
  asNumber,
  asString,
  useBranding,
} from "@/components/editor/design/_branding";
import {
  ACCENT_PRESETS,
  ColorPicker,
  PRIMARY_PRESETS,
} from "@/components/editor/featured/controls/ColorPicker";
import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import {
  resolveFontEntry,
  snapWeightToFont,
  type CustomFont,
} from "@/lib/fonts/catalog";
import { extractFontFamiliesFromHtml } from "@/lib/rich-text-fonts";
import { normalizeHexColor } from "@/lib/block-colors";
import { randomUUID } from "@/lib/utils";
import { useEditorStore, type EditorBlock } from "@/stores/editor-store";
import { BlockColorControls } from "./BlockColorControls";
import { QuickVariableInsertMenu } from "../shared/QuickVariableInsertMenu";
import { PromptedInput, PromptedTextarea } from "../shared/PromptedField";

type Props = {
  block: EditorBlock;
  onChange: (content: Record<string, unknown>) => void;
};

type TextVariant =
  | "prose"
  | "card"
  | "facts"
  | "stack"
  | "contacts"
  | "alert"
  | "checklist"
  | "callout";

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
  styleId: string;
  styleCustomized: boolean;
};

type CalloutStylePresetContent = Pick<
  TextCallout,
  | "icon"
  | "ctaEnabled"
  | "cardStyle"
  | "bodyEnabled"
  | "iconSize"
  | "mobileStack"
  | "accentRole"
  | "accentColor"
>;

type CalloutStylePreset = {
  id: string;
  name: string;
  content: Partial<CalloutStylePresetContent>;
};

const CALLOUT_STYLE_SETTINGS_KEY = "callout_card_styles";
const CALLOUT_STYLE_DEFAULT_KEY = "callout_card_style_default_id";
const DEFAULT_CALLOUT_BODY_HTML =
  "<p>Add a short note guests should see here.</p>";
const DEFAULT_CALLOUT_ACTION_LABEL = "Learn more";
const DEFAULT_CALLOUT_ACTION_HREF = "#";

const CALLOUT_CARD_STYLES: Array<{
  value: CalloutCardStyle;
  label: string;
}> = [
  { value: "simple", label: "01. Simple" },
  { value: "hover_elevation", label: "02. Hover Elevation" },
  { value: "watermark_scale", label: "03. Watermark Scale" },
  { value: "overlapping_badge", label: "04. Overlapping Badge" },
  { value: "kinetic_border", label: "05. Kinetic Border" },
  { value: "radar_notification", label: "06. Radar Notification" },
  { value: "split_pane", label: "07. Split Pane" },
  { value: "brutalist_press", label: "08. Brutalist Press" },
  { value: "serif_shift", label: "09. Serif Shift" },
  { value: "minimalist_inline", label: "10. Minimalist Inline" },
  { value: "icon_box", label: "11. Icon Box" },
];

const CALLOUT_CARD_STYLE_VALUES = CALLOUT_CARD_STYLES.map(
  (style) => style.value
);

const CALLOUT_COLOR_ROLES: Array<{
  value: CalloutColorRole;
  label: string;
}> = [
  { value: "primary", label: "Guide primary" },
  { value: "secondary", label: "Guide secondary" },
  { value: "accent", label: "Guide accent" },
  { value: "ink", label: "Guide text" },
  { value: "muted", label: "Guide muted" },
  { value: "border", label: "Guide border" },
];

const CALLOUT_COLOR_ROLE_VALUES = CALLOUT_COLOR_ROLES.map(
  (role) => role.value
);

const CONTACT_ROW_STYLES: Array<{
  value: ContactRowsStyle;
  label: string;
}> = [
  { value: "clean_cards", label: "Basic Cards" },
  { value: "compact_list", label: "01. Compact List" },
  { value: "accent_rail", label: "02. Accent Rail" },
  { value: "split_panel", label: "03. Split Panel" },
  { value: "directory_grid", label: "04. Directory Grid" },
  { value: "ticket_cards", label: "05. Ticket Cards" },
  { value: "floating_chips", label: "06. Floating Chips" },
  { value: "brutalist_stamp", label: "07. Brutalist Stamp" },
];

const CONTACT_ROW_STYLE_VALUES = CONTACT_ROW_STYLES.map(
  (style) => style.value
);

const ALERT_BANNER_STYLES: Array<{
  value: AlertBannerStyle;
  label: string;
}> = [
  { value: "classic", label: "Basic Emergency" },
  { value: "soft_callout", label: "01. Soft Callout" },
  { value: "solid", label: "02. Solid Brand" },
  { value: "side_rail", label: "03. Side Rail" },
  { value: "top_tape", label: "04. Top Tape" },
  { value: "glass", label: "05. Frosted Glass" },
  { value: "ticker", label: "06. Ticker Strip" },
  { value: "brutalist", label: "07. Brutalist Stamp" },
  { value: "outline", label: "08. Editorial Outline" },
];

const ALERT_BANNER_STYLE_VALUES = ALERT_BANNER_STYLES.map(
  (style) => style.value
);

const CHECKLIST_STYLES: Array<{
  value: ChecklistStyle;
  label: string;
  needsIcon?: boolean;
}> = [
  { value: "interactive_checklist", label: "01. Interactive Checklist" },
  { value: "floating_cards", label: "02. Floating Cards", needsIcon: true },
  { value: "watermark_numbers", label: "03. Watermark Numbers" },
  { value: "soft_icon_bullets", label: "04. Soft Icon Bullets", needsIcon: true },
  { value: "pill_checklist", label: "05. Pill Checklist" },
  { value: "brutalist_index", label: "06. Brutalist Index" },
  { value: "blur_focus", label: "07. Blur Focus" },
  { value: "morphing_icon", label: "08. Morphing Icon", needsIcon: true },
  { value: "swipe_fill", label: "09. Swipe Fill" },
  { value: "bookmark_ribbon", label: "10. Bookmark Ribbon" },
  { value: "node_timeline", label: "11. Node Timeline" },
  { value: "background_icon", label: "12. Background Icon", needsIcon: true },
];

const CHECKLIST_STYLE_VALUES = CHECKLIST_STYLES.map((style) => style.value);

const FACTS_GRID_STYLES: Array<{
  value: FactsGridStyle;
  label: string;
  needsIcon?: boolean;
  needsImage?: boolean;
  needsBadge?: boolean;
}> = [
  { value: "basic", label: "Basic Grid" },
  { value: "cinematic_banner", label: "01. Cinematic Banner", needsImage: true },
  { value: "spinning_gradient_border", label: "02. Spinning Gradient Border" },
  { value: "folded_ribbon", label: "03. Folded Ribbon", needsBadge: true },
  { value: "neumorphic_soft", label: "04. Neumorphic Soft Card" },
  { value: "image_top_card", label: "05. Rectangular Image Top", needsImage: true },
  { value: "dark_frosted_glass", label: "06. Dark Frosted Glass" },
  { value: "morphing_icon", label: "07. Morphing Icon", needsIcon: true },
  { value: "split_pill", label: "08. Split Pill", needsIcon: true },
  { value: "blueprint_grid", label: "09. Blueprint Grid" },
  { value: "boarding_pass", label: "10. Boarding Pass", needsBadge: true },
  { value: "polaroid_snapshot", label: "11. Polaroid Snapshot", needsImage: true },
  { value: "flip_secret", label: "12. 3D Flip Secret", needsIcon: true },
  { value: "light_frosted_glass", label: "13. Light Frosted Glass" },
  { value: "brutalist_press", label: "14. Brutalist Press", needsIcon: true },
  { value: "split_ticket", label: "15. Minimal Split Ticket", needsBadge: true },
  { value: "origami_fold", label: "16. Origami Fold", needsBadge: true },
];

const FACTS_GRID_STYLE_VALUES = FACTS_GRID_STYLES.map((style) => style.value);

const FONT_SIZE_OPTIONS = [
  { value: "12px", label: "12" },
  { value: "14px", label: "14" },
  { value: "16px", label: "16" },
  { value: "18px", label: "18" },
  { value: "20px", label: "20" },
  { value: "24px", label: "24" },
  { value: "28px", label: "28" },
  { value: "32px", label: "32" },
];

function cssFontStack(
  family: string,
  customFonts: CustomFont[],
  fallback: "serif" | "sans-serif" | "monospace"
) {
  const trimmed = family.trim();
  if (!trimmed) return fallback;
  const entry = resolveFontEntry(trimmed, customFonts);
  const generic =
    entry?.category === "serif" || entry?.category === "monospace"
      ? entry.category
      : fallback;
  return `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}", ${generic}`;
}

function firstFontFamily(value: unknown) {
  if (typeof value !== "string") return "";
  const raw = value.trim();
  if (!raw) return "";
  const first = raw.split(",")[0]?.trim() ?? "";
  return first.replace(/^["']|["']$/g, "");
}

function normalizeFontSize(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : "";
}

function hasMeaningfulHtml(value: unknown) {
  if (typeof value !== "string") return false;
  const plain = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 0;
}

function coerceCalloutCardStyle(value: unknown): CalloutCardStyle {
  if (value === "continuous_pulse") return "radar_notification";
  if (CALLOUT_CARD_STYLE_VALUES.includes(value as CalloutCardStyle)) {
    return value as CalloutCardStyle;
  }
  return "hover_elevation";
}

function coerceCalloutIconSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.75, numeric));
}

function readSettingString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readCalloutStylePresets(value: unknown): CalloutStylePreset[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const content =
      record.content && typeof record.content === "object"
        ? (record.content as Partial<CalloutStylePresetContent>)
        : null;
    if (!id || !name || !content) return [];
    return [{ id, name, content }];
  });
}

function sanitizeCalloutStyleContent(
  content: Partial<CalloutStylePresetContent>
): Partial<CalloutStylePresetContent> {
  return {
    icon: typeof content.icon === "string" ? content.icon : "",
    ctaEnabled: content.ctaEnabled === true,
    cardStyle: coerceCalloutCardStyle(content.cardStyle),
    bodyEnabled: content.bodyEnabled === true,
    iconSize: coerceCalloutIconSize(content.iconSize),
    mobileStack: content.mobileStack === true,
    accentRole: coerceCalloutColorRole(content.accentRole, "secondary"),
    accentColor: normalizeHexColor(content.accentColor),
  };
}

function hasVisibleCalloutBody(html: string) {
  return hasMeaningfulHtml(html);
}

function htmlWithDefaultCalloutBody(html: string) {
  return hasVisibleCalloutBody(html) ? html : DEFAULT_CALLOUT_BODY_HTML;
}

function coerceCalloutColorRole(
  value: unknown,
  fallback: CalloutColorRole
): CalloutColorRole {
  if (CALLOUT_COLOR_ROLE_VALUES.includes(value as CalloutColorRole)) {
    return value as CalloutColorRole;
  }
  return fallback;
}

function coerceDecorIconSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.7, numeric));
}

function coerceContactRowsStyle(value: unknown): ContactRowsStyle {
  if (CONTACT_ROW_STYLE_VALUES.includes(value as ContactRowsStyle)) {
    return value as ContactRowsStyle;
  }
  return "clean_cards";
}

function coerceAlertBannerStyle(value: unknown): AlertBannerStyle {
  if (ALERT_BANNER_STYLE_VALUES.includes(value as AlertBannerStyle)) {
    return value as AlertBannerStyle;
  }
  return "classic";
}

function readContactConfig(content: Record<string, unknown>): TextContactConfig {
  const raw =
    typeof content.contacts_config === "object" &&
    content.contacts_config !== null
      ? (content.contacts_config as Record<string, unknown>)
      : {};
  return {
    style: coerceContactRowsStyle(content.contacts_style),
    iconSize: coerceDecorIconSize(raw.icon_size),
    accentRole: coerceCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function readAlertConfig(content: Record<string, unknown>): TextAlertConfig {
  const raw =
    typeof content.alert_config === "object" && content.alert_config !== null
      ? (content.alert_config as Record<string, unknown>)
      : {};
  return {
    style: coerceAlertBannerStyle(content.alert_style),
    iconSize: coerceDecorIconSize(raw.icon_size),
    accentRole: coerceCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function coerceFactsGridStyle(value: unknown): FactsGridStyle {
  if (FACTS_GRID_STYLE_VALUES.includes(value as FactsGridStyle)) {
    return value as FactsGridStyle;
  }
  return "basic";
}

function factsStyleNeedsIcon(style: FactsGridStyle) {
  return FACTS_GRID_STYLES.some((option) => option.value === style && option.needsIcon);
}

function factsStyleNeedsImage(style: FactsGridStyle) {
  return FACTS_GRID_STYLES.some((option) => option.value === style && option.needsImage);
}

function factsStyleNeedsBadge(style: FactsGridStyle) {
  return FACTS_GRID_STYLES.some((option) => option.value === style && option.needsBadge);
}

function coerceFactsIconSize(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(2, Math.max(0.7, numeric));
}

function readFactsConfig(content: Record<string, unknown>): TextFactsConfig {
  const raw =
    typeof content.facts_config === "object" && content.facts_config !== null
      ? (content.facts_config as Record<string, unknown>)
      : {};
  return {
    iconSize: coerceFactsIconSize(raw.icon_size),
    accentRole: coerceCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
  };
}

function coerceChecklistStyle(value: unknown): ChecklistStyle {
  if (CHECKLIST_STYLE_VALUES.includes(value as ChecklistStyle)) {
    return value as ChecklistStyle;
  }
  return "soft_icon_bullets";
}

function coerceChecklistNumberFont(value: unknown): ChecklistNumberFont {
  return value === "theme" ? "theme" : "playfair";
}

function coerceChecklistIconSize(value: unknown): number {
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
  content: Record<string, unknown>
): TextChecklistConfig {
  const raw =
    typeof content.checklist === "object" && content.checklist !== null
      ? (content.checklist as Record<string, unknown>)
      : {};
  return {
    style: coerceChecklistStyle(raw.style),
    icon: typeof raw.icon === "string" ? raw.icon : "",
    iconSize: coerceChecklistIconSize(raw.icon_size),
    labelEnabled: raw.label_enabled === true,
    headingEnabled: raw.heading_enabled === true,
    heading: typeof raw.heading === "string" ? raw.heading : "",
    accentRole: coerceCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: normalizeHexColor(raw.accent_color),
    numberFont: coerceChecklistNumberFont(raw.number_font),
  };
}

function checklistStyleNeedsIcon(style: ChecklistStyle) {
  return CHECKLIST_STYLES.some((option) => option.value === style && option.needsIcon);
}

function getInitialHtml(content: Record<string, unknown>) {
  const html = content.html;
  if (typeof html === "string") return html;

  const text = content.text;
  if (typeof text === "string" && text.trim().length > 0) {
    return `<p>${text}</p>`;
  }

  return "<p></p>";
}

function readVariant(content: Record<string, unknown>): TextVariant {
  const value = content.variant;
  if (
    value === "card" ||
    value === "facts" ||
    value === "stack" ||
    value === "contacts" ||
    value === "alert" ||
    value === "checklist" ||
    value === "callout"
  ) {
    return value;
  }
  return "prose";
}

function readString(content: Record<string, unknown>, key: string) {
  const value = content[key];
  return typeof value === "string" ? value : "";
}

function readFacts(content: Record<string, unknown>): TextFact[] {
  const value = content.facts;
  if (!Array.isArray(value)) return [];

  return value
    .map((item): TextFact | null => {
      if (!item || typeof item !== "object") return null;
      const fact = item as Record<string, unknown>;
      return {
        label: typeof fact.label === "string" ? fact.label : "",
        value: typeof fact.value === "string" ? fact.value : "",
        note: typeof fact.note === "string" ? fact.note : "",
        icon: typeof fact.icon === "string" ? fact.icon : "",
        image_url: typeof fact.image_url === "string" ? fact.image_url : "",
        badge: typeof fact.badge === "string" ? fact.badge : "",
      };
    })
    .filter((item): item is TextFact => Boolean(item));
}

function readItems(content: Record<string, unknown>): TextStackItem[] {
  const value = content.items;
  if (!Array.isArray(value)) return [];

  return value
    .map((item): TextStackItem | null => {
      if (!item || typeof item !== "object") return null;
      const stackItem = item as Record<string, unknown>;
      return {
        icon: typeof stackItem.icon === "string" ? stackItem.icon : "",
        title: typeof stackItem.title === "string" ? stackItem.title : "",
        description:
          typeof stackItem.description === "string" ? stackItem.description : "",
      };
    })
    .filter((item): item is TextStackItem => Boolean(item));
}

function readContacts(content: Record<string, unknown>): TextContact[] {
  const value = content.contacts;
  if (!Array.isArray(value)) return [];

  return value
    .map((item): TextContact | null => {
      if (!item || typeof item !== "object") return null;
      const contact = item as Record<string, unknown>;
      return {
        icon: typeof contact.icon === "string" ? contact.icon : "",
        label: typeof contact.label === "string" ? contact.label : "",
        value: typeof contact.value === "string" ? contact.value : "",
        href: typeof contact.href === "string" ? contact.href : "",
      };
    })
    .filter((item): item is TextContact => Boolean(item));
}

function readAlert(content: Record<string, unknown>): TextAlert {
  const alertRaw =
    typeof content.alert === "object" && content.alert !== null
      ? (content.alert as Record<string, unknown>)
      : {};

  return {
    label: typeof alertRaw.label === "string" ? alertRaw.label : "",
    value: typeof alertRaw.value === "string" ? alertRaw.value : "",
    icon: typeof alertRaw.icon === "string" ? alertRaw.icon : "",
    href: typeof alertRaw.href === "string" ? alertRaw.href : "",
  };
}

function readChecklistItems(content: Record<string, unknown>): TextChecklistItem[] {
  const value = content.checklist_items;
  if (!Array.isArray(value)) return [];

  return value
    .map((item): TextChecklistItem | null => {
      if (!item || typeof item !== "object") return null;
      const checklistItem = item as Record<string, unknown>;
      return {
        icon: typeof checklistItem.icon === "string" ? checklistItem.icon : "",
        text: typeof checklistItem.text === "string" ? checklistItem.text : "",
        note: typeof checklistItem.note === "string" ? checklistItem.note : "",
      };
    })
    .filter((item): item is TextChecklistItem => Boolean(item));
}

function readCallout(
  content: Record<string, unknown>,
  styleContent?: Partial<CalloutStylePresetContent>
): TextCallout {
  const raw =
    typeof content.callout === "object" && content.callout !== null
      ? (content.callout as Record<string, unknown>)
      : {};
  const style = styleContent
    ? sanitizeCalloutStyleContent(styleContent)
    : undefined;
  const actionLabel =
    typeof raw.action_label === "string" ? raw.action_label : "";
  const actionHref = typeof raw.action_href === "string" ? raw.action_href : "";
  const hasActionFields = Boolean(actionLabel.trim() || actionHref.trim());
  return {
    eyebrow:
      typeof raw.eyebrow === "string"
        ? raw.eyebrow
        : typeof content.label === "string"
        ? content.label
        : "",
    icon:
      typeof style?.icon === "string"
        ? style.icon
        : typeof raw.icon === "string"
        ? raw.icon
        : "",
    title: typeof raw.title === "string" ? raw.title : "",
    subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
    actionLabel,
    actionHref,
    ctaEnabled:
      typeof style?.ctaEnabled === "boolean"
        ? style.ctaEnabled
        : typeof raw.cta_enabled === "boolean"
        ? raw.cta_enabled
        : hasActionFields,
    cardStyle: style?.cardStyle ?? coerceCalloutCardStyle(raw.card_style),
    bodyEnabled:
      typeof style?.bodyEnabled === "boolean"
        ? style.bodyEnabled
        : typeof raw.body_enabled === "boolean"
        ? raw.body_enabled
        : hasMeaningfulHtml(content.html),
    iconSize: style?.iconSize ?? coerceCalloutIconSize(raw.icon_size),
    mobileStack:
      typeof style?.mobileStack === "boolean"
        ? style.mobileStack
        : raw.mobile_stack === true,
    accentRole:
      style?.accentRole ?? coerceCalloutColorRole(raw.accent_role, "secondary"),
    accentColor: style?.accentColor ?? normalizeHexColor(raw.accent_color),
    styleId: typeof raw.style_id === "string" ? raw.style_id : "",
    styleCustomized: raw.style_customized === true,
  };
}

function ToolbarButton({
  active,
  onClick,
  ariaLabel,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-xs"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      disabled={disabled}
      data-active={active ? "true" : "false"}
      className={
        active
          ? "rich-text-tool-button border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/92 hover:text-primary-foreground"
          : "rich-text-tool-button text-foreground/70 hover:bg-muted/70 hover:text-foreground"
      }
    >
      {children}
    </Button>
  );
}

function ToolbarGroup({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rich-text-toolbar-group ${className}`}>
      {children}
    </div>
  );
}

function RichTextPanel({
  blockId,
  html,
  onHtmlChange,
}: {
  blockId: string;
  html: string;
  onHtmlChange: (html: string) => void;
}) {
  const { requestTextInput } = useFeedbackDialog();
  const { branding } = useBranding();
  const [, setToolbarRevision] = useState(0);
  const savedSelectionRef = useRef<{ from: number; to: number } | null>(null);
  const toolbarRefreshFrameRef = useRef<number | null>(null);
  const scheduleToolbarRefresh = () => {
    if (typeof window === "undefined") {
      setToolbarRevision((value) => (value + 1) % 1000000);
      return;
    }
    if (toolbarRefreshFrameRef.current !== null) return;
    toolbarRefreshFrameRef.current = window.requestAnimationFrame(() => {
      toolbarRefreshFrameRef.current = null;
      setToolbarRevision((value) => (value + 1) % 1000000);
    });
  };
  const rememberEditorSelection = (instance: TiptapEditor | null) => {
    if (!instance) return;
    const { from, to } = instance.state.selection;
    savedSelectionRef.current = { from, to };
  };
  const customFonts = useMemo<CustomFont[]>(
    () => (Array.isArray(branding.custom_fonts) ? branding.custom_fonts : []),
    [branding.custom_fonts]
  );
  const headingFont = asString(
    branding.heading_font,
    asString(branding.font_family, DEFAULTS.heading_font)
  );
  const bodyFont = asString(
    branding.body_font,
    asString(branding.font_family, DEFAULTS.body_font)
  );
  const headingWeight = snapWeightToFont(
    asNumber(branding.heading_weight, DEFAULTS.heading_weight),
    headingFont,
    customFonts
  );
  const bodyWeight = snapWeightToFont(
    asNumber(branding.body_weight, DEFAULTS.body_weight),
    bodyFont,
    customFonts
  );
  const richTextStyle = useMemo(
    () =>
      ({
        "--rich-text-heading-font": cssFontStack(
          headingFont,
          customFonts,
          "serif"
        ),
        "--rich-text-body-font": cssFontStack(
          bodyFont,
          customFonts,
          "sans-serif"
        ),
        "--rich-text-heading-scale": String(
          asNumber(branding.heading_scale, DEFAULTS.heading_scale)
        ),
        "--rich-text-body-scale": String(
          asNumber(branding.body_scale, DEFAULTS.body_scale)
        ),
        "--rich-text-heading-weight": String(headingWeight),
        "--rich-text-heading-strong-weight": String(
          Math.max(700, Math.min(900, headingWeight + 200))
        ),
        "--rich-text-body-weight": String(bodyWeight),
        "--rich-text-body-strong-weight": String(
          snapWeightToFont(Math.min(900, bodyWeight + 200), bodyFont, customFonts)
        ),
        "--rich-text-heading-letter-spacing": `${asNumber(
          branding.heading_letter_spacing,
          DEFAULTS.heading_letter_spacing
        )}em`,
        "--rich-text-body-letter-spacing": `${asNumber(
          branding.body_letter_spacing,
          DEFAULTS.body_letter_spacing
        )}em`,
        "--rich-text-heading-line-height": String(
          asNumber(branding.heading_line_height, DEFAULTS.heading_line_height)
        ),
        "--rich-text-body-line-height": String(
          asNumber(branding.body_line_height, DEFAULTS.body_line_height)
        ),
        "--rich-text-primary-color": asString(
          branding.primary_color,
          DEFAULTS.primary_color
        ),
        "--rich-text-secondary-color": asString(
          branding.secondary_color,
          DEFAULTS.secondary_color
        ),
      }) as CSSProperties,
    [
      bodyFont,
      bodyWeight,
      branding.body_letter_spacing,
      branding.body_line_height,
      branding.body_scale,
      branding.heading_letter_spacing,
      branding.heading_line_height,
      branding.heading_scale,
      branding.primary_color,
      branding.secondary_color,
      customFonts,
      headingFont,
      headingWeight,
    ]
  );
  const inlineFontFamilies = useMemo(
    () => extractFontFamiliesFromHtml(html),
    [html]
  );
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        protocols: ["http", "https", "mailto"],
      }),
      Placeholder.configure({
        placeholder: "Write guest instructions, welcome notes, or details...",
      }),
    ],
    content: html,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "rich-text-editor-surface min-h-40 bg-background px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-0",
      },
    },
    onSelectionUpdate: ({ editor: instance }) => {
      rememberEditorSelection(instance);
      scheduleToolbarRefresh();
    },
    onTransaction: ({ editor: instance }) => {
      rememberEditorSelection(instance);
      scheduleToolbarRefresh();
    },
    onUpdate: ({ editor: instance }) => {
      onHtmlChange(instance.getHTML());
    },
  });

  useEffect(() => {
    return () => {
      if (toolbarRefreshFrameRef.current !== null) {
        window.cancelAnimationFrame(toolbarRefreshFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== html) {
      editor.commands.setContent(html, { emitUpdate: false });
    }
  }, [editor, html]);

  const setLink = async () => {
    if (!editor) return;
    const selection = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    savedSelectionRef.current = selection;
    const current = editor.getAttributes("link").href as string | undefined;
    const value = await requestTextInput({
      title: current ? "Edit link" : "Add link",
      description: "Paste a URL, email link, or leave the field empty to remove the link.",
      label: "Link URL",
      defaultValue: current ?? "https://",
      placeholder: "https://example.com",
      confirmLabel: current ? "Update link" : "Add link",
      tone: "default",
    });
    if (value === null) return;

    const trimmed = value.trim();
    if (!trimmed) {
      editor
        .chain()
        .focus()
        .setTextSelection(selection)
        .extendMarkRange("link")
        .unsetLink()
        .run();
      return;
    }

    const normalized =
      /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

    editor
      .chain()
      .focus()
      .setTextSelection(selection)
      .extendMarkRange("link")
      .setLink({ href: normalized })
      .run();
  };

  const currentFontFamily = firstFontFamily(
    editor?.getAttributes("textStyle").fontFamily
  );
  const currentFontSize = normalizeFontSize(
    editor?.getAttributes("textStyle").fontSize
  );
  const toolbarFont =
    currentFontFamily || (editor?.isActive("heading") ? headingFont : bodyFont);
  const fontLoaderFamilies = useMemo(
    () =>
      [
        headingFont,
        bodyFont,
        toolbarFont,
        ...inlineFontFamilies,
      ].filter(Boolean),
    [bodyFont, headingFont, inlineFontFamilies, toolbarFont]
  );

  if (!editor) return null;

  const rememberSelection = () => {
    const { from, to } = editor.state.selection;
    savedSelectionRef.current = { from, to };
  };

  const withSavedSelection = () => {
    const chain = editor.chain().focus();
    const selection = savedSelectionRef.current;
    if (selection) {
      const max = editor.state.doc.content.size;
      const from = Math.min(Math.max(selection.from, 0), max);
      const to = Math.min(Math.max(selection.to, from), max);
      chain.setTextSelection({ from, to });
    }
    return chain;
  };

  const applyTextColor = (color: string) => {
    withSavedSelection().setColor(color).run();
  };

  const clearTextColor = () => {
    withSavedSelection().unsetColor().removeEmptyTextStyle().run();
  };

  const applyHighlightColor = (color: string) => {
    withSavedSelection().setHighlight({ color }).run();
  };

  const clearHighlight = () => {
    withSavedSelection().unsetHighlight().run();
  };

  const insertQuickVariable = (token: string) => {
    withSavedSelection().insertContent(token).run();
  };

  const applyFontFamily = (family: string) => {
    const trimmed = family.trim();
    if (!trimmed) return;
    withSavedSelection()
      .setFontFamily(cssFontStack(trimmed, customFonts, "sans-serif"))
      .run();
  };

  const clearFontFamily = () => {
    withSavedSelection().unsetFontFamily().removeEmptyTextStyle().run();
  };

  const applyFontSize = (size: string | null) => {
    if (!size) return;
    if (size === "default") {
      withSavedSelection().unsetFontSize().removeEmptyTextStyle().run();
      return;
    }
    withSavedSelection().setFontSize(size).run();
  };

  const textColor =
    (editor.getAttributes("textStyle").color as string | undefined) ?? "#24302f";
  const highlightColor =
    (editor.getAttributes("highlight").color as string | undefined) ?? "#fff1a8";
  const hasTextColor = Boolean(editor.getAttributes("textStyle").color);
  const fontSizeOptions =
    currentFontSize &&
    !FONT_SIZE_OPTIONS.some((option) => option.value === currentFontSize)
      ? [
          ...FONT_SIZE_OPTIONS,
          { value: currentFontSize, label: currentFontSize.replace("px", "") },
        ]
      : FONT_SIZE_OPTIONS;

  return (
    <div className="space-y-2">
      <div className="block-subbody rich-text-editor" style={richTextStyle}>
        <RuntimeFontLoader
          id={`rich-text-editor-${blockId}`}
          fontFamilies={fontLoaderFamilies}
          customFonts={customFonts}
        />
        <div className="rich-text-toolbar sticky top-2 z-20 rounded-t-md border-b border-border/75 bg-muted/95 p-1.5 backdrop-blur">
          <div className="rich-text-toolbar-row rich-text-toolbar-row--blocks">
          <ToolbarGroup className="rich-text-history-group">
            <ToolbarButton
              ariaLabel="Undo"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Redo"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo2 className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup className="rich-text-block-style-group">
            <ToolbarButton
              ariaLabel="Paragraph"
              active={editor.isActive("paragraph")}
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              <Pilcrow className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Heading 1"
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Heading 2"
              active={editor.isActive("heading", { level: 2 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Heading 3"
              active={editor.isActive("heading", { level: 3 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>
          </div>

          <div className="rich-text-toolbar-row rich-text-toolbar-row--font">
            <div
              className="rich-text-font-picker"
              onPointerDown={rememberSelection}
            >
              <FontPicker
                value={toolbarFont}
                onChange={applyFontFamily}
                role={editor.isActive("heading") ? "heading" : "body"}
                triggerClassName="!h-7 px-2 text-[11px]"
              />
            </div>
            <Select
              value={currentFontSize || "default"}
              onValueChange={applyFontSize}
            >
              <SelectTrigger
                className="h-7 rounded-md border-border/70 bg-background px-2 text-[11px] shadow-none"
                aria-label="Font size"
                title="Font size"
                onPointerDown={rememberSelection}
              >
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="default">Auto</SelectItem>
                {fontSizeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToolbarButton
              ariaLabel="Clear font"
              onClick={clearFontFamily}
              disabled={!currentFontFamily}
            >
              <RemoveFormatting className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>

          <div className="rich-text-toolbar-row rich-text-toolbar-row--format">
          <ToolbarGroup className="rich-text-inline-group">
            <ToolbarButton
              ariaLabel="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Underline"
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Strikethrough"
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Inline code"
              active={editor.isActive("code")}
              onClick={() => editor.chain().focus().toggleCode().run()}
            >
              <Code className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup className="rich-text-list-group">
            <ToolbarButton
              ariaLabel="Bullet List"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Ordered List"
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Blockquote"
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Horizontal rule"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
            >
              <Minus className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup className="rich-text-align-group">
            <ToolbarButton
              ariaLabel="Align left"
              active={editor.isActive({ textAlign: "left" })}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Align center"
              active={editor.isActive({ textAlign: "center" })}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Align right"
              active={editor.isActive({ textAlign: "right" })}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>
          </div>

          <div className="rich-text-toolbar-row rich-text-toolbar-row--extras">
          <ToolbarGroup className="rich-text-link-group">
            <ToolbarButton
              ariaLabel="Add Link"
              active={editor.isActive("link")}
              onClick={setLink}
            >
              <Link2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              ariaLabel="Remove Link"
              onClick={() => editor.chain().focus().unsetLink().run()}
              disabled={!editor.isActive("link")}
            >
              <Unlink className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarGroup className="rich-text-quick-variable-group">
            <div onPointerDown={rememberSelection}>
              <QuickVariableInsertMenu
                onInsert={insertQuickVariable}
                className="h-7 w-7"
              />
            </div>
          </ToolbarGroup>

          <ToolbarGroup className="rich-text-color-group">
            <div
              className="rich-text-color-control"
              title="Text color"
              aria-label="Text color"
              onPointerDown={rememberSelection}
            >
              <span className="rich-text-color-glyph">A</span>
              <ColorPicker
                compact
                value={textColor}
                onChange={applyTextColor}
                presets={PRIMARY_PRESETS}
                className="gap-0"
              />
            </div>
            <ToolbarButton
              ariaLabel="Clear text color"
              onClick={clearTextColor}
              disabled={!hasTextColor}
            >
              <RemoveFormatting className="h-3.5 w-3.5" />
            </ToolbarButton>
            <div
              className="rich-text-color-control"
              title="Highlight color"
              aria-label="Highlight color"
              onPointerDown={rememberSelection}
            >
              <Highlighter className="rich-text-color-icon" />
              <ColorPicker
                compact
                value={highlightColor}
                onChange={applyHighlightColor}
                presets={ACCENT_PRESETS}
                className="gap-0"
              />
            </div>
            <ToolbarButton
              ariaLabel="Remove highlight"
              onClick={clearHighlight}
              active={editor.isActive("highlight")}
              disabled={!editor.isActive("highlight")}
            >
              <Highlighter className="h-3.5 w-3.5" />
            </ToolbarButton>
          </ToolbarGroup>
          </div>
        </div>
        <div className="rich-text-editor-scroll bg-background/95">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

export function TextBlockEditor({ block, onChange }: Props) {
  const html = getInitialHtml(block.content);
  const variant = readVariant(block.content);
  const rawCalloutStyles = useEditorStore(
    (state) => state.guidebookSettings[CALLOUT_STYLE_SETTINGS_KEY]
  );
  const rawDefaultCalloutStyleId = useEditorStore(
    (state) => state.guidebookSettings[CALLOUT_STYLE_DEFAULT_KEY]
  );
  const updateGuidebookSettings = useEditorStore(
    (state) => state.updateGuidebookSettings
  );
  const savedCalloutStyles = useMemo(
    () => readCalloutStylePresets(rawCalloutStyles),
    [rawCalloutStyles]
  );
  const defaultCalloutStyleId = readSettingString(rawDefaultCalloutStyleId);
  const defaultCalloutPreset = savedCalloutStyles.find(
    (preset) => preset.id === defaultCalloutStyleId
  );
  const rawCallout =
    typeof block.content.callout === "object" && block.content.callout !== null
      ? (block.content.callout as Record<string, unknown>)
      : {};
  const blockCalloutStyleId = readSettingString(rawCallout.style_id);
  const calloutStyleCustomized = rawCallout.style_customized === true;
  const linkedCalloutPreset = !calloutStyleCustomized
    ? savedCalloutStyles.find((preset) => preset.id === blockCalloutStyleId)
    : undefined;
  const activeCalloutPreset = !calloutStyleCustomized
    ? linkedCalloutPreset ??
      (!blockCalloutStyleId ? defaultCalloutPreset : undefined)
    : undefined;
  const usingCalloutGuideDefault = Boolean(
    defaultCalloutPreset &&
      activeCalloutPreset?.id === defaultCalloutPreset.id &&
      !linkedCalloutPreset
  );
  const label = readString(block.content, "label");
  const facts = readFacts(block.content);
  const factsStyle = coerceFactsGridStyle(block.content.facts_style);
  const factsConfig = readFactsConfig(block.content);
  const items = readItems(block.content);
  const contacts = readContacts(block.content);
  const contactConfig = readContactConfig(block.content);
  const alert = readAlert(block.content);
  const alertConfig = readAlertConfig(block.content);
  const checklistItems = readChecklistItems(block.content);
  const checklistConfig = readChecklistConfig(block.content);
  const callout = readCallout(block.content, activeCalloutPreset?.content);
  const [calloutPresetName, setCalloutPresetName] = useState("");
  const [saveCalloutAsGuideDefault, setSaveCalloutAsGuideDefault] =
    useState(false);
  const [uploadingFactIndex, setUploadingFactIndex] = useState<number | null>(
    null
  );
  const [factUploadProgress, setFactUploadProgress] = useState<Record<number, number>>({});
  const factImageRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const currentCalloutStyleContent: Partial<CalloutStylePresetContent> = {
    icon: callout.icon,
    ctaEnabled: callout.ctaEnabled,
    cardStyle: callout.cardStyle,
    bodyEnabled: callout.bodyEnabled,
    iconSize: callout.iconSize,
    mobileStack: callout.mobileStack,
    accentRole: callout.accentRole,
    accentColor: callout.accentColor,
  };
  const hasRichTextBody =
    variant === "prose" ||
    variant === "card" ||
    (variant === "callout" && callout.bodyEnabled);

  const patch = (next: {
    html?: string;
    label?: string;
    facts?: TextFact[];
    factsStyle?: FactsGridStyle;
    factsConfig?: TextFactsConfig;
    items?: TextStackItem[];
    contacts?: TextContact[];
    contactConfig?: TextContactConfig;
    alert?: TextAlert;
    alertConfig?: TextAlertConfig;
    checklistItems?: TextChecklistItem[];
    checklistConfig?: TextChecklistConfig;
    callout?: TextCallout;
  }) => {
    const nextFactsConfig = next.factsConfig ?? factsConfig;
    const nextContactConfig = next.contactConfig ?? contactConfig;
    const nextAlertConfig = next.alertConfig ?? alertConfig;
    const nextChecklistConfig = next.checklistConfig ?? checklistConfig;
    const nextCallout = next.callout ?? callout;
    const nextHasRichTextBody =
      variant === "prose" ||
      variant === "card" ||
      (variant === "callout" && nextCallout.bodyEnabled);
    const updated: Record<string, unknown> = {
      ...block.content,
      variant,
      label: next.label ?? label,
      facts: next.facts ?? facts,
      facts_style: next.factsStyle ?? factsStyle,
      facts_config: {
        icon_size: nextFactsConfig.iconSize,
        accent_role: nextFactsConfig.accentRole,
        accent_color: nextFactsConfig.accentColor || undefined,
      },
      items: next.items ?? items,
      contacts: next.contacts ?? contacts,
      contacts_style: nextContactConfig.style,
      contacts_config: {
        icon_size: nextContactConfig.iconSize,
        accent_role: nextContactConfig.accentRole,
        accent_color: nextContactConfig.accentColor || undefined,
      },
      alert: next.alert ?? alert,
      alert_style: nextAlertConfig.style,
      alert_config: {
        icon_size: nextAlertConfig.iconSize,
        accent_role: nextAlertConfig.accentRole,
        accent_color: nextAlertConfig.accentColor || undefined,
      },
      checklist_items: next.checklistItems ?? checklistItems,
      checklist: {
        style: nextChecklistConfig.style,
        icon: nextChecklistConfig.icon,
        icon_size: nextChecklistConfig.iconSize,
        label_enabled: nextChecklistConfig.labelEnabled,
        heading_enabled: nextChecklistConfig.headingEnabled,
        heading: nextChecklistConfig.heading,
        accent_role: nextChecklistConfig.accentRole,
        number_font: nextChecklistConfig.numberFont,
        accent_color: nextChecklistConfig.accentColor || undefined,
      },
      callout: {
        eyebrow: nextCallout.eyebrow,
        icon: nextCallout.icon,
        title: nextCallout.title,
        subtitle: nextCallout.subtitle,
        action_label: nextCallout.actionLabel,
        action_href: nextCallout.actionHref,
        cta_enabled: nextCallout.ctaEnabled,
        card_style: nextCallout.cardStyle,
        body_enabled: nextCallout.bodyEnabled,
        icon_size: nextCallout.iconSize,
        mobile_stack: nextCallout.mobileStack,
        accent_role: nextCallout.accentRole,
        accent_color: nextCallout.accentColor || undefined,
        style_id: nextCallout.styleId,
        style_customized: nextCallout.styleCustomized,
      },
    };

    if (nextHasRichTextBody) {
      updated.html = next.html ?? html;
    } else {
      delete updated.html;
    }

    onChange(updated);
  };

  const calloutWithVisibleDefaults = (nextCallout: TextCallout) => {
    let prepared = nextCallout;
    if (nextCallout.ctaEnabled) {
      prepared = {
        ...prepared,
        actionLabel: prepared.actionLabel.trim()
          ? prepared.actionLabel
          : DEFAULT_CALLOUT_ACTION_LABEL,
        actionHref: prepared.actionHref.trim()
          ? prepared.actionHref
          : DEFAULT_CALLOUT_ACTION_HREF,
      };
    }
    return prepared;
  };

  const patchCalloutStyle = (
    next: Partial<CalloutStylePresetContent>,
    options?: { html?: string }
  ) => {
    const nextCallout = calloutWithVisibleDefaults({
      ...callout,
      ...next,
      styleId: "",
      styleCustomized: true,
    });
    patch({
      callout: nextCallout,
      html:
        options?.html ??
        (nextCallout.bodyEnabled ? htmlWithDefaultCalloutBody(html) : html),
    });
  };

  const saveCurrentCalloutStyle = () => {
    const name = calloutPresetName.trim();
    if (!name) {
      toast.error("Name this info card style first.");
      return;
    }
    const nextPreset: CalloutStylePreset = {
      id: randomUUID(),
      name,
      content: sanitizeCalloutStyleContent(currentCalloutStyleContent),
    };
    const nextStyles = [...savedCalloutStyles, nextPreset];
    updateGuidebookSettings({
      [CALLOUT_STYLE_SETTINGS_KEY]: nextStyles,
      ...(saveCalloutAsGuideDefault
        ? { [CALLOUT_STYLE_DEFAULT_KEY]: nextPreset.id }
        : {}),
    });
    setCalloutPresetName("");
    setSaveCalloutAsGuideDefault(false);
    toast.success(
      saveCalloutAsGuideDefault
        ? "Info card style saved and set as the guide default."
        : "Info card style saved."
    );
  };

  const applyCalloutStyle = (preset: CalloutStylePreset) => {
    const styleContent = sanitizeCalloutStyleContent(preset.content);
    const nextCallout = calloutWithVisibleDefaults({
      ...callout,
      ...styleContent,
      styleId: preset.id,
      styleCustomized: false,
    });
    patch({
      callout: nextCallout,
      html: nextCallout.bodyEnabled ? htmlWithDefaultCalloutBody(html) : html,
    });
    toast.success(`Applied ${preset.name}.`);
  };

  const toggleCalloutPresetDefault = (
    preset: CalloutStylePreset,
    checked: boolean
  ) => {
    updateGuidebookSettings({
      [CALLOUT_STYLE_DEFAULT_KEY]: checked ? preset.id : null,
    });
    toast.success(
      checked
        ? `${preset.name} is now the guide default.`
        : "Guide default info card style cleared."
    );
  };

  const deleteCalloutStyle = (preset: CalloutStylePreset) => {
    const settingsPatch: Record<string, unknown> = {
      [CALLOUT_STYLE_SETTINGS_KEY]: savedCalloutStyles.filter(
        (item) => item.id !== preset.id
      ),
    };
    if (defaultCalloutStyleId === preset.id) {
      settingsPatch[CALLOUT_STYLE_DEFAULT_KEY] = null;
    }
    updateGuidebookSettings(settingsPatch);
    toast.success(`${preset.name} deleted.`);
  };

  const moveFact = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= facts.length) return;
    const next = [...facts];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    patch({ facts: next });
  };

  const uploadFactImage = async (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    setUploadingFactIndex(index);
    setFactUploadProgress((current) => ({ ...current, [index]: 1 }));

    try {
      const result = await uploadMediaFile(file, {
        onProgress: (progress) =>
          setFactUploadProgress((current) => ({
            ...current,
            [index]: progress,
          })),
      });
      const next = [...facts];
      if (!next[index]) return;
      next[index] = { ...next[index], image_url: result.url };
      patch({ facts: next });
      toast.success("Image uploaded to Media");
    } catch (err) {
      toast.error("Couldn't upload image", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploadingFactIndex(null);
      window.setTimeout(() => {
        setFactUploadProgress((current) => {
          const next = { ...current };
          delete next[index];
          return next;
        });
      }, 400);
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    patch({ items: next });
  };

  const moveContact = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= contacts.length) return;
    const next = [...contacts];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    patch({ contacts: next });
  };

  const moveChecklistItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= checklistItems.length) return;
    const next = [...checklistItems];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;
    patch({ checklistItems: next });
  };

  return (
    <div className="space-y-3">
      {variant === "card" ? (
        <PromptedInput
          label="Card Label"
          value={label}
          onChange={(v) => patch({ label: v })}
          placeholder="Optional label"
        />
      ) : null}

      {variant === "callout" ? (
        <div className="editor-section">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Card Style</Label>
              <Select
                value={callout.cardStyle}
                onValueChange={(value) => {
                  const cardStyle = coerceCalloutCardStyle(value);
                  patchCalloutStyle({
                    cardStyle,
                    ...(cardStyle === "simple"
                      ? { icon: "", iconSize: 1 }
                      : {}),
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CALLOUT_CARD_STYLES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {callout.cardStyle !== "simple" ? (
              <div className="grid gap-1.5">
                <Label>Icon</Label>
                <IconifyPicker
                  value={callout.icon}
                  onChange={(icon) => patchCalloutStyle({ icon })}
                  ariaLabel="Select info card icon"
                  triggerClassName="h-12 w-12 rounded-md border border-border/70 text-foreground"
                  iconClassName="text-2xl"
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/25 px-2.5 py-2">
              <Label htmlFor={`callout-body-${block.id}`}>Body</Label>
              <Switch
                id={`callout-body-${block.id}`}
                checked={callout.bodyEnabled}
                onCheckedChange={(checked) =>
                  patchCalloutStyle(
                    {
                      bodyEnabled: checked,
                    },
                    {
                      html: checked ? htmlWithDefaultCalloutBody(html) : "",
                    }
                  )
                }
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/25 px-2.5 py-2">
              <Label htmlFor={`callout-cta-${block.id}`}>CTA</Label>
              <Switch
                id={`callout-cta-${block.id}`}
                checked={callout.ctaEnabled}
                onCheckedChange={(checked) =>
                  patchCalloutStyle({
                    ctaEnabled: checked,
                  })
                }
                size="sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/25 px-2.5 py-2">
              <Label htmlFor={`callout-mobile-stack-${block.id}`}>
                Stack on mobile
              </Label>
              <Switch
                id={`callout-mobile-stack-${block.id}`}
                checked={callout.mobileStack}
                onCheckedChange={(checked) =>
                  patchCalloutStyle({
                    mobileStack: checked,
                  })
                }
                size="sm"
              />
            </div>
          </div>

          {callout.cardStyle !== "simple" ? (
            <PremiumSlider
              label="Guidebook Icon Size"
              value={callout.iconSize}
              min={0.75}
              max={2}
              step={0.05}
              onChange={(value) =>
                patchCalloutStyle({
                  iconSize: coerceCalloutIconSize(value),
                })
              }
              format={(value) => `${Math.round(value * 100)}%`}
              marks={[
                { value: 0.75, label: "Small" },
                { value: 1, label: "Default" },
                { value: 2, label: "Large" },
              ]}
            />
          ) : null}

          <div className="grid gap-2 rounded-md border border-border/55 bg-background/70 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <BookmarkPlus className="h-3.5 w-3.5 text-primary" aria-hidden />
                <p className="text-[12px] font-medium leading-tight text-foreground">
                  Saved info card styles
                </p>
              </div>
              {activeCalloutPreset ? (
                <span className="inline-flex max-w-[9rem] items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {usingCalloutGuideDefault ? (
                    <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                  ) : (
                    <Check className="h-3 w-3 shrink-0" aria-hidden />
                  )}
                  <span className="truncate">
                    {usingCalloutGuideDefault ? "Default" : "In use"}
                  </span>
                </span>
              ) : null}
            </div>

            {activeCalloutPreset ? (
              <p className="truncate text-[11px] leading-snug text-muted-foreground">
                {usingCalloutGuideDefault ? "Using guide default: " : "Using: "}
                <span className="font-medium text-foreground">
                  {activeCalloutPreset.name}
                </span>
              </p>
            ) : null}

            <div className="grid gap-1.5">
              <Input
                value={calloutPresetName}
                onChange={(event) => setCalloutPresetName(event.target.value)}
                placeholder="Style name"
                className="h-8 text-xs"
              />
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <label className="flex min-w-0 items-center gap-2 rounded-md bg-muted/25 px-2.5 py-2 text-[11px] leading-snug text-muted-foreground">
                  <Switch
                    checked={saveCalloutAsGuideDefault}
                    onCheckedChange={setSaveCalloutAsGuideDefault}
                    size="sm"
                  />
                  <span className="min-w-0">Set as guide default when saved</span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={saveCurrentCalloutStyle}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save style
                </Button>
              </div>
            </div>

            {savedCalloutStyles.length > 0 ? (
              <div className="grid gap-1.5">
                {savedCalloutStyles.map((preset) => {
                  const isDefault = preset.id === defaultCalloutStyleId;
                  const isActive = activeCalloutPreset?.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className="grid gap-2 rounded-md border border-border/55 bg-background px-2.5 py-2"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <p className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                          {preset.name}
                        </p>
                        {isActive ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            In use
                          </span>
                        ) : null}
                        {isDefault ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-w-0 flex-1 sm:flex-none"
                          onClick={() => applyCalloutStyle(preset)}
                        >
                          Apply
                        </Button>
                        <Button
                          type="button"
                          variant={isDefault ? "secondary" : "ghost"}
                          size="sm"
                          className="min-w-0 flex-1 sm:flex-none"
                          onClick={() =>
                            toggleCalloutPresetDefault(preset, !isDefault)
                          }
                        >
                          {isDefault ? "Default" : "Make default"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                          onClick={() => deleteCalloutStyle(preset)}
                          aria-label={`Delete ${preset.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] leading-snug text-muted-foreground">
                Save an info card look here, then reuse it in other sections.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <BlockColorControls
              label="Element Color"
              role={callout.accentRole}
              customColor={callout.accentColor}
              options={CALLOUT_COLOR_ROLES}
              onChange={({ role, customColor }) =>
                patchCalloutStyle({
                  accentRole: role,
                  accentColor: customColor,
                })
              }
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <PromptedInput
              label="Eyebrow"
              value={callout.eyebrow}
              onChange={(v) => patch({ callout: { ...callout, eyebrow: v } })}
              placeholder="Details"
            />
            <PromptedInput
              label="Title"
              value={callout.title}
              onChange={(v) => patch({ callout: { ...callout, title: v } })}
              placeholder="Helpful tip"
            />
            <PromptedInput
              label="Subtitle"
              value={callout.subtitle}
              onChange={(v) => patch({ callout: { ...callout, subtitle: v } })}
              placeholder="One line context"
            />
          </div>

          {callout.ctaEnabled ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <PromptedInput
                label="Action Label"
                value={callout.actionLabel}
                onChange={(v) =>
                  patch({ callout: { ...callout, actionLabel: v } })
                }
                placeholder="Optional button text"
              />
              <PromptedInput
                label="Action Link"
                value={callout.actionHref}
                onChange={(v) =>
                  patch({ callout: { ...callout, actionHref: v } })
                }
                placeholder="https://... or tel:..."
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {variant === "checklist" ? (
        <div className="editor-section">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2 rounded-md bg-muted/25 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`checklist-label-enabled-${block.id}`}>
                  Label
                </Label>
                <Switch
                  id={`checklist-label-enabled-${block.id}`}
                  checked={checklistConfig.labelEnabled}
                  onCheckedChange={(checked) =>
                    patch({
                      checklistConfig: {
                        ...checklistConfig,
                        labelEnabled: checked,
                      },
                    })
                  }
                  size="sm"
                />
              </div>
              {checklistConfig.labelEnabled ? (
                <PromptedInput
                  label="Label Text"
                  value={label}
                  onChange={(v) => patch({ label: v })}
                  placeholder="List"
                />
              ) : null}
            </div>

            <div className="grid gap-2 rounded-md bg-muted/25 p-2.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`checklist-heading-enabled-${block.id}`}>
                  Heading
                </Label>
                <Switch
                  id={`checklist-heading-enabled-${block.id}`}
                  checked={checklistConfig.headingEnabled}
                  onCheckedChange={(checked) =>
                    patch({
                      checklistConfig: {
                        ...checklistConfig,
                        headingEnabled: checked,
                      },
                    })
                  }
                  size="sm"
                />
              </div>
              {checklistConfig.headingEnabled ? (
                <PromptedInput
                  label="Heading Text"
                  value={checklistConfig.heading}
                  onChange={(v) =>
                    patch({
                      checklistConfig: {
                        ...checklistConfig,
                        heading: v,
                      },
                    })
                  }
                  placeholder="Checkout checklist"
                />
              ) : null}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>List Style</Label>
              <Select
                value={checklistConfig.style}
                onValueChange={(value) =>
                  patch({
                    checklistConfig: {
                      ...checklistConfig,
                      style: coerceChecklistStyle(value),
                    },
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHECKLIST_STYLES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {checklistStyleNeedsIcon(checklistConfig.style) ? (
              <PremiumSlider
                label="Icon Size"
                value={checklistConfig.iconSize}
                min={0.7}
                max={2}
                step={0.05}
                onChange={(value) =>
                  patch({
                    checklistConfig: {
                      ...checklistConfig,
                      iconSize: coerceChecklistIconSize(value),
                    },
                  })
                }
                format={(value) => `${Math.round(value * 100)}%`}
                marks={[
                  { value: 0.7, label: "Small" },
                  { value: 1, label: "Default" },
                  { value: 2, label: "Large" },
                ]}
              />
            ) : null}
          </div>

          <div className="grid gap-2">
            <BlockColorControls
              label="Element Color"
              role={checklistConfig.accentRole}
              customColor={checklistConfig.accentColor}
              options={CALLOUT_COLOR_ROLES}
              onChange={({ role, customColor }) =>
                patch({
                  checklistConfig: {
                    ...checklistConfig,
                    accentRole: role,
                    accentColor: customColor,
                  },
                })
              }
            />
          </div>

          {checklistConfig.style === "watermark_numbers" ? (
            <div className="grid gap-1.5">
              <Label>Watermark Number Font</Label>
              <Select
                value={checklistConfig.numberFont}
                onValueChange={(value) =>
                  patch({
                    checklistConfig: {
                      ...checklistConfig,
                      numberFont: coerceChecklistNumberFont(value),
                    },
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="playfair">Playfair Display</SelectItem>
                  <SelectItem value="theme">Guidebook heading font</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="editor-section-header">
            <Label>Items</Label>
            <Button
              type="button"
              size="sm"
              className="editor-cta"
              onClick={() =>
                patch({
                  checklistItems: [
                    ...checklistItems,
                    {
                      icon: checklistStyleNeedsIcon(checklistConfig.style)
                        ? checklistConfig.icon || "ph:sparkle-fill"
                        : "",
                      text: "New list item",
                      note: "",
                    },
                  ],
                })
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add item
            </Button>
          </div>

          {checklistItems.length === 0 ? (
            <div className="editor-empty">
              Add list items.
            </div>
          ) : (
            <div className="editor-list editor-list--checklist">
              {checklistItems.map((item, index) => (
                <div
                  key={`${block.id}-checklist-${index}`}
                  className="editor-list-item editor-list-item--checklist"
                >
                  <div
                    className={
                      checklistStyleNeedsIcon(checklistConfig.style)
                        ? "editor-item-toolbar editor-item-toolbar--split"
                        : "editor-item-toolbar"
                    }
                  >
                    {checklistStyleNeedsIcon(checklistConfig.style) ? (
                      <IconifyPicker
                        value={item.icon || checklistConfig.icon}
                        onChange={(icon) => {
                          const next = [...checklistItems];
                          next[index] = { ...item, icon };
                          patch({ checklistItems: next });
                        }}
                        ariaLabel="Select list item icon"
                        triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
                        iconClassName="text-lg"
                      />
                    ) : null}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => moveChecklistItem(index, -1)}
                        disabled={index === 0}
                        aria-label="Move list item up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => moveChecklistItem(index, 1)}
                        disabled={index === checklistItems.length - 1}
                        aria-label="Move list item down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          patch({
                            checklistItems: checklistItems.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                          })
                        }
                        aria-label="Remove list item"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="editor-checklist-fields">
                    <PromptedInput
                      label="Item"
                      value={item.text}
                      onChange={(v) => {
                        const next = [...checklistItems];
                        next[index] = { ...item, text: v };
                        patch({ checklistItems: next });
                      }}
                      placeholder="Take out trash before checkout"
                    />
                    <PromptedTextarea
                      label="Note"
                      value={item.note}
                      onChange={(v) => {
                        const next = [...checklistItems];
                        next[index] = { ...item, note: v };
                        patch({ checklistItems: next });
                      }}
                      placeholder="Optional extra detail"
                      rows={1}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {variant === "facts" ? (
        <div className="editor-section">
          <div className="grid gap-1.5">
            <Label>Card Style</Label>
            <Select
              value={factsStyle}
              onValueChange={(value) =>
                patch({ factsStyle: coerceFactsGridStyle(value) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FACTS_GRID_STYLES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <BlockColorControls
              label="Element Color"
              role={factsConfig.accentRole}
              customColor={factsConfig.accentColor}
              options={CALLOUT_COLOR_ROLES}
              onChange={({ role, customColor }) =>
                patch({
                  factsConfig: {
                    ...factsConfig,
                    accentRole: role,
                    accentColor: customColor,
                  },
                })
              }
            />
          </div>

          {factsStyleNeedsIcon(factsStyle) ? (
            <PremiumSlider
              label="Icon Size"
              value={factsConfig.iconSize}
              min={0.7}
              max={2}
              step={0.05}
              onChange={(value) =>
                patch({
                  factsConfig: {
                    ...factsConfig,
                    iconSize: coerceFactsIconSize(value),
                  },
                })
              }
              format={(value) => `${Math.round(value * 100)}%`}
              marks={[
                { value: 0.7, label: "Small" },
                { value: 1, label: "Default" },
                { value: 2, label: "Large" },
              ]}
            />
          ) : null}

          <div className="editor-section-header">
            <Label>Facts</Label>
            <Button
              type="button"
              size="sm"
              className="editor-cta"
              onClick={() =>
                patch({
                  facts: [
                    ...facts,
                    {
                      label: "Label",
                      value: "Value",
                      note: "",
                      icon: factsStyleNeedsIcon(factsStyle)
                        ? "ph:info-fill"
                        : "",
                      image_url: "",
                      badge: "",
                    },
                  ],
                })
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add fact
            </Button>
          </div>

          {facts.length === 0 ? (
            <div className="editor-empty">
              Add facts like times, key metrics, or quick highlights.
            </div>
          ) : (
            <div className="editor-list">
              {facts.map((fact, index) => (
                <div key={`${block.id}-fact-${index}`} className="editor-list-item">
                  <div
                    className={
                      factsStyleNeedsIcon(factsStyle)
                        ? "editor-item-toolbar editor-item-toolbar--split"
                        : "editor-item-toolbar"
                    }
                  >
                    {factsStyleNeedsIcon(factsStyle) ? (
                      <IconifyPicker
                        value={fact.icon}
                        onChange={(icon) => {
                          const next = [...facts];
                          next[index] = { ...fact, icon };
                          patch({ facts: next });
                        }}
                        ariaLabel="Select fact icon"
                        triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
                        iconClassName="text-lg"
                      />
                    ) : null}
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => moveFact(index, -1)}
                        disabled={index === 0}
                        aria-label="Move fact up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => moveFact(index, 1)}
                        disabled={index === facts.length - 1}
                        aria-label="Move fact down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          patch({
                            facts: facts.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                        aria-label="Remove fact"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <PromptedInput
                      label="Label"
                      value={fact.label}
                      onChange={(v) => {
                        const next = [...facts];
                        next[index] = { ...fact, label: v };
                        patch({ facts: next });
                      }}
                      placeholder="Check-in"
                    />
                    <PromptedInput
                      label="Value"
                      value={fact.value}
                      onChange={(v) => {
                        const next = [...facts];
                        next[index] = { ...fact, value: v };
                        patch({ facts: next });
                      }}
                      placeholder="4:00 PM"
                    />
                  </div>
                  {factsStyleNeedsBadge(factsStyle) ||
                  factsStyleNeedsImage(factsStyle) ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {factsStyleNeedsBadge(factsStyle) ? (
                        <PromptedInput
                          label="Badge"
                          value={fact.badge}
                          onChange={(v) => {
                            const next = [...facts];
                            next[index] = { ...fact, badge: v };
                            patch({ facts: next });
                          }}
                          placeholder="Contact"
                        />
                      ) : null}
                      {factsStyleNeedsImage(factsStyle) ? (
                        <div className="grid gap-1.5">
                          <input
                            ref={(node) => {
                              factImageRefs.current[index] = node;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void uploadFactImage(index, file);
                              }
                              event.currentTarget.value = "";
                            }}
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="editor-cta"
                              disabled={uploadingFactIndex === index}
                              onClick={() => factImageRefs.current[index]?.click()}
                            >
                              {uploadingFactIndex === index ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="mr-1.5 h-3.5 w-3.5" />
                              )}
                              {uploadingFactIndex === index
                                ? "Uploading..."
                                : "Upload image"}
                            </Button>
                            <AssetsHubPickerButton
                              assetType="media"
                              label="Use Assets Hub media"
                              onSelect={(asset) => {
                                const url = getMediaAssetUrl(asset);
                                if (!url) {
                                  toast.error("Saved media is missing a URL.");
                                  return;
                                }
                                const next = [...facts];
                                next[index] = { ...fact, image_url: url };
                                patch({ facts: next });
                                toast.success("Saved media applied");
                              }}
                            />
                            {fact.image_url ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const next = [...facts];
                                  next[index] = { ...fact, image_url: "" };
                                  patch({ facts: next });
                                }}
                              >
                                Remove image
                              </Button>
                            ) : null}
                          </div>
                          {factUploadProgress[index] ? (
                            <div className="space-y-1">
                              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${factUploadProgress[index]}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Saving to Media... {factUploadProgress[index]}%
                              </p>
                            </div>
                          ) : null}
                          <PromptedInput
                            label="Image URL"
                            value={fact.image_url}
                            onChange={(v) => {
                              const next = [...facts];
                              next[index] = { ...fact, image_url: v };
                              patch({ facts: next });
                            }}
                            placeholder="https://..."
                            type="url"
                            inputMode="url"
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-2">
                    <PromptedTextarea
                      label="Note"
                      value={fact.note}
                      onChange={(v) => {
                        const next = [...facts];
                        next[index] = { ...fact, note: v };
                        patch({ facts: next });
                      }}
                      placeholder="Optional short note"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {variant === "stack" ? (
        <div className="editor-section">
          <div className="editor-section-header">
            <Label>Items</Label>
            <Button
              type="button"
              size="sm"
              className="editor-cta"
              onClick={() =>
                patch({
                  items: [
                    ...items,
                    {
                      icon: "",
                      title: "Item title",
                      description: "",
                    },
                  ],
                })
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add item
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="editor-empty">
              Add rows with icon, title, and description.
            </div>
          ) : (
            <div className="editor-list">
              {items.map((item, index) => (
                <div key={`${block.id}-stack-${index}`} className="editor-list-item">
                  <div className="editor-item-toolbar editor-item-toolbar--split">
                    <IconifyPicker
                      value={item.icon}
                      onChange={(icon) => {
                        const next = [...items];
                        next[index] = { ...item, icon };
                        patch({ items: next });
                      }}
                      ariaLabel="Select item icon"
                      triggerClassName="h-8 w-8 rounded-md border border-border/70 text-foreground"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0}
                        aria-label="Move item up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => moveItem(index, 1)}
                        disabled={index === items.length - 1}
                        aria-label="Move item down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() =>
                          patch({
                            items: items.filter((_, itemIndex) => itemIndex !== index),
                          })
                        }
                        aria-label="Remove item"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <PromptedInput
                      label="Title"
                      value={item.title}
                      onChange={(v) => {
                        const next = [...items];
                        next[index] = { ...item, title: v };
                        patch({ items: next });
                      }}
                      placeholder="Title"
                    />
                    <PromptedTextarea
                      label="Description"
                      value={item.description}
                      onChange={(v) => {
                        const next = [...items];
                        next[index] = { ...item, description: v };
                        patch({ items: next });
                      }}
                      placeholder="Supporting details"
                      rows={3}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {variant === "contacts" ? (
        <div className="editor-section">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Contact Style</Label>
              <Select
                value={contactConfig.style}
                onValueChange={(value) =>
                  patch({
                    contactConfig: {
                      ...contactConfig,
                      style: coerceContactRowsStyle(value),
                    },
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_ROW_STYLES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <PremiumSlider
              label="Icon Size"
              value={contactConfig.iconSize}
              min={0.7}
              max={2}
              step={0.05}
              onChange={(value) =>
                patch({
                  contactConfig: {
                    ...contactConfig,
                    iconSize: coerceDecorIconSize(value),
                  },
                })
              }
              format={(value) => `${Math.round(value * 100)}%`}
              marks={[
                { value: 0.7, label: "Small" },
                { value: 1, label: "Default" },
                { value: 2, label: "Large" },
              ]}
            />
          </div>

          <div className="grid gap-2">
            <BlockColorControls
              label="Element Color"
              role={contactConfig.accentRole}
              customColor={contactConfig.accentColor}
              options={CALLOUT_COLOR_ROLES}
              onChange={({ role, customColor }) =>
                patch({
                  contactConfig: {
                    ...contactConfig,
                    accentRole: role,
                    accentColor: customColor,
                  },
                })
              }
            />
          </div>

          <div className="editor-section-header">
            <Label>Contacts</Label>
            <Button
              type="button"
              size="sm"
              className="editor-cta"
              onClick={() =>
                patch({
                  contacts: [
                    ...contacts,
                    {
                      icon: "",
                      label: "Contact",
                      value: "Add value",
                      href: "",
                    },
                  ],
                })
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add contact
            </Button>
          </div>

          {contacts.length === 0 ? (
            <div className="editor-empty">
              Add contact rows for phone, email, links, or support channels.
            </div>
          ) : (
            <div className="editor-list">
              {contacts.map((contact, index) => (
                <div key={`${block.id}-contact-${index}`} className="editor-list-item">
                  <div className="editor-item-toolbar editor-item-toolbar--split">
                    <IconifyPicker
                      value={contact.icon}
                      onChange={(icon) => {
                        const next = [...contacts];
                        next[index] = { ...contact, icon };
                        patch({ contacts: next });
                      }}
                      ariaLabel="Select contact icon"
                      triggerClassName="h-8 w-8 rounded-md border border-border/70 text-foreground"
                    />
                    <div className="flex items-center gap-1">
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
                        disabled={index === contacts.length - 1}
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
                            contacts: contacts.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                          })
                        }
                        aria-label="Remove contact"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <PromptedInput
                      label="Label"
                      value={contact.label}
                      onChange={(v) => {
                        const next = [...contacts];
                        next[index] = { ...contact, label: v };
                        patch({ contacts: next });
                      }}
                      placeholder="Host phone"
                    />
                    <PromptedInput
                      label="Value"
                      value={contact.value}
                      onChange={(v) => {
                        const next = [...contacts];
                        next[index] = { ...contact, value: v };
                        patch({ contacts: next });
                      }}
                      placeholder="+1 234 567 8901"
                    />
                  </div>

                  <div className="mt-2">
                    <PromptedInput
                      label="Link Override (Optional)"
                      value={contact.href}
                      onChange={(v) => {
                        const next = [...contacts];
                        next[index] = { ...contact, href: v };
                        patch({ contacts: next });
                      }}
                      placeholder="tel:+123456789 or mailto:host@example.com"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {variant === "alert" ? (
        <div className="editor-section">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Banner Style</Label>
              <Select
                value={alertConfig.style}
                onValueChange={(value) =>
                  patch({
                    alertConfig: {
                      ...alertConfig,
                      style: coerceAlertBannerStyle(value),
                    },
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALERT_BANNER_STYLES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <PremiumSlider
              label="Icon Size"
              value={alertConfig.iconSize}
              min={0.7}
              max={2}
              step={0.05}
              onChange={(value) =>
                patch({
                  alertConfig: {
                    ...alertConfig,
                    iconSize: coerceDecorIconSize(value),
                  },
                })
              }
              format={(value) => `${Math.round(value * 100)}%`}
              marks={[
                { value: 0.7, label: "Small" },
                { value: 1, label: "Default" },
                { value: 2, label: "Large" },
              ]}
            />
          </div>

          <div className="grid gap-2">
            <BlockColorControls
              label="Element Color"
              role={alertConfig.accentRole}
              customColor={alertConfig.accentColor}
              options={CALLOUT_COLOR_ROLES}
              onChange={({ role, customColor }) =>
                patch({
                  alertConfig: {
                    ...alertConfig,
                    accentRole: role,
                    accentColor: customColor,
                  },
                })
              }
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <PromptedInput
              label="Label"
              value={alert.label}
              onChange={(v) => patch({ alert: { ...alert, label: v } })}
              placeholder="Emergency"
            />
            <PromptedInput
              label="Value"
              value={alert.value}
              onChange={(v) => patch({ alert: { ...alert, value: v } })}
              placeholder="911"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Icon</Label>
              <IconifyPicker
                value={alert.icon}
                onChange={(icon) => patch({ alert: { ...alert, icon } })}
                ariaLabel="Select alert icon"
                triggerClassName="h-9 w-9 rounded-md border border-border/70 text-foreground"
              />
            </div>
            <PromptedInput
              label="Link"
              value={alert.href}
              onChange={(v) => patch({ alert: { ...alert, href: v } })}
              placeholder="tel:911 or https://..."
            />
          </div>
        </div>
      ) : null}

      {hasRichTextBody ? (
        <RichTextPanel
          blockId={block.id}
          html={html}
          onHtmlChange={(nextHtml) => patch({ html: nextHtml })}
        />
      ) : null}
    </div>
  );
}
