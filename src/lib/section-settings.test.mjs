import assert from "node:assert/strict";
import test from "node:test";

const settingsModule = await import("./section-settings.ts");
const {
  DEFAULT_SECTION_INDEX_SETTINGS,
  SECTION_INDEX_SETTINGS_KEY,
  normalizeSectionIndexSettings,
} = settingsModule.default ?? settingsModule;

test("normalizes legacy section index settings with layout and intro only", () => {
  const settings = normalizeSectionIndexSettings({
    [SECTION_INDEX_SETTINGS_KEY]: {
      layout: "list",
      intro: {
        enabled: false,
        eyebrow: "Guest guide",
        title: "Start here",
        subtitle: "Everything in one place.",
      },
    },
  });

  assert.equal(settings.layout, "list");
  assert.deepEqual(settings.intro, {
    enabled: false,
    eyebrow: "Guest guide",
    title: "Start here",
    subtitle: "Everything in one place.",
  });
  assert.deepEqual(settings.card, DEFAULT_SECTION_INDEX_SETTINGS.card);
  assert.deepEqual(settings.spacing, DEFAULT_SECTION_INDEX_SETTINGS.spacing);
  assert.deepEqual(settings.grid, DEFAULT_SECTION_INDEX_SETTINGS.grid);
  assert.deepEqual(settings.list, DEFAULT_SECTION_INDEX_SETTINGS.list);
  assert.deepEqual(settings.bento, DEFAULT_SECTION_INDEX_SETTINGS.bento);
});

test("normalizes legacy masonry layout into bento card options", () => {
  const settings = normalizeSectionIndexSettings({
    [SECTION_INDEX_SETTINGS_KEY]: {
      layout: "masonry",
      card: {
        style: "solid_brand",
        solid_color_role: "secondary",
        radius: 24,
        shadow: 3,
        padding: 20,
      },
      spacing: {
        gap: 18,
        page_x: 24,
        page_top: 12,
        page_bottom: 44,
        max_width: 900,
      },
      masonry: {
        icon_placement: "left",
        card_min_width: 180,
        card_min_height: 140,
        rhythm: "mixed",
      },
    },
  });

  assert.equal(settings.layout, "bento");
  assert.deepEqual(settings.card, {
    style: "solid_brand",
    solid_color_role: "secondary",
    radius: 24,
    shadow: 3,
    padding: 20,
  });
  assert.deepEqual(settings.spacing, {
    gap: 18,
    page_x: 24,
    page_top: 12,
    page_bottom: 44,
    max_width: 900,
  });
  assert.deepEqual(settings.bento, {
    icon_placement: "left",
    card_min_width: 180,
    card_min_height: 140,
    pattern: "showcase",
  });
});

test("normalizes bento layout and pattern options", () => {
  const settings = normalizeSectionIndexSettings({
    [SECTION_INDEX_SETTINGS_KEY]: {
      layout: "bento",
      bento: {
        icon_placement: "right",
        card_min_width: 168,
        card_min_height: 128,
        pattern: "compact",
      },
    },
  });

  assert.equal(settings.layout, "bento");
  assert.deepEqual(settings.bento, {
    icon_placement: "right",
    card_min_width: 168,
    card_min_height: 128,
    pattern: "compact",
  });
});

test("falls back for invalid enums and clamps numeric options", () => {
  const settings = normalizeSectionIndexSettings({
    [SECTION_INDEX_SETTINGS_KEY]: {
      layout: "stack",
      card: {
        style: "glow",
        solid_color_role: "background",
        radius: -10,
        shadow: 99,
        padding: 99,
      },
      spacing: {
        gap: 1,
        page_x: 99,
        page_top: -5,
        page_bottom: 999,
        max_width: 9999,
      },
      grid: {
        icon_placement: "corner",
        card_min_width: 1,
        card_min_height: 999,
      },
      list: {
        icon_placement: "top",
        row_height: 1,
        show_arrow: "no",
      },
      masonry: {
        icon_placement: "corner",
        card_min_width: 999,
        card_min_height: 999,
        rhythm: "random",
      },
    },
  });

  assert.equal(settings.layout, DEFAULT_SECTION_INDEX_SETTINGS.layout);
  assert.deepEqual(settings.card, {
    style: DEFAULT_SECTION_INDEX_SETTINGS.card.style,
    solid_color_role: DEFAULT_SECTION_INDEX_SETTINGS.card.solid_color_role,
    radius: 0,
    shadow: 4,
    padding: 32,
  });
  assert.deepEqual(settings.spacing, {
    gap: 4,
    page_x: 48,
    page_top: 0,
    page_bottom: 96,
    max_width: 1200,
  });
  assert.deepEqual(settings.grid, {
    icon_placement: DEFAULT_SECTION_INDEX_SETTINGS.grid.icon_placement,
    card_min_width: 112,
    card_min_height: 220,
  });
  assert.deepEqual(settings.list, {
    icon_placement: DEFAULT_SECTION_INDEX_SETTINGS.list.icon_placement,
    row_height: 48,
    show_arrow: DEFAULT_SECTION_INDEX_SETTINGS.list.show_arrow,
  });
  assert.deepEqual(settings.bento, {
    icon_placement: DEFAULT_SECTION_INDEX_SETTINGS.bento.icon_placement,
    card_min_width: 320,
    card_min_height: 240,
    pattern: DEFAULT_SECTION_INDEX_SETTINGS.bento.pattern,
  });
});

test("solid brand style defaults to the primary brand role", () => {
  const settings = normalizeSectionIndexSettings({
    [SECTION_INDEX_SETTINGS_KEY]: {
      card: {
        style: "solid_brand",
      },
    },
  });

  assert.equal(settings.card.style, "solid_brand");
  assert.equal(settings.card.solid_color_role, "primary");
});
