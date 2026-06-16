import assert from "node:assert/strict";
import test from "node:test";

const heroModule = await import("./hero-data.ts");
const {
  HERO_GLASS_SHADOW_DEFAULT,
  HERO_SPLASH_BLOCK_TYPES,
  HERO_SPLASH_CONTAINER_DEFAULT,
  HERO_SOLID_BACKGROUND_COLOR_DEFAULT,
  HERO_SOLID_BACKGROUND_OPACITY_DEFAULT,
  buildHomePresetPatch,
  extractHeroSplashFontFamilies,
  heroDataPatchSchema,
  normalizeHeroData,
} = heroModule.default ?? heroModule;

test("normalizes home glass shadow settings to current defaults", () => {
  const heroData = normalizeHeroData({});

  assert.deepEqual(heroData.home.glass_shadow, HERO_GLASS_SHADOW_DEFAULT);
  assert.deepEqual(heroData.home.glass_shadow, {
    enabled: true,
    color: "#0F172A",
    opacity: 0.9,
    blur: 5,
    offset_x: -1,
    offset_y: 2,
  });
});

test("preserves custom home glass shadow settings", () => {
  const heroData = normalizeHeroData({
    home: {
      preset: "card",
      glass_shadow: {
        enabled: true,
        color: "#123456",
        opacity: 0.72,
        blur: 26,
        offset_x: -3,
        offset_y: 9,
      },
    },
  });

  assert.deepEqual(heroData.home.glass_shadow, {
    enabled: true,
    color: "#123456",
    opacity: 0.72,
    blur: 26,
    offset_x: -3,
    offset_y: 9,
  });
});

test("accepts partial home glass shadow patches", () => {
  const parsed = heroDataPatchSchema.parse({
    home: {
      glass_shadow: {
        enabled: true,
        opacity: 0.35,
        offset_y: 12,
      },
    },
  });

  assert.deepEqual(parsed.home.glass_shadow, {
    enabled: true,
    opacity: 0.35,
    offset_y: 12,
  });
});

test("normalizes solid overlay background opacity to current default", () => {
  const heroData = normalizeHeroData({});

  assert.equal(HERO_SOLID_BACKGROUND_OPACITY_DEFAULT, 1);
  assert.equal(
    heroData.home.solid_background_opacity,
    HERO_SOLID_BACKGROUND_OPACITY_DEFAULT
  );
});

test("accepts partial solid overlay background opacity patches", () => {
  const parsed = heroDataPatchSchema.parse({
    home: {
      solid_background_opacity: 0.68,
    },
  });

  assert.equal(parsed.home.solid_background_opacity, 0.68);
});

test("normalizes solid overlay background color override to current default", () => {
  const heroData = normalizeHeroData({});

  assert.deepEqual(heroData.home.solid_background_color, {
    enabled: false,
    color: "#002927",
  });
  assert.deepEqual(
    heroData.home.solid_background_color,
    HERO_SOLID_BACKGROUND_COLOR_DEFAULT
  );
});

test("preserves custom solid overlay background color override", () => {
  const heroData = normalizeHeroData({
    home: {
      preset: "classic",
      solid_background_color: {
        enabled: true,
        color: "#123456",
      },
    },
  });

  assert.deepEqual(heroData.home.solid_background_color, {
    enabled: true,
    color: "#123456",
  });
});

test("accepts partial solid overlay background color patches", () => {
  const parsed = heroDataPatchSchema.parse({
    home: {
      solid_background_color: {
        enabled: true,
      },
    },
  });

  assert.deepEqual(parsed.home.solid_background_color, {
    enabled: true,
  });
});

test("selecting the glass home preset enables the default content shadow", () => {
  assert.deepEqual(buildHomePresetPatch("card", "classic"), {
    preset: "card",
    glass_shadow: HERO_GLASS_SHADOW_DEFAULT,
  });
});

test("selecting the minimal home preset enables the default content shadow", () => {
  assert.deepEqual(buildHomePresetPatch("minimal", "classic"), {
    preset: "minimal",
    glass_shadow: HERO_GLASS_SHADOW_DEFAULT,
  });
});

test("reselecting glass leaves existing shadow customization untouched", () => {
  assert.deepEqual(buildHomePresetPatch("card", "card"), {
    preset: "card",
  });
});

test("switching between shadow-capable presets leaves shadow customization untouched", () => {
  assert.deepEqual(buildHomePresetPatch("minimal", "card"), {
    preset: "minimal",
  });
  assert.deepEqual(buildHomePresetPatch("card", "minimal"), {
    preset: "card",
  });
});

test("normalizes default splash blocks and overlay container", () => {
  const heroData = normalizeHeroData({});

  assert.deepEqual(heroData.home.times, {
    checkin_label: "Check-in",
    checkin_time: "4:00 PM",
    checkout_label: "Check-out",
    checkout_time: "11:00 AM",
  });
  assert.deepEqual(
    heroData.home.splash_blocks.map((block) => block.type),
    [...HERO_SPLASH_BLOCK_TYPES]
  );
  assert.deepEqual(heroData.home.overlay_container, HERO_SPLASH_CONTAINER_DEFAULT);

  const byType = new Map(
    heroData.home.splash_blocks.map((block) => [block.type, block])
  );
  assert.equal(byType.get("logo").visible, true);
  assert.equal(byType.get("title").visible, true);
  assert.equal(byType.get("tagline").visible, true);
  assert.equal(byType.get("host").visible, true);
  assert.equal(byType.get("contact").visible, true);
  assert.equal(byType.get("times").visible, false);
  assert.equal(byType.get("button").visible, true);
  assert.equal(byType.get("contact").style.icon_phone, "lucide:phone");
  assert.equal(byType.get("contact").style.icon_email, "lucide:mail");
  assert.equal(byType.get("contact").style.icon_address, "lucide:map-pin");
  assert.equal(byType.get("contact").style.icon_align, "center");
  assert.equal(byType.get("contact").style.padding_top, 0);
  assert.equal(byType.get("contact").style.padding_bottom, 0);
  assert.equal(byType.get("times").style.inherit_contact_style, true);
  assert.equal(byType.get("times").style.icon_checkin, "lucide:log-in");
  assert.equal(byType.get("times").style.icon_checkout, "lucide:log-out");
});

test("legacy home show flags seed generated splash block visibility", () => {
  const heroData = normalizeHeroData({
    home: {
      show: {
        subtitle: false,
        phone: false,
        email: false,
        address: false,
        times: true,
      },
    },
  });

  const byType = new Map(
    heroData.home.splash_blocks.map((block) => [block.type, block])
  );
  assert.equal(byType.get("tagline").visible, false);
  assert.equal(byType.get("contact").visible, false);
  assert.equal(byType.get("times").visible, true);
  assert.equal(byType.get("title").visible, true);
  assert.equal(byType.get("button").visible, true);
});

test("custom splash block order and styles are preserved with missing blocks appended", () => {
  const heroData = normalizeHeroData({
    home: {
      splash_blocks: [
        {
          id: "button",
          type: "button",
          visible: true,
          style: {
            font_family: "Playfair Display",
            font_size: 18,
            font_weight: 800,
          },
        },
        {
          id: "title",
          type: "title",
          visible: false,
          style: {
            max_width: 500,
            line_height: 1.4,
          },
        },
      ],
    },
  });

  assert.deepEqual(
    heroData.home.splash_blocks.map((block) => block.type),
    ["button", "title", "logo", "tagline", "host", "contact", "times"]
  );

  const button = heroData.home.splash_blocks[0];
  assert.equal(button.style.font_family, "Playfair Display");
  assert.equal(button.style.font_size, 18);
  assert.equal(button.style.font_weight, 800);
  assert.equal(button.style.max_width, 240);

  const title = heroData.home.splash_blocks[1];
  assert.equal(title.visible, false);
  assert.equal(title.style.max_width, 500);
  assert.equal(title.style.line_height, 1.4);
});

test("accepts partial splash block and overlay container patches", () => {
  const parsed = heroDataPatchSchema.parse({
    home: {
      times: {
        checkin_label: "Arrival",
        checkout_label: "Departure",
      },
      splash_blocks: [
        {
          id: "title",
          type: "title",
          visible: true,
          style: {
            font_size: 44,
            padding_top: 6,
            icon_style: "circle",
          },
        },
      ],
      overlay_container: {
        width: 520,
        max_height: 1500,
        padding_y: 18,
      },
    },
  });

  assert.equal(parsed.home.splash_blocks[0].style.font_size, 44);
  assert.equal(parsed.home.splash_blocks[0].style.font_weight, 700);
  assert.equal(parsed.home.splash_blocks[0].style.padding_top, 6);
  assert.equal(parsed.home.splash_blocks[0].style.icon_style, "circle");
  assert.deepEqual(parsed.home.times, {
    checkin_label: "Arrival",
    checkout_label: "Departure",
  });
  assert.deepEqual(parsed.home.overlay_container, {
    width: 520,
    max_height: 1500,
    padding_y: 18,
  });
});

test("extracts splash block font families from hero data or home config", () => {
  const heroData = normalizeHeroData({
    home: {
      splash_blocks: [
        {
          id: "title",
          type: "title",
          visible: true,
          style: {
            font_family: "Playfair Display",
          },
        },
        {
          id: "tagline",
          type: "tagline",
          visible: true,
          style: {
            font_family: "Montserrat",
          },
        },
      ],
    },
  });

  assert.deepEqual(extractHeroSplashFontFamilies(heroData), [
    "Playfair Display",
    "Montserrat",
  ]);
  assert.deepEqual(extractHeroSplashFontFamilies(heroData.home), [
    "Playfair Display",
    "Montserrat",
  ]);
});
