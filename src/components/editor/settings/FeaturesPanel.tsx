"use client";

import { ImageIcon } from "lucide-react";
import {
  EditorPanelShell,
  EditorSection,
  SelectRow,
  SettingGroup,
  ToggleRow,
} from "@/components/editor/settings-ui";
import { ImageUploadField } from "@/components/editor/featured/ImageUploadField";
import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import {
  GUIDEBOOK_FAVICON_SETTINGS_KEY,
  normalizeGuidebookFaviconSettings,
  resolveGuidebookFaviconSource,
  type GuidebookFaviconSettingSource,
  type GuidebookFaviconSettings,
} from "@/lib/guidebook-favicon";
import {
  readChatWidgetSettings,
  type ChatWidgetBubbleShape,
  type ChatWidgetGlow,
  type ChatWidgetMotion,
  type ChatWidgetPlacement,
  type ChatWidgetSize,
  type ChatWidgetSettings,
} from "@/lib/chat-widget-settings";
import { useEditorStore } from "@/stores/editor-store";

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

const FAVICON_SOURCE_OPTIONS: Array<{
  value: GuidebookFaviconSettingSource;
  label: string;
  disabled?: boolean;
}> = [
  { value: "guestnix", label: "Guestnix" },
  { value: "custom", label: "Upload favicon" },
  { value: "header", label: "Header menu logo" },
  { value: "home", label: "Splash/home logo" },
  { value: "host", label: "Host photo" },
];

export function FeaturesPanel() {
  const settings = useEditorStore((s) => s.guidebookSettings);
  const branding = useEditorStore((s) => s.branding);
  const guidebook = useEditorStore((s) => s.guidebook);
  const update = useEditorStore((s) => s.updateGuidebookSettings);
  const s = settings as Record<string, unknown>;
  const chatWidget = readChatWidgetSettings(s);
  const favicon = normalizeGuidebookFaviconSettings(s);
  const faviconPreview = resolveGuidebookFaviconSource({
    settings: s,
    branding,
    heroData: guidebook?.heroData ?? null,
  });
  const headerLogoAvailable =
    resolveGuidebookFaviconSource({
      settings: { ...s, [GUIDEBOOK_FAVICON_SETTINGS_KEY]: { source: "header" } },
      branding,
      heroData: guidebook?.heroData ?? null,
    }).source === "header";
  const homeLogoAvailable = Boolean(guidebook?.heroData.property.logo_url);
  const hostPhotoAvailable = Boolean(guidebook?.heroData.host.avatar_url);
  const updateChatWidget = (patch: Partial<ChatWidgetSettings>) => {
    update({ chat_widget: { ...chatWidget, ...patch } });
  };
  const updateFavicon = (patch: Partial<GuidebookFaviconSettings>) => {
    update({
      [GUIDEBOOK_FAVICON_SETTINGS_KEY]: {
        ...favicon,
        ...patch,
      },
    });
  };
  const faviconOptions = FAVICON_SOURCE_OPTIONS.map((option) => {
    if (option.value === "header") {
      return { ...option, disabled: !headerLogoAvailable };
    }
    if (option.value === "home") {
      return { ...option, disabled: !homeLogoAvailable };
    }
    if (option.value === "host") {
      return { ...option, disabled: !hostPhotoAvailable };
    }
    return option;
  });

  return (
    <EditorPanelShell contentClassName="space-y-4">
      <EditorSection title="Guest features">
        <ToggleRow
          id="feat-pwa"
          label="PWA (install to home screen)"
          description="Guests can add the guidebook to their phone's home screen."
          checked={asBool(s.pwa_enabled, true)}
          onCheckedChange={(v) => update({ pwa_enabled: v })}
        />
        <ToggleRow
          id="feat-chat"
          label="AI chat"
          description="Guests can ask questions and get answers from your guidebook content."
          checked={asBool(s.ai_chat_enabled, true)}
          onCheckedChange={(v) => update({ ai_chat_enabled: v })}
        />
      </EditorSection>

      <EditorSection
        title="Browser icon"
        description="Favicon shown in browser tabs and saved guidebook shortcuts."
      >
        <SettingGroup>
          <SelectRow<GuidebookFaviconSettingSource>
            label="Source"
            inline
            value={favicon.source}
            onChange={(source) => updateFavicon({ source })}
            options={faviconOptions}
          />
          {favicon.source === "custom" ? (
            <ImageUploadField
              label="Favicon file"
              value={favicon.custom_url}
              onChange={(custom_url) => updateFavicon({ custom_url })}
              variant="avatar"
              emptyText="Drop favicon here"
              hint="Use ICO, PNG, SVG, WebP, GIF, or JPEG."
              accept="image/*,.ico"
              allowedExtensions={["ico"]}
              invalidFileMessage="Please choose an ICO or image file."
            />
          ) : null}
          <div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/70 p-2.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border border-border/70 bg-muted/35">
              {faviconPreview.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faviconPreview.url}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium leading-tight text-foreground">
                Current favicon
              </p>
              <p className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground">
                {faviconPreview.source === "guestnix"
                  ? "Using Guestnix fallback"
                  : faviconPreview.url}
              </p>
            </div>
          </div>
        </SettingGroup>
      </EditorSection>

      {asBool(s.ai_chat_enabled, true) && (
        <EditorSection
          title="Chat appearance"
          description="Launcher"
        >
          <SettingGroup>
            <SelectRow<ChatWidgetPlacement>
              label="Position"
              inline
              value={chatWidget.placement}
              onChange={(placement) => updateChatWidget({ placement })}
              options={[
                { value: "bottom-left", label: "Bottom left" },
                { value: "bottom-center", label: "Bottom center" },
                { value: "bottom-right", label: "Bottom right" },
                { value: "top-left", label: "Top left" },
                { value: "top-center", label: "Top center" },
                { value: "top-right", label: "Top right" },
              ]}
            />
            <PremiumSlider
              label="Y offset"
              value={chatWidget.offsetY}
              min={0}
              max={240}
              step={4}
              format={(value) => `${value}px`}
              onChange={(offsetY) => updateChatWidget({ offsetY })}
              ariaLabel="Chat launcher vertical offset"
              hint="Move it away from nav bars or sticky buttons."
            />
          </SettingGroup>

          <SettingGroup>
            <SelectRow<ChatWidgetSize>
              label="Size"
              inline
              value={chatWidget.size}
              onChange={(size) => updateChatWidget({ size })}
              options={[
                { value: "small", label: "Small" },
                { value: "medium", label: "Medium" },
                { value: "large", label: "Large" },
              ]}
            />
            <SelectRow<ChatWidgetBubbleShape>
              label="Shape"
              inline
              value={chatWidget.bubbleShape}
              onChange={(bubbleShape) => updateChatWidget({ bubbleShape })}
              options={[
                { value: "auto", label: "Auto" },
                { value: "side", label: "Side" },
                { value: "center", label: "Center" },
              ]}
            />
            <ToggleRow
              id="chat-brand-color"
              label="Use brand color"
              description="Off uses the multicolor launcher."
              checked={chatWidget.colorMode === "brand"}
              onCheckedChange={(checked) =>
                updateChatWidget({
                  colorMode: checked ? "brand" : "multicolor",
                })
              }
            />
            <SelectRow<ChatWidgetGlow>
              label="Glow"
              inline
              value={chatWidget.glow}
              onChange={(glow) => updateChatWidget({ glow })}
              options={[
                { value: "breathe", label: "Breathe" },
                { value: "still", label: "Still" },
                { value: "off", label: "Off" },
              ]}
            />
            <SelectRow<ChatWidgetMotion>
              label="Motion"
              inline
              value={chatWidget.motion}
              onChange={(motion) => updateChatWidget({ motion })}
              options={[
                { value: "lively", label: "Lively" },
                { value: "calm", label: "Calm" },
                { value: "off", label: "Off" },
              ]}
            />
          </SettingGroup>
        </EditorSection>
      )}
    </EditorPanelShell>
  );
}
