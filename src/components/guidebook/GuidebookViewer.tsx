"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { SunsetLakehouseTemplate } from "@/templates/sunset-lakehouse/TemplateRoot";
import { ChatWidget } from "@/components/viewer/chat/ChatWidget";
import { RuntimeFontLoader } from "@/components/fonts/RuntimeFontLoader";
import type { CustomFont } from "@/lib/fonts/catalog";
import { extractFontFamiliesFromBlocks } from "@/lib/rich-text-fonts";
import { readNearbySettingsFromGuidebookSettings } from "@/lib/nearby";
import { readLanguagesSettings } from "@/lib/languages";
import { readChatWidgetSettings } from "@/lib/chat-widget-settings";
import {
  extractHeroSplashFontFamilies,
  normalizeHeroData,
} from "@/lib/hero-data";
import { LanguageProvider } from "@/components/guidebook/LanguageContext";
import { GoogleTranslateLoader } from "@/components/guidebook/GoogleTranslateLoader";
import { PwaInstallProvider } from "@/components/guidebook/pwa/PwaInstallProvider";
import { FirstVisitInstallToast } from "@/components/guidebook/pwa/FirstVisitInstallToast";
import { activateHostPreviewModeFromLocation } from "@/lib/analytics/host-preview";
import {
  GUEST_IDENTITY_UPDATED_EVENT,
  readGuestIdentity,
} from "@/lib/guest-identity";
import {
  resolveQuickVariablesInBlockContent,
  resolveQuickVariablesInString,
  resolveQuickVariablesInValue,
  withGuestNameQuickVariable,
  type QuickVariableRenderPayload,
} from "@/lib/quick-variables";
import "@/templates/sunset-lakehouse/google-translate.css";
import type {
  TemplateBlock,
  TemplateGuidebook,
  TemplatePlace,
  TemplateSection,
} from "@/templates/sunset-lakehouse/types";
import type { BottomNavSlot } from "@/types/bottom-nav";
import type { SnapshotStorefront } from "@/lib/store/types";
import {
  PUBLIC_GUIDEBOOK_BASE_PATH,
  type GuidebookPublicBasePath,
} from "@/lib/guidebook-public-url";

const DEMO_GUIDEBOOK_CTA_COPY =
  "This is the exact guidebook your guests will use during their stay. Customize it to match your property and brand.";
const DEMO_GUIDEBOOK_PROMPT_DELAY_MS = 60_000;

type RawBlock = {
  id: string;
  sectionId: string;
  type: string;
  content: unknown;
  orderIndex: number;
  isVisible: boolean;
};

type RawSection = {
  id: string;
  title: string;
  icon: string;
  orderIndex: number;
  isVisible: boolean;
  kind: "guide" | "featured";
  displayMode: "popup" | "full_page" | "inline" | "drawer";
  itemSettings?: Record<string, unknown>;
};

type RawPlace = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  tags: Record<string, unknown> | null;
};

type RawGuidebook = {
  id: string;
  title: string;
  slug: string;
  templateId: string;
  branding: Record<string, unknown>;
  heroData: unknown;
  bottomNav: BottomNavSlot[];
  settings: Record<string, unknown>;
  propertyName: string;
  hostFirstName: string;
};

type Props = {
  guidebook: RawGuidebook;
  sections: RawSection[];
  blocks: RawBlock[];
  places: RawPlace[];
  storefront?: SnapshotStorefront | null;
  quickVariables?: QuickVariableRenderPayload | null;
  publicBasePath?: GuidebookPublicBasePath;
  showDemoBadge?: boolean;
};

export function GuidebookViewer({
  guidebook,
  sections,
  blocks,
  places,
  storefront = null,
  quickVariables = null,
  publicBasePath = PUBLIC_GUIDEBOOK_BASE_PATH,
  showDemoBadge = false,
}: Props) {
  const [hostPreviewActive, setHostPreviewActive] = useState(false);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [demoPromptReadyFor, setDemoPromptReadyFor] = useState<string | null>(
    null
  );
  const [demoPromptDismissedFor, setDemoPromptDismissedFor] = useState<
    string | null
  >(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHostPreviewActive(activateHostPreviewModeFromLocation(guidebook.id));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [guidebook.id]);

  useEffect(() => {
    if (!showDemoBadge) {
      return;
    }

    const timer = window.setTimeout(
      () => setDemoPromptReadyFor(guidebook.id),
      DEMO_GUIDEBOOK_PROMPT_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [showDemoBadge, guidebook.id]);

  useEffect(() => {
    const readName = () =>
      setGuestName(readGuestIdentity(guidebook.slug)?.guestName ?? null);

    readName();
    const handleIdentityUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ slug?: string }>;
      if (!custom.detail?.slug || custom.detail.slug === guidebook.slug) {
        readName();
      }
    };
    window.addEventListener(
      GUEST_IDENTITY_UPDATED_EVENT,
      handleIdentityUpdated
    );
    return () =>
      window.removeEventListener(
        GUEST_IDENTITY_UPDATED_EVENT,
        handleIdentityUpdated
      );
  }, [guidebook.slug]);

  const quickVariablePayload = useMemo(
    () =>
      withGuestNameQuickVariable(
        quickVariables ?? {
          values: {},
          emptyKeys: [],
          blockedKeys: [],
          generatedAt: "",
        },
        guestName
      ),
    [guestName, quickVariables]
  );

  const templateSections = useMemo<TemplateSection[]>(() => {
    const bySection = new Map<string, TemplateBlock[]>();
    for (const b of blocks) {
      if (!bySection.has(b.sectionId)) bySection.set(b.sectionId, []);
      bySection.get(b.sectionId)!.push({
        id: b.id,
        type: b.type,
        content: resolveQuickVariablesInBlockContent(
          b.type,
          (b.content ?? {}) as Record<string, unknown>,
          quickVariablePayload
        ),
        orderIndex: b.orderIndex,
        isVisible: b.isVisible,
      });
    }
    return sections
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((s) => ({
        id: s.id,
        title: resolveQuickVariablesInString(s.title, quickVariablePayload),
        icon: s.icon,
        orderIndex: s.orderIndex,
        isVisible: s.isVisible,
        kind: s.kind,
        displayMode: s.displayMode,
        itemSettings: resolveQuickVariablesInValue(
          s.itemSettings ?? {},
          quickVariablePayload
        ),
        blocks: (bySection.get(s.id) ?? []).sort(
          (a, b) => a.orderIndex - b.orderIndex
        ),
      }));
  }, [blocks, quickVariablePayload, sections]);

  const templatePlaces = useMemo<TemplatePlace[]>(
    () =>
      places.map((p) => ({
        id: p.id,
        name: resolveQuickVariablesInString(p.name, quickVariablePayload),
        category: p.category,
        description: p.description
          ? resolveQuickVariablesInString(p.description, quickVariablePayload)
          : null,
        address: p.address
          ? resolveQuickVariablesInString(p.address, quickVariablePayload)
          : null,
        lat: p.lat,
        lng: p.lng,
        phone: p.phone
          ? resolveQuickVariablesInString(p.phone, quickVariablePayload)
          : null,
        website: p.website
          ? resolveQuickVariablesInString(p.website, quickVariablePayload)
          : null,
        email: p.email
          ? resolveQuickVariablesInString(p.email, quickVariablePayload)
          : null,
        imageUrl: p.imageUrl,
        openingHours: p.openingHours
          ? resolveQuickVariablesInString(p.openingHours, quickVariablePayload)
          : null,
        tags: resolveQuickVariablesInValue(p.tags, quickVariablePayload),
      })),
    [places, quickVariablePayload]
  );

  const normalizedHeroData = useMemo(
    () =>
      resolveQuickVariablesInValue(
        normalizeHeroData(guidebook.heroData),
        quickVariablePayload
      ),
    [guidebook.heroData, quickVariablePayload]
  );

  const resolvedBranding = useMemo(
    () => resolveQuickVariablesInValue(guidebook.branding, quickVariablePayload),
    [guidebook.branding, quickVariablePayload]
  );

  const resolvedGuidebookSettings = useMemo(
    () =>
      resolveQuickVariablesInValue(
        guidebook.settings,
        quickVariablePayload
      ) as Record<string, unknown>,
    [guidebook.settings, quickVariablePayload]
  );

  const resolvedBottomNav = useMemo(
    () => resolveQuickVariablesInValue(guidebook.bottomNav, quickVariablePayload),
    [guidebook.bottomNav, quickVariablePayload]
  );

  const resolvedStorefront = useMemo(
    () => resolveQuickVariablesInValue(storefront, quickVariablePayload),
    [quickVariablePayload, storefront]
  );

  const templateGuidebook: TemplateGuidebook = {
    id: guidebook.id,
    title: resolveQuickVariablesInString(guidebook.title, quickVariablePayload),
    slug: guidebook.slug,
    templateId: guidebook.templateId,
    branding: resolvedBranding,
    heroData: normalizedHeroData,
  };

  const nearbySettings = useMemo(
    () => readNearbySettingsFromGuidebookSettings(resolvedGuidebookSettings),
    [resolvedGuidebookSettings]
  );

  const chatEnabled = resolvedGuidebookSettings.ai_chat_enabled !== false;
  const pwaEnabled = resolvedGuidebookSettings.pwa_enabled !== false;
  const primaryColor =
    typeof (resolvedBranding as { primary_color?: unknown })?.primary_color === "string"
      ? ((resolvedBranding as { primary_color: string }).primary_color)
      : undefined;
  const languagesSettings = useMemo(
    () => readLanguagesSettings(resolvedGuidebookSettings),
    [resolvedGuidebookSettings]
  );
  const chatWidgetSettings = useMemo(
    () => readChatWidgetSettings(resolvedGuidebookSettings),
    [resolvedGuidebookSettings]
  );
  const languagesActive =
    languagesSettings.enabled && languagesSettings.available.length > 0;

  const chatWidget = chatEnabled ? (
    <ChatWidget
      guidebookSlug={guidebook.slug}
      propertyName={
        normalizedHeroData.property.name.trim() ||
        templateGuidebook.title ||
        guidebook.propertyName
      }
      hostFirstName={
        normalizedHeroData.host.name.trim().split(" ")[0] ||
        guidebook.hostFirstName
      }
      hostAvatarUrl={normalizedHeroData.host.avatar_url}
      settings={chatWidgetSettings}
    />
  ) : null;

  const brandFonts = useMemo(() => {
    const b = resolvedBranding as {
      heading_font?: string;
      body_font?: string;
      font_family?: string;
    };
    const inlineFonts = extractFontFamiliesFromBlocks(
      templateSections.flatMap((section) => section.blocks)
    );
    const splashFonts = extractHeroSplashFontFamilies(normalizedHeroData);
    return [
      b.heading_font ?? b.font_family ?? "",
      b.body_font ?? b.font_family ?? "",
      ...inlineFonts,
      ...splashFonts,
    ].filter(Boolean);
  }, [normalizedHeroData, resolvedBranding, templateSections]);

  const customFonts = useMemo<CustomFont[]>(() => {
    const raw = (resolvedBranding as { custom_fonts?: unknown }).custom_fonts;
    return Array.isArray(raw) ? (raw as CustomFont[]) : [];
  }, [resolvedBranding]);

  const demoCtaHref = `/signup?source=demo_guidebook&demo=${encodeURIComponent(
    guidebook.slug
  )}`;

  const demoCtaSlot = showDemoBadge ? (
    <aside className="mx-auto mt-6 w-full max-w-3xl rounded-lg border border-black/10 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium leading-6 text-neutral-800">
          {DEMO_GUIDEBOOK_CTA_COPY}
        </p>
        <a
          href={demoCtaHref}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          Try it now
        </a>
      </div>
    </aside>
  ) : null;

  return (
    <LanguageProvider
      baseLanguage={languagesSettings.base_language}
      available={languagesActive ? languagesSettings.available : []}
    >
      <PwaInstallProvider publicBasePath={publicBasePath}>
        <div className="fixed inset-0">
          <RuntimeFontLoader
            id="viewer"
            fontFamilies={brandFonts}
            customFonts={customFonts}
          />
          {languagesActive && (
            <GoogleTranslateLoader
              baseLanguage={languagesSettings.base_language}
              available={languagesSettings.available}
            />
          )}
          <SunsetLakehouseTemplate
            guidebook={templateGuidebook}
            sections={templateSections}
            places={templatePlaces}
            bottomNav={resolvedBottomNav}
            storefront={resolvedStorefront}
            nearbySettings={nearbySettings}
            guidebookSettings={resolvedGuidebookSettings}
            chatWidget={chatWidget}
            showLanguagePicker={languagesActive}
            publicBasePath={publicBasePath}
            demoCtaSlot={demoCtaSlot}
          />
          {pwaEnabled && (
            <FirstVisitInstallToast primaryColor={primaryColor} />
          )}
          {showDemoBadge &&
          demoPromptReadyFor === guidebook.id &&
          demoPromptDismissedFor !== guidebook.id ? (
            <div className="fixed inset-x-3 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-[10000] mx-auto flex max-w-3xl items-start gap-3 rounded-lg border border-black/10 bg-white/95 px-3 py-3 text-xs font-medium text-neutral-800 shadow-lg backdrop-blur md:px-4 md:text-sm">
              <span className="min-w-0">
                {DEMO_GUIDEBOOK_CTA_COPY}
              </span>
              <a
                href={demoCtaHref}
                className="shrink-0 rounded-md bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-neutral-800 md:text-sm"
              >
                Try it now
              </a>
              <button
                type="button"
                onClick={() => setDemoPromptDismissedFor(guidebook.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Dismiss demo guidebook prompt"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : null}
          {hostPreviewActive ? (
            <div className="pointer-events-none fixed left-1/2 top-[max(0.75rem,env(safe-area-inset-top))] z-[9999] -translate-x-1/2 rounded-full border border-black/10 bg-white/90 px-2.5 py-1 text-[11px] font-medium text-neutral-700 shadow-sm backdrop-blur">
              Preview mode
            </div>
          ) : null}
        </div>
      </PwaInstallProvider>
    </LanguageProvider>
  );
}
