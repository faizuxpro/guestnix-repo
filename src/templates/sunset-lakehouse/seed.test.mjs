import assert from "node:assert/strict";
import test from "node:test";

const seedModule = await import("./seed.ts");
const { buildSeedGuidebookSettings, sunsetLakehouseSeed } =
  seedModule.default ?? seedModule;

test("sunset seed preserves the v57 guidebook-level editor configuration", () => {
  assert.equal(sunsetLakehouseSeed.branding.primary_color, "#16101c");
  assert.equal(sunsetLakehouseSeed.branding.background_pattern, "dots");
  assert.equal(sunsetLakehouseSeed.branding.section_background_pattern, "dots");

  assert.deepEqual(
    sunsetLakehouseSeed.bottomNav.map((slot) => slot.type),
    ["home", "guide", "store", "nearby", "host"]
  );
  assert.ok(sunsetLakehouseSeed.bottomNav.every((slot) => slot.icon));

  assert.equal(sunsetLakehouseSeed.heroData.property.name, "{{property_name}}");
  assert.equal(sunsetLakehouseSeed.heroData.home.button_label, "Click");
  assert.equal(sunsetLakehouseSeed.heroData.home.overlay_container.width, 400);
  assert.equal(sunsetLakehouseSeed.heroData.host_page.show.social, true);

  assert.deepEqual(sunsetLakehouseSeed.settings.languages, {
    enabled: true,
    available: ["fr", "es", "da"],
    base_language: "en",
  });
  assert.equal(sunsetLakehouseSeed.settings.topbar.layout.height, 54);
  assert.equal(sunsetLakehouseSeed.settings.chat_widget.motion, "lively");
  assert.deepEqual(sunsetLakehouseSeed.settings.nearby.categories, []);
  assert.deepEqual(sunsetLakehouseSeed.settings.nearby.search_categories, []);
  assert.equal(
    sunsetLakehouseSeed.settings.nearby.intro.title,
    "Places Explorer"
  );
  assert.equal(sunsetLakehouseSeed.settings.store.listingStyle, "catalogue");
  assert.equal(sunsetLakehouseSeed.settings.store.intro.title, "Store");
});

test("sunset seed uses the v57 quick-start content without seeding map or store rows", () => {
  assert.deepEqual(
    sunsetLakehouseSeed.sections.map((section) => section.title),
    [
      "Welcome",
      "Meet Host",
      "Check-in / out",
      "Wi-Fi",
      "Amenities",
      "House Rules",
      "Kitchen & Dining",
      "Emergency",
      "Pet",
      "Sustainability",
      "FAQ",
      "Contact / Booking",
    ]
  );

  assert.equal(sunsetLakehouseSeed.sections.length, 12);
  assert.equal(
    sunsetLakehouseSeed.sections.reduce(
      (total, section) => total + section.blocks.length,
      0
    ),
    37
  );
  assert.equal("places" in sunsetLakehouseSeed, false);
  assert.equal("storefront" in sunsetLakehouseSeed, false);

  const sectionIds = sunsetLakehouseSeed.sections.map(
    (_, index) => `section-${index}`
  );
  const settings = buildSeedGuidebookSettings(
    sunsetLakehouseSeed,
    sectionIds
  );
  assert.equal(Object.keys(settings.content_units).length, 12);
  assert.equal(
    settings.content_units["section-0"].itemSettings.section_cover.title_text,
    "Feel Home \uD83C\uDF1FFeel Peace"
  );
});

test("sunset seed uses preset quick variables for host and property placeholders", () => {
  const serialized = JSON.stringify(sunsetLakehouseSeed);
  const forbiddenLiterals = [
    "Sunset Lake House",
    "SunsetLakehouse_Guest",
    "LakeSunset2026!",
    "Jane Doe",
    "147 Maple Hollow Road",
    "Asheville",
    "+1 (555) 010-2400",
    "+1 (555) 010-7711",
    "+1 (555) 010-8844",
    "hello@sunsetlakehouse.example",
  ];

  for (const literal of forbiddenLiterals) {
    assert.equal(
      serialized.includes(literal),
      false,
      `Seed should not include hardcoded sample literal: ${literal}`
    );
  }

  assert.equal(sunsetLakehouseSeed.heroData.property.address, "{{property_location}}");
  assert.equal(sunsetLakehouseSeed.heroData.host.name, "{{host_name}}");
  assert.equal(sunsetLakehouseSeed.heroData.host.phone, "{{host_phone}}");
  assert.equal(sunsetLakehouseSeed.heroData.host.email, "{{host_email}}");
});
