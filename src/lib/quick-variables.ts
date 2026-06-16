export const QUICK_VARIABLES_SETTINGS_KEY = "quick_variables";

export const QUICK_VARIABLE_TYPES = [
  "text",
  "code",
  "time",
  "datetime",
  "phone",
  "url",
  "notice",
] as const;

export type QuickVariableType = (typeof QUICK_VARIABLE_TYPES)[number];

export type QuickVariablePreset = {
  key: string;
  label: string;
  type: QuickVariableType;
  sensitive: boolean;
  placeholder?: string;
};

export type QuickVariableValue = {
  value: string;
  enabled?: boolean;
  sensitive?: boolean;
  reveal_at?: string | null;
  expires_at?: string | null;
};

export type CustomQuickVariableDefinition = {
  key: string;
  label: string;
  type: QuickVariableType;
  sensitive: boolean;
  order_index: number;
  enabled: boolean;
};

export type QuickVariablesState = {
  values: Record<string, QuickVariableValue>;
  custom: CustomQuickVariableDefinition[];
  updated_at: string | null;
  updated_by: string | null;
};

export type QuickVariablesSettings = {
  schema_version: 1;
  values: Record<string, QuickVariableValue>;
  custom: CustomQuickVariableDefinition[];
  updated_at: string | null;
  updated_by: string | null;
};

export type QuickVariableDefinition = QuickVariablePreset & {
  custom: boolean;
  enabled: boolean;
  order_index: number;
};

export type QuickVariableRenderPayload = {
  values: Record<string, string>;
  emptyKeys: string[];
  blockedKeys: string[];
  generatedAt: string;
};

export type QuickVariableContext = {
  guidebookTitle?: string | null;
  propertyName?: string | null;
  propertyLocation?: string | null;
  hostName?: string | null;
  hostPhone?: string | null;
  hostEmail?: string | null;
  cohostName?: string | null;
  cohostPhone?: string | null;
  cohostEmail?: string | null;
  heroData?: unknown;
};

export type QuickVariableTokenDiagnostic = {
  key: string;
  status: "unknown" | "empty";
};

export type QuickVariablesInput = {
  values: Record<string, QuickVariableValue>;
  custom: CustomQuickVariableDefinition[];
};

export type QuickVariablesValidationResult =
  | { ok: true; data: QuickVariablesInput }
  | { ok: false; errors: string[] };

export const QUICK_VARIABLE_PRESETS: QuickVariablePreset[] = [
  {
    key: "guest_name",
    label: "Guest name",
    type: "text",
    sensitive: false,
    placeholder: "Sam",
  },
  {
    key: "property_name",
    label: "Property name",
    type: "text",
    sensitive: false,
    placeholder: "Sunset Lake House",
  },
  {
    key: "property_location",
    label: "Property location",
    type: "text",
    sensitive: false,
    placeholder: "Asheville, NC",
  },
  {
    key: "host_name",
    label: "Host name",
    type: "text",
    sensitive: false,
    placeholder: "Amina",
  },
  {
    key: "host_phone",
    label: "Host phone",
    type: "phone",
    sensitive: false,
  },
  {
    key: "host_email",
    label: "Host email",
    type: "text",
    sensitive: false,
    placeholder: "host@example.com",
  },
  {
    key: "cohost_name",
    label: "Co-host name",
    type: "text",
    sensitive: false,
  },
  {
    key: "cohost_phone",
    label: "Co-host phone",
    type: "phone",
    sensitive: false,
  },
  {
    key: "cohost_email",
    label: "Co-host email",
    type: "text",
    sensitive: false,
    placeholder: "cohost@example.com",
  },
  {
    key: "checkin_time",
    label: "Check-in time",
    type: "time",
    sensitive: false,
    placeholder: "4:00 PM",
  },
  {
    key: "checkout_time",
    label: "Check-out time",
    type: "time",
    sensitive: false,
    placeholder: "11:00 AM",
  },
  {
    key: "early_checkin_note",
    label: "Early check-in note",
    type: "notice",
    sensitive: false,
  },
  {
    key: "late_checkout_note",
    label: "Late check-out note",
    type: "notice",
    sensitive: false,
  },
  {
    key: "wifi_network_name",
    label: "WiFi network name",
    type: "text",
    sensitive: false,
    placeholder: "Guest WiFi",
  },
  {
    key: "wifi_password",
    label: "WiFi password",
    type: "code",
    sensitive: true,
    placeholder: "guest-access",
  },
  {
    key: "wifi_note",
    label: "WiFi note",
    type: "notice",
    sensitive: false,
  },
  {
    key: "door_code",
    label: "Door code",
    type: "code",
    sensitive: true,
    placeholder: "1234",
  },
  {
    key: "access_reveal_time",
    label: "Access reveal time",
    type: "datetime",
    sensitive: false,
  },
  {
    key: "gate_code",
    label: "Gate or building code",
    type: "code",
    sensitive: true,
  },
  {
    key: "lockbox_code",
    label: "Lockbox code",
    type: "code",
    sensitive: true,
  },
  {
    key: "alarm_code",
    label: "Alarm code",
    type: "code",
    sensitive: true,
  },
  {
    key: "alarm_instructions",
    label: "Alarm instructions",
    type: "notice",
    sensitive: true,
  },
  {
    key: "parking_spot",
    label: "Parking spot",
    type: "text",
    sensitive: false,
  },
  {
    key: "parking_note",
    label: "Parking note",
    type: "notice",
    sensitive: false,
  },
  {
    key: "temporary_notice",
    label: "Temporary guest notice",
    type: "notice",
    sensitive: false,
  },
  {
    key: "temporary_notice_expires_at",
    label: "Notice expiry",
    type: "datetime",
    sensitive: false,
  },
  {
    key: "on_call_phone",
    label: "On-call phone",
    type: "phone",
    sensitive: false,
  },
  {
    key: "tv_pairing_code",
    label: "TV pairing code",
    type: "code",
    sensitive: true,
  },
  {
    key: "streaming_note",
    label: "Streaming or TV note",
    type: "notice",
    sensitive: false,
  },
];

export const QUICK_VARIABLE_PRESET_KEYS = new Set(
  QUICK_VARIABLE_PRESETS.map((preset) => preset.key)
);

const PRESET_BY_KEY = new Map(
  QUICK_VARIABLE_PRESETS.map((preset) => [preset.key, preset])
);

const VALID_TYPE_SET = new Set<string>(QUICK_VARIABLE_TYPES);
const KEY_PATTERN = /^[a-z][a-z0-9_]{1,47}$/;
const TOKEN_PATTERN_SOURCE = "\\{\\{\\s*([a-z][a-z0-9_]{1,47})\\s*\\}\\}";
const TOKEN_PATTERN = new RegExp(TOKEN_PATTERN_SOURCE, "g");
const LEGACY_TOKEN_PATTERN_SOURCE =
  "(^|[^\\{])\\{\\s*([a-z][a-z0-9_ ]{0,47})\\s*\\}(?!\\})";
const MAX_CUSTOM_FIELDS = 20;
const MAX_VALUE_LENGTH = 500;
const MAX_NOTICE_LENGTH = 240;

const LEGACY_QUICK_VARIABLE_ALIASES: Record<string, string> = {
  location: "property_location",
  property: "property_name",
  host: "host_name",
  cohost: "cohost_name",
  phone: "host_phone",
  email: "host_email",
};

function tokenPattern() {
  return new RegExp(TOKEN_PATTERN_SOURCE, "g");
}

function legacyTokenPattern() {
  return new RegExp(LEGACY_TOKEN_PATTERN_SOURCE, "g");
}

function normalizeTokenKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function canonicalQuickVariableKey(key: string) {
  const normalized = normalizeTokenKey(key);
  return LEGACY_QUICK_VARIABLE_ALIASES[normalized] ?? normalized;
}

function isKnownLegacyTokenKey(key: string) {
  const normalized = normalizeTokenKey(key);
  const canonical = canonicalQuickVariableKey(normalized);
  return (
    LEGACY_QUICK_VARIABLE_ALIASES[normalized] !== undefined ||
    PRESET_BY_KEY.has(canonical)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readQuickVariableType(value: unknown): QuickVariableType {
  return typeof value === "string" && VALID_TYPE_SET.has(value)
    ? (value as QuickVariableType)
    : "text";
}

function normalizeValue(value: unknown): QuickVariableValue {
  if (!isRecord(value)) {
    return { value: typeof value === "string" ? value : "" };
  }

  return {
    value: readString(value.value).slice(0, MAX_VALUE_LENGTH),
    ...(typeof value.enabled === "boolean" ? { enabled: value.enabled } : {}),
    ...(typeof value.sensitive === "boolean"
      ? { sensitive: value.sensitive }
      : {}),
    reveal_at:
      typeof value.reveal_at === "string" && value.reveal_at.trim()
        ? value.reveal_at.trim()
        : null,
    expires_at:
      typeof value.expires_at === "string" && value.expires_at.trim()
        ? value.expires_at.trim()
        : null,
  };
}

function normalizeValueRecord(value: unknown): Record<string, QuickVariableValue> {
  if (!isRecord(value)) return {};

  const entries: Record<string, QuickVariableValue> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (KEY_PATTERN.test(key)) {
      entries[key] = normalizeValue(raw);
    }
  }
  return entries;
}

function normalizeCustomDefinitions(
  value: unknown
): CustomQuickVariableDefinition[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const custom: CustomQuickVariableDefinition[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const key = readString(raw.key).trim().toLowerCase();
    if (
      !KEY_PATTERN.test(key) ||
      QUICK_VARIABLE_PRESET_KEYS.has(key) ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    custom.push({
      key,
      label: readString(raw.label).trim().slice(0, 80) || key,
      type: readQuickVariableType(raw.type),
      sensitive: readBoolean(raw.sensitive, false),
      order_index:
        typeof raw.order_index === "number" && Number.isFinite(raw.order_index)
          ? Math.max(0, Math.trunc(raw.order_index))
          : custom.length,
      enabled: readBoolean(raw.enabled, true),
    });

    if (custom.length >= MAX_CUSTOM_FIELDS) break;
  }

  return custom.sort((a, b) => a.order_index - b.order_index);
}

function normalizeState(value: unknown): QuickVariablesState {
  const raw = isRecord(value) ? value : {};
  return {
    values: normalizeValueRecord(raw.values),
    custom: normalizeCustomDefinitions(raw.custom),
    updated_at:
      readNullableString(raw.updated_at) ?? readNullableString(raw.pushed_at),
    updated_by:
      readNullableString(raw.updated_by) ?? readNullableString(raw.pushed_by),
  };
}

function emptyQuickVariables(): QuickVariablesSettings {
  return {
    schema_version: 1,
    values: {},
    custom: [],
    updated_at: null,
    updated_by: null,
  };
}

function hasStateContent(state: QuickVariablesState) {
  return (
    Object.keys(state.values).length > 0 ||
    state.custom.length > 0 ||
    Boolean(state.updated_at) ||
    Boolean(state.updated_by)
  );
}

export function normalizeQuickVariablesSettings(
  value: unknown
): QuickVariablesSettings {
  if (!isRecord(value)) return emptyQuickVariables();

  const direct = normalizeState(value);
  if (hasStateContent(direct)) {
    return {
      schema_version: 1,
      values: direct.values,
      custom: direct.custom,
      updated_at: direct.updated_at,
      updated_by: direct.updated_by,
    };
  }

  const legacyDraft = normalizeState(value.draft);
  const legacyLive = normalizeState(value.live);
  const legacy = hasStateContent(legacyDraft) ? legacyDraft : legacyLive;

  return {
    schema_version: 1,
    values: legacy.values,
    custom: legacy.custom,
    updated_at: legacy.updated_at,
    updated_by: legacy.updated_by,
  };
}

export function readQuickVariablesFromSettings(
  settings: unknown
): QuickVariablesSettings {
  if (!isRecord(settings)) return emptyQuickVariables();
  return normalizeQuickVariablesSettings(settings[QUICK_VARIABLES_SETTINGS_KEY]);
}

export function writeQuickVariablesToSettings(
  settings: Record<string, unknown>,
  quickVariables: QuickVariablesSettings
) {
  return {
    ...settings,
    [QUICK_VARIABLES_SETTINGS_KEY]: quickVariables,
  };
}

export function stripQuickVariablesFromSettings(settings: unknown) {
  if (!isRecord(settings)) return {};
  const next = { ...settings };
  delete next[QUICK_VARIABLES_SETTINGS_KEY];
  return next;
}

export function stripPrivateGuidebookSettings(settings: unknown) {
  const next = stripQuickVariablesFromSettings(settings);
  delete next.password;
  delete next.password_hash;
  return next;
}

export function getQuickVariableDefinitions(
  quickVariables: QuickVariablesSettings,
  mode: "draft" | "live" = "live"
): QuickVariableDefinition[] {
  void mode;
  const presets = QUICK_VARIABLE_PRESETS.map<QuickVariableDefinition>(
    (preset, index) => ({
      ...preset,
      custom: false,
      enabled: true,
      order_index: index,
    })
  );
  const customDefinitions = quickVariables.custom.map<QuickVariableDefinition>(
    (field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      sensitive: field.sensitive,
      custom: true,
      enabled: field.enabled,
      order_index: QUICK_VARIABLE_PRESETS.length + field.order_index,
    })
  );

  return [...presets, ...customDefinitions];
}

function compareDate(value: string | null | undefined, now: Date) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 0;
  return timestamp - now.getTime();
}

function getDefinitionMap(definitions: QuickVariableDefinition[]) {
  return new Map(definitions.map((definition) => [definition.key, definition]));
}

function getValueRevealAt(
  key: string,
  value: QuickVariableValue,
  values: Record<string, QuickVariableValue>
) {
  if (value.reveal_at) return value.reveal_at;
  if (key === "access_reveal_time") return null;
  const accessReveal = values.access_reveal_time?.value;
  return accessReveal?.trim() || null;
}

function getValueExpiresAt(key: string, value: QuickVariableValue) {
  if (value.expires_at) return value.expires_at;
  if (key === "temporary_notice") return null;
  return null;
}

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function readRecordString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function contextualQuickVariableValues(
  context: QuickVariableContext | null | undefined
): Record<string, string> {
  if (!context) return {};

  const hero = isRecord(context.heroData) ? context.heroData : {};
  const property = isRecord(hero.property) ? hero.property : {};
  const host = isRecord(hero.host) ? hero.host : {};
  const propertyLocation = firstText(
    context.propertyLocation,
    [
      readRecordString(property, "address"),
      readRecordString(property, "city"),
      readRecordString(property, "state"),
      readRecordString(property, "country"),
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(", ")
  );

  return {
    property_name: firstText(
      context.propertyName,
      readRecordString(property, "name"),
      context.guidebookTitle
    ),
    property_location: propertyLocation,
    host_name: firstText(context.hostName, readRecordString(host, "name")),
    host_phone: firstText(context.hostPhone, readRecordString(host, "phone")),
    host_email: firstText(context.hostEmail, readRecordString(host, "email")),
    cohost_name: firstText(context.cohostName),
    cohost_phone: firstText(context.cohostPhone),
    cohost_email: firstText(context.cohostEmail),
  };
}

export function buildQuickVariableRenderPayload({
  quickVariables,
  mode = "live",
  now = new Date(),
  guestName,
  publicMode = false,
  context,
}: {
  quickVariables: QuickVariablesSettings;
  mode?: "draft" | "live";
  now?: Date;
  guestName?: string | null;
  publicMode?: boolean;
  context?: QuickVariableContext | null;
}): QuickVariableRenderPayload {
  const definitions = getQuickVariableDefinitions(quickVariables);
  const definitionsByKey = getDefinitionMap(definitions);
  const contextualValues = contextualQuickVariableValues(context);
  const values: Record<string, string> = {};
  const emptyKeys: string[] = [];
  const blockedKeys: string[] = [];
  const useDraftPlaceholders = mode === "draft" && !publicMode;

  for (const definition of definitions) {
    if (!definition.enabled) {
      emptyKeys.push(definition.key);
      values[definition.key] = "";
      continue;
    }

    const stored = quickVariables.values[definition.key];
    const storedValue =
      stored !== undefined
        ? stored.value ?? ""
        : contextualValues[definition.key] ?? "";
    const rawValue =
      storedValue ||
      (useDraftPlaceholders && definition.placeholder
        ? definition.placeholder
        : "");
    const enabled = stored?.enabled !== false;
    const sensitive = stored?.sensitive ?? definition.sensitive;
    const revealAt = getValueRevealAt(
      definition.key,
      stored ?? { value: "" },
      quickVariables.values
    );
    const expiresAt =
      getValueExpiresAt(definition.key, stored ?? { value: "" }) ??
      (definition.key === "temporary_notice"
        ? quickVariables.values.temporary_notice_expires_at?.value
        : null);

    if (!enabled) {
      emptyKeys.push(definition.key);
      values[definition.key] = "";
      continue;
    }

    if (expiresAt && compareDate(expiresAt, now) <= 0) {
      blockedKeys.push(definition.key);
      values[definition.key] = "";
      continue;
    }

    if (publicMode && sensitive && revealAt && compareDate(revealAt, now) > 0) {
      blockedKeys.push(definition.key);
      values[definition.key] = "";
      continue;
    }

    values[definition.key] = rawValue;
    if (!rawValue) emptyKeys.push(definition.key);
  }

  const normalizedGuestName = guestName?.trim();
  if (normalizedGuestName) {
    values.guest_name = normalizedGuestName;
  } else if (!definitionsByKey.has("guest_name")) {
    values.guest_name = "";
  }

  return {
    values,
    emptyKeys: [...new Set(emptyKeys)].sort(),
    blockedKeys: [...new Set(blockedKeys)].sort(),
    generatedAt: now.toISOString(),
  };
}

export function withGuestNameQuickVariable(
  payload: QuickVariableRenderPayload | null | undefined,
  guestName: string | null | undefined
): QuickVariableRenderPayload | null {
  if (!payload) return null;
  const normalizedGuestName = guestName?.trim();
  if (!normalizedGuestName) return payload;
  return {
    ...payload,
    values: {
      ...payload.values,
      guest_name: normalizedGuestName,
    },
    emptyKeys: payload.emptyKeys.filter((key) => key !== "guest_name"),
  };
}

export function tokenForQuickVariable(key: string) {
  return `{{${key}}}`;
}

export function extractQuickVariableTokens(input: string): string[] {
  const keys = new Set<string>();
  input.replace(TOKEN_PATTERN, (_match, key: string) => {
    keys.add(canonicalQuickVariableKey(key));
    return _match;
  });
  input.replace(legacyTokenPattern(), (_match, prefix: string, key: string) => {
    void prefix;
    if (isKnownLegacyTokenKey(key)) {
      keys.add(canonicalQuickVariableKey(key));
    }
    return _match;
  });
  return [...keys];
}

export function extractQuickVariableUsage(input: unknown): Record<string, number> {
  const usage: Record<string, number> = {};

  const visit = (value: unknown) => {
    if (typeof value === "string") {
      for (const match of value.matchAll(tokenPattern())) {
        const key = canonicalQuickVariableKey(match[1]);
        usage[key] = (usage[key] ?? 0) + 1;
      }
      for (const match of value.matchAll(legacyTokenPattern())) {
        if (!isKnownLegacyTokenKey(match[2])) continue;
        const key = canonicalQuickVariableKey(match[2]);
        usage[key] = (usage[key] ?? 0) + 1;
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (isRecord(value)) {
      Object.values(value).forEach(visit);
    }
  };

  visit(input);
  return usage;
}

export function mergeQuickVariableUsage(
  ...items: unknown[]
): Record<string, number> {
  const total: Record<string, number> = {};
  for (const item of items) {
    const usage = extractQuickVariableUsage(item);
    for (const [key, count] of Object.entries(usage)) {
      total[key] = (total[key] ?? 0) + count;
    }
  }
  return total;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolveTokenString(
  input: string,
  payload: QuickVariableRenderPayload | null | undefined,
  options?: { html?: boolean }
) {
  if (!payload || (!input.includes("{{") && !input.includes("{"))) return input;

  const resolve = (key: string) => {
    const value = payload.values[canonicalQuickVariableKey(key)];
    if (typeof value !== "string") return "";
    return options?.html ? escapeHtml(value) : value;
  };

  return input
    .replace(tokenPattern(), (_match, key: string) => resolve(key))
    .replace(legacyTokenPattern(), (_match, prefix: string, key: string) => {
      if (!isKnownLegacyTokenKey(key)) return _match;
      return `${prefix}${resolve(key)}`;
    });
}

export function resolveQuickVariablesInString(
  input: string,
  payload: QuickVariableRenderPayload | null | undefined
) {
  return resolveTokenString(input, payload);
}

export function resolveQuickVariablesInHtml(
  input: string,
  payload: QuickVariableRenderPayload | null | undefined
) {
  return resolveTokenString(input, payload, { html: true });
}

export function resolveQuickVariablesInValue<T>(
  input: T,
  payload: QuickVariableRenderPayload | null | undefined,
  options?: {
    htmlKeys?: Set<string>;
    skipHtml?: boolean;
  }
): T {
  if (typeof input === "string") {
    return resolveQuickVariablesInString(input, payload) as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) =>
      resolveQuickVariablesInValue(item, payload, options)
    ) as T;
  }
  if (isRecord(input)) {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string" && key === "html" && !options?.skipHtml) {
        next[key] = resolveQuickVariablesInHtml(value, payload);
        continue;
      }
      next[key] = resolveQuickVariablesInValue(value, payload, options);
    }
    return next as T;
  }
  return input;
}

export function resolveQuickVariablesInBlockContent(
  _blockType: string,
  content: Record<string, unknown>,
  payload: QuickVariableRenderPayload | null | undefined
) {
  return resolveQuickVariablesInValue(content, payload);
}

export function getQuickVariableDiagnostics(
  input: string,
  payload: QuickVariableRenderPayload | null | undefined,
  definitions: QuickVariableDefinition[]
): QuickVariableTokenDiagnostic[] {
  const known = new Set(definitions.map((definition) => definition.key));
  return extractQuickVariableTokens(input).flatMap<QuickVariableTokenDiagnostic>(
    (key) => {
      if (!known.has(key)) return [{ key, status: "unknown" as const }];
      if (!payload?.values[key]) return [{ key, status: "empty" as const }];
      return [];
    }
  );
}

function hasNestedQuickVariable(value: string) {
  return extractQuickVariableTokens(value).length > 0;
}

function maxLengthForDefinition(
  definition:
    | QuickVariableDefinition
    | CustomQuickVariableDefinition
    | QuickVariablePreset
) {
  return definition.type === "notice" ? MAX_VALUE_LENGTH : MAX_VALUE_LENGTH;
}

export function validateQuickVariablesInput(
  input: unknown
): QuickVariablesValidationResult {
  const errors: string[] = [];
  const raw = isRecord(input) ? input : {};
  const custom = normalizeCustomDefinitions(raw.custom);
  const rawCustom = Array.isArray(raw.custom) ? raw.custom : [];

  if (rawCustom.length > MAX_CUSTOM_FIELDS) {
    errors.push(`Custom fields are limited to ${MAX_CUSTOM_FIELDS}.`);
  }

  const seen = new Set<string>();
  for (const item of rawCustom) {
    if (!isRecord(item)) {
      errors.push("Each custom field must be an object.");
      continue;
    }
    const key = readString(item.key).trim().toLowerCase();
    if (!KEY_PATTERN.test(key)) {
      errors.push(
        "Custom keys must start with a letter and use lowercase letters, numbers, and underscores."
      );
    }
    if (QUICK_VARIABLE_PRESET_KEYS.has(key)) {
      errors.push(`Custom key "${key}" is already a preset.`);
    }
    if (seen.has(key)) {
      errors.push(`Custom key "${key}" is duplicated.`);
    }
    seen.add(key);
    if (!readString(item.label).trim()) {
      errors.push(`Custom field "${key || "new"}" needs a label.`);
    }
  }

  const definitions: QuickVariableDefinition[] = [
    ...QUICK_VARIABLE_PRESETS.map((preset, index) => ({
      ...preset,
      custom: false,
      enabled: true,
      order_index: index,
    })),
    ...custom.map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      sensitive: field.sensitive,
      custom: true,
      enabled: field.enabled,
      order_index: QUICK_VARIABLE_PRESETS.length + field.order_index,
    })),
  ];
  const definitionByKey = getDefinitionMap(definitions);
  const values = normalizeValueRecord(raw.values);

  for (const key of Object.keys(values)) {
    const definition = definitionByKey.get(key);
    if (!definition) {
      errors.push(`Unknown Quick Variable key "${key}".`);
      continue;
    }

    const value = values[key]?.value ?? "";
    const max = maxLengthForDefinition(definition);
    if (value.length > max) {
      errors.push(`${definition.label} must be ${max} characters or fewer.`);
    }
    if (definition.key === "temporary_notice" && value.length > MAX_NOTICE_LENGTH) {
      errors.push(
        `${definition.label} should be ${MAX_NOTICE_LENGTH} characters or fewer.`
      );
    }
    if (hasNestedQuickVariable(value)) {
      errors.push(`${definition.label} cannot contain another Quick Variable.`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors: [...new Set(errors)] };
  }

  const allowedKeys = new Set(definitions.map((definition) => definition.key));
  const cleanValues = Object.fromEntries(
    Object.entries(values).filter(([key]) => allowedKeys.has(key))
  );

  return {
    ok: true,
    data: {
      values: cleanValues,
      custom,
    },
  };
}

export function saveQuickVariables(
  current: QuickVariablesSettings,
  input: QuickVariablesInput,
  actorId: string,
  now = new Date()
): QuickVariablesSettings {
  return {
    ...current,
    values: input.values,
    custom: input.custom,
    updated_at: now.toISOString(),
    updated_by: actorId,
  };
}

export function maskQuickVariableValue(value: string) {
  if (!value) return "";
  return "******";
}

export function isQuickVariableSensitive(
  key: string,
  custom: CustomQuickVariableDefinition[] = []
) {
  const preset = PRESET_BY_KEY.get(key);
  if (preset) return preset.sensitive;
  return custom.find((field) => field.key === key)?.sensitive === true;
}
