import assert from "node:assert/strict";
import test from "node:test";

const faviconModule = await import("./guidebook-favicon.ts");
const heroModule = await import("./hero-data.ts");

const {
  GUESTNIX_FAVICON_URL,
  normalizeGuidebookFaviconSettings,
  resolveGuidebookFaviconSource,
  resolveGuidebookFaviconUrl,
} = faviconModule.default ?? faviconModule;
const { normalizeHeroData } = heroModule.default ?? heroModule;

function guidebook(input = {}) {
  return {
    branding: input.branding ?? {},
    settings: input.settings ?? {},
    heroData: normalizeHeroData(input.heroData ?? {}),
  };
}

test("defaults to Guestnix instead of auto-prioritizing guidebook images", () => {
  const url = resolveGuidebookFaviconUrl(
    guidebook({
      settings: {
        topbar: {
          brand: {
            logo_mode: "custom",
            logo_url: "https://cdn.example.com/header.png",
          },
        },
      },
      heroData: {
        property: { logo_url: "https://cdn.example.com/home.png" },
        host: { avatar_url: "https://cdn.example.com/host.jpg" },
      },
    })
  );

  assert.equal(url, GUESTNIX_FAVICON_URL);
});

test("uses uploaded favicon when custom source is selected", () => {
  const source = resolveGuidebookFaviconSource(
    guidebook({
      settings: {
        favicon: {
          source: "custom",
          custom_url: "https://cdn.example.com/favicon.ico",
        },
      },
    })
  );

  assert.deepEqual(source, {
    url: "https://cdn.example.com/favicon.ico",
    source: "custom",
    fit: "contain",
  });
});

test("uses header logo only when header source is selected", () => {
  const source = resolveGuidebookFaviconSource(
    guidebook({
      settings: {
        favicon: { source: "header" },
        topbar: {
          brand: {
            logo_mode: "custom",
            logo_url: "https://cdn.example.com/header.png",
          },
        },
      },
      heroData: {
        property: { logo_url: "https://cdn.example.com/home.png" },
      },
    })
  );

  assert.deepEqual(source, {
    url: "https://cdn.example.com/header.png",
    source: "header",
    fit: "contain",
  });
});

test("uses home logo when home source is selected", () => {
  const source = resolveGuidebookFaviconSource(
    guidebook({
      settings: {
        favicon: { source: "home" },
      },
      heroData: {
        property: { logo_url: "https://cdn.example.com/home.png" },
        host: { avatar_url: "https://cdn.example.com/host.jpg" },
      },
    })
  );

  assert.deepEqual(source, {
    url: "https://cdn.example.com/home.png",
    source: "home",
    fit: "contain",
  });
});

test("uses host photo when host source is selected", () => {
  const source = resolveGuidebookFaviconSource(
    guidebook({
      settings: {
        favicon: { source: "host" },
      },
      heroData: {
        property: { logo_url: "https://cdn.example.com/home.png" },
        host: { avatar_url: "https://cdn.example.com/host.jpg" },
      },
    })
  );

  assert.deepEqual(source, {
    url: "https://cdn.example.com/host.jpg",
    source: "host",
    fit: "cover",
  });
});

test("falls back to Guestnix when selected source has no usable image", () => {
  const source = resolveGuidebookFaviconSource(
    guidebook({
      settings: {
        favicon: { source: "custom", custom_url: "" },
      },
      heroData: {
        property: { logo_url: "https://cdn.example.com/home.png" },
      },
    })
  );

  assert.deepEqual(source, {
    url: GUESTNIX_FAVICON_URL,
    source: "guestnix",
    fit: "contain",
  });
});

test("normalizes invalid favicon settings", () => {
  assert.deepEqual(
    normalizeGuidebookFaviconSettings({
      favicon: { source: "auto", custom_url: "javascript:alert(1)" },
    }),
    { source: "guestnix", custom_url: null }
  );
});
