import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  guidebooks,
  guidebookSections,
  guidebookBlocks,
  guidebookPlaces,
  profiles,
} from "@/lib/db/schema";
import { getCountryEntry } from "@/lib/emergency-numbers";
import { getPhrasebookLanguage, type PhrasebookCategory } from "@/lib/phrasebook";
import {
  buildQuickVariableRenderPayload,
  readQuickVariablesFromSettings,
  resolveQuickVariablesInBlockContent,
  resolveQuickVariablesInString,
} from "@/lib/quick-variables";

type BuildResult = {
  context: string;
  propertyName: string;
  hostFirstName: string;
  userId: string;
};

type Block = typeof guidebookBlocks.$inferSelect;

export async function buildGuidebookContext(
  guidebookId: string
): Promise<BuildResult | null> {
  const gb = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.id, guidebookId),
    with: { property: true },
  });
  if (!gb) return null;

  const [sections, blocks, places, host] = await Promise.all([
    db
      .select()
      .from(guidebookSections)
      .where(eq(guidebookSections.guidebookId, guidebookId))
      .orderBy(asc(guidebookSections.orderIndex)),
    db
      .select()
      .from(guidebookBlocks)
      .where(eq(guidebookBlocks.guidebookId, guidebookId))
      .orderBy(asc(guidebookBlocks.orderIndex)),
    db
      .select()
      .from(guidebookPlaces)
      .where(eq(guidebookPlaces.guidebookId, guidebookId))
      .orderBy(asc(guidebookPlaces.orderIndex)),
    db.query.profiles.findFirst({ where: eq(profiles.id, gb.userId) }),
  ]);

  const hostFirstName =
    (host?.fullName ?? "").split(" ")[0] || "your host";
  const propertyName = gb.property?.name ?? gb.title;
  const city = [gb.property?.city, gb.property?.state].filter(Boolean).join(", ");
  const quickVariables = buildQuickVariableRenderPayload({
    quickVariables: readQuickVariablesFromSettings(gb.settings),
    mode: "live",
    publicMode: true,
    context: {
      guidebookTitle: gb.title,
      propertyName,
      propertyLocation: city,
      hostName: host?.fullName ?? hostFirstName,
      hostPhone: null,
      hostEmail: host?.email ?? null,
      heroData: gb.heroData,
    },
  });

  const lines: string[] = [];
  lines.push(`PROPERTY: ${propertyName}`);
  if (city) lines.push(`CITY: ${city}`);
  lines.push("");

  const blocksBySection = new Map<string, Block[]>();
  for (const b of blocks) {
    if (!blocksBySection.has(b.sectionId)) blocksBySection.set(b.sectionId, []);
    blocksBySection.get(b.sectionId)!.push(b);
  }

  for (const section of sections) {
    if (!section.isVisible) continue;
    const sectionBlocks = blocksBySection.get(section.id) ?? [];
    const serialized = sectionBlocks
      .filter((b) => b.isVisible)
      .map((b) =>
        serializeBlock({
          ...b,
          content: resolveQuickVariablesInBlockContent(
            b.type,
            (b.content ?? {}) as Record<string, unknown>,
            quickVariables
          ),
        })
      )
      .filter((s): s is string => Boolean(s));

    if (serialized.length === 0) continue;

    lines.push(
      `== ${resolveQuickVariablesInString(section.title, quickVariables)} ==`
    );
    lines.push(`section_id: ${section.id}`);
    lines.push(...serialized);
    lines.push("");
  }

  if (places.length > 0) {
    lines.push(`== Local Places ==`);
    for (const p of places) {
      const parts = [resolveQuickVariablesInString(p.name, quickVariables)];
      if (p.category) parts.push(`(${p.category})`);
      lines.push(
        `- ${parts.join(" ")}${
          p.description
            ? ` - ${resolveQuickVariablesInString(
                p.description,
                quickVariables
              )}`
            : ""
        }`
      );
    }
    lines.push("");
  }

  return {
    context: lines.join("\n").trim(),
    propertyName,
    hostFirstName,
    userId: gb.userId,
  };
}

function serializeBlock(block: Block): string | null {
  const c = (block.content ?? {}) as Record<string, unknown>;

  switch (block.type) {
    case "text": {
      const variant = str(c.variant) || "prose";
      if (variant === "facts") {
        const facts = Array.isArray(c.facts)
          ? (c.facts as Array<Record<string, unknown>>)
          : [];
        const lines = facts
          .map((fact) => {
            const label = str(fact.label);
            const value = str(fact.value);
            const note = str(fact.note);
            if (!label && !value && !note) return "";
            const head = `${label || "Fact"}${value ? `: ${value}` : ""}`;
            return note ? `${head} (${note})` : head;
          })
          .filter(Boolean);
        return lines.length > 0 ? lines.map((line) => `- ${line}`).join("\n") : null;
      }

      if (variant === "stack") {
        const items = Array.isArray(c.items)
          ? (c.items as Array<Record<string, unknown>>)
          : [];
        const lines = items
          .map((item) => {
            const title = str(item.title);
            const description = str(item.description);
            if (!title && !description) return "";
            return `${title || "Item"}${description ? `: ${description}` : ""}`;
          })
          .filter(Boolean);
        return lines.length > 0 ? lines.map((line) => `- ${line}`).join("\n") : null;
      }

      if (variant === "contacts") {
        const contacts = Array.isArray(c.contacts)
          ? (c.contacts as Array<Record<string, unknown>>)
          : [];
        const lines = contacts
          .map((contact) => {
            const label = str(contact.label);
            const value = str(contact.value);
            if (!label && !value) return "";
            return `- ${label || "contact"}: ${value}`;
          })
          .filter(Boolean);
        return lines.length > 0 ? lines.join("\n") : null;
      }

      if (variant === "alert") {
        const alert =
          typeof c.alert === "object" && c.alert !== null
            ? (c.alert as Record<string, unknown>)
            : {};
        const label = str(alert.label);
        const value = str(alert.value);
        const parts: string[] = [];
        if (label || value) {
          parts.push(`Alert: ${label || "Important"}${value ? ` - ${value}` : ""}`);
        }
        return parts.length > 0 ? parts.join("\n") : null;
      }

      if (variant === "checklist") {
        const label = str(c.label);
        const items = Array.isArray(c.checklist_items)
          ? (c.checklist_items as Array<Record<string, unknown>>)
          : [];
        const lines = items
          .map((item) => {
            const text = str(item.text);
            const note = str(item.note);
            if (!text && !note) return "";
            return `${text || "Item"}${note ? ` (${note})` : ""}`;
          })
          .filter(Boolean);
        const heading = label ? `${label}:` : "";
        if (lines.length === 0) return heading || null;
        return `${heading}${heading ? "\n" : ""}${lines.map((line) => `- ${line}`).join("\n")}`;
      }

      if (variant === "callout") {
        const callout =
          typeof c.callout === "object" && c.callout !== null
            ? (c.callout as Record<string, unknown>)
            : {};
        const title = str(callout.title);
        const subtitle = str(callout.subtitle);
        const actionLabel = str(callout.action_label);
        const actionEnabled =
          typeof callout.cta_enabled === "boolean"
            ? callout.cta_enabled
            : Boolean(actionLabel);
        const body = str(c.html);
        const bodyEnabled =
          typeof callout.body_enabled === "boolean"
            ? callout.body_enabled
            : Boolean(body);
        const plain = body && bodyEnabled ? stripHtml(body) : "";
        const parts: string[] = [];
        if (title) parts.push(`Callout card: ${title}`);
        if (subtitle) parts.push(subtitle);
        if (actionEnabled && actionLabel) parts.push(`Action: ${actionLabel}`);
        if (plain) parts.push(plain);
        return parts.length > 0 ? parts.join("\n") : null;
      }

      const html = str(c.html);
      if (!html) return null;
      const plain = stripHtml(html);
      return plain;
    }
    case "heading": {
      const text = str(c.text);
      if (!text) return null;
      return text;
    }
    case "icon_grid": {
      const items = Array.isArray(c.items)
        ? (c.items as Array<Record<string, unknown>>)
        : [];
      const lines = items
        .map((item) => {
          const title = str(item.title);
          const description = str(item.description);
          if (!title && !description) return "";
          return `${title || "Item"}${description ? `: ${description}` : ""}`;
        })
        .filter(Boolean);
      return lines.length > 0 ? lines.map((line) => `- ${line}`).join("\n") : null;
    }
    case "image_cards": {
      const cards = Array.isArray(c.cards)
        ? (c.cards as Array<Record<string, unknown>>)
        : [];
      const lines = cards
        .map((card) => {
          const title = str(card.title);
          const description = str(card.description);
          const alt = str(card.alt);
          if (!title && !description && !alt) return "";
          const head = title || alt || "Image card";
          return description ? `${head}: ${description}` : head;
        })
        .filter(Boolean);
      return lines.length > 0 ? lines.map((line) => `- ${line}`).join("\n") : null;
    }
    case "tile_set": {
      const title = str(c.title);
      const tiles = Array.isArray(c.tiles)
        ? (c.tiles as Array<Record<string, unknown>>)
        : [];
      const labels = tiles.map((tile) => str(tile.label)).filter(Boolean);
      if (!title && labels.length === 0) return null;
      return `${title ? `${title}:` : "Tiles:"}${labels.length > 0 ? ` ${labels.join(", ")}` : ""}`;
    }
    case "custom_html": {
      const html = str(c.html);
      if (!html) return null;
      const plain = stripHtml(html);
      return plain || null;
    }
    case "wifi": {
      const name = str(c.network_name);
      const password = str(c.password);
      const notes = str(c.notes);
      const parts: string[] = [];
      if (name) parts.push(`Network: ${name}`);
      parts.push(`Password: ${password || "(none set)"}`);
      if (notes) parts.push(`Notes: ${notes}`);
      return parts.join("\n");
    }
    case "container": {
      const title = str(c.title);
      const subtitle = str(c.subtitle);
      const children = Array.isArray(c.children)
        ? (c.children as Array<Record<string, unknown>>)
        : [];
      const parts = [title ? `Container: ${title}` : "", subtitle].filter(Boolean);
      const childLines = children
        .filter((child) => child.type !== "container")
        .map((child, index) => {
          const childType = str(child.type);
          const childContent =
            typeof child.content === "object" && child.content !== null
              ? (child.content as Record<string, unknown>)
              : {};
          if (!childType) return "";
          return serializeBlock({
            ...block,
            id: str(child.id) || `${block.id}-child-${index}`,
            type: childType,
            content: childContent,
            orderIndex:
              typeof child.orderIndex === "number" ? child.orderIndex : index,
            isVisible:
              typeof child.isVisible === "boolean" ? child.isVisible : true,
          } as Block);
        })
        .filter((line): line is string => Boolean(line));
      parts.push(...childLines);
      return parts.length > 0 ? parts.join("\n") : null;
    }
    case "button": {
      const label = str(c.label);
      const action = str(c.action);
      const value = str(c.value);
      const parts: string[] = [];
      if (label) parts.push(`Button: ${label}`);
      if (action) parts.push(`Action: ${action}`);
      if (value) parts.push(`Target: ${value}`);
      return parts.length > 0 ? parts.join("\n") : null;
    }
    case "booking_link": {
      const label = str(c.label);
      const platform = str(c.platform);
      const url = str(c.url);
      const subtitle = str(c.subtitle);
      const parts: string[] = [];
      if (label) parts.push(`Booking link: ${label}`);
      if (platform) parts.push(`Platform: ${labelize(platform)}`);
      if (url) parts.push(`URL: ${url}`);
      if (subtitle) parts.push(subtitle);
      return parts.length > 0 ? parts.join("\n") : null;
    }
    case "streaming": {
      const services = Array.isArray(c.services)
        ? (c.services as Array<Record<string, unknown>>)
        : [];
      const lines = services
        .map((service) => {
          const name = labelize(str(service.service));
          const loginMode = labelize(str(service.login_mode));
          const instructions = str(service.instructions);
          if (!name && !loginMode && !instructions) return "";
          const details = [
            loginMode ? `login mode: ${loginMode}` : "",
            instructions,
          ].filter(Boolean);
          return `- ${name || "Streaming service"}${details.length > 0 ? `: ${details.join("; ")}` : ""}`;
        })
        .filter(Boolean);
      return lines.length > 0 ? lines.join("\n") : null;
    }
    case "world_clock": {
      const clocks = Array.isArray(c.clocks)
        ? (c.clocks as Array<Record<string, unknown>>)
        : [];
      const lines = clocks
        .map((clock) => {
          const label = str(clock.label);
          const timezone = str(clock.timezone);
          const note = str(clock.note);
          if (!label && !timezone && !note) return "";
          const head = `- ${label || "Clock"}${timezone ? `: ${timezone}` : ""}`;
          return note ? `${head} (${note})` : head;
        })
        .filter(Boolean);
      return lines.length > 0 ? `World clocks:\n${lines.join("\n")}` : null;
    }
    case "smart_lock": {
      const title = str(c.title) || "Door code";
      const rawItems = Array.isArray(c.items)
        ? (c.items as Array<Record<string, unknown>>)
        : [];
      const items =
        rawItems.length > 0
          ? rawItems
          : [
              {
                label: title,
                code: str(c.code),
                reveal_at: str(c.reveal_at),
                instructions: str(c.instructions),
              },
            ];
      const parts: string[] = [`Smart lock: ${title}`];
      for (const item of items) {
        const label = str(item.label) || "Access item";
        const type = str(item.type);
        const code = str(item.code);
        const revealAt = str(item.reveal_at);
        const instructions = str(item.instructions);
        const ready = isReadyToReveal(revealAt);
        const itemParts: string[] = [];
        if (type) itemParts.push(`type: ${labelize(type)}`);
        if (code && ready) itemParts.push(`code: ${code}`);
        if (code && !ready) itemParts.push(`code available after: ${revealAt}`);
        if (instructions && ready) itemParts.push(`instructions: ${instructions}`);
        if (itemParts.length > 0) {
          parts.push(`- ${label}: ${itemParts.join("; ")}`);
        }
      }
      return parts.length > 1 ? parts.join("\n") : null;
    }
    case "emergency_contacts": {
      const country = str(c.country).toUpperCase();
      const entry = country ? getCountryEntry(country) : undefined;
      const custom = Array.isArray(c.custom_contacts)
        ? (c.custom_contacts as Array<Record<string, unknown>>)
        : [];
      const parts: string[] = [];
      if (entry) {
        parts.push(`Emergency numbers (${entry.name}):`);
        for (const [label, value] of Object.entries(entry.numbers)) {
          if (value) parts.push(`- ${labelize(label)}: ${value}`);
        }
      } else if (country) {
        parts.push(`Emergency country: ${country}`);
      }
      for (const contact of custom) {
        const label = str(contact.label);
        const phone = str(contact.phone);
        if (label || phone) parts.push(`- ${label || "Custom contact"}: ${phone}`);
      }
      return parts.length > 0 ? parts.join("\n") : null;
    }
    case "phrasebook": {
      const languageCode = str(c.language);
      const language = languageCode ? getPhrasebookLanguage(languageCode) : undefined;
      const categories = stringArray(c.categories);
      const activeCategories =
        categories.length > 0 ? categories : Object.keys(language?.categories ?? {});
      const parts: string[] = [];
      if (language) {
        parts.push(`Phrasebook: ${language.name} (${language.endonym})`);
      } else if (languageCode) {
        parts.push(`Phrasebook language: ${languageCode}`);
      }
      for (const category of activeCategories) {
        const phrases =
          language?.categories[category as PhrasebookCategory] ?? [];
        if (phrases.length === 0) continue;
        parts.push(`${labelize(category)}:`);
        for (const phrase of phrases) {
          const line = [
            phrase.en,
            phrase.local,
            phrase.pronunciation ? `pronunciation: ${phrase.pronunciation}` : "",
          ].filter(Boolean);
          if (line.length > 0) parts.push(`- ${line.join(" | ")}`);
        }
      }
      const customPhrases = Array.isArray(c.custom_phrases)
        ? (c.custom_phrases as Array<Record<string, unknown>>)
        : [];
      const customLines = customPhrases
        .map((phrase) => {
          const category = str(phrase.category);
          const en = str(phrase.en);
          const local = str(phrase.local);
          const pronunciation = str(phrase.pronunciation);
          const line = [
            category ? `[${category}]` : "",
            en,
            local,
            pronunciation ? `pronunciation: ${pronunciation}` : "",
          ].filter(Boolean);
          return line.length > 0 ? `- ${line.join(" | ")}` : "";
        })
        .filter(Boolean);
      if (customLines.length > 0) {
        parts.push("Custom phrases:");
        parts.push(...customLines);
      }
      return parts.length > 0 ? parts.join("\n") : null;
    }
    case "currency": {
      const base = str(c.base);
      const targets = stringArray(c.targets);
      const defaultAmount =
        typeof c.default_amount === "number" ? c.default_amount : null;
      const parts: string[] = [];
      if (base) parts.push(`Currency base: ${base}`);
      if (targets.length > 0) parts.push(`Targets: ${targets.join(", ")}`);
      if (defaultAmount !== null) parts.push(`Default amount: ${defaultAmount}`);
      return parts.length > 0 ? parts.join("\n") : null;
    }
    case "weather": {
      const location = str(c.location_label);
      const units = str(c.units);
      const forecastDays =
        typeof c.forecast_days === "number" ? c.forecast_days : null;
      const lat = typeof c.lat === "number" ? c.lat : null;
      const lng = typeof c.lng === "number" ? c.lng : null;
      const parts: string[] = [];
      if (location) parts.push(`Weather location: ${location}`);
      if (lat !== null && lng !== null) parts.push(`Coordinates: ${lat}, ${lng}`);
      if (units) parts.push(`Units: ${units}`);
      if (forecastDays !== null) parts.push(`Forecast days: ${forecastDays}`);
      return parts.length > 0 ? parts.join("\n") : null;
    }
    case "faq": {
      const items = Array.isArray(c.items)
        ? (c.items as Array<Record<string, unknown>>)
        : [];
      if (items.length === 0) return null;
      return items
        .map((q) => {
          const question = str(q.question);
          const answer = str(q.answer);
          return `Q: ${question}\nA: ${answer}`;
        })
        .join("\n\n");
    }
    case "video": {
      const title = str(c.title);
      const provider = str(c.provider);
      const url = str(c.url);
      const parts: string[] = [];
      if (title) parts.push(`Video: ${title}`);
      if (provider) parts.push(`Provider: ${provider}`);
      if (url) parts.push(`URL: ${url}`);
      return parts.length > 0 ? parts.join("\n") : null;
    }
    case "gallery": {
      const images = Array.isArray(c.images)
        ? (c.images as Array<Record<string, unknown>>)
        : [];
      const described = images
        .map((img) => str(img.caption) || str(img.alt))
        .filter(Boolean);
      if (described.length === 0) return null;
      return described.map((line) => `- ${line}`).join("\n");
    }
    case "image":
    case "divider":
      return null;
    default:
      return null;
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((item): item is string => typeof item === "string")
    : [];
}

function labelize(value: string): string {
  const text = value.split("_").filter(Boolean).join(" ");
  return text.replace(/^\w/, (m) => m.toUpperCase());
}

function isReadyToReveal(revealAt: string): boolean {
  if (!revealAt) return true;
  const timestamp = new Date(revealAt).getTime();
  if (Number.isNaN(timestamp)) return true;
  return Date.now() >= timestamp;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
