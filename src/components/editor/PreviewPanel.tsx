"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { SunsetLakehouseTemplate } from "@/templates/sunset-lakehouse/TemplateRoot";
import { RuntimeFontLoader } from "@/components/fonts/RuntimeFontLoader";
import type { CustomFont } from "@/lib/fonts/catalog";
import { extractFontFamiliesFromBlocks } from "@/lib/rich-text-fonts";
import { readNearbySettingsFromGuidebookSettings } from "@/lib/nearby";
import { readLanguagesSettings } from "@/lib/languages";
import { readChatWidgetSettings } from "@/lib/chat-widget-settings";
import { LanguageProvider } from "@/components/guidebook/LanguageContext";
import { ChatWidget } from "@/components/viewer/chat/ChatWidget";
import { PwaInstallProvider } from "@/components/guidebook/pwa/PwaInstallProvider";
import {
  DEFAULT_HERO_DATA,
  extractHeroSplashFontFamilies,
} from "@/lib/hero-data";
import { readStoreSettingsFromGuidebookSettings } from "@/lib/store/settings";
import { fetchEditorStorefront } from "@/lib/store/editor-storefront-cache";
import { storefrontToPreviewSnapshot } from "@/lib/store/storefront-preview";
import {
  buildQuickVariableRenderPayload,
  readQuickVariablesFromSettings,
  resolveQuickVariablesInBlockContent,
  resolveQuickVariablesInString,
  resolveQuickVariablesInValue,
  type QuickVariableRenderPayload,
} from "@/lib/quick-variables";
import { PreviewInspector } from "./inspect/PreviewInspector";
import type {
  TemplateBlock,
  TemplateGuidebook,
  TemplatePlace,
  TemplateSection,
} from "@/templates/sunset-lakehouse/types";
import type { SnapshotStorefront } from "@/lib/store/types";

export type PreviewDevice = "mobile" | "tablet" | "desktop";

const DEVICE_CANVAS: Record<PreviewDevice, { width: number; height: number }> = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1200, height: 820 },
};

const DEVICE_STAGE_SPACING: Record<
  PreviewDevice,
  { horizontal: number; top: number; bottom: number }
> = {
  mobile: { horizontal: 8, top: 8, bottom: 24 },
  tablet: { horizontal: 12, top: 12, bottom: 28 },
  desktop: { horizontal: 12, top: 12, bottom: 12 },
};

type Props = {
  device: PreviewDevice;
  inspectEnabled: boolean;
  onInspectEnabledChange: (enabled: boolean) => void;
};

type PlaceRecord = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  imageUrl: string | null;
  openingHours: string | null;
  tags: Record<string, unknown> | null;
};

function FrameChrome({
  device,
  children,
}: {
  device: PreviewDevice;
  children: React.ReactNode;
}) {
  if (device === "desktop") {
    return (
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden",
          "rounded-xl bg-white",
          "ring-1 ring-black/5",
          "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15),0_12px_24px_-8px_rgba(0,0,0,0.08)]"
        )}
      >
        <div className="flex h-10 flex-shrink-0 items-center gap-2.5 border-b border-[#c8ccd1] bg-gradient-to-b from-[#e8eaed] to-[#dee1e6] px-3.5">
          <div className="flex gap-[7px]">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1)]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1)]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1)]" />
          </div>
          <div className="flex h-[26px] flex-1 items-center gap-1.5 overflow-hidden rounded-md border border-[#c8ccd1] bg-white px-2.5 text-[11px] text-neutral-500">
            <span aria-hidden className="opacity-60">lock</span>
            <span className="truncate">guestnix.com/g/your-stay</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-background">{children}</div>
      </div>
    );
  }

  if (device === "tablet") {
    return (
      <div
        className={cn(
          "relative flex h-full w-full flex-col overflow-hidden",
          "rounded-[26px] p-1.5",
          "bg-[#e0e0e0]",
          "ring-1 ring-[#d0d0d0]",
          "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.18),0_8px_16px_-6px_rgba(0,0,0,0.08)]"
        )}
      >
        <div className="flex-1 overflow-hidden rounded-[20px] bg-background">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden",
        "rounded-[36px] p-1.5",
        "bg-[#e0e0e0]",
        "ring-1 ring-[#d0d0d0]",
        "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.18),0_8px_16px_-6px_rgba(0,0,0,0.08)]"
      )}
    >
      <div className="pointer-events-none absolute left-1/2 top-1.5 z-20 flex h-[18px] w-[100px] -translate-x-1/2 items-center justify-center gap-1 rounded-b-[12px] bg-[#e0e0e0]">
        <span className="block h-[6px] w-[6px] rounded-full border border-[#bbb] bg-[#c8c8c8]" />
        <span className="block h-[3px] w-10 rounded-[2px] bg-[#c8c8c8]" />
      </div>
      <div className="flex-1 overflow-hidden rounded-[30px] bg-background">
        {children}
      </div>
    </div>
  );
}

function toTemplateSections(
  editorSections: ReturnType<typeof useEditorStore.getState>["sections"],
  quickVariables: QuickVariableRenderPayload | null
): TemplateSection[] {
  return editorSections
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((s) => ({
      id: s.id,
      title: resolveQuickVariablesInString(s.title, quickVariables),
      icon: s.icon,
      isVisible: s.isVisible,
      orderIndex: s.orderIndex,
      kind: s.kind,
      displayMode: s.displayMode,
      itemSettings: resolveQuickVariablesInValue(s.itemSettings, quickVariables),
      blocks: s.blocks.map<TemplateBlock>((b) => ({
        id: b.id,
        type: b.type,
        content: resolveQuickVariablesInBlockContent(
          b.type,
          b.content,
          quickVariables
        ),
        isVisible: b.isVisible,
        orderIndex: b.orderIndex,
      })),
    }));
}

function escapePreviewTarget(value: string) {
  return (
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(value)
      : value.replace(/["\\]/g, "\\$&")
  );
}

function previewBlockSelector(blockId: string) {
  const escaped = escapePreviewTarget(`block-${blockId}`);
  return `[data-guidebook-search-target="${escaped}"]`;
}

function editorPreviewTargetSelector(target: {
  kind: "section_title";
  sectionId: string;
}) {
  const escaped = escapePreviewTarget(`section-title-${target.sectionId}`);
  return `[data-editor-preview-target="${escaped}"]`;
}

function scrollPreviewTargetIntoView(target: HTMLElement) {
  const container = target.closest<HTMLElement>(".sl-popup-body");
  if (!container) return;

  const targetRect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const targetMiddle = targetRect.top - containerRect.top + targetRect.height / 2;
  const nextTop =
    container.scrollTop + targetMiddle - container.clientHeight / 2;
  const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);

  container.scrollTo({
    top: Math.min(maxTop, Math.max(0, nextTop)),
    behavior: "smooth",
  });
}

export function PreviewPanel({
  device,
  inspectEnabled,
  onInspectEnabledChange,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const openSectionRef = useRef<((sectionId: string | null) => void) | null>(null);
  const setFeaturedViewRef = useRef<
    ((view: "home" | "host" | "nearby" | "store" | null) => void) | null
  >(null);
  const activePreviewActivationKeyRef = useRef(0);
  const lastActivatedBlockIdRef = useRef<string | null>(null);
  const lastPreviewScrollRef = useRef<{
    blockId: string | null;
    sectionId: string | null;
    completed: boolean;
  }>({ blockId: null, sectionId: null, completed: false });
  const [openSectionHookVersion, setOpenSectionHookVersion] = useState(0);
  const [setFeaturedViewHookVersion, setSetFeaturedViewHookVersion] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [places, setPlaces] = useState<TemplatePlace[]>([]);
  const [storefront, setStorefront] = useState<SnapshotStorefront | null>(null);
  const [activePreviewFlash, setActivePreviewFlash] = useState<{
    blockId: string;
    key: number;
  } | null>(null);

  const sections = useEditorStore((s) => s.sections);
  const guidebook = useEditorStore((s) => s.guidebook);
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const branding = useEditorStore((s) => s.branding);
  const bottomNav = useEditorStore((s) => s.bottomNav);
  const activeSectionId = useEditorStore((s) => s.activeSectionId);
  const activeBlockId = useEditorStore((s) => s.activeBlockId);
  const activePreviewFocus = useEditorStore((s) => s.activePreviewFocus);
  const activeFeaturedView = useEditorStore((s) => s.activeFeaturedView);
  const requestEditorNavigation = useEditorStore(
    (s) => s.requestEditorNavigation
  );
  const placesVersion = useEditorStore((s) => s.placesVersion);

  useEffect(() => {
    if (!guidebook?.id) {
      return;
    }

    let cancelled = false;

    const fetchPlaces = async () => {
      const result = await apiFetch<PlaceRecord[]>(
        `/api/guidebooks/${guidebook.id}/places`
      );
      if (cancelled) return;
      if (!result.ok || !Array.isArray(result.data)) {
        // Preview is best-effort; the user already sees toasts from the
        // customizer if anything actually changed. Stay silent here.
        if (!result.ok) setPlaces([]);
        return;
      }
      setPlaces(
        result.data.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          address: p.address,
          lat: p.lat,
          lng: p.lng,
          phone: p.phone,
          website: p.website,
          email: p.email,
          imageUrl: p.imageUrl,
          openingHours: p.openingHours,
          tags: p.tags,
        }))
      );
    };

    void fetchPlaces();

    return () => {
      cancelled = true;
    };
  }, [guidebook?.id, placesVersion]);

  useEffect(() => {
    if (!guidebook?.id) {
      return;
    }

    let cancelled = false;

    const fetchStorefront = async () => {
      const result = await fetchEditorStorefront(guidebook.id);

      if (cancelled) return;
      if (!result.ok || !result.data?.storefront) {
        setStorefront(null);
        return;
      }

      setStorefront(storefrontToPreviewSnapshot(result.data.storefront));
    };

    const handleStorefrontUpdated = () => {
      void fetchStorefront();
    };
    const handleStorefrontPreview = (event: Event) => {
      const custom = event as CustomEvent<{
        storefront?: SnapshotStorefront | null;
      }>;
      setStorefront(custom.detail?.storefront ?? null);
    };

    void fetchStorefront();
    window.addEventListener("guestnix:storefront-updated", handleStorefrontUpdated);
    window.addEventListener("guestnix:storefront-preview", handleStorefrontPreview);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "guestnix:storefront-updated",
        handleStorefrontUpdated
      );
      window.removeEventListener(
        "guestnix:storefront-preview",
        handleStorefrontPreview
      );
    };
  }, [guidebook?.id]);

  const handleRegisterOpenSection = useCallback(
    (fn: (sectionId: string | null) => void) => {
      openSectionRef.current = fn;
      setOpenSectionHookVersion((v) => v + 1);
    },
    []
  );

  const handleRegisterSetFeaturedView = useCallback(
    (fn: (view: "home" | "host" | "nearby" | "store" | null) => void) => {
      setFeaturedViewRef.current = fn;
      setSetFeaturedViewHookVersion((v) => v + 1);
    },
    []
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const measure = () => {
      setViewportSize({ width: node.clientWidth, height: node.clientHeight });
    };

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const quickVariablePayload = useMemo(
    () =>
      buildQuickVariableRenderPayload({
        quickVariables: readQuickVariablesFromSettings(guidebookSettings),
        mode: "draft",
        context: {
          guidebookTitle: guidebook?.title,
          propertyName:
            typeof (guidebook?.heroData as { property?: { name?: unknown } })
              ?.property?.name === "string"
              ? ((guidebook?.heroData as { property: { name: string } }).property
                  .name)
              : guidebook?.title,
          hostName:
            typeof (guidebook?.heroData as { host?: { name?: unknown } })?.host
              ?.name === "string"
              ? ((guidebook?.heroData as { host: { name: string } }).host.name)
              : undefined,
          heroData: guidebook?.heroData,
        },
      }),
    [guidebook?.heroData, guidebook?.title, guidebookSettings]
  );
  const templateSections = useMemo(
    () => toTemplateSections(sections, quickVariablePayload),
    [quickVariablePayload, sections]
  );
  const activeBlockSectionId = useMemo(
    () =>
      activeBlockId
        ? sections.find((section) =>
            section.blocks.some((block) => block.id === activeBlockId)
          )?.id ?? null
        : null,
    [activeBlockId, sections]
  );

  useEffect(() => {
    openSectionRef.current?.(activeSectionId ?? null);
  }, [activeSectionId, openSectionHookVersion]);

  useEffect(() => {
    let frame = 0;

    if (!activeBlockId) {
      lastActivatedBlockIdRef.current = null;
      frame = window.requestAnimationFrame(() => {
        setActivePreviewFlash(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (lastActivatedBlockIdRef.current === activeBlockId) return;

    lastActivatedBlockIdRef.current = activeBlockId;
    activePreviewActivationKeyRef.current += 1;
    const key = activePreviewActivationKeyRef.current;
    frame = window.requestAnimationFrame(() => {
      setActivePreviewFlash({ blockId: activeBlockId, key });
    });

    const timeout = window.setTimeout(() => {
      setActivePreviewFlash((current) =>
        current?.key === key ? null : current
      );
    }, 900);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [activeBlockId]);

  useEffect(() => {
    if (!activeBlockId) {
      lastPreviewScrollRef.current = {
        blockId: null,
        sectionId: null,
        completed: false,
      };
      return;
    }

    const scrollKey = {
      blockId: activeBlockId,
      sectionId: activeBlockSectionId ?? null,
    };

    const lastScroll = lastPreviewScrollRef.current;
    if (
      lastScroll.blockId === scrollKey.blockId &&
      lastScroll.sectionId === scrollKey.sectionId &&
      lastScroll.completed
    ) {
      return;
    }

    lastPreviewScrollRef.current = { ...scrollKey, completed: false };

    if (activeBlockSectionId) {
      openSectionRef.current?.(activeBlockSectionId);
    }

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = viewportRef.current?.querySelector<HTMLElement>(
          previewBlockSelector(activeBlockId)
        );
        if (target) {
          scrollPreviewTargetIntoView(target);
          lastPreviewScrollRef.current = { ...scrollKey, completed: true };
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [activeBlockId, activeBlockSectionId, openSectionHookVersion]);

  useEffect(() => {
    if (!activePreviewFocus) return;

    openSectionRef.current?.(activePreviewFocus.sectionId);

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = viewportRef.current?.querySelector<HTMLElement>(
          editorPreviewTargetSelector(activePreviewFocus)
        );
        if (target) scrollPreviewTargetIntoView(target);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [activePreviewFocus, openSectionHookVersion]);

  useEffect(() => {
    setFeaturedViewRef.current?.(activeFeaturedView ?? null);
  }, [activeFeaturedView, setFeaturedViewHookVersion]);

  const templateGuidebook: TemplateGuidebook = useMemo(
    () => ({
      id: guidebook?.id ?? "",
      title: resolveQuickVariablesInString(
        guidebook?.title ?? "Your Stay",
        quickVariablePayload
      ),
      slug: guidebook?.slug ?? "",
      templateId: guidebook?.templateId ?? "sunset-lakehouse",
      branding: resolveQuickVariablesInValue(branding, quickVariablePayload),
      heroData: resolveQuickVariablesInValue(
        guidebook?.heroData ?? DEFAULT_HERO_DATA,
        quickVariablePayload
      ),
    }),
    [branding, guidebook, quickVariablePayload]
  );

  const resolvedGuidebookSettings = useMemo(
    () =>
      resolveQuickVariablesInValue(
        guidebookSettings,
        quickVariablePayload
      ) as Record<string, unknown>,
    [guidebookSettings, quickVariablePayload]
  );

  const brandFonts = useMemo(() => {
    const b = templateGuidebook.branding as {
      heading_font?: string;
      body_font?: string;
      font_family?: string;
    };
    const inlineFonts = extractFontFamiliesFromBlocks(
      templateSections.flatMap((section) => section.blocks)
    );
    const splashFonts = extractHeroSplashFontFamilies(templateGuidebook.heroData);
    return [
      b.heading_font ?? b.font_family ?? "",
      b.body_font ?? b.font_family ?? "",
      ...inlineFonts,
      ...splashFonts,
    ].filter(Boolean);
  }, [templateGuidebook.branding, templateGuidebook.heroData, templateSections]);

  const customFonts = useMemo<CustomFont[]>(() => {
    const raw = (templateGuidebook.branding as { custom_fonts?: unknown }).custom_fonts;
    return Array.isArray(raw) ? (raw as CustomFont[]) : [];
  }, [templateGuidebook.branding]);

  const nearbySettings = useMemo(
    () => readNearbySettingsFromGuidebookSettings(resolvedGuidebookSettings),
    [resolvedGuidebookSettings]
  );
  const previewPlaces = useMemo(
    () =>
      guidebook?.id
        ? resolveQuickVariablesInValue(places, quickVariablePayload)
        : [],
    [guidebook?.id, places, quickVariablePayload]
  );
  const storeSettings = useMemo(
    () => readStoreSettingsFromGuidebookSettings(resolvedGuidebookSettings),
    [resolvedGuidebookSettings]
  );
  const previewStorefront = useMemo(
    () =>
      guidebook?.id && storefront
        ? resolveQuickVariablesInValue(
            {
              ...storefront,
              intro: storeSettings.intro,
              listingStyle: storeSettings.listingStyle,
            },
            quickVariablePayload
          )
        : null,
    [
      guidebook?.id,
      quickVariablePayload,
      storefront,
      storeSettings.intro,
      storeSettings.listingStyle,
    ]
  );
  const previewBottomNav = useMemo(
    () => resolveQuickVariablesInValue(bottomNav, quickVariablePayload),
    [bottomNav, quickVariablePayload]
  );

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

  const s = resolvedGuidebookSettings as Record<string, unknown>;
  const chatEnabled = s.ai_chat_enabled !== false;

  const propertyName =
    templateGuidebook.heroData.property.name?.trim() ||
    templateGuidebook.title ||
    "Your Stay";
  const hostFirstName =
    (templateGuidebook.heroData.host.name ?? "").split(" ")[0] || "your host";

  const canvas = DEVICE_CANVAS[device];
  const stageSpacing = DEVICE_STAGE_SPACING[device];

  const scale = useMemo(() => {
    if (viewportSize.width <= 0 || viewportSize.height <= 0) return 1;
    const availableWidth = Math.max(
      1,
      viewportSize.width - stageSpacing.horizontal * 2
    );
    const availableHeight = Math.max(
      1,
      viewportSize.height - stageSpacing.top - stageSpacing.bottom
    );
    const fit = Math.min(
      availableWidth / canvas.width,
      availableHeight / canvas.height
    );
    return Math.max(0.1, Math.min(1, fit));
  }, [
    canvas.height,
    canvas.width,
    stageSpacing.bottom,
    stageSpacing.horizontal,
    stageSpacing.top,
    viewportSize.height,
    viewportSize.width,
  ]);

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <RuntimeFontLoader
        id="editor-preview"
        fontFamilies={brandFonts}
        customFonts={customFonts}
      />
      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
        <PreviewInspector
          enabled={inspectEnabled}
          onEnabledChange={onInspectEnabledChange}
          containerRef={viewportRef}
          onTarget={requestEditorNavigation}
        />
        <div
          className="absolute left-1/2"
          style={{
            top: `${stageSpacing.top}px`,
            transform: "translateX(-50%)",
          }}
        >
          <div
            style={{
              width: `${canvas.width}px`,
              height: `${canvas.height}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              transition:
                "width 260ms cubic-bezier(0.2, 0.8, 0.2, 1), height 260ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)",
            }}
            className="will-change-transform"
          >
            <FrameChrome device={device}>
              <LanguageProvider
                baseLanguage={languagesSettings.base_language}
                available={languagesActive ? languagesSettings.available : []}
                isolated
              >
                <PwaInstallProvider>
                  <div className="relative h-full w-full">
                    <SunsetLakehouseTemplate
                      guidebook={templateGuidebook}
                      sections={templateSections}
                      places={previewPlaces}
                      bottomNav={previewBottomNav}
                      storefront={previewStorefront}
                      nearbySettings={nearbySettings}
                      guidebookSettings={resolvedGuidebookSettings}
                      activePreviewBlockId={activeBlockId}
                      activePreviewFlashBlockId={activePreviewFlash?.blockId ?? null}
                      activePreviewActivationKey={activePreviewFlash?.key ?? 0}
                      activePreviewFocus={activePreviewFocus}
                      isPreview
                      previewDevice={device}
                      chatWidget={
                        chatEnabled && guidebook?.slug ? (
                          <ChatWidget
                            guidebookSlug={guidebook.slug}
                            propertyName={propertyName}
                            hostFirstName={hostFirstName}
                            settings={chatWidgetSettings}
                            preview
                          />
                        ) : null
                      }
                      showLanguagePicker={languagesActive}
                      registerOpenSection={handleRegisterOpenSection}
                      registerSetFeaturedView={handleRegisterSetFeaturedView}
                    />
                  </div>
                </PwaInstallProvider>
              </LanguageProvider>
            </FrameChrome>
          </div>
        </div>
      </div>
    </div>
  );
}
