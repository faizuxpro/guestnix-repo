import assert from "node:assert/strict";
import test from "node:test";

const normalizeModule = await import("./normalize.ts");
const { createPrintDocument } =
  normalizeModule.default ?? normalizeModule;

const snapshot = {
  schemaVersion: 1,
  version: 3,
  publishedAt: "2026-06-08T08:00:00.000Z",
  guidebook: {
    id: "guide-1",
    title: "Harbor House",
    slug: "harbor-house",
    templateId: "sunset-lakehouse",
    branding: {
      primary_color: "#123456",
      secondary_color: "#abcdef",
      accent_color: "#ffcc00",
      background_color: "#f7f3ec",
      heading_font: "Fraunces",
      body_font: "Montserrat",
      heading_weight: 600,
      body_weight: 500,
      heading_letter_spacing: 0.02,
      body_letter_spacing: 0.01,
      heading_line_height: 1.1,
      body_line_height: 1.45,
      custom_fonts: [
        {
          family: "Host Serif",
          source: "upload",
          url: "https://example.com/host-serif.woff2",
          format: "woff2",
          weights: [400, 700],
        },
      ],
    },
    heroData: {
      property: {
        name: "Harbor House",
        tagline: "Steps from the pier",
        address: "12 Dock Street",
        city: "Portview",
        country: "US",
        cover_image_url: "https://example.com/cover.jpg",
        logo_url: null,
      },
      host: {
        name: "Mina Host",
        phone: "+15551234567",
        email: "mina@example.com",
        bio: "We love sharing our favorite local spots.",
        languages: "English, Spanish",
        superhost: true,
        avatar_url: "https://example.com/host.jpg",
        social: [],
      },
      home: {},
      host_page: {
        photo_source: "host_avatar",
        show: {},
      },
    },
    bottomNav: [],
    settings: {},
    propertyName: "Harbor House",
    hostFirstName: "Mina",
  },
  sections: [
    {
      id: "visible-section",
      title: "Arrival",
      icon: "<svg viewBox=\"0 0 24 24\"><path d=\"M4 20h16L12 4z\" /></svg>",
      orderIndex: 2,
      isVisible: true,
      kind: "guide",
      displayMode: "popup",
      itemSettings: {
        section_cover: {
          image_url: "https://example.com/arrival.jpg",
          title_text: "Arrival day",
        },
      },
    },
    {
      id: "hidden-section",
      title: "Hidden",
      icon: "",
      orderIndex: 1,
      isVisible: false,
      kind: "guide",
      displayMode: "popup",
      itemSettings: {},
    },
  ],
  blocks: [
    {
      id: "wifi",
      sectionId: "visible-section",
      type: "wifi",
      orderIndex: 2,
      isVisible: true,
      content: {
        network_name: "HarborWifi",
        password: "sea-view",
        notes: "Router is in the hall closet.",
      },
    },
    {
      id: "button",
      sectionId: "visible-section",
      type: "button",
      orderIndex: 3,
      isVisible: true,
      content: {
        label: "Parking directions",
        action: "url",
        value: "example.com/parking",
        icon: "<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"8\" /></svg>",
      },
    },
    {
      id: "hidden-block",
      sectionId: "visible-section",
      type: "heading",
      orderIndex: 1,
      isVisible: false,
      content: { text: "Hidden heading" },
    },
  ],
  places: [
    {
      id: "place-1",
      name: "Pier Coffee",
      category: "cafe",
      description: "Good breakfast.",
      address: "1 Pier Road",
      lat: 1,
      lng: 2,
      phone: null,
      website: "pier.example.com",
      email: null,
      imageUrl: "https://example.com/cafe.jpg",
      openingHours: "8-4",
      tags: null,
    },
  ],
};

test("creates a print document from the published guidebook snapshot", () => {
  const doc = createPrintDocument(snapshot, {
    publicUrl: "https://guestnix.com/g/harbor-house",
  });

  assert.equal(doc.title, "Harbor House");
  assert.equal(doc.publicUrl, "https://guestnix.com/g/harbor-house");
  assert.equal(doc.sections.length, 1);
  assert.equal(doc.sections[0].title, "Arrival");
  assert.deepEqual(
    doc.sections[0].blocks.map((block) => block.id),
    ["wifi", "button"]
  );
  assert.equal(doc.sections[0].blocks[0].kind, "wifi");
  assert.equal(doc.sections[0].blocks[0].fields[0].label, "Network");
  assert.equal(doc.sections[0].blocks[1].kind, "link");
  assert.equal(doc.sections[0].blocks[1].url, "https://example.com/parking");
  assert.match(doc.sections[0].blocks[1].icon ?? "", /^<svg/);
  assert.equal(doc.places[0].website, "https://pier.example.com");
  assert.equal(doc.brand.primaryColor, "#123456");
  assert.equal(doc.brand.backgroundColor, "#f7f3ec");
  assert.equal(doc.brand.headingWeight, 600);
  assert.equal(doc.brand.bodyWeight, 500);
  assert.equal(doc.brand.headingLetterSpacing, 0.02);
  assert.equal(doc.brand.bodyLetterSpacing, 0.01);
  assert.equal(doc.brand.headingLineHeight, 1.1);
  assert.equal(doc.brand.bodyLineHeight, 1.45);
  assert.equal(doc.brand.customFonts[0].family, "Host Serif");
  assert.equal(doc.sections[0].icon, snapshot.sections[0].icon);
  assert.equal(doc.sections[0].coverImageUrl, "https://example.com/arrival.jpg");
  assert.equal(doc.sections[0].coverTitle, "Arrival day");
  assert.equal(doc.places[0].imageUrl, "https://example.com/cafe.jpg");
  assert.equal(doc.places[0].categoryLabel, "Cafe");
  assert.match(doc.places[0].categoryIcon, /^<svg/);
  assert.equal(doc.places[0].categoryColor, "#8E44AD");
  assert.equal(doc.places[0].categorySoft, "rgba(142, 68, 173, 0.14)");
});

test("labels every supported block type for print-specific presentation", () => {
  const blockTypes = [
    ["text", { html: "<p>Welcome home.</p>" }, "Note"],
    ["heading", { text: "Before you arrive" }, "Section note"],
    ["image", { url: "https://example.com/image.jpg" }, "Photo"],
    ["video", { title: "How to use the fireplace", url: "video.example.com" }, "Video"],
    [
      "gallery",
      { images: [{ url: "https://example.com/one.jpg" }] },
      "Gallery",
    ],
    [
      "faq",
      { items: [{ question: "Can we park?", answer: "Yes." }] },
      "FAQ",
    ],
    ["divider", {}, "Divider"],
    [
      "wifi",
      { network_name: "HarborWifi", password: "sea-view" },
      "Wi-Fi",
    ],
    [
      "container",
      {
        title: "Arrival",
        children: [
          {
            id: "container-heading",
            type: "heading",
            isVisible: true,
            content: { text: "Before you arrive" },
          },
          {
            id: "container-hidden",
            type: "text",
            isVisible: false,
            content: { html: "<p>Hidden</p>" },
          },
        ],
      },
      "Group",
    ],
    ["weather", { location_label: "Portview", units: "celsius" }, "Weather"],
    [
      "world_clock",
      { clocks: [{ label: "Home", timezone: "Europe/London" }] },
      "World clock",
    ],
    ["smart_lock", { title: "Front door", code: "1234" }, "Smart lock"],
    [
      "booking_link",
      { label: "Book again", url: "stay.example.com" },
      "Booking",
    ],
    ["currency", { base: "USD", targets: ["EUR", "GBP"] }, "Currency"],
    [
      "emergency_contacts",
      { custom_contacts: [{ label: "Police", phone: "911" }] },
      "Emergency",
    ],
    [
      "phrasebook",
      { language: "es", categories: ["greetings", "directions"] },
      "Phrasebook",
    ],
    [
      "button",
      { label: "Parking", action: "url", value: "parking.example.com" },
      "Action",
    ],
    [
      "streaming",
      {
        services: [
          {
            service: "netflix",
            login_mode: "account",
            instructions: "Use the guest profile.",
          },
        ],
      },
      "Streaming",
    ],
  ];

  const doc = createPrintDocument(
    {
      ...snapshot,
      sections: [
        {
          id: "all-blocks",
          title: "Everything",
          icon: "",
          orderIndex: 0,
          isVisible: true,
          kind: "guide",
          displayMode: "popup",
          itemSettings: {},
        },
      ],
      blocks: blockTypes.map(([type, content], index) => ({
        id: `${type}-${index}`,
        sectionId: "all-blocks",
        type,
        orderIndex: index,
        isVisible: true,
        content,
      })),
      places: [],
    },
    { publicUrl: "https://guestnix.com/g/harbor-house" }
  );

  const badges = doc.sections[0].blocks.map((block) => block.badge);
  assert.deepEqual(
    badges,
    blockTypes.map(([, , badge]) => badge)
  );
});
