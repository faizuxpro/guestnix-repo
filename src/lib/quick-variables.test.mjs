import assert from "node:assert/strict";
import test from "node:test";

const quickVariablesModule = await import("./quick-variables.ts");

const {
  buildQuickVariableRenderPayload,
  extractQuickVariableUsage,
  getQuickVariableDefinitions,
  normalizeQuickVariablesSettings,
  resolveQuickVariablesInBlockContent,
  resolveQuickVariablesInHtml,
  resolveQuickVariablesInString,
  saveQuickVariables,
  validateQuickVariablesInput,
} = quickVariablesModule.default ?? quickVariablesModule;

test("resolves canonical and whitespace tokens", () => {
  const settings = normalizeQuickVariablesSettings({
    draft: {
      values: {
        wifi_password: { value: "safe-pass" },
      },
    },
  });
  const payload = buildQuickVariableRenderPayload({
    quickVariables: settings,
    mode: "draft",
  });

  assert.equal(
    resolveQuickVariablesInString(
      "Password: {{wifi_password}} / {{ wifi_password }}",
      payload
    ),
    "Password: safe-pass / safe-pass"
  );
});

test("unknown tokens resolve to empty strings", () => {
  const payload = buildQuickVariableRenderPayload({
    quickVariables: normalizeQuickVariablesSettings({}),
    mode: "draft",
  });

  assert.equal(
    resolveQuickVariablesInString("Code: {{missing_code}}.", payload),
    "Code: ."
  );
});

test("guest name uses browser identity when provided", () => {
  const settings = normalizeQuickVariablesSettings({
    draft: {
      values: {
        guest_name: { value: "Stored Guest" },
      },
    },
  });
  const payload = buildQuickVariableRenderPayload({
    quickVariables: settings,
    mode: "draft",
    guestName: "Jane",
  });

  assert.equal(
    resolveQuickVariablesInString("Welcome {{guest_name}}", payload),
    "Welcome Jane"
  );
});

test("HTML resolution escapes inserted values", () => {
  const settings = normalizeQuickVariablesSettings({
    draft: {
      values: {
        temporary_notice: { value: "<script>alert(1)</script>" },
      },
    },
  });
  const payload = buildQuickVariableRenderPayload({
    quickVariables: settings,
    mode: "draft",
  });

  assert.equal(
    resolveQuickVariablesInHtml("<p>{{temporary_notice}}</p>", payload),
    "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
  );
});

test("custom key validation blocks preset collisions and duplicate keys", () => {
  const result = validateQuickVariablesInput({
    custom: [
      {
        key: "wifi_password",
        label: "WiFi password again",
        type: "code",
        sensitive: true,
        order_index: 0,
        enabled: true,
      },
      {
        key: "pool_code",
        label: "Pool code",
        type: "code",
        sensitive: true,
        order_index: 1,
        enabled: true,
      },
      {
        key: "pool_code",
        label: "Pool code duplicate",
        type: "code",
        sensitive: true,
        order_index: 2,
        enabled: true,
      },
    ],
    values: {},
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /already a preset/);
  assert.match(result.errors.join("\n"), /duplicated/);
});

test("saving variables updates the single live value set", () => {
  const initial = normalizeQuickVariablesSettings({});
  const saved = saveQuickVariables(
    initial,
    {
      custom: [],
      values: {
        checkin_time: { value: "3:00 PM" },
      },
    },
    "user-1",
    new Date("2026-06-15T10:00:00.000Z")
  );

  assert.equal(saved.values.checkin_time.value, "3:00 PM");
  assert.equal(saved.updated_at, "2026-06-15T10:00:00.000Z");
});

test("public payload gates sensitive values until reveal time", () => {
  const settings = normalizeQuickVariablesSettings({
    live: {
      values: {
        access_reveal_time: { value: "2026-06-15T12:00:00.000Z" },
        door_code: { value: "1234" },
      },
    },
  });

  const before = buildQuickVariableRenderPayload({
    quickVariables: settings,
    mode: "live",
    publicMode: true,
    now: new Date("2026-06-15T11:00:00.000Z"),
  });
  const after = buildQuickVariableRenderPayload({
    quickVariables: settings,
    mode: "live",
    publicMode: true,
    now: new Date("2026-06-15T12:01:00.000Z"),
  });

  assert.equal(before.values.door_code, "");
  assert.equal(after.values.door_code, "1234");
});

test("expired temporary notices resolve to empty values", () => {
  const settings = normalizeQuickVariablesSettings({
    live: {
      values: {
        temporary_notice: { value: "Pool closed today" },
        temporary_notice_expires_at: { value: "2026-06-15T10:00:00.000Z" },
      },
    },
  });
  const payload = buildQuickVariableRenderPayload({
    quickVariables: settings,
    mode: "live",
    publicMode: true,
    now: new Date("2026-06-15T10:01:00.000Z"),
  });

  assert.equal(
    resolveQuickVariablesInString("Notice: {{temporary_notice}}", payload),
    "Notice: "
  );
});

test("custom HTML block content resolves escaped variable values", () => {
  const settings = normalizeQuickVariablesSettings({
    values: {
      wifi_password: { value: "<secret>" },
    },
  });
  const payload = buildQuickVariableRenderPayload({
    quickVariables: settings,
    mode: "live",
  });

  assert.deepEqual(
    resolveQuickVariablesInBlockContent(
      "custom_html",
      { html: "<span>{{wifi_password}}</span>" },
      payload
    ),
    { html: "<span>&lt;secret&gt;</span>" }
  );
});

test("definitions include presets and custom fields", () => {
  const settings = normalizeQuickVariablesSettings({
    custom: [
      {
        key: "pool_gate_code",
        label: "Pool gate code",
        type: "code",
        sensitive: true,
        order_index: 0,
        enabled: true,
      },
    ],
  });
  const definitions = getQuickVariableDefinitions(settings, "draft");

  assert.equal(
    definitions.some((definition) => definition.key === "wifi_password"),
    true
  );
  assert.equal(
    definitions.some((definition) => definition.key === "property_name"),
    true
  );
  assert.equal(
    definitions.some((definition) => definition.key === "host_email"),
    true
  );
  assert.equal(
    definitions.some((definition) => definition.key === "pool_gate_code"),
    true
  );
});

test("context presets fall back to guidebook and hero data", () => {
  const payload = buildQuickVariableRenderPayload({
    quickVariables: normalizeQuickVariablesSettings({}),
    context: {
      guidebookTitle: "Fallback Stay",
      heroData: {
        property: {
          name: "Lake Cottage",
          address: "10 Pine Road",
          city: "Asheville",
          state: "NC",
          country: "USA",
        },
        host: {
          name: "Mina Host",
          phone: "+1 555 0101",
          email: "mina@example.com",
        },
      },
    },
  });

  assert.equal(
    resolveQuickVariablesInString(
      "{{property_name}} in {{property_location}} by {{host_name}}",
      payload
    ),
    "Lake Cottage in 10 Pine Road, Asheville, NC, USA by Mina Host"
  );
  assert.equal(resolveQuickVariablesInString("Call {{host_phone}}", payload), "Call +1 555 0101");
  assert.equal(resolveQuickVariablesInString("Email {{host_email}}", payload), "Email mina@example.com");
});

test("saved values override context preset fallbacks", () => {
  const payload = buildQuickVariableRenderPayload({
    quickVariables: normalizeQuickVariablesSettings({
      values: {
        property_name: { value: "Manual Name" },
      },
    }),
    context: {
      guidebookTitle: "Fallback Stay",
      heroData: {
        property: { name: "Lake Cottage" },
      },
    },
  });

  assert.equal(
    resolveQuickVariablesInString("{{property_name}}", payload),
    "Manual Name"
  );
});

test("legacy single-brace aliases resolve and count as canonical presets", () => {
  const payload = buildQuickVariableRenderPayload({
    quickVariables: normalizeQuickVariablesSettings({}),
    context: {
      propertyLocation: "Asheville, NC",
      hostPhone: "+1 555 0101",
    },
  });

  assert.equal(
    resolveQuickVariablesInString("Near {location}. Call {phone}.", payload),
    "Near Asheville, NC. Call +1 555 0101."
  );
  assert.deepEqual(extractQuickVariableUsage("Near {location} and {{property_location}}"), {
    property_location: 2,
  });
});

test("usage scanner counts repeated tokens across nested content", () => {
  assert.deepEqual(
    extractQuickVariableUsage({
      title: "{{wifi_password}}",
      blocks: [
        { html: "{{wifi_password}} {{ checkin_time }}" },
        "{{wifi_password}}",
      ],
    }),
    {
      wifi_password: 3,
      checkin_time: 1,
    }
  );
});
