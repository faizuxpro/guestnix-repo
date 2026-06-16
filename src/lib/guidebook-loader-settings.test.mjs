import assert from "node:assert/strict";
import test from "node:test";

const loaderModule = await import("./guidebook-loader-settings.ts");
const {
  GUIDEBOOK_LOADER_MIN_DURATION_MS,
  GUIDEBOOK_LOADER_SETTINGS_KEY,
  createPublishedGuidebookLoaderConfig,
  normalizeGuidebookLoaderSettings,
} = loaderModule.default ?? loaderModule;

test("keeps the guidebook loader minimum duration at 3 seconds", () => {
  assert.equal(GUIDEBOOK_LOADER_MIN_DURATION_MS, 3_000);
});

test("inherits loader colors from guidebook branding by default", () => {
  const settings = normalizeGuidebookLoaderSettings(
    { [GUIDEBOOK_LOADER_SETTINGS_KEY]: {} },
    { primary_color: "#f8fafc", accent_color: "#123456" }
  );

  assert.equal(settings.background_color, "#f8fafc");
  assert.equal(settings.foreground_color, "#0f172a");
  assert.equal(settings.accent_color, "#123456");
  assert.equal(settings.background_color_override, false);
  assert.equal(settings.foreground_color_override, false);
  assert.equal(settings.accent_color_override, false);
});

test("ignores stored loader colors while override flags are off", () => {
  const settings = normalizeGuidebookLoaderSettings(
    {
      [GUIDEBOOK_LOADER_SETTINGS_KEY]: {
        background_color: "#111111",
        foreground_color: "#222222",
        accent_color: "#333333",
        background_color_override: false,
        foreground_color_override: false,
        accent_color_override: false,
      },
    },
    { primary_color: "#eeeeee", accent_color: "#abcdef" }
  );

  assert.equal(settings.background_color, "#eeeeee");
  assert.equal(settings.foreground_color, "#0f172a");
  assert.equal(settings.accent_color, "#abcdef");
});

test("uses stored loader colors when override flags are on", () => {
  const settings = normalizeGuidebookLoaderSettings(
    {
      [GUIDEBOOK_LOADER_SETTINGS_KEY]: {
        background_color: "#111111",
        foreground_color: "#eeeeee",
        accent_color: "#333333",
        background_color_override: true,
        foreground_color_override: true,
        accent_color_override: true,
      },
    },
    { primary_color: "#fafafa", accent_color: "#abcdef" }
  );

  assert.equal(settings.background_color, "#111111");
  assert.equal(settings.foreground_color, "#eeeeee");
  assert.equal(settings.accent_color, "#333333");
});

test("auto text color follows a custom background when text override is off", () => {
  const settings = normalizeGuidebookLoaderSettings(
    {
      [GUIDEBOOK_LOADER_SETTINGS_KEY]: {
        background_color: "#ffffff",
        foreground_color: "#ff0000",
        background_color_override: true,
        foreground_color_override: false,
      },
    },
    { primary_color: "#002927" }
  );

  assert.equal(settings.background_color, "#ffffff");
  assert.equal(settings.foreground_color, "#0f172a");
});

test("published loader configs contain resolved self-contained colors", () => {
  const config = createPublishedGuidebookLoaderConfig(
    { [GUIDEBOOK_LOADER_SETTINGS_KEY]: {} },
    { primary_color: "#123456", accent_color: "#fedcba" }
  );

  assert.equal(config.background_color, "#123456");
  assert.equal(config.foreground_color, "#ffffff");
  assert.equal(config.accent_color, "#fedcba");
  assert.equal(config.background_color_override, true);
  assert.equal(config.foreground_color_override, true);
  assert.equal(config.accent_color_override, true);
});
