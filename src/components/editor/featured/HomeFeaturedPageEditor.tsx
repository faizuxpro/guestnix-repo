"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Circle,
  Crop,
  Eye,
  EyeOff,
  Expand,
  ExternalLink,
  GripVertical,
  Home,
  LayoutTemplate,
  Mail,
  RectangleHorizontal,
  Sparkles,
  Square,
  Squircle,
  Tag,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FontPicker } from "@/components/editor/design/FontPicker";
import { IconifyPicker } from "@/components/icons/IconifyPicker";
import { useEditorStore } from "@/stores/editor-store";
import type { HomeInspectFocus } from "@/lib/editor-inspect";
import {
  DEFAULT_HOME_CONFIG,
  HERO_GLASS_BLUR_MAX,
  HERO_GLASS_SHADOW_BLUR_MAX,
  HERO_GLASS_SHADOW_OFFSET_MAX,
  HERO_GLASS_SHADOW_OFFSET_MIN,
  HERO_LOGO_SIZE_MAX,
  HERO_LOGO_SIZE_MIN,
  HERO_SPLASH_CARD_RADIUS_MAX,
  HERO_SPLASH_CONTAINER_GAP_MAX,
  HERO_SPLASH_CONTAINER_HEIGHT_MAX,
  HERO_SPLASH_CONTAINER_HEIGHT_MIN,
  HERO_SPLASH_CONTAINER_PADDING_MAX,
  HERO_SPLASH_CONTAINER_WIDTH_MAX,
  HERO_SPLASH_CONTAINER_WIDTH_MIN,
  HERO_SPLASH_ICON_SIZE_MAX,
  HERO_SPLASH_ICON_SIZE_MIN,
  HERO_SPLASH_LINE_HEIGHT_MAX,
  HERO_SPLASH_LINE_HEIGHT_MIN,
  HERO_SPLASH_PADDING_MAX,
  HERO_SPLASH_TEXT_SIZE_MAX,
  HERO_SPLASH_TEXT_SIZE_MIN,
  HERO_SPLASH_WIDTH_MAX,
  HERO_SPLASH_WIDTH_MIN,
  buildHomePresetPatch,
  formatFullAddress,
  type HeroBackgroundType,
  type HeroButtonAnimation,
  type HeroButtonArrowStyle,
  type HeroButtonSpeed,
  type HeroButtonStyle,
  type HeroData,
  type HeroGlassShadow,
  type HeroImageFit,
  type HeroHomeShowFlags,
  type HeroLogoShape,
  type HeroSplashAlign,
  type HeroSplashBlock,
  type HeroSplashBlockStyle,
  type HeroSplashBlockType,
  type HeroSplashContactVariant,
  type HeroSplashContainerStyle,
  type HeroSplashIconAnimation,
  type HeroSplashIconStyle,
} from "@/lib/hero-data";
import { cn } from "@/lib/utils";
import { ImageUploadField } from "./ImageUploadField";
import { ColorPicker } from "./controls/ColorPicker";
import { GradientPicker } from "./controls/GradientPicker";
import { OverlayPresetPicker } from "./controls/OverlayPresetPicker";
import { FeaturedNavCard } from "./controls/PanelHeader";
import { PatternPicker } from "./controls/PatternPicker";
import { PremiumSlider } from "./controls/PremiumSlider";
import {
  Disclosure,
  SegmentedControl,
  SettingsField,
  SettingsSection,
} from "./controls/SettingsField";
import { EditorPanelShell } from "../settings-ui";
import type { BlockCardAccent } from "../BlockWrapper";

const SPLASH_BLOCK_LABELS: Record<HeroSplashBlockType, string> = {
  logo: "Logo",
  title: "Property name",
  tagline: "Tagline",
  host: "Host name",
  contact: "Contact info",
  times: "Stay times",
  button: "Enter button",
};

const SPLASH_BLOCK_ICONS: Record<HeroSplashBlockType, ReactNode> = {
  logo: <Sparkles className="h-3.5 w-3.5" />,
  title: <Home className="h-3.5 w-3.5" />,
  tagline: <Tag className="h-3.5 w-3.5" />,
  host: <UserIcon className="h-3.5 w-3.5" />,
  contact: <Mail className="h-3.5 w-3.5" />,
  times: <Clock className="h-3.5 w-3.5" />,
  button: <LayoutTemplate className="h-3.5 w-3.5" />,
};

const SPLASH_BLOCK_ACCENTS = [
  "ink",
  "green",
  "blue",
  "teal",
  "amber",
  "orange",
  "violet",
] as const satisfies readonly BlockCardAccent[];

const CONTACT_VARIANTS: Array<{ value: HeroSplashContactVariant; label: string }> = [
  { value: "cards", label: "Cards" },
  { value: "chips", label: "Chips" },
  { value: "minimal", label: "Minimal" },
  { value: "list", label: "List" },
];

// Shimmer reads poorly on the bare halo/compass circles - hide it for those.
const ICON_STYLES: Array<{ value: HeroSplashIconStyle; label: string }> = [
  { value: "plain", label: "Plain" },
  { value: "soft", label: "Soft" },
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "inverted", label: "Invert" },
];

const ICON_ANIMATIONS: Array<{
  value: HeroSplashIconAnimation;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "float", label: "Float" },
  { value: "pulse", label: "Pulse" },
  { value: "glow", label: "Glow" },
  { value: "bounce", label: "Bounce" },
];

const SPLASH_BLOCK_PREFIX = "splash-block:";
const toSplashBlockDragId = (type: HeroSplashBlockType) =>
  `${SPLASH_BLOCK_PREFIX}${type}`;
const fromSplashBlockDragId = (value: string) =>
  value.startsWith(SPLASH_BLOCK_PREFIX)
    ? (value.slice(SPLASH_BLOCK_PREFIX.length) as HeroSplashBlockType)
    : null;

function animationOptions(style: HeroButtonStyle): Array<{
  value: HeroButtonAnimation;
  label: string;
}> {
  const all: Array<{ value: HeroButtonAnimation; label: string }> = [
    { value: "pulse", label: "Pulse" },
    { value: "breathe", label: "Breathe" },
    { value: "bounce", label: "Bounce" },
    { value: "shimmer", label: "Shimmer" },
    { value: "none", label: "None" },
  ];
  if (style === "halo" || style === "compass") {
    return all.filter((o) => o.value !== "shimmer");
  }
  return all;
}

type Props =
  | { mode: "card"; onSelect: () => void }
  | { mode: "detail"; onOpenPropertyHostInfo?: () => void };

export function HomeFeaturedPageEditor(props: Props) {
  const heroData = useEditorStore((s) => s.guidebook?.heroData);
  const updateHeroData = useEditorStore((s) => s.updateHeroData);
  const branding = useEditorStore((s) => s.branding);
  const editorNavigationRequest = useEditorStore(
    (s) => s.editorNavigationRequest
  );
  const handledNavigationNonceRef = useRef(0);
  const [focusRequest, setFocusRequest] = useState<{
    focus: HomeInspectFocus;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    if (props.mode !== "detail") return;
    if (!editorNavigationRequest) return;
    if (handledNavigationNonceRef.current === editorNavigationRequest.nonce) {
      return;
    }
    const target = editorNavigationRequest.target;
    if (target.kind !== "home") return;

    handledNavigationNonceRef.current = editorNavigationRequest.nonce;
    const frame = window.requestAnimationFrame(() => {
      setFocusRequest({
        focus: target.focus,
        nonce: editorNavigationRequest.nonce,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorNavigationRequest, props.mode]);

  useEffect(() => {
    if (props.mode !== "detail" || !focusRequest) return;
    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(
        `[data-editor-home-focus="${focusRequest.focus}"]`
      );
      element?.scrollIntoView({ block: "center", behavior: "smooth" });
      const preferredInput =
        element?.querySelector<HTMLElement>("input, textarea");
      const fallbackTarget = element?.querySelector<HTMLElement>(
        "button, [tabindex]"
      );
      (preferredInput ?? fallbackTarget)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusRequest, props.mode]);

  if (props.mode === "card") {
    return (
      <FeaturedNavCard
        icon={<Home className="h-4 w-4" />}
        title="Home / Splash"
        accent="teal"
        onSelect={props.onSelect}
      />
    );
  }

  if (!heroData) return null;
  const property = heroData.property;
  const host = heroData.host;
  const config = heroData.home;
  const bg = config.background;
  const glassShadow = config.glass_shadow;
  const solidBackgroundColor = config.solid_background_color;
  const splashBlocks = config.splash_blocks;
  const overlayContainer = config.overlay_container;
  const fullAddress = formatFullAddress(property);
  const supportsContentShadow =
    config.preset === "card" || config.preset === "minimal";

  return (
    <EditorPanelShell contentClassName="space-y-4">
      <div data-editor-home-focus="background">
        <SettingsSection
          key={
            focusRequest?.focus === "background"
              ? `background-${focusRequest.nonce}`
              : "background"
          }
          title="Background"
          defaultExpanded={focusRequest?.focus === "background"}
        >
        <SettingsField label="Type" inline>
          <SegmentedControl<HeroBackgroundType>
            value={bg.type}
            onChange={(v) =>
              updateHeroData({ home: { background: { type: v } } })
            }
            options={[
              { value: "image", label: "Image" },
              { value: "color", label: "Color" },
              { value: "gradient", label: "Gradient" },
            ]}
            ariaLabel="Background type"
          />
        </SettingsField>

        <ToggleRow
          label="Use brand colors"
          checked={bg.use_brand}
          onChange={(v) =>
            updateHeroData({ home: { background: { use_brand: v } } })
          }
        />

        {bg.type === "image" ? (
          <div className="space-y-3">
            <ImageUploadField
              label="Cover image"
              value={property.cover_image_url}
              onChange={(url) =>
                updateHeroData({ property: { cover_image_url: url } })
              }
              variant="cover"
              emptyText="Drop a cover photo here"
              assetsHubLabel="Use Assets Hub cover"
            />

            <Disclosure label="Adjust">
              <div className="grid gap-3 sm:grid-cols-2">
                <PremiumSlider
                  label="Focal X"
                  value={bg.position.x}
                  min={0}
                  max={100}
                  step={1}
                  format={(v) => `${Math.round(v)}%`}
                  marks={[
                    { value: 0, label: "L" },
                    { value: 50, label: "C" },
                    { value: 100, label: "R" },
                  ]}
                  showAllMarkLabels
                  onChange={(v) =>
                    updateHeroData({
                      home: {
                        background: {
                          position: { x: v, y: bg.position.y },
                        },
                      },
                    })
                  }
                />
                <PremiumSlider
                  label="Focal Y"
                  value={bg.position.y}
                  min={0}
                  max={100}
                  step={1}
                  format={(v) => `${Math.round(v)}%`}
                  marks={[
                    { value: 0, label: "T" },
                    { value: 50, label: "C" },
                    { value: 100, label: "B" },
                  ]}
                  showAllMarkLabels
                  onChange={(v) =>
                    updateHeroData({
                      home: {
                        background: {
                          position: { x: bg.position.x, y: v },
                        },
                      },
                    })
                  }
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <PremiumSlider
                  label="Overlay"
                  value={bg.overlay_opacity}
                  min={0}
                  max={1}
                  step={0.05}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(v) =>
                    updateHeroData({
                      home: { background: { overlay_opacity: v } },
                    })
                  }
                />
                <PremiumSlider
                  label="Blur"
                  value={bg.blur}
                  min={0}
                  max={20}
                  step={1}
                  format={(v) => `${Math.round(v)}px`}
                  onChange={(v) =>
                    updateHeroData({
                      home: { background: { blur: v } },
                    })
                  }
                />
              </div>
            </Disclosure>
          </div>
        ) : null}

        {bg.type === "color" ? (
          bg.use_brand ? (
            <InheritNote text="Inherits Primary from Design tab." />
          ) : (
            <div className="flex items-center gap-2">
              <ColorPicker
                value={bg.color}
                onChange={(c) =>
                  updateHeroData({
                    home: { background: { color: c } },
                  })
                }
              />
              <Input
                value={bg.color}
                onChange={(e) =>
                  updateHeroData({
                    home: {
                      background: { color: e.target.value.trim() },
                    },
                  })
                }
                placeholder="#002927"
                className="h-9 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          )
        ) : null}

        {bg.type === "gradient" ? (
          bg.use_brand ? (
            <InheritNote text="Inherits brand gradient from Design tab." />
          ) : (
            <GradientPicker
              from={bg.gradient_from}
              to={bg.gradient_to}
              angle={bg.gradient_angle}
              onChange={(next) =>
                updateHeroData({
                  home: {
                    background: {
                      gradient_from: next.from ?? bg.gradient_from,
                      gradient_to: next.to ?? bg.gradient_to,
                      gradient_angle: next.angle ?? bg.gradient_angle,
                    },
                  },
                })
              }
            />
          )
        ) : null}

        {bg.use_brand ? (
          <InheritNote text="Pattern inherits from Design tab." />
        ) : (
          <SettingsField label="Pattern">
            <PatternPicker
              value={bg.pattern}
              onChange={(v) =>
                updateHeroData({
                  home: { background: { pattern: v } },
                })
              }
            />
          </SettingsField>
        )}
      </SettingsSection>

      <SettingsSection
        key={
          focusRequest?.focus === "container"
            ? `overlay-${focusRequest.nonce}`
            : "overlay"
        }
        title="Overlay"
        defaultExpanded={focusRequest?.focus === "container"}
      >
        <OverlayPresetPicker
          value={config.preset}
          onChange={(id) =>
            updateHeroData({
              home: buildHomePresetPatch(id, config.preset),
            })
          }
          coverImage={property.cover_image_url}
        />
        {config.preset === "card" ? (
          <PremiumSlider
            label="Glass blur"
            value={config.glass_blur}
            min={0}
            max={HERO_GLASS_BLUR_MAX}
            step={1}
            format={(v) => `${Math.round(v)}px`}
            marks={[
              { value: 0, label: "0" },
              { value: 12, label: "Light" },
              { value: 22, label: "Med" },
              { value: 32, label: "Heavy" },
            ]}
            showAllMarkLabels
            onChange={(v) => updateHeroData({ home: { glass_blur: v } })}
            ariaLabel="Glass blur"
          />
        ) : null}
        {config.preset === "classic" ? (
          <div className="space-y-3">
            <PremiumSlider
              label="Background opacity"
              value={config.solid_background_opacity}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              marks={[
                { value: 0, label: "0" },
                { value: 0.5, label: "50" },
                { value: 1, label: "100" },
              ]}
              showAllMarkLabels
              onChange={(v) =>
                updateHeroData({
                  home: { solid_background_opacity: v },
                })
              }
              ariaLabel="Solid background opacity"
            />
            <ToggleRow
              label="Override background color"
              checked={solidBackgroundColor.enabled}
              onChange={(v) =>
                updateHeroData({
                  home: { solid_background_color: { enabled: v } },
                })
              }
            />
            {solidBackgroundColor.enabled ? (
              <SettingsField label="Background color" inline>
                <div className="flex items-center gap-2">
                  <ColorPicker
                    value={solidBackgroundColor.color}
                    onChange={(color) =>
                      updateHeroData({
                        home: { solid_background_color: { color } },
                      })
                    }
                    compact
                  />
                  <Input
                    value={solidBackgroundColor.color}
                    onChange={(e) =>
                      updateHeroData({
                        home: {
                          solid_background_color: {
                            color: e.target.value.trim(),
                          },
                        },
                      })
                    }
                    placeholder="#002927"
                    className="h-9 font-mono text-xs uppercase"
                    maxLength={7}
                  />
                </div>
              </SettingsField>
            ) : null}
          </div>
        ) : null}
        {supportsContentShadow ? (
          <ContentShadowControls
            shadow={glassShadow}
            onChange={(patch) =>
              updateHeroData({ home: { glass_shadow: patch } })
            }
          />
        ) : null}
        <div data-editor-home-focus="container">
          <OverlayContainerControls
            container={overlayContainer}
            onChange={(patch) =>
              updateHeroData({ home: { overlay_container: patch } })
            }
          />
        </div>
        </SettingsSection>
      </div>

      <SettingsSection
        key={
          focusRequest && focusRequest.focus !== "background"
            ? `splash-${focusRequest.nonce}`
            : "splash"
        }
        title="Splash blocks"
        defaultExpanded={Boolean(
          focusRequest && focusRequest.focus !== "background"
        )}
      >
        <SplashBlocksEditor
          focusRequest={focusRequest}
          blocks={splashBlocks}
          property={property}
          host={host}
          fullAddress={fullAddress}
          logo={config.logo}
          show={config.show}
          hostLabel={config.host_label}
          times={config.times}
          button={{
            label: config.button_label,
            style: config.button_style,
            animation: config.button_animation,
            speed: config.button_speed,
            arrowStyle: config.button_arrow_style,
          }}
          branding={branding}
          onBlocksChange={(blocks) =>
            updateHeroData({ home: { splash_blocks: blocks } })
          }
          onPropertyChange={(propertyPatch) =>
            updateHeroData({ property: propertyPatch })
          }
          onLogoChange={(logo) => updateHeroData({ home: { logo } })}
          onShowChange={(show) => updateHeroData({ home: { show } })}
          onHostLabelChange={(host_label) =>
            updateHeroData({ home: { host_label } })
          }
          onTimesChange={(times) => updateHeroData({ home: { times } })}
          onOpenPropertyHostInfo={props.onOpenPropertyHostInfo}
          onButtonChange={(button) =>
            updateHeroData({
              home: {
                ...(button.label !== undefined
                  ? { button_label: button.label }
                  : {}),
                ...(button.style !== undefined
                  ? { button_style: button.style }
                  : {}),
                ...(button.animation !== undefined
                  ? { button_animation: button.animation }
                  : {}),
                ...(button.speed !== undefined
                  ? { button_speed: button.speed }
                  : {}),
                ...(button.arrowStyle !== undefined
                  ? { button_arrow_style: button.arrowStyle }
                  : {}),
              },
            })
          }
        />
      </SettingsSection>
    </EditorPanelShell>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} size="sm" />
    </div>
  );
}

function InheritNote({ text }: { text: string }) {
  return (
    <p className="text-[10.5px] text-muted-foreground/70">{text}</p>
  );
}

function OverlayContainerControls({
  container,
  onChange,
}: {
  container: HeroSplashContainerStyle;
  onChange: (patch: Partial<HeroSplashContainerStyle>) => void;
}) {
  const applyPatch = (patch: Partial<HeroSplashContainerStyle>) => {
    onChange(patch);
  };

  return (
    <Disclosure label="Container size">
      <div className="grid gap-3 sm:grid-cols-2">
        <PremiumSlider
          label="Width"
          value={container.width}
          min={HERO_SPLASH_CONTAINER_WIDTH_MIN}
          max={HERO_SPLASH_CONTAINER_WIDTH_MAX}
          step={10}
          format={(v) => `${Math.round(v)}px`}
          onChange={(width) => applyPatch({ width })}
        />
        <PremiumSlider
          label="Max height"
          value={container.max_height}
          min={HERO_SPLASH_CONTAINER_HEIGHT_MIN}
          max={HERO_SPLASH_CONTAINER_HEIGHT_MAX}
          step={10}
          format={(v) => `${Math.round(v)}px`}
          onChange={(max_height) =>
            applyPatch({
              max_height: Math.max(max_height, container.min_height),
            })
          }
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PremiumSlider
          label="Min height"
          value={container.min_height}
          min={HERO_SPLASH_CONTAINER_HEIGHT_MIN}
          max={HERO_SPLASH_CONTAINER_HEIGHT_MAX}
          step={10}
          format={(v) => (v <= 0 ? "Auto" : `${Math.round(v)}px`)}
          onChange={(min_height) =>
            applyPatch({
              min_height: Math.min(min_height, container.max_height),
            })
          }
        />
        <PremiumSlider
          label="Gap"
          value={container.gap}
          min={0}
          max={HERO_SPLASH_CONTAINER_GAP_MAX}
          step={1}
          format={(v) => `${Math.round(v)}px`}
          onChange={(gap) => applyPatch({ gap })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PremiumSlider
          label="Padding X"
          value={container.padding_x}
          min={0}
          max={HERO_SPLASH_CONTAINER_PADDING_MAX}
          step={2}
          format={(v) => `${Math.round(v)}px`}
          onChange={(padding_x) => applyPatch({ padding_x })}
        />
        <PremiumSlider
          label="Padding Y"
          value={container.padding_y}
          min={0}
          max={HERO_SPLASH_CONTAINER_PADDING_MAX}
          step={2}
          format={(v) => `${Math.round(v)}px`}
          onChange={(padding_y) => applyPatch({ padding_y })}
        />
      </div>
      <SettingsField label="Alignment" inline>
        <SegmentedControl<HeroSplashAlign>
          value={container.align}
          onChange={(align) => applyPatch({ align })}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
          ariaLabel="Splash container alignment"
        />
      </SettingsField>
    </Disclosure>
  );
}

type SplashButtonPatch = {
  label?: string;
  style?: HeroButtonStyle;
  animation?: HeroButtonAnimation;
  speed?: HeroButtonSpeed;
  arrowStyle?: HeroButtonArrowStyle;
};

type SplashBlockPatch = {
  visible?: boolean;
  style?: Partial<HeroSplashBlockStyle>;
};

type SplashTimesPatch = {
  checkin_label?: string;
  checkin_time?: string;
  checkout_label?: string;
  checkout_time?: string;
};

function SplashBlocksEditor({
  focusRequest,
  blocks,
  property,
  host,
  fullAddress,
  logo,
  show,
  hostLabel,
  times,
  button,
  branding,
  onBlocksChange,
  onPropertyChange,
  onLogoChange,
  onShowChange,
  onHostLabelChange,
  onTimesChange,
  onOpenPropertyHostInfo,
  onButtonChange,
}: {
  focusRequest: { focus: HomeInspectFocus; nonce: number } | null;
  blocks: HeroSplashBlock[];
  property: HeroData["property"];
  host: HeroData["host"];
  fullAddress: string;
  logo: HeroData["home"]["logo"];
  show: HeroHomeShowFlags;
  hostLabel: string;
  times: HeroData["home"]["times"];
  button: {
    label: string;
    style: HeroButtonStyle;
    animation: HeroButtonAnimation;
    speed: HeroButtonSpeed;
    arrowStyle: HeroButtonArrowStyle;
  };
  branding: Record<string, unknown>;
  onBlocksChange: (blocks: HeroSplashBlock[]) => void;
  onPropertyChange: (property: Partial<HeroData["property"]>) => void;
  onLogoChange: (logo: Partial<HeroData["home"]["logo"]>) => void;
  onShowChange: (show: Partial<HeroHomeShowFlags>) => void;
  onHostLabelChange: (value: string) => void;
  onTimesChange: (times: SplashTimesPatch) => void;
  onOpenPropertyHostInfo?: () => void;
  onButtonChange: (button: SplashButtonPatch) => void;
}) {
  const patchBlock = (
    type: HeroSplashBlockType,
    patch: SplashBlockPatch
  ) => {
    onBlocksChange(
      blocks.map((block) =>
        block.type === type
          ? {
              ...block,
              ...patch,
              style: {
                ...block.style,
                ...(patch.style ?? {}),
              },
            }
          : block
      )
    );
  };

  const patchStyle = (
    type: HeroSplashBlockType,
    patch: Partial<HeroSplashBlockStyle>
  ) => {
    patchBlock(type, { style: patch });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onBlocksChange(next);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const activeType = fromSplashBlockDragId(String(active.id));
    const overType = fromSplashBlockDragId(String(over.id));
    if (!activeType || !overType) return;
    const oldIndex = blocks.findIndex((block) => block.type === activeType);
    const newIndex = blocks.findIndex((block) => block.type === overType);
    if (oldIndex === -1 || newIndex === -1) return;
    onBlocksChange(arrayMove(blocks, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((block) => toSplashBlockDragId(block.type))}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2.5">
          {blocks.map((block, index) => {
            const inspectFocus = homeFocusForSplashBlock(block.type);
            const isFocused =
              Boolean(inspectFocus) && focusRequest?.focus === inspectFocus;

            return (
              <SortableSplashBlockRow
                key={block.type}
                block={block}
                accent={
                  SPLASH_BLOCK_ACCENTS[index % SPLASH_BLOCK_ACCENTS.length]
                }
                index={index}
                total={blocks.length}
                inspectFocus={inspectFocus}
                focused={isFocused}
                onMove={moveBlock}
                onToggleVisible={() =>
                  patchBlock(block.type, { visible: !block.visible })
                }
              >
                {block.visible ? (
                  <Disclosure
                    key={
                      isFocused
                        ? `customize-${block.type}-${focusRequest?.nonce}`
                        : `customize-${block.type}`
                    }
                    label="Customize"
                    defaultExpanded={isFocused}
                  >
                    <SplashBlockControls
                      block={block}
                      property={property}
                      host={host}
                      fullAddress={fullAddress}
                      logo={logo}
                      show={show}
                      hostLabel={hostLabel}
                      times={times}
                      button={button}
                      branding={branding}
                      onStyleChange={(patch) => patchStyle(block.type, patch)}
                      onPropertyChange={onPropertyChange}
                      onLogoChange={onLogoChange}
                      onShowChange={onShowChange}
                      onHostLabelChange={onHostLabelChange}
                      onTimesChange={onTimesChange}
                      onOpenPropertyHostInfo={onOpenPropertyHostInfo}
                      onButtonChange={onButtonChange}
                    />
                  </Disclosure>
                ) : null}
              </SortableSplashBlockRow>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function homeFocusForSplashBlock(
  type: HeroSplashBlockType
): HomeInspectFocus | null {
  if (type === "logo") return "logo";
  if (type === "title") return "title";
  if (type === "tagline") return "tagline";
  if (type === "host") return "host";
  if (type === "contact") return "contact";
  if (type === "times") return "times";
  if (type === "button") return "button";
  return null;
}

function SortableSplashBlockRow({
  block,
  accent,
  index,
  total,
  inspectFocus,
  focused,
  children,
  onMove,
  onToggleVisible,
}: {
  block: HeroSplashBlock;
  accent: BlockCardAccent;
  index: number;
  total: number;
  inspectFocus: HomeInspectFocus | null;
  focused: boolean;
  children: ReactNode;
  onMove: (index: number, direction: -1 | 1) => void;
  onToggleVisible: () => void;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: toSplashBlockDragId(block.type) });

  return (
    <div
      ref={setNodeRef}
      data-editor-home-focus={inspectFocus ?? undefined}
      data-accent={accent}
      data-active={focused}
      data-collapsed={!block.visible}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "block-card overflow-hidden transition-all",
        !focused && "hover:bg-background",
        isDragging && "opacity-60"
      )}
    >
      <div className="block-card-header flex items-center gap-1.5 px-2 py-1.5">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground active:cursor-grabbing"
          aria-label={`Drag ${SPLASH_BLOCK_LABELS[block.type]}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3" />
        </button>
        <span className="block-card-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
          {SPLASH_BLOCK_ICONS[block.type]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="block-card-title truncate text-sm font-semibold">
            {SPLASH_BLOCK_LABELS[block.type]}
          </p>
          <p className="text-[10.5px] text-muted-foreground">
            {block.visible ? "Visible" : "Hidden"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={index === 0}
          aria-label={`Move ${SPLASH_BLOCK_LABELS[block.type]} up`}
          onClick={() => onMove(index, -1)}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={index === total - 1}
          aria-label={`Move ${SPLASH_BLOCK_LABELS[block.type]} down`}
          onClick={() => onMove(index, 1)}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`${block.visible ? "Hide" : "Show"} ${
            SPLASH_BLOCK_LABELS[block.type]
          }`}
          onClick={onToggleVisible}
        >
          {block.visible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {block.visible ? (
        <div className="block-card-body editor-form px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}

function SplashBlockControls({
  block,
  property,
  host,
  fullAddress,
  logo,
  show,
  hostLabel,
  times,
  button,
  branding,
  onStyleChange,
  onPropertyChange,
  onLogoChange,
  onShowChange,
  onHostLabelChange,
  onTimesChange,
  onOpenPropertyHostInfo,
  onButtonChange,
}: {
  block: HeroSplashBlock;
  property: HeroData["property"];
  host: HeroData["host"];
  fullAddress: string;
  logo: HeroData["home"]["logo"];
  show: HeroHomeShowFlags;
  hostLabel: string;
  times: HeroData["home"]["times"];
  button: {
    label: string;
    style: HeroButtonStyle;
    animation: HeroButtonAnimation;
    speed: HeroButtonSpeed;
    arrowStyle: HeroButtonArrowStyle;
  };
  branding: Record<string, unknown>;
  onStyleChange: (patch: Partial<HeroSplashBlockStyle>) => void;
  onPropertyChange: (property: Partial<HeroData["property"]>) => void;
  onLogoChange: (logo: Partial<HeroData["home"]["logo"]>) => void;
  onShowChange: (show: Partial<HeroHomeShowFlags>) => void;
  onHostLabelChange: (value: string) => void;
  onTimesChange: (times: SplashTimesPatch) => void;
  onOpenPropertyHostInfo?: () => void;
  onButtonChange: (button: SplashButtonPatch) => void;
}) {
  if (block.type === "logo") {
    return (
      <div className="space-y-3">
        <ImageUploadField
          label="Image"
          value={property.logo_url}
          onChange={(url) => onPropertyChange({ logo_url: url })}
          variant="avatar"
          emptyText="Drop a logo here"
          assetsHubLabel="Use Assets Hub logo"
        />
        <SettingsField label="Shape" inline>
          <SegmentedControl<HeroLogoShape>
            value={logo.shape}
            onChange={(shape) => onLogoChange({ shape })}
            options={[
              {
                value: "natural",
                label: "Natural",
                icon: <RectangleHorizontal className="h-3.5 w-3.5" />,
              },
              {
                value: "rounded",
                label: "Rounded",
                icon: <Squircle className="h-3.5 w-3.5" />,
              },
              {
                value: "circle",
                label: "Circle",
                icon: <Circle className="h-3.5 w-3.5" />,
              },
            ]}
            ariaLabel="Logo shape"
          />
        </SettingsField>
        <Disclosure label="Logo sizing">
          <div className="grid gap-3 sm:grid-cols-2">
            <PremiumSlider
              label="Size"
              value={logo.size}
              min={HERO_LOGO_SIZE_MIN}
              max={HERO_LOGO_SIZE_MAX}
              step={2}
              format={(v) => `${Math.round(v)}px`}
              onChange={(size) => onLogoChange({ size })}
              ariaLabel="Logo size"
            />
            <PremiumSlider
              label="Max width"
              value={block.style.max_width}
              min={HERO_SPLASH_WIDTH_MIN}
              max={HERO_SPLASH_WIDTH_MAX}
              step={10}
              format={(v) => `${Math.round(v)}px`}
              onChange={(max_width) => onStyleChange({ max_width })}
            />
          </div>
          {logo.shape === "rounded" ? (
            <PremiumSlider
              label="Corner radius"
              value={logo.corner_radius}
              min={0}
              max={50}
              step={1}
              format={(v) => `${Math.round(v)}%`}
              marks={[
                { value: 0, label: <Square className="inline h-2.5 w-2.5" /> },
                { value: 25, label: "25" },
                { value: 50, label: "50" },
              ]}
              showAllMarkLabels
              onChange={(corner_radius) => onLogoChange({ corner_radius })}
            />
          ) : null}
          {logo.shape !== "natural" ? (
            <SettingsField label="Fit" inline>
              <SegmentedControl<HeroImageFit>
                value={logo.fit}
                onChange={(fit) => onLogoChange({ fit })}
                options={[
                  {
                    value: "cover",
                    label: "Fill",
                    icon: <Expand className="h-3.5 w-3.5" />,
                  },
                  {
                    value: "contain",
                    label: "Fit",
                    icon: <Crop className="h-3.5 w-3.5" />,
                  },
                ]}
                ariaLabel="Logo fit"
              />
            </SettingsField>
          ) : null}
        </Disclosure>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {block.type === "title" ? (
        <SourceInfoField
          label="Property name"
          value={property.name}
          onOpenPropertyHostInfo={onOpenPropertyHostInfo}
        />
      ) : null}

      {block.type === "tagline" ? (
        <SourceInfoField
          label="Tagline"
          value={property.tagline}
          onOpenPropertyHostInfo={onOpenPropertyHostInfo}
        />
      ) : null}

      {block.type === "host" ? (
        <SourceInfoField
          label="Host name"
          value={host.name}
          onOpenPropertyHostInfo={onOpenPropertyHostInfo}
        />
      ) : null}

      {block.type === "host" ? (
        <SettingsField label="Host prefix" inline>
          <Input
            value={hostLabel}
            onChange={(e) => onHostLabelChange(e.target.value)}
            placeholder="Hosted by"
            className="h-9"
          />
        </SettingsField>
      ) : null}

      {block.type === "contact" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <SourceInfoField
              label="Phone"
              value={host.phone}
              onOpenPropertyHostInfo={onOpenPropertyHostInfo}
            />
            <SourceInfoField
              label="Email"
              value={host.email}
              onOpenPropertyHostInfo={onOpenPropertyHostInfo}
            />
            <SourceInfoField
              label="Address"
              value={fullAddress}
              onOpenPropertyHostInfo={onOpenPropertyHostInfo}
            />
          </div>
          <ToggleRow
            label="Phone"
            checked={show.phone}
            onChange={(phone) => onShowChange({ phone })}
          />
          <ToggleRow
            label="Email"
            checked={show.email}
            onChange={(email) => onShowChange({ email })}
          />
          <ToggleRow
            label="Address"
            checked={show.address}
            onChange={(address) => onShowChange({ address })}
          />
          <CardDesignControls
            style={block.style}
            onChange={onStyleChange}
          />
          <ContactIconControls
            style={block.style}
            onChange={onStyleChange}
          />
        </div>
      ) : null}

      {block.type === "times" ? (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <SettingsField label="Check-in text">
              <Input
                value={times.checkin_label}
                onChange={(e) =>
                  onTimesChange({ checkin_label: e.target.value })
                }
                placeholder="Check-in"
                className="h-9"
              />
            </SettingsField>
            <SettingsField label="Check-out text">
              <Input
                value={times.checkout_label}
                onChange={(e) =>
                  onTimesChange({ checkout_label: e.target.value })
                }
                placeholder="Check-out"
                className="h-9"
              />
            </SettingsField>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <SettingsField label="Check-in time">
              <Input
                value={times.checkin_time}
                onChange={(e) =>
                  onTimesChange({ checkin_time: e.target.value })
                }
                placeholder="4:00 PM"
                className="h-9"
              />
            </SettingsField>
            <SettingsField label="Check-out time">
              <Input
                value={times.checkout_time}
                onChange={(e) =>
                  onTimesChange({ checkout_time: e.target.value })
                }
                placeholder="11:00 AM"
                className="h-9"
              />
            </SettingsField>
          </div>
          <TimeIconControls
            style={block.style}
            onChange={onStyleChange}
          />
          <ToggleRow
            label="Use contact styling"
            checked={block.style.inherit_contact_style}
            onChange={(inherit_contact_style) =>
              onStyleChange({ inherit_contact_style })
            }
          />
          {block.style.inherit_contact_style ? (
            <InheritNote text="Layout, typography, card, and icon treatment follow Contact info." />
          ) : (
            <>
              <CardDesignControls
                style={block.style}
                onChange={onStyleChange}
              />
              <IconTreatmentControls
                style={block.style}
                onChange={onStyleChange}
              />
            </>
          )}
        </div>
      ) : null}

      {block.type === "button" ? (
        <ButtonBlockControls
          button={button}
          onChange={onButtonChange}
        />
      ) : null}

      {block.type === "times" && block.style.inherit_contact_style ? null : (
        <TypographyControls
          blockType={block.type}
          style={block.style}
          branding={branding}
          onChange={onStyleChange}
        />
      )}
    </div>
  );
}

function ButtonBlockControls({
  button,
  onChange,
}: {
  button: {
    label: string;
    style: HeroButtonStyle;
    animation: HeroButtonAnimation;
    speed: HeroButtonSpeed;
    arrowStyle: HeroButtonArrowStyle;
  };
  onChange: (button: SplashButtonPatch) => void;
}) {
  return (
    <div className="space-y-3">
      <SettingsField label="Label" inline>
        <Input
          value={button.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Enter Guide"
          className="h-9"
        />
      </SettingsField>
      <SettingsField label="Style" inline>
        <SegmentedControl<HeroButtonStyle>
          value={button.style}
          onChange={(style) => onChange({ style })}
          options={[
            { value: "tower", label: "Tower" },
            { value: "halo", label: "Halo" },
            { value: "compass", label: "Compass" },
            { value: "bar", label: "Bar" },
          ]}
          ariaLabel="Button style"
        />
      </SettingsField>
      <SettingsField label="Animation" inline>
        <SegmentedControl<HeroButtonAnimation>
          value={button.animation}
          onChange={(animation) => onChange({ animation })}
          options={animationOptions(button.style)}
          ariaLabel="Button animation"
        />
      </SettingsField>
      {button.animation !== "none" ? (
        <SettingsField label="Speed" inline>
          <SegmentedControl<HeroButtonSpeed>
            value={button.speed}
            onChange={(speed) => onChange({ speed })}
            options={[
              { value: "slow", label: "Slow" },
              { value: "normal", label: "Normal" },
              { value: "fast", label: "Fast" },
            ]}
            ariaLabel="Animation speed"
          />
        </SettingsField>
      ) : null}
      {button.style === "tower" ? (
        <SettingsField label="Arrows" inline>
          <SegmentedControl<HeroButtonArrowStyle>
            value={button.arrowStyle}
            onChange={(arrowStyle) => onChange({ arrowStyle })}
            options={[
              { value: "triangle", label: "Triangle" },
              { value: "chevron", label: "Chevron" },
              { value: "line", label: "Line" },
              { value: "dots", label: "Dots" },
              { value: "none", label: "Off" },
            ]}
            ariaLabel="Arrow style"
          />
        </SettingsField>
      ) : null}
    </div>
  );
}

function SourceInfoField({
  label,
  value,
  onOpenPropertyHostInfo,
}: {
  label: string;
  value: string;
  onOpenPropertyHostInfo?: () => void;
}) {
  return (
    <SettingsField label={label}>
      <div className="flex items-center gap-1.5">
        <Input
          value={value}
          readOnly
          disabled
          className="h-9 flex-1 bg-muted/50 text-xs text-muted-foreground disabled:cursor-default disabled:opacity-100"
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onOpenPropertyHostInfo}
          disabled={!onOpenPropertyHostInfo}
          aria-label={`Edit ${label} in Property & Host info`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </SettingsField>
  );
}

function ContactIconControls({
  style,
  onChange,
}: {
  style: HeroSplashBlockStyle;
  onChange: (patch: Partial<HeroSplashBlockStyle>) => void;
}) {
  return (
    <Disclosure label="Icons">
      <div className="grid gap-2">
        <IconPickerRow
          label="Phone"
          value={style.icon_phone}
          onChange={(icon_phone) => onChange({ icon_phone })}
        />
        <IconPickerRow
          label="Email"
          value={style.icon_email}
          onChange={(icon_email) => onChange({ icon_email })}
        />
        <IconPickerRow
          label="Address"
          value={style.icon_address}
          onChange={(icon_address) => onChange({ icon_address })}
        />
      </div>
      <IconTreatmentControls style={style} onChange={onChange} />
    </Disclosure>
  );
}

function TimeIconControls({
  style,
  onChange,
}: {
  style: HeroSplashBlockStyle;
  onChange: (patch: Partial<HeroSplashBlockStyle>) => void;
}) {
  return (
    <Disclosure label="Time icons">
      <div className="grid gap-2">
        <IconPickerRow
          label="Check-in"
          value={style.icon_checkin}
          onChange={(icon_checkin) => onChange({ icon_checkin })}
        />
        <IconPickerRow
          label="Check-out"
          value={style.icon_checkout}
          onChange={(icon_checkout) => onChange({ icon_checkout })}
        />
      </div>
    </Disclosure>
  );
}

function IconPickerRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/50 px-2 py-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <IconifyPicker
        value={value}
        onChange={onChange}
        ariaLabel={`Select ${label} icon`}
        triggerClassName="h-8 w-8 rounded-md border border-border/70 text-foreground"
        iconClassName="text-base"
      />
    </div>
  );
}

function IconTreatmentControls({
  style,
  onChange,
}: {
  style: HeroSplashBlockStyle;
  onChange: (patch: Partial<HeroSplashBlockStyle>) => void;
}) {
  return (
    <div className="space-y-3">
      <SettingsField label="Icon style" inline>
        <SegmentedControl<HeroSplashIconStyle>
          value={style.icon_style}
          onChange={(icon_style) => onChange({ icon_style })}
          options={ICON_STYLES}
          ariaLabel="Splash icon style"
        />
      </SettingsField>
      <SettingsField label="Icon align" inline>
        <SegmentedControl<HeroSplashAlign>
          value={style.icon_align}
          onChange={(icon_align) => onChange({ icon_align })}
          options={[
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
          ariaLabel="Splash icon alignment"
        />
      </SettingsField>
      <SettingsField label="Animation" inline>
        <SegmentedControl<HeroSplashIconAnimation>
          value={style.icon_animation}
          onChange={(icon_animation) => onChange({ icon_animation })}
          options={ICON_ANIMATIONS}
          ariaLabel="Splash icon animation"
        />
      </SettingsField>
    </div>
  );
}

function CardDesignControls({
  style,
  onChange,
}: {
  style: HeroSplashBlockStyle;
  onChange: (patch: Partial<HeroSplashBlockStyle>) => void;
}) {
  const showRadius = style.variant === "cards";
  const showSurface = style.variant === "cards" || style.variant === "chips";

  return (
    <div className="space-y-3">
      <SettingsField label="Layout" inline>
        <SegmentedControl<HeroSplashContactVariant>
          value={style.variant}
          onChange={(variant) => onChange({ variant })}
          options={CONTACT_VARIANTS}
          ariaLabel="Splash card layout"
        />
      </SettingsField>
      <div
        className={cn(
          "grid gap-3",
          showRadius ? "sm:grid-cols-2" : "sm:grid-cols-1"
        )}
      >
        <PremiumSlider
          label="Icon size"
          value={style.icon_size}
          min={HERO_SPLASH_ICON_SIZE_MIN}
          max={HERO_SPLASH_ICON_SIZE_MAX}
          step={1}
          format={(v) => `${Math.round(v)}px`}
          onChange={(icon_size) => onChange({ icon_size })}
        />
        {showRadius ? (
          <PremiumSlider
            label="Radius"
            value={style.card_radius}
            min={0}
            max={HERO_SPLASH_CARD_RADIUS_MAX}
            step={1}
            format={(v) => `${Math.round(v)}px`}
            onChange={(card_radius) => onChange({ card_radius })}
          />
        ) : null}
      </div>
      {showSurface ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <PremiumSlider
            label="Bg opacity"
            value={style.card_opacity}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(card_opacity) => onChange({ card_opacity })}
          />
          <PremiumSlider
            label="Border opacity"
            value={style.card_border_opacity}
            min={0}
            max={1}
            step={0.05}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(card_border_opacity) =>
              onChange({ card_border_opacity })
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function TypographyControls({
  blockType,
  style,
  branding,
  onChange,
}: {
  blockType: HeroSplashBlockType;
  style: HeroSplashBlockStyle;
  branding: Record<string, unknown>;
  onChange: (patch: Partial<HeroSplashBlockStyle>) => void;
}) {
  const fontOverride = style.font_family.trim().length > 0;
  const fallbackFont = defaultSplashFont(blockType, branding);
  const showColor = style.color_enabled;

  return (
    <div className="space-y-3">
      <ToggleRow
        label="Override font"
        checked={fontOverride}
        onChange={(enabled) =>
          onChange({ font_family: enabled ? style.font_family || fallbackFont : "" })
        }
      />
      {fontOverride ? (
        <SettingsField label="Font">
          <FontPicker
            value={style.font_family || fallbackFont}
            onChange={(font_family) => onChange({ font_family })}
            role={blockType === "title" || blockType === "times" ? "heading" : "body"}
          />
        </SettingsField>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <PremiumSlider
          label="Size"
          value={style.font_size}
          min={HERO_SPLASH_TEXT_SIZE_MIN}
          max={HERO_SPLASH_TEXT_SIZE_MAX}
          step={1}
          format={(v) => `${Math.round(v)}px`}
          onChange={(font_size) => onChange({ font_size })}
        />
        <PremiumSlider
          label="Weight"
          value={style.font_weight}
          min={100}
          max={900}
          step={50}
          format={(v) => `${Math.round(v)}`}
          onChange={(font_weight) => onChange({ font_weight })}
        />
      </div>
      <div
        className={cn(
          "grid gap-3",
          blockType === "times" ? "sm:grid-cols-1" : "sm:grid-cols-2"
        )}
      >
        <PremiumSlider
          label="Line height"
          value={style.line_height}
          min={HERO_SPLASH_LINE_HEIGHT_MIN}
          max={HERO_SPLASH_LINE_HEIGHT_MAX}
          step={0.05}
          format={(v) => `${v.toFixed(2)}x`}
          onChange={(line_height) => onChange({ line_height })}
        />
        {blockType === "times" ? null : (
          <PremiumSlider
            label="Line width"
            value={style.max_width}
            min={HERO_SPLASH_WIDTH_MIN}
            max={HERO_SPLASH_WIDTH_MAX}
            step={10}
            format={(v) => `${Math.round(v)}px`}
            onChange={(max_width) => onChange({ max_width })}
          />
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PremiumSlider
          label="Padding top"
          value={style.padding_top}
          min={0}
          max={HERO_SPLASH_PADDING_MAX}
          step={1}
          format={(v) => `${Math.round(v)}px`}
          onChange={(padding_top) => onChange({ padding_top })}
        />
        <PremiumSlider
          label="Padding bottom"
          value={style.padding_bottom}
          min={0}
          max={HERO_SPLASH_PADDING_MAX}
          step={1}
          format={(v) => `${Math.round(v)}px`}
          onChange={(padding_bottom) => onChange({ padding_bottom })}
        />
      </div>
      <ToggleRow
        label="Override color"
        checked={showColor}
        onChange={(color_enabled) => onChange({ color_enabled })}
      />
      {showColor ? (
        <SettingsField label="Color" inline>
          <div className="flex items-center gap-2">
            <ColorPicker
              value={style.color}
              onChange={(color) => onChange({ color })}
              compact
            />
            <Input
              value={style.color}
              onChange={(e) => onChange({ color: e.target.value.trim() })}
              placeholder="#FFFFFF"
              className="h-9 font-mono text-xs uppercase"
              maxLength={7}
            />
          </div>
        </SettingsField>
      ) : null}
    </div>
  );
}

function defaultSplashFont(
  blockType: HeroSplashBlockType,
  branding: Record<string, unknown>
) {
  const heading =
    typeof branding.heading_font === "string"
      ? branding.heading_font
      : typeof branding.font_family === "string"
        ? branding.font_family
        : "Fraunces";
  const body =
    typeof branding.body_font === "string"
      ? branding.body_font
      : typeof branding.font_family === "string"
        ? branding.font_family
        : "Montserrat";
  return blockType === "title" || blockType === "times" ? heading : body;
}

function ContentShadowControls({
  shadow,
  onChange,
}: {
  shadow: HeroGlassShadow;
  onChange: (patch: Partial<HeroGlassShadow>) => void;
}) {
  return (
    <div className="space-y-3">
      <ToggleRow
        label="Text/logo/icon shadow"
        checked={shadow.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />

      {shadow.enabled ? (
        <Disclosure label="Customize shadow">
          <SettingsField label="Color" inline>
            <div className="flex items-center gap-2">
              <ColorPicker
                value={shadow.color}
                onChange={(color) => onChange({ color })}
                compact
              />
              <Input
                value={shadow.color}
                onChange={(e) => onChange({ color: e.target.value.trim() })}
                placeholder="#000000"
                className="h-9 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          </SettingsField>

          <div className="grid gap-3 sm:grid-cols-2">
            <PremiumSlider
              label="Opacity"
              value={shadow.opacity}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(opacity) => onChange({ opacity })}
            />
            <PremiumSlider
              label="Blur"
              value={shadow.blur}
              min={0}
              max={HERO_GLASS_SHADOW_BLUR_MAX}
              step={1}
              format={(v) => `${Math.round(v)}px`}
              onChange={(blur) => onChange({ blur })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <PremiumSlider
              label="Offset X"
              value={shadow.offset_x}
              min={HERO_GLASS_SHADOW_OFFSET_MIN}
              max={HERO_GLASS_SHADOW_OFFSET_MAX}
              step={1}
              format={(v) => `${Math.round(v)}px`}
              onChange={(offset_x) => onChange({ offset_x })}
            />
            <PremiumSlider
              label="Offset Y"
              value={shadow.offset_y}
              min={HERO_GLASS_SHADOW_OFFSET_MIN}
              max={HERO_GLASS_SHADOW_OFFSET_MAX}
              step={1}
              format={(v) => `${Math.round(v)}px`}
              onChange={(offset_y) => onChange({ offset_y })}
            />
          </div>
        </Disclosure>
      ) : null}
    </div>
  );
}

export function resetHomeFeaturedConfig() {
  useEditorStore
    .getState()
    .updateHeroData({ home: structuredClone(DEFAULT_HOME_CONFIG) });
}
