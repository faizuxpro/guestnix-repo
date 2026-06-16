"use client";

import { useEffect, useRef, useState } from "react";
import {
  PanelTop,
  RotateCcw,
  Search,
  Sparkles,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import {
  EditorPanelShell,
  EditorSection,
  SegmentedRow,
  SelectRow,
  SettingRow,
  ToggleRow,
} from "@/components/editor/settings-ui";
import { ImageUploadField } from "@/components/editor/featured/ImageUploadField";
import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import { useEditorStore } from "@/stores/editor-store";
import type { NavigationInspectFocus } from "@/lib/editor-inspect";
import {
  DEFAULT_TOPBAR_SETTINGS,
  TOPBAR_SETTINGS_KEY,
  normalizeTopbarSettings,
  writeTopbarSettings,
  type TopbarLogoMode,
  type TopbarSearchExpandBehavior,
  type TopbarSearchMotion,
  type TopbarSearchStyle,
  type TopbarSettingsPatch,
} from "@/lib/topbar-settings";

type HeaderEditorProps = {
  embedded?: boolean;
};

const LOGO_MODE_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "custom", label: "Custom" },
  { value: "hidden", label: "Hidden" },
] satisfies Array<{ value: TopbarLogoMode; label: string }>;

const SEARCH_STYLE_OPTIONS = [
  { value: "pill", label: "Pill" },
  { value: "glass", label: "Glass" },
  { value: "outline", label: "Outline" },
  { value: "minimal", label: "Minimal" },
] satisfies Array<{ value: TopbarSearchStyle; label: string }>;

const SEARCH_EXPAND_OPTIONS = [
  { value: "expand", label: "Expand" },
  { value: "static", label: "Static" },
] satisfies Array<{ value: TopbarSearchExpandBehavior; label: string }>;

const SEARCH_MOTION_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "reduced", label: "Reduced" },
  { value: "off", label: "Off" },
] satisfies Array<{ value: TopbarSearchMotion; label: string }>;

export function HeaderEditor({ embedded = false }: HeaderEditorProps = {}) {
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const editorNavigationRequest = useEditorStore(
    (s) => s.editorNavigationRequest
  );
  const updateGuidebookSettings = useEditorStore((s) => s.updateGuidebookSettings);
  const settings = normalizeTopbarSettings(guidebookSettings);
  const handledNavigationNonceRef = useRef(0);
  const [focusRequest, setFocusRequest] = useState<{
    focus: NavigationInspectFocus;
    nonce: number;
  } | null>(null);

  const writeSettings = (patch: TopbarSettingsPatch) => {
    updateGuidebookSettings(writeTopbarSettings(guidebookSettings, patch));
  };

  const resetToDefault = () => {
    updateGuidebookSettings({
      ...guidebookSettings,
      [TOPBAR_SETTINGS_KEY]: DEFAULT_TOPBAR_SETTINGS,
    });
  };

  useEffect(() => {
    if (!editorNavigationRequest) return;
    if (handledNavigationNonceRef.current === editorNavigationRequest.nonce) {
      return;
    }
    const target = editorNavigationRequest.target;
    if (target.kind !== "navigation" || target.focus === "bottom_nav") return;

    handledNavigationNonceRef.current = editorNavigationRequest.nonce;
    const frame = window.requestAnimationFrame(() => {
      setFocusRequest({
        focus: target.focus,
        nonce: editorNavigationRequest.nonce,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorNavigationRequest]);

  useEffect(() => {
    if (!focusRequest) return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-editor-navigation-focus="${focusRequest.focus}"]`
      );
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
      const focusTarget = element?.querySelector<HTMLElement>(
        "button, input, [tabindex]"
      );
      (focusTarget ?? element)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest]);

  const content = (
    <>
      <div
        data-editor-navigation-focus="header"
        tabIndex={-1}
        className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
      <EditorSection
        key={
          focusRequest?.focus === "header" ||
          focusRequest?.focus === "header_brand"
            ? `header-brand-${focusRequest.nonce}`
            : "header-brand"
        }
        icon={<PanelTop />}
        title="Header brand"
        description="Logo and title visibility."
        defaultExpanded={
          !focusRequest ||
          focusRequest.focus === "header" ||
          focusRequest.focus === "header_brand"
        }
      >
        <div data-editor-navigation-focus="header_brand" tabIndex={-1}>
        <SelectRow<TopbarLogoMode>
          label="Logo"
          inline
          value={settings.brand.logo_mode}
          onChange={(logo_mode) => writeSettings({ brand: { logo_mode } })}
          options={LOGO_MODE_OPTIONS}
        />
        {settings.brand.logo_mode === "custom" ? (
          <ImageUploadField
            label="Logo image"
            value={settings.brand.logo_url}
            onChange={(logo_url) => writeSettings({ brand: { logo_url } })}
            variant="avatar"
            emptyText="Drop a logo here"
            assetsHubLabel="Use Assets Hub logo"
          />
        ) : null}
        {settings.brand.logo_mode !== "hidden" ? (
          <PremiumSlider
            label="Logo size"
            value={settings.layout.logo_size}
            min={18}
            max={72}
            step={2}
            format={(value) => `${value}px`}
            marks={[
              { value: 18, label: "18" },
              { value: 28, label: "28" },
              { value: 72, label: "72" },
            ]}
            onChange={(logo_size) => writeSettings({ layout: { logo_size } })}
            ariaLabel="Header logo size"
          />
        ) : null}
        <PremiumSlider
          label="Header height"
          hint="Search, share, and language controls scale with this height."
          value={settings.layout.height}
          min={48}
          max={104}
          step={2}
          format={(value) => `${value}px`}
          marks={[
            { value: 48, label: "48" },
            { value: 64, label: "64" },
            { value: 104, label: "104" },
          ]}
          onChange={(height) => writeSettings({ layout: { height } })}
          ariaLabel="Header height"
        />
        <ToggleRow
          label="Show title"
          checked={settings.brand.show_title}
          onCheckedChange={(show_title) =>
            writeSettings({ brand: { show_title } })
          }
        />
        </div>
      </EditorSection>
      </div>

      <div
        data-editor-navigation-focus="page_name"
        tabIndex={-1}
        className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
      <EditorSection
        key={
          focusRequest?.focus === "page_name"
            ? `page-name-${focusRequest.nonce}`
            : "page-name"
        }
        icon={<Type />}
        title="Page name"
        description="Current view label."
        defaultExpanded={!focusRequest || focusRequest.focus === "page_name"}
      >
        <ToggleRow
          label="Show page name (desktop only)"
          checked={settings.page_name.visible}
          onCheckedChange={(visible) =>
            writeSettings({ page_name: { visible } })
          }
        />
      </EditorSection>
      </div>

      <div
        data-editor-navigation-focus="share"
        tabIndex={-1}
        className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
      <EditorSection
        key={
          focusRequest?.focus === "share"
            ? `action-icons-${focusRequest.nonce}`
            : "action-icons"
        }
        icon={<Sparkles />}
        title="Action icons"
        description="Search and share icons."
        defaultExpanded={!focusRequest || focusRequest.focus === "share"}
      >
        <SettingRow label="Search icon">
          <div className="flex min-w-0 items-center gap-2">
            <IconifyPicker
              value={settings.actions.search_icon}
              onChange={(search_icon) =>
                writeSettings({ actions: { search_icon } })
              }
              ariaLabel="Pick search icon"
              triggerClassName="h-10 w-10 shrink-0 rounded-md border border-border/70 text-foreground [&_svg]:h-5 [&_svg]:w-5 [&_.host-icon]:text-xl"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => writeSettings({ actions: { search_icon: "" } })}
            >
              Default
            </Button>
          </div>
        </SettingRow>
        <SettingRow label="Share icon">
          <div
            data-editor-navigation-focus="share"
            tabIndex={-1}
            className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <IconifyPicker
              value={settings.actions.share_icon}
              onChange={(share_icon) =>
                writeSettings({ actions: { share_icon } })
              }
              ariaLabel="Pick share icon"
              triggerClassName="h-10 w-10 shrink-0 rounded-md border border-border/70 text-foreground [&_svg]:h-5 [&_svg]:w-5 [&_.host-icon]:text-xl"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => writeSettings({ actions: { share_icon: "" } })}
            >
              Default
            </Button>
          </div>
        </SettingRow>
      </EditorSection>
      </div>

      <div
        data-editor-navigation-focus="search"
        tabIndex={-1}
        className="scroll-mt-4 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
      <EditorSection
        key={
          focusRequest?.focus === "search"
            ? `search-bar-${focusRequest.nonce}`
            : "search-bar"
        }
        icon={<Search />}
        title="Search bar"
        description="Style and focus animation."
        defaultExpanded={!focusRequest || focusRequest.focus === "search"}
      >
        <SelectRow<TopbarSearchStyle>
          label="Style"
          inline
          value={settings.search.style}
          onChange={(style) => writeSettings({ search: { style } })}
          options={SEARCH_STYLE_OPTIONS}
        />
        <SegmentedRow<TopbarSearchExpandBehavior>
          label="Focus"
          value={settings.search.expand_behavior}
          onChange={(expand_behavior) =>
            writeSettings({ search: { expand_behavior } })
          }
          options={SEARCH_EXPAND_OPTIONS}
          presentation="segmented"
        />
        <SelectRow<TopbarSearchMotion>
          label="Motion"
          inline
          value={settings.search.motion}
          onChange={(motion) => writeSettings({ search: { motion } })}
          options={SEARCH_MOTION_OPTIONS}
        />
      </EditorSection>
      </div>
    </>
  );

  const resetButton = (
    <Button type="button" variant="outline" size="sm" onClick={resetToDefault}>
      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
    </Button>
  );

  if (embedded) {
    return (
      <div className="h-full min-w-0 overflow-y-auto overflow-x-hidden bg-background">
        <div className="flex justify-end px-4 pt-4">{resetButton}</div>
        <div className="min-w-0 space-y-4 p-4 pt-3">{content}</div>
      </div>
    );
  }

  return (
    <EditorPanelShell
      title="Header"
      description="Tune the guest header."
      actions={resetButton}
    >
      {content}
    </EditorPanelShell>
  );
}
