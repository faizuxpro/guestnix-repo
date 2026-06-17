import type { GuidebookSnapshot, SnapshotBlock } from "../snapshot";
import { nearbyCategoryMeta } from "../nearby-categories";
import { normalizeSectionCoverSettings } from "../section-cover";
import { snapWeightToFont, type CustomFont } from "../fonts/catalog";

export type PrintField = {
  label: string;
  value: string;
  icon?: string;
};

export type PrintListItem = {
  title: string;
  detail?: string;
  meta?: string;
  icon?: string;
};

export type PrintImage = {
  url: string;
  alt?: string;
  caption?: string;
};

export type PrintBlock = {
  id: string;
  sourceType: string;
  badge: string;
  tone: "neutral" | "media" | "action" | "success" | "warning" | "danger";
  kind:
    | "heading"
    | "text"
    | "image"
    | "gallery"
    | "wifi"
    | "faq"
    | "link"
    | "list"
    | "contacts"
    | "notice"
    | "divider";
  title?: string;
  subtitle?: string;
  label?: string;
  icon?: string;
  html?: string;
  text?: string;
  url?: string;
  fields: PrintField[];
  items: PrintListItem[];
  images: PrintImage[];
};

export type PrintSection = {
  id: string;
  title: string;
  icon: string;
  coverImageUrl: string | null;
  coverTitle: string;
  coverImagePosition: {
    x: number;
    y: number;
  };
  blocks: PrintBlock[];
};

export type PrintPlace = {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
  categorySoft: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  openingHours: string | null;
};

export type PrintGuidebookDocument = {
  title: string;
  slug: string;
  publicUrl: string;
  publishedAt: string;
  version: number;
  brand: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    headingFont: string;
    bodyFont: string;
    headingWeight: number | null;
    bodyWeight: number | null;
    headingLetterSpacing: number | null;
    bodyLetterSpacing: number | null;
    headingLineHeight: number | null;
    bodyLineHeight: number | null;
    customFonts: CustomFont[];
  };
  property: {
    name: string;
    tagline: string;
    address: string;
    coverImageUrl: string | null;
    logoUrl: string | null;
  };
  host: {
    name: string;
    firstName: string;
    phone: string;
    email: string;
    bio: string;
    languages: string;
    avatarUrl: string | null;
  };
  sections: PrintSection[];
  places: PrintPlace[];
};

type CreatePrintDocumentOptions = {
  publicUrl: string;
};

const DEFAULT_PRIMARY = "#042129";
const DEFAULT_SECONDARY = "#ecfff5";
const DEFAULT_ACCENT = "#6fef8b";
const DEFAULT_BACKGROUND = "#fffdf8";
const DEFAULT_HEADING_FONT = "Fraunces";
const DEFAULT_BODY_FONT = "Montserrat";

const CUSTOM_FONT_FORMATS = new Set(["woff2", "woff", "ttf", "otf"]);

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asPositiveNumber(value: unknown): number | null {
  const number = asNumber(value);
  return number !== null && number > 0 ? number : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
}

function normalizeUrl(value: unknown): string | null {
  const url = asString(value);
  if (!url) return null;
  if (/^(#|\/|\?)/.test(url)) return url;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  if (/^\+?[\d\s().-]{6,}$/.test(url)) {
    return `tel:${url.replace(/\s+/g, "")}`;
  }
  if (/^\S+@\S+\.\S+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

function asCustomFonts(value: unknown): CustomFont[] {
  if (!Array.isArray(value)) return [];

  return value
    .map<CustomFont | null>((item) => {
      const font = asRecord(item);
      const family = asString(font.family);
      const source = asString(font.source);
      if (!family || (source !== "google" && source !== "upload")) return null;

      const format = asString(font.format);
      const weights = Array.isArray(font.weights)
        ? font.weights
            .map((weight) => asNumber(weight))
            .filter((weight): weight is number => weight !== null && weight > 0)
        : undefined;

      const next: CustomFont = {
        family,
        source,
      };
      const url = asString(font.url);
      if (url) next.url = url;
      if (CUSTOM_FONT_FORMATS.has(format)) {
        next.format = format as CustomFont["format"];
      }
      if (weights && weights.length > 0) next.weights = weights;
      if (typeof font.italics === "boolean") next.italics = font.italics;
      return next;
    })
    .filter((font): font is CustomFont => font !== null);
}

function combineAddress(...parts: unknown[]): string {
  return parts.map((part) => asString(part)).filter(Boolean).join(", ");
}

function humanize(value: unknown): string {
  const text = asString(value);
  if (!text) return "";
  return text
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const BLOCK_PRESENTATION: Record<
  string,
  { badge: string; tone: PrintBlock["tone"] }
> = {
  text: { badge: "Note", tone: "neutral" },
  heading: { badge: "Section note", tone: "neutral" },
  image: { badge: "Photo", tone: "media" },
  video: { badge: "Video", tone: "media" },
  gallery: { badge: "Gallery", tone: "media" },
  faq: { badge: "FAQ", tone: "neutral" },
  icon_grid: { badge: "Icon grid", tone: "neutral" },
  image_cards: { badge: "Image cards", tone: "media" },
  tile_set: { badge: "Tile set", tone: "neutral" },
  custom_html: { badge: "HTML", tone: "neutral" },
  divider: { badge: "Divider", tone: "neutral" },
  wifi: { badge: "Wi-Fi", tone: "success" },
  container: { badge: "Group", tone: "neutral" },
  weather: { badge: "Weather", tone: "neutral" },
  world_clock: { badge: "World clock", tone: "neutral" },
  smart_lock: { badge: "Smart lock", tone: "warning" },
  booking_link: { badge: "Booking", tone: "action" },
  currency: { badge: "Currency", tone: "neutral" },
  emergency_contacts: { badge: "Emergency", tone: "danger" },
  phrasebook: { badge: "Phrasebook", tone: "neutral" },
  button: { badge: "Action", tone: "action" },
  streaming: { badge: "Streaming", tone: "neutral" },
};

function makeBlock(
  block: SnapshotBlock,
  kind: PrintBlock["kind"],
  values: Partial<Omit<PrintBlock, "id" | "sourceType" | "kind">> = {}
): PrintBlock {
  const presentation = BLOCK_PRESENTATION[block.type] ?? {
    badge: humanize(block.type) || "Guide",
    tone: "neutral" as const,
  };
  return {
    id: block.id,
    sourceType: block.type,
    badge: presentation.badge,
    tone: presentation.tone,
    kind,
    fields: [],
    items: [],
    images: [],
    ...values,
  };
}

function summarizePrintBlock(block: PrintBlock): PrintListItem | null {
  const fieldSummary = block.fields
    .map((field) =>
      [field.label, field.value].filter(Boolean).join(": ")
    )
    .filter(Boolean)
    .join("; ");
  const itemSummary = block.items
    .slice(0, 4)
    .map((item) =>
      [item.title, item.detail].filter(Boolean).join(": ")
    )
    .filter(Boolean)
    .join("; ");
  const imageSummary =
    block.images.length > 0
      ? `${block.images.length} image${block.images.length === 1 ? "" : "s"}`
      : "";
  const title = block.title || block.label || block.badge;
  const detail =
    block.text ||
    block.subtitle ||
    fieldSummary ||
    itemSummary ||
    imageSummary ||
    undefined;

  return title || detail
    ? {
        title: title || block.badge,
        detail,
        meta: block.badge,
        icon: block.icon,
      }
    : null;
}

function normalizeTextBlock(block: SnapshotBlock): PrintBlock | null {
  const content = asRecord(block.content);
  const variant = asString(content.variant, "prose");
  const label = asString(content.label);
  const html = asString(content.html);

  if (variant === "facts") {
    const fields = Array.isArray(content.facts)
      ? content.facts
          .map((fact) => {
            const row = asRecord(fact);
            return {
              label: asString(row.label),
              value: [asString(row.value), asString(row.note)]
                .filter(Boolean)
                .join(" - "),
            };
          })
          .filter((field) => field.label || field.value)
      : [];
    return fields.length > 0
      ? makeBlock(block, "list", { title: label || "Details", fields })
      : null;
  }

  if (variant === "stack") {
    const items = Array.isArray(content.items)
      ? content.items
          .map((item) => {
            const row = asRecord(item);
            return {
              title: asString(row.title),
              detail: asString(row.description) || undefined,
              icon: asString(row.icon) || undefined,
            };
          })
          .filter((item) => item.title || item.detail)
      : [];
    return items.length > 0
      ? makeBlock(block, "list", { title: label || undefined, items })
      : null;
  }

  if (variant === "contacts") {
    const fields = Array.isArray(content.contacts)
      ? content.contacts
          .map((contact) => {
            const row = asRecord(contact);
            return {
              label: asString(row.label),
              value: asString(row.value),
              icon: asString(row.icon) || undefined,
            };
          })
          .filter((field) => field.label || field.value)
      : [];
    return fields.length > 0
      ? makeBlock(block, "contacts", { title: label || "Contacts", fields })
      : null;
  }

  if (variant === "checklist") {
    const items = Array.isArray(content.checklist_items)
      ? content.checklist_items
          .map((item) => {
            const row = asRecord(item);
            return {
              title: asString(row.text),
              detail: asString(row.note) || undefined,
            };
          })
          .filter((item) => item.title || item.detail)
      : [];
    return items.length > 0
      ? makeBlock(block, "list", {
          title: label || "List",
          items,
        })
      : null;
  }

  if (variant === "callout") {
    const callout = asRecord(content.callout);
    const bodyEnabled =
      typeof callout.body_enabled === "boolean"
        ? callout.body_enabled
        : Boolean(html);
    const actionUrl = normalizeUrl(callout.action_href) ?? undefined;
    const actionText = asString(callout.action_label) || undefined;
    const actionEnabled =
      typeof callout.cta_enabled === "boolean"
        ? callout.cta_enabled
        : Boolean(actionUrl || actionText);
    return makeBlock(block, "notice", {
      title: asString(callout.title) || label || undefined,
      subtitle: asString(callout.subtitle) || undefined,
      icon: asString(callout.icon) || undefined,
      html: bodyEnabled && html ? html : undefined,
      url: actionEnabled ? actionUrl : undefined,
      text: actionEnabled ? actionText : undefined,
    });
  }

  if (variant === "alert") {
    const alert = asRecord(content.alert);
    return makeBlock(block, "notice", {
      title: asString(alert.label) || label || "Important",
      icon: asString(alert.icon) || undefined,
      text: asString(alert.value),
      url: normalizeUrl(alert.href) ?? undefined,
    });
  }

  return html || label
    ? makeBlock(block, "text", { title: label || undefined, html })
    : null;
}

function normalizeBlock(block: SnapshotBlock): PrintBlock | null {
  const content = asRecord(block.content);

  switch (block.type) {
    case "heading":
      return makeBlock(block, "heading", {
        label: asString(content.eyebrow) || undefined,
        title: asString(content.text),
        subtitle: asString(content.subtitle) || undefined,
      });
    case "text":
      return normalizeTextBlock(block);
    case "image": {
      const url = normalizeUrl(content.url);
      return url
        ? makeBlock(block, "image", {
            images: [
              {
                url,
                alt: asString(content.alt) || undefined,
                caption: asString(content.caption) || undefined,
              },
            ],
          })
        : null;
    }
    case "gallery": {
      const images: PrintImage[] = Array.isArray(content.images)
        ? content.images
            .map<PrintImage | null>((image) => {
              const row = asRecord(image);
              const url = normalizeUrl(row.url);
              return url
                ? {
                    url,
                    alt: asString(row.alt) || undefined,
                    caption: asString(row.caption) || undefined,
                  }
                : null;
            })
            .filter((image): image is PrintImage => image !== null)
        : [];
      return images.length > 0 ? makeBlock(block, "gallery", { images }) : null;
    }
    case "wifi": {
      const fields = [
        { label: "Network", value: asString(content.network_name) },
        { label: "Password", value: asString(content.password) },
      ].filter((field) => field.value);
      return fields.length > 0
        ? makeBlock(block, "wifi", {
            title: "Wi-Fi access",
            fields,
            text: asString(content.notes) || undefined,
          })
        : null;
    }
    case "container": {
      const children = Array.isArray(content.children)
        ? content.children.map((child) => asRecord(child))
        : [];
      const items = children
        .filter(
          (child) =>
            asString(child.type) &&
            child.type !== "container" &&
            child.isVisible !== false
        )
        .map((child, index) =>
          normalizeBlock({
            ...block,
            id: asString(child.id) || `${block.id}-child-${index}`,
            type: asString(child.type),
            content: asRecord(child.content),
            orderIndex:
              typeof child.orderIndex === "number" ? child.orderIndex : index,
            isVisible:
              typeof child.isVisible === "boolean" ? child.isVisible : true,
          })
        )
        .filter((child): child is PrintBlock => Boolean(child))
        .map(summarizePrintBlock)
        .filter((item): item is PrintListItem => Boolean(item));
      const title = asString(content.title);
      const subtitle = asString(content.subtitle);
      return title || subtitle || items.length > 0
        ? makeBlock(block, "list", {
            title: title || "Grouped blocks",
            subtitle: subtitle || undefined,
            icon: asString(content.icon) || undefined,
            items,
          })
        : null;
    }
    case "faq": {
      const items = Array.isArray(content.items)
        ? content.items
            .map((item) => {
              const row = asRecord(item);
              return {
                title: asString(row.question),
                detail: asString(row.answer) || undefined,
              };
            })
            .filter((item) => item.title || item.detail)
        : [];
      return items.length > 0
        ? makeBlock(block, "faq", { title: "Questions", items })
        : null;
    }
    case "icon_grid": {
      const items = Array.isArray(content.items)
        ? content.items
            .map((item) => {
              const row = asRecord(item);
              return {
                title: asString(row.title),
                detail: asString(row.description) || undefined,
                icon: asString(row.icon) || undefined,
              };
            })
            .filter((item) => item.title || item.detail)
        : [];
      return items.length > 0
        ? makeBlock(block, "list", { title: "Icon grid", items })
        : null;
    }
    case "image_cards": {
      const cards = Array.isArray(content.cards)
        ? content.cards.map((card) => asRecord(card))
        : [];
      const images: PrintImage[] = cards
        .map<PrintImage | null>((card) => {
          const url = normalizeUrl(card.image_url);
          return url
            ? {
                url,
                alt: asString(card.alt) || asString(card.title) || undefined,
                caption: asString(card.title) || undefined,
              }
            : null;
        })
        .filter((image): image is PrintImage => image !== null);
      const items = cards
        .map((card) => ({
          title: asString(card.title),
          detail: asString(card.description) || undefined,
        }))
        .filter((item) => item.title || item.detail);
      return images.length > 0 || items.length > 0
        ? makeBlock(block, "gallery", {
            title: "Image cards",
            images,
            items,
          })
        : null;
    }
    case "tile_set": {
      const items = Array.isArray(content.tiles)
        ? content.tiles
            .map((tile) => {
              const row = asRecord(tile);
              return {
                title: asString(row.label),
                icon: asString(row.icon) || undefined,
              };
            })
            .filter((item) => item.title)
        : [];
      const title = asString(content.title);
      return title || items.length > 0
        ? makeBlock(block, "list", { title: title || "Tile set", items })
        : null;
    }
    case "custom_html": {
      const html = asString(content.html);
      return html ? makeBlock(block, "text", { title: "HTML code", html }) : null;
    }
    case "video":
      return makeBlock(block, "link", {
        title: asString(content.title) || "Video",
        url: normalizeUrl(content.url) ?? undefined,
      });
    case "button": {
      const action = asString(content.action);
      const value = asString(content.value);
      const url =
        action === "email"
          ? normalizeUrl(`mailto:${value}`)
          : action === "phone"
            ? normalizeUrl(`tel:${value}`)
            : normalizeUrl(value);
      return value
        ? makeBlock(block, "link", {
            title: asString(content.label) || "Link",
            icon: asString(content.icon) || undefined,
            url: url ?? undefined,
          })
        : null;
    }
    case "booking_link":
      return makeBlock(block, "link", {
        title: asString(content.label) || "Booking link",
        subtitle: asString(content.subtitle) || undefined,
        url: normalizeUrl(content.url) ?? undefined,
      });
    case "streaming": {
      const items = Array.isArray(content.services)
        ? content.services
            .map((service) => {
              const row = asRecord(service);
              return {
                title: humanize(row.service),
                detail: [
                  humanize(row.login_mode),
                  asString(row.instructions),
                ]
                  .filter(Boolean)
                  .join(" - "),
              };
            })
            .filter((item) => item.title || item.detail)
        : [];
      return items.length > 0
        ? makeBlock(block, "list", { title: "Streaming", items })
        : null;
    }
    case "smart_lock":
      return makeBlock(block, "notice", {
        title: asString(content.title) || "Smart lock",
        fields: [
          { label: "Code", value: asString(content.code) },
          { label: "Available", value: asString(content.reveal_at) },
        ].filter((field) => field.value),
        text: asString(content.instructions) || undefined,
      });
    case "emergency_contacts": {
      const customServices = Array.isArray(content.custom_services)
        ? content.custom_services
        : [];
      const customContacts = Array.isArray(content.custom_contacts)
        ? content.custom_contacts
        : [];
      const fields = [...customServices, ...customContacts]
        .map((contact) => {
          const row = asRecord(contact);
          return {
            label: asString(row.label),
            value: asString(row.phone),
            icon: asString(row.icon) || undefined,
          };
        })
        .filter((field) => field.label || field.value);
      return fields.length > 0
        ? makeBlock(block, "contacts", {
            title: "Emergency contacts",
            fields,
          })
        : null;
    }
    case "world_clock": {
      const fields = Array.isArray(content.clocks)
        ? content.clocks
            .map((clock) => {
              const row = asRecord(clock);
              return {
                label: asString(row.label),
                value: asString(row.timezone),
              };
            })
            .filter((field) => field.label || field.value)
        : [];
      return fields.length > 0
        ? makeBlock(block, "list", { title: "World clocks", fields })
        : null;
    }
    case "phrasebook": {
      const categories = asStringArray(content.categories).map((category) => ({
        title: humanize(category),
      }));
      return makeBlock(block, "list", {
        title: `Phrasebook${asString(content.language) ? `: ${asString(content.language)}` : ""}`,
        items: categories,
      });
    }
    case "currency":
      return makeBlock(block, "list", {
        title: "Currency",
        fields: [
          { label: "Base", value: asString(content.base) },
          {
            label: "Example amount",
            value:
              asNumber(content.default_amount) !== null
                ? String(asNumber(content.default_amount))
                : "",
          },
          {
            label: "Targets",
            value: asStringArray(content.targets).join(", "),
          },
        ].filter((field) => field.value),
      });
    case "weather":
      return makeBlock(block, "notice", {
        title: "Weather",
        fields: [
          { label: "Location", value: asString(content.location_label) },
          { label: "Units", value: humanize(content.units) },
          {
            label: "Forecast",
            value:
              asNumber(content.forecast_days) !== null
                ? `${asNumber(content.forecast_days)} day${asNumber(content.forecast_days) === 1 ? "" : "s"}`
                : "",
          },
        ].filter((field) => field.value),
      });
    case "divider":
      return makeBlock(block, "divider");
    default:
      return null;
  }
}

export function createPrintDocument(
  snapshot: GuidebookSnapshot,
  options: CreatePrintDocumentOptions
): PrintGuidebookDocument {
  const branding = asRecord(snapshot.guidebook.branding);
  const heroData = asRecord(snapshot.guidebook.heroData);
  const property = asRecord(heroData.property);
  const host = asRecord(heroData.host);
  const visibleSectionIds = new Set(
    snapshot.sections.filter((section) => section.isVisible).map((section) => section.id)
  );
  const blocksBySection = new Map<string, PrintBlock[]>();

  for (const block of snapshot.blocks) {
    if (!block.isVisible || !visibleSectionIds.has(block.sectionId)) continue;
    const printBlock = normalizeBlock(block);
    if (!printBlock) continue;
    const list = blocksBySection.get(block.sectionId) ?? [];
    list.push(printBlock);
    blocksBySection.set(block.sectionId, list);
  }

  const sections = snapshot.sections
    .filter((section) => section.isVisible)
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((section) => {
      const coverSettings = normalizeSectionCoverSettings(
        section.itemSettings,
        snapshot.guidebook.settings
      );
      return {
        id: section.id,
        title: section.title,
        icon: section.icon,
        coverImageUrl: normalizeUrl(coverSettings.image_url),
        coverTitle: coverSettings.title_text.trim(),
        coverImagePosition: coverSettings.image_position,
        blocks: (blocksBySection.get(section.id) ?? []).sort((a, b) => {
          const left =
            snapshot.blocks.find((block) => block.id === a.id)?.orderIndex ?? 0;
          const right =
            snapshot.blocks.find((block) => block.id === b.id)?.orderIndex ?? 0;
          return left - right;
        }),
      };
    })
    .filter((section) => section.blocks.length > 0);

  const customFonts = asCustomFonts(branding.custom_fonts);
  const headingFont =
    asString(branding.heading_font) ||
    asString(branding.font_family) ||
    DEFAULT_HEADING_FONT;
  const bodyFont =
    asString(branding.body_font) ||
    asString(branding.font_family) ||
    DEFAULT_BODY_FONT;
  const headingWeight = asPositiveNumber(branding.heading_weight);
  const bodyWeight = asPositiveNumber(branding.body_weight);

  return {
    title: snapshot.guidebook.title,
    slug: snapshot.guidebook.slug,
    publicUrl: options.publicUrl,
    publishedAt: snapshot.publishedAt,
    version: snapshot.version,
    brand: {
      primaryColor: asString(branding.primary_color, DEFAULT_PRIMARY),
      secondaryColor: asString(branding.secondary_color, DEFAULT_SECONDARY),
      accentColor: asString(branding.accent_color, DEFAULT_ACCENT),
      backgroundColor: asString(branding.background_color, DEFAULT_BACKGROUND),
      headingFont,
      bodyFont,
      headingWeight:
        headingWeight !== null
          ? snapWeightToFont(headingWeight, headingFont, customFonts)
          : null,
      bodyWeight:
        bodyWeight !== null ? snapWeightToFont(bodyWeight, bodyFont, customFonts) : null,
      headingLetterSpacing: asNumber(branding.heading_letter_spacing),
      bodyLetterSpacing: asNumber(branding.body_letter_spacing),
      headingLineHeight: asPositiveNumber(branding.heading_line_height),
      bodyLineHeight: asPositiveNumber(branding.body_line_height),
      customFonts,
    },
    property: {
      name:
        asString(property.name) ||
        snapshot.guidebook.propertyName ||
        snapshot.guidebook.title,
      tagline: asString(property.tagline),
      address: combineAddress(property.address, property.city, property.country),
      coverImageUrl: normalizeUrl(property.cover_image_url),
      logoUrl: normalizeUrl(property.logo_url),
    },
    host: {
      name: asString(host.name) || snapshot.guidebook.hostFirstName,
      firstName: snapshot.guidebook.hostFirstName,
      phone: asString(host.phone),
      email: asString(host.email),
      bio: asString(host.bio),
      languages: asString(host.languages),
      avatarUrl: normalizeUrl(host.avatar_url),
    },
    sections,
    places: snapshot.places.map((place) => {
      const meta = nearbyCategoryMeta(place.category);
      return {
        id: place.id,
        name: place.name,
        category: place.category,
        categoryLabel: meta.label,
        categoryIcon: meta.icon,
        categoryColor: meta.color,
        categorySoft: meta.soft,
        description: place.description,
        address: place.address,
        phone: place.phone,
        website: normalizeUrl(place.website),
        email: normalizeUrl(place.email),
        imageUrl: normalizeUrl(place.imageUrl),
        openingHours: place.openingHours,
      };
    }),
  };
}

export const _internal = { normalizeUrl };
