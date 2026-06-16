import assert from "node:assert/strict";
import test from "node:test";

const settingsModule = await import("./bottom-nav-settings.ts");
const bottomNavModule = await import("./bottom-nav.ts");

const {
  BOTTOM_NAV_DESIGN_SETTINGS_KEY,
  DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS,
  normalizeBottomNavDesignSettings,
  writeBottomNavDesignSettings,
} = settingsModule.default ?? settingsModule;
const { hasDuplicateBuiltinSlots, parseStoredSlots } =
  bottomNavModule.default ?? bottomNavModule;

test("normalizes empty bottom nav design settings to current defaults", () => {
  const settings = normalizeBottomNavDesignSettings({});

  assert.deepEqual(settings, DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS);
  assert.equal(settings.dock.mode, "floating");
  assert.equal(settings.container.style, "brand");
  assert.equal(settings.spacing.height, 66);
  assert.equal(settings.item.layout, "stacked");
  assert.equal(settings.active.style, "pill");
  assert.equal(settings.behavior.show_during_intro, false);
});

test("falls back for invalid enums and clamps numeric bottom nav options", () => {
  const settings = normalizeBottomNavDesignSettings({
    [BOTTOM_NAV_DESIGN_SETTINGS_KEY]: {
      dock: { mode: "side" },
      container: {
        style: "chrome",
        solid_color_role: "background",
        radius: -10,
        shadow: 99,
        border: 9,
        blur: 99,
        opacity: 0.1,
      },
      spacing: {
        height: 10,
        side_inset: 999,
        bottom_offset: -1,
        clearance: 999,
        max_width: 99,
        padding_x: 999,
        padding_y: 999,
        item_gap: 999,
        safe_area: "yes",
      },
      item: {
        layout: "grid",
        label_visibility: "sometimes",
        label_case: "shout",
        icon_scale: 9,
        label_size: 99,
        height: 4,
        radius: 999,
      },
      active: {
        style: "glow",
        background_role: "neutral",
        foreground_role: "paper",
      },
      badge: {
        style: "number",
        color_role: "warning",
      },
      behavior: {
        show_during_intro: "no",
        motion: "wild",
      },
    },
  });

  assert.equal(settings.dock.mode, DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.dock.mode);
  assert.deepEqual(settings.container, {
    style: DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.container.style,
    solid_color_role:
      DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.container.solid_color_role,
    radius: 0,
    shadow: 4,
    border: 3,
    blur: 28,
    opacity: 0.45,
  });
  assert.deepEqual(settings.spacing, {
    height: 48,
    side_inset: 48,
    bottom_offset: 0,
    clearance: 120,
    max_width: 280,
    padding_x: 28,
    padding_y: 20,
    item_gap: 24,
    safe_area: DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.spacing.safe_area,
  });
  assert.deepEqual(settings.item, {
    layout: DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.layout,
    label_visibility:
      DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.label_visibility,
    label_case: DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.item.label_case,
    icon_scale: 2.5,
    label_size: 16,
    height: 36,
    radius: 48,
  });
  assert.deepEqual(settings.active, DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.active);
  assert.deepEqual(settings.badge, DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.badge);
  assert.deepEqual(
    settings.behavior,
    DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS.behavior
  );
});

test("solid brand style defaults to primary and reads legacy icon scale", () => {
  const settings = normalizeBottomNavDesignSettings(
    {
      [BOTTOM_NAV_DESIGN_SETTINGS_KEY]: {
        container: { style: "solid_brand" },
      },
    },
    { legacyIconScale: 1.35 }
  );

  assert.equal(settings.container.style, "solid_brand");
  assert.equal(settings.container.solid_color_role, "primary");
  assert.equal(settings.item.icon_scale, 1.35);
});

test("writer preserves legacy icon scale when creating bottom nav design", () => {
  const written = writeBottomNavDesignSettings(
    {},
    { container: { style: "surface" } },
    { legacyIconScale: 1.2 }
  );
  const settings = normalizeBottomNavDesignSettings(written);

  assert.equal(settings.container.style, "surface");
  assert.equal(settings.item.icon_scale, 1.2);
});

test("slot parsing drops duplicate built-ins but allows section and link repeats", () => {
  const slots = parseStoredSlots([
    { type: "home", label: "Home", icon: "" },
    { type: "home", label: "Home duplicate", icon: "" },
    { type: "guide", label: "Guide", icon: "" },
    { type: "section", label: "A", icon: "", sectionId: "section-a" },
    { type: "section", label: "B", icon: "", sectionId: "section-b" },
    { type: "link", label: "Site", icon: "", url: "https://example.com" },
  ]);

  assert.deepEqual(
    slots.map((slot) => slot.type),
    ["home", "guide", "section", "section", "link"]
  );
  assert.equal(slots[0].label, "Home");
});

test("duplicate built-in helper ignores repeat custom slots", () => {
  assert.equal(
    hasDuplicateBuiltinSlots([
      { type: "home" },
      { type: "section" },
      { type: "section" },
      { type: "link" },
    ]),
    false
  );
  assert.equal(
    hasDuplicateBuiltinSlots([{ type: "store" }, { type: "store" }]),
    true
  );
});
