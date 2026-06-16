"use client";

import { useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Badge,
  Layers3,
  Navigation,
  Paintbrush,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EditorPanelShell,
  EditorSection,
  RepeaterGroup,
  SegmentedRow,
  SelectRow,
  ToggleRow,
} from "@/components/editor/settings-ui";
import { PremiumSlider } from "@/components/editor/featured/controls/PremiumSlider";
import {
  BOTTOM_NAV_BUILTIN_TYPES,
  BOTTOM_NAV_DEFAULTS,
  BOTTOM_NAV_MAX,
  BOTTOM_NAV_MIN,
  type BottomNavBuiltinType,
  type BottomNavSlot,
} from "@/types/bottom-nav";
import { isBottomNavBuiltinType } from "@/lib/bottom-nav";
import {
  normalizeBottomNavDesignSettings,
  writeBottomNavDesignSettings,
  BOTTOM_NAV_DESIGN_SETTINGS_KEY,
  DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS,
  type BottomNavActiveForegroundRole,
  type BottomNavActiveStyle,
  type BottomNavBadgeColorRole,
  type BottomNavBadgeStyle,
  type BottomNavBrandRole,
  type BottomNavContainerStyle,
  type BottomNavDesignSettingsPatch,
  type BottomNavDockMode,
  type BottomNavItemLayout,
  type BottomNavLabelCase,
  type BottomNavLabelVisibility,
  type BottomNavMotion,
} from "@/lib/bottom-nav-settings";
import { randomUUID } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor-store";
import {
  BottomNavSlotRow,
  DESTINATION_LABELS,
  createBottomNavSlot,
} from "./BottomNavSlotRow";

type UsedBuiltins = Partial<Record<BottomNavBuiltinType, number>>;

const DOCK_OPTIONS = [
  { value: "floating", label: "Floating" },
  { value: "attached", label: "Attached" },
  { value: "centered", label: "Centered" },
] satisfies Array<{ value: BottomNavDockMode; label: string }>;

const STYLE_OPTIONS = [
  { value: "brand", label: "Brand pill" },
  { value: "surface", label: "Surface" },
  { value: "glass", label: "Glass" },
  { value: "outline", label: "Outline" },
  { value: "solid_brand", label: "Solid brand" },
  { value: "minimal", label: "Minimal" },
] satisfies Array<{ value: BottomNavContainerStyle; label: string }>;

const BRAND_ROLE_OPTIONS = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "accent", label: "Accent" },
] satisfies Array<{ value: BottomNavBrandRole; label: string }>;

const ITEM_LAYOUT_OPTIONS = [
  { value: "stacked", label: "Stacked" },
  { value: "inline", label: "Inline" },
] satisfies Array<{ value: BottomNavItemLayout; label: string }>;

const LABEL_VISIBILITY_OPTIONS = [
  { value: "show", label: "Show" },
  { value: "active", label: "Active only" },
  { value: "hide", label: "Hide" },
] satisfies Array<{ value: BottomNavLabelVisibility; label: string }>;

const LABEL_CASE_OPTIONS = [
  { value: "uppercase", label: "Uppercase" },
  { value: "title", label: "Title case" },
  { value: "none", label: "As typed" },
] satisfies Array<{ value: BottomNavLabelCase; label: string }>;

const ACTIVE_STYLE_OPTIONS = [
  { value: "pill", label: "Pill" },
  { value: "underline", label: "Underline" },
  { value: "dot", label: "Dot" },
  { value: "icon_ring", label: "Icon ring" },
  { value: "none", label: "None" },
] satisfies Array<{ value: BottomNavActiveStyle; label: string }>;

const ACTIVE_FOREGROUND_OPTIONS = [
  { value: "auto_contrast", label: "Auto contrast" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "accent", label: "Accent" },
] satisfies Array<{ value: BottomNavActiveForegroundRole; label: string }>;

const BADGE_STYLE_OPTIONS = [
  { value: "count", label: "Count" },
  { value: "dot", label: "Dot" },
  { value: "hidden", label: "Hidden" },
] satisfies Array<{ value: BottomNavBadgeStyle; label: string }>;

const BADGE_COLOR_OPTIONS = [
  { value: "danger", label: "Alert red" },
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "accent", label: "Accent" },
] satisfies Array<{ value: BottomNavBadgeColorRole; label: string }>;

const MOTION_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "reduced", label: "Reduced" },
  { value: "off", label: "Off" },
] satisfies Array<{ value: BottomNavMotion; label: string }>;

const QUICK_STYLE_PATCHES: Record<
  BottomNavContainerStyle,
  BottomNavDesignSettingsPatch
> = {
  brand: {
    container: {
      style: "brand",
      radius: 20,
      shadow: 2,
      border: 0,
      blur: 0,
      opacity: 1,
    },
    active: {
      style: "pill",
      background_role: "accent",
      foreground_role: "primary",
    },
  },
  surface: {
    container: {
      style: "surface",
      radius: 18,
      shadow: 1,
      border: 1,
      blur: 0,
      opacity: 0.98,
    },
    active: {
      style: "pill",
      background_role: "primary",
      foreground_role: "auto_contrast",
    },
  },
  glass: {
    container: {
      style: "glass",
      radius: 22,
      shadow: 2,
      border: 1,
      blur: 16,
      opacity: 0.9,
    },
    active: {
      style: "pill",
      background_role: "accent",
      foreground_role: "primary",
    },
  },
  outline: {
    container: {
      style: "outline",
      radius: 16,
      shadow: 0,
      border: 1,
      blur: 0,
      opacity: 1,
    },
    active: {
      style: "underline",
      background_role: "primary",
      foreground_role: "auto_contrast",
    },
  },
  solid_brand: {
    container: {
      style: "solid_brand",
      solid_color_role: "primary",
      radius: 20,
      shadow: 2,
      border: 0,
      blur: 0,
      opacity: 1,
    },
    active: {
      style: "pill",
      background_role: "accent",
      foreground_role: "primary",
    },
  },
  minimal: {
    container: {
      style: "minimal",
      radius: 0,
      shadow: 0,
      border: 0,
      blur: 0,
      opacity: 1,
    },
    active: {
      style: "dot",
      background_role: "primary",
      foreground_role: "auto_contrast",
    },
  },
};

function makeRowId() {
  return `bottom-nav-slot-${randomUUID()}`;
}

const SLOT_ROW_IDS = new WeakMap<object, string>();

function getSlotRowId(slot: BottomNavSlot) {
  const key = slot as object;
  const existing = SLOT_ROW_IDS.get(key);
  if (existing) return existing;
  const next = makeRowId();
  SLOT_ROW_IDS.set(key, next);
  return next;
}

type BottomNavEditorProps = {
  embedded?: boolean;
};

export function BottomNavEditor({ embedded = false }: BottomNavEditorProps = {}) {
  const slots = useEditorStore((s) => s.bottomNav);
  const setBottomNav = useEditorStore((s) => s.setBottomNav);
  const sections = useEditorStore((s) => s.sections);
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const updateGuidebookSettings = useEditorStore((s) => s.updateGuidebookSettings);
  const branding = useEditorStore((s) => s.branding);
  const legacyIconScale = (branding as { icon_scale_nav?: unknown }).icon_scale_nav;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const rowIds = useMemo(() => slots.map(getSlotRowId), [slots]);

  const design = normalizeBottomNavDesignSettings(guidebookSettings, {
    legacyIconScale,
  });

  const usedBuiltins = useMemo<UsedBuiltins>(() => {
    const used: UsedBuiltins = {};
    slots.forEach((slot, index) => {
      if (isBottomNavBuiltinType(slot.type) && used[slot.type] === undefined) {
        used[slot.type] = index;
      }
    });
    return used;
  }, [slots]);

  const availableBuiltins = useMemo(
    () => BOTTOM_NAV_BUILTIN_TYPES.filter((type) => usedBuiltins[type] === undefined),
    [usedBuiltins]
  );

  const writeDesign = (patch: BottomNavDesignSettingsPatch) => {
    updateGuidebookSettings(
      writeBottomNavDesignSettings(guidebookSettings, patch, {
        legacyIconScale,
      })
    );
  };

  const update = (index: number, next: BottomNavSlot) => {
    const copy = slots.slice();
    copy[index] = next;
    setBottomNav(copy);
  };

  const remove = (index: number) => {
    if (slots.length <= BOTTOM_NAV_MIN) return;
    setBottomNav(slots.filter((_, i) => i !== index));
  };

  const add = (type: BottomNavSlot["type"]) => {
    if (slots.length >= BOTTOM_NAV_MAX) return;
    const next = createBottomNavSlot(type, null, sections[0]?.id ?? "");
    setBottomNav([...slots, next]);
  };

  const resetToDefault = () => {
    setBottomNav(BOTTOM_NAV_DEFAULTS.map((slot) => ({ ...slot })));
    updateGuidebookSettings({
      ...guidebookSettings,
      [BOTTOM_NAV_DESIGN_SETTINGS_KEY]: DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rowIds.indexOf(String(active.id));
    const newIndex = rowIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    setBottomNav(arrayMove(slots, oldIndex, newIndex));
  };

  const content = (
    <>
      <EditorSection
        icon={<Navigation />}
        title="Bottom navigation"
        description={`Arrange what guests see in the bottom navigation. ${BOTTOM_NAV_MIN}-${BOTTOM_NAV_MAX} slots.`}
        defaultExpanded
      >
        <RepeaterGroup label="Slots">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rowIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {slots.map((slot, index) => (
                  <BottomNavSlotRow
                    key={rowIds[index] ?? `${slot.type}-${index}`}
                    rowId={rowIds[index] ?? `${slot.type}-${index}`}
                    slot={slot}
                    index={index}
                    usedBuiltins={usedBuiltins}
                    onChange={(next) => update(index, next)}
                    onRemove={() => remove(index)}
                    canRemove={slots.length > BOTTOM_NAV_MIN}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </RepeaterGroup>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={slots.length >= BOTTOM_NAV_MAX}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add slot
              </Button>
            }
          />
          <DropdownMenuContent className="w-48">
            {availableBuiltins.length > 0 ? (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Core pages</DropdownMenuLabel>
                  {availableBuiltins.map((type) => (
                    <DropdownMenuItem key={type} onClick={() => add(type)}>
                      {DESTINATION_LABELS[type]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Custom</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => add("section")}>
                {DESTINATION_LABELS.section}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => add("link")}>
                {DESTINATION_LABELS.link}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </EditorSection>

      <EditorSection
        icon={<Sparkles />}
        title="Quick styles"
        description="Apply a complete visual direction, then tune the details below."
        defaultExpanded
      >
        <SelectRow<BottomNavContainerStyle>
          label="Style preset"
          inline
          value={design.container.style}
          onChange={(style) => writeDesign(QUICK_STYLE_PATCHES[style])}
          options={STYLE_OPTIONS}
        />
      </EditorSection>

      <EditorSection
        icon={<SlidersHorizontal />}
        title="Dock and spacing"
        description="Controls where the nav sits and how much page space it reserves."
      >
        <SegmentedRow<BottomNavDockMode>
          label="Dock"
          value={design.dock.mode}
          onChange={(mode) => writeDesign({ dock: { mode } })}
          options={DOCK_OPTIONS}
          presentation="segmented"
        />
        <PremiumSlider
          label="Nav height"
          value={design.spacing.height}
          min={48}
          max={104}
          step={1}
          format={(value) => `${value}px`}
          onChange={(height) => writeDesign({ spacing: { height } })}
        />
        <PremiumSlider
          label="Side inset"
          value={design.spacing.side_inset}
          min={0}
          max={48}
          step={1}
          format={(value) => `${value}px`}
          onChange={(side_inset) => writeDesign({ spacing: { side_inset } })}
        />
        <PremiumSlider
          label="Bottom offset"
          value={design.spacing.bottom_offset}
          min={0}
          max={56}
          step={1}
          format={(value) => `${value}px`}
          onChange={(bottom_offset) =>
            writeDesign({ spacing: { bottom_offset } })
          }
        />
        <PremiumSlider
          label="Content clearance"
          value={design.spacing.clearance}
          min={0}
          max={120}
          step={1}
          format={(value) => `${value}px`}
          onChange={(clearance) => writeDesign({ spacing: { clearance } })}
        />
        <PremiumSlider
          label="Max width"
          value={design.spacing.max_width}
          min={280}
          max={1600}
          step={20}
          format={(value) => `${value}px`}
          onChange={(max_width) => writeDesign({ spacing: { max_width } })}
        />
        <PremiumSlider
          label="Inner padding"
          value={design.spacing.padding_x}
          min={0}
          max={28}
          step={1}
          format={(value) => `${value}px`}
          onChange={(padding_x) => writeDesign({ spacing: { padding_x } })}
        />
        <PremiumSlider
          label="Item gap"
          value={design.spacing.item_gap}
          min={0}
          max={24}
          step={1}
          format={(value) => `${value}px`}
          onChange={(item_gap) => writeDesign({ spacing: { item_gap } })}
        />
        <ToggleRow
          label="Use safe area"
          description="Adds the device bottom inset on phones with home indicators."
          checked={design.spacing.safe_area}
          onCheckedChange={(safe_area) =>
            writeDesign({ spacing: { safe_area } })
          }
        />
      </EditorSection>

      <EditorSection
        icon={<Paintbrush />}
        title="Container appearance"
        description="Shape and material for the navigation bar."
      >
        <SelectRow<BottomNavContainerStyle>
          label="Container style"
          inline
          value={design.container.style}
          onChange={(style) => writeDesign({ container: { style } })}
          options={STYLE_OPTIONS}
        />
        {design.container.style === "solid_brand" ? (
          <SelectRow<BottomNavBrandRole>
            label="Solid color"
            inline
            value={design.container.solid_color_role}
            onChange={(solid_color_role) =>
              writeDesign({ container: { solid_color_role } })
            }
            options={BRAND_ROLE_OPTIONS}
          />
        ) : null}
        <PremiumSlider
          label="Roundedness"
          value={design.container.radius}
          min={0}
          max={40}
          step={1}
          format={(value) => `${value}px`}
          onChange={(radius) => writeDesign({ container: { radius } })}
        />
        <PremiumSlider
          label="Shadow"
          value={design.container.shadow}
          min={0}
          max={4}
          step={1}
          format={(value) =>
            ["Off", "Soft", "Classic", "High", "Dramatic"][value] ??
            String(value)
          }
          onChange={(shadow) => writeDesign({ container: { shadow } })}
        />
        <PremiumSlider
          label="Border"
          value={design.container.border}
          min={0}
          max={3}
          step={1}
          format={(value) => `${value}px`}
          onChange={(border) => writeDesign({ container: { border } })}
        />
        <PremiumSlider
          label="Blur"
          value={design.container.blur}
          min={0}
          max={28}
          step={1}
          format={(value) => `${value}px`}
          onChange={(blur) => writeDesign({ container: { blur } })}
        />
        <PremiumSlider
          label="Opacity"
          value={design.container.opacity}
          min={0.45}
          max={1}
          step={0.05}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(opacity) => writeDesign({ container: { opacity } })}
        />
      </EditorSection>

      <EditorSection
        icon={<Layers3 />}
        title="Items"
        description="Icon, label, and tap-target styling."
      >
        <SegmentedRow<BottomNavItemLayout>
          label="Item layout"
          value={design.item.layout}
          onChange={(layout) => writeDesign({ item: { layout } })}
          options={ITEM_LAYOUT_OPTIONS}
          presentation="segmented"
        />
        <SelectRow<BottomNavLabelVisibility>
          label="Labels"
          inline
          value={design.item.label_visibility}
          onChange={(label_visibility) =>
            writeDesign({ item: { label_visibility } })
          }
          options={LABEL_VISIBILITY_OPTIONS}
        />
        <SelectRow<BottomNavLabelCase>
          label="Label case"
          inline
          value={design.item.label_case}
          onChange={(label_case) => writeDesign({ item: { label_case } })}
          options={LABEL_CASE_OPTIONS}
        />
        <PremiumSlider
          label="Icon size"
          value={design.item.icon_scale}
          min={0.4}
          max={2.5}
          step={0.05}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(icon_scale) => writeDesign({ item: { icon_scale } })}
        />
        {design.item.label_visibility !== "hide" ? (
          <>
            <ToggleRow
              label="Text size override"
              description="Use a fixed label size instead of the theme text scale."
              checked={design.item.label_size_override}
              onCheckedChange={(label_size_override) =>
                writeDesign({ item: { label_size_override } })
              }
            />
            {design.item.label_size_override ? (
              <PremiumSlider
                label="Text size"
                value={design.item.label_size}
                min={8}
                max={16}
                step={0.1}
                format={(value) => `${value.toFixed(1)}px`}
                onChange={(label_size) => writeDesign({ item: { label_size } })}
              />
            ) : null}
          </>
        ) : null}
        <PremiumSlider
          label="Item height"
          value={design.item.height}
          min={36}
          max={80}
          step={1}
          format={(value) => `${value}px`}
          onChange={(height) => writeDesign({ item: { height } })}
        />
        <PremiumSlider
          label="Item radius"
          value={design.item.radius}
          min={0}
          max={48}
          step={1}
          format={(value) => `${value}px`}
          onChange={(radius) => writeDesign({ item: { radius } })}
        />
      </EditorSection>

      <EditorSection
        icon={<Navigation />}
        title="Active state"
        description="How the current destination is highlighted."
      >
        <SelectRow<BottomNavActiveStyle>
          label="Indicator"
          inline
          value={design.active.style}
          onChange={(style) => writeDesign({ active: { style } })}
          options={ACTIVE_STYLE_OPTIONS}
        />
        <SelectRow<BottomNavBrandRole>
          label="Active color"
          inline
          value={design.active.background_role}
          onChange={(background_role) =>
            writeDesign({ active: { background_role } })
          }
          options={BRAND_ROLE_OPTIONS}
        />
        <SelectRow<BottomNavActiveForegroundRole>
          label="Active foreground"
          inline
          value={design.active.foreground_role}
          onChange={(foreground_role) =>
            writeDesign({ active: { foreground_role } })
          }
          options={ACTIVE_FOREGROUND_OPTIONS}
        />
        {design.active.style === "pill" ? (
          <PremiumSlider
            label="Active side padding"
            hint="Extends the active color left and right."
            value={design.active.padding_x}
            min={0}
            max={28}
            step={1}
            format={(value) => `${value}px`}
            onChange={(padding_x) => writeDesign({ active: { padding_x } })}
          />
        ) : null}
      </EditorSection>

      <EditorSection
        icon={<Badge />}
        title="Badge and behavior"
        description="Store unread badge and intro visibility."
      >
        <SelectRow<BottomNavBadgeStyle>
          label="Badge"
          inline
          value={design.badge.style}
          onChange={(style) => writeDesign({ badge: { style } })}
          options={BADGE_STYLE_OPTIONS}
        />
        {design.badge.style !== "hidden" ? (
          <SelectRow<BottomNavBadgeColorRole>
            label="Badge color"
            inline
            value={design.badge.color_role}
            onChange={(color_role) => writeDesign({ badge: { color_role } })}
            options={BADGE_COLOR_OPTIONS}
          />
        ) : null}
        <SelectRow<BottomNavMotion>
          label="Motion"
          inline
          value={design.behavior.motion}
          onChange={(motion) => writeDesign({ behavior: { motion } })}
          options={MOTION_OPTIONS}
        />
        <ToggleRow
          label="Show during intro"
          description="Keeps the nav visible before guests enter the guide."
          checked={design.behavior.show_during_intro}
          onCheckedChange={(show_during_intro) =>
            writeDesign({ behavior: { show_during_intro } })
          }
        />
      </EditorSection>
    </>
  );

  if (embedded) {
    return (
      <div className="h-full min-w-0 overflow-y-auto overflow-x-hidden bg-background">
        <div className="flex justify-end px-4 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetToDefault}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
          </Button>
        </div>
        <div className="min-w-0 space-y-4 p-4 pt-3">{content}</div>
      </div>
    );
  }

  return (
    <EditorPanelShell
      title="Navigation"
      description="Arrange destinations and tune the bottom nav."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={resetToDefault}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
        </Button>
      }
    >
      {content}
    </EditorPanelShell>
  );
}
