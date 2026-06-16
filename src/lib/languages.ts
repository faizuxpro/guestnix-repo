/**
 * Curated language catalog used by the guest-facing language picker and the
 * editor's Languages settings panel. Codes match Google Translate's expected
 * `pageLanguage` / `includedLanguages` values so we can pass them straight to
 * the widget without remapping.
 */
export type LanguageInfo = {
  code: string;
  name: string;
  native_name: string;
  flag_emoji: string;
  rtl?: boolean;
};

export const LANGUAGES: readonly LanguageInfo[] = [
  // ─── Top tier (most common travel languages) ───────────
  { code: "en",    name: "English",    native_name: "English",    flag_emoji: "🇺🇸" },
  { code: "es",    name: "Spanish",    native_name: "Español",    flag_emoji: "🇪🇸" },
  { code: "fr",    name: "French",     native_name: "Français",   flag_emoji: "🇫🇷" },
  { code: "de",    name: "German",     native_name: "Deutsch",    flag_emoji: "🇩🇪" },
  { code: "it",    name: "Italian",    native_name: "Italiano",   flag_emoji: "🇮🇹" },
  { code: "pt",    name: "Portuguese", native_name: "Português",  flag_emoji: "🇵🇹" },
  { code: "pt-BR", name: "Portuguese (Brazil)", native_name: "Português (BR)", flag_emoji: "🇧🇷" },
  { code: "nl",    name: "Dutch",      native_name: "Nederlands", flag_emoji: "🇳🇱" },
  { code: "ja",    name: "Japanese",   native_name: "日本語",      flag_emoji: "🇯🇵" },
  { code: "zh-CN", name: "Chinese (Simplified)",  native_name: "简体中文",  flag_emoji: "🇨🇳" },
  { code: "zh-TW", name: "Chinese (Traditional)", native_name: "繁體中文",  flag_emoji: "🇹🇼" },
  { code: "ko",    name: "Korean",     native_name: "한국어",      flag_emoji: "🇰🇷" },
  { code: "ar",    name: "Arabic",     native_name: "العربية",    flag_emoji: "🇸🇦", rtl: true },
  { code: "ru",    name: "Russian",    native_name: "Русский",    flag_emoji: "🇷🇺" },
  { code: "tr",    name: "Turkish",    native_name: "Türkçe",     flag_emoji: "🇹🇷" },
  { code: "pl",    name: "Polish",     native_name: "Polski",     flag_emoji: "🇵🇱" },
  { code: "hi",    name: "Hindi",      native_name: "हिन्दी",       flag_emoji: "🇮🇳" },

  // ─── Nordic ────────────────────────────────────────────
  { code: "sv",    name: "Swedish",    native_name: "Svenska",    flag_emoji: "🇸🇪" },
  { code: "da",    name: "Danish",     native_name: "Dansk",      flag_emoji: "🇩🇰" },
  { code: "no",    name: "Norwegian",  native_name: "Norsk",      flag_emoji: "🇳🇴" },
  { code: "fi",    name: "Finnish",    native_name: "Suomi",      flag_emoji: "🇫🇮" },
  { code: "is",    name: "Icelandic",  native_name: "Íslenska",   flag_emoji: "🇮🇸" },

  // ─── Central & Eastern European ────────────────────────
  { code: "cs",    name: "Czech",      native_name: "Čeština",    flag_emoji: "🇨🇿" },
  { code: "sk",    name: "Slovak",     native_name: "Slovenčina", flag_emoji: "🇸🇰" },
  { code: "hu",    name: "Hungarian",  native_name: "Magyar",     flag_emoji: "🇭🇺" },
  { code: "ro",    name: "Romanian",   native_name: "Română",     flag_emoji: "🇷🇴" },
  { code: "bg",    name: "Bulgarian",  native_name: "Български",  flag_emoji: "🇧🇬" },
  { code: "el",    name: "Greek",      native_name: "Ελληνικά",   flag_emoji: "🇬🇷" },
  { code: "uk",    name: "Ukrainian",  native_name: "Українська", flag_emoji: "🇺🇦" },
  { code: "hr",    name: "Croatian",   native_name: "Hrvatski",   flag_emoji: "🇭🇷" },
  { code: "sr",    name: "Serbian",    native_name: "Српски",     flag_emoji: "🇷🇸" },
  { code: "sl",    name: "Slovenian",  native_name: "Slovenščina", flag_emoji: "🇸🇮" },
  { code: "lt",    name: "Lithuanian", native_name: "Lietuvių",   flag_emoji: "🇱🇹" },
  { code: "lv",    name: "Latvian",    native_name: "Latviešu",   flag_emoji: "🇱🇻" },
  { code: "et",    name: "Estonian",   native_name: "Eesti",      flag_emoji: "🇪🇪" },

  // ─── Middle East & North Africa ────────────────────────
  { code: "he",    name: "Hebrew",     native_name: "עברית",      flag_emoji: "🇮🇱", rtl: true },
  { code: "fa",    name: "Persian",    native_name: "فارسی",      flag_emoji: "🇮🇷", rtl: true },
  { code: "ur",    name: "Urdu",       native_name: "اردو",       flag_emoji: "🇵🇰", rtl: true },

  // ─── South & Southeast Asia ────────────────────────────
  { code: "vi",    name: "Vietnamese", native_name: "Tiếng Việt", flag_emoji: "🇻🇳" },
  { code: "th",    name: "Thai",       native_name: "ไทย",         flag_emoji: "🇹🇭" },
  { code: "id",    name: "Indonesian", native_name: "Bahasa Indonesia", flag_emoji: "🇮🇩" },
  { code: "ms",    name: "Malay",      native_name: "Bahasa Melayu",     flag_emoji: "🇲🇾" },
  { code: "tl",    name: "Filipino",   native_name: "Filipino",   flag_emoji: "🇵🇭" },
  { code: "bn",    name: "Bengali",    native_name: "বাংলা",        flag_emoji: "🇧🇩" },
  { code: "ta",    name: "Tamil",      native_name: "தமிழ்",        flag_emoji: "🇮🇳" },
  { code: "te",    name: "Telugu",     native_name: "తెలుగు",       flag_emoji: "🇮🇳" },
  { code: "mr",    name: "Marathi",    native_name: "मराठी",       flag_emoji: "🇮🇳" },
  { code: "gu",    name: "Gujarati",   native_name: "ગુજરાતી",      flag_emoji: "🇮🇳" },
  { code: "pa",    name: "Punjabi",    native_name: "ਪੰਜਾਬੀ",       flag_emoji: "🇮🇳" },

  // ─── Africa ────────────────────────────────────────────
  { code: "sw",    name: "Swahili",    native_name: "Kiswahili",  flag_emoji: "🇰🇪" },
  { code: "af",    name: "Afrikaans",  native_name: "Afrikaans",  flag_emoji: "🇿🇦" },

  // ─── Western European (smaller) ────────────────────────
  { code: "ca",    name: "Catalan",    native_name: "Català",     flag_emoji: "🇪🇸" },
  { code: "ga",    name: "Irish",      native_name: "Gaeilge",    flag_emoji: "🇮🇪" },
  { code: "cy",    name: "Welsh",      native_name: "Cymraeg",    flag_emoji: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
];

export const DEFAULT_BASE_LANGUAGE = "en";

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));

export function getLanguage(code: string): LanguageInfo | undefined {
  return BY_CODE.get(code);
}

export function getLanguageName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}

export function isRtl(code: string): boolean {
  return BY_CODE.get(code)?.rtl === true;
}

/**
 * Shape persisted under `guidebooks.settings.languages`.
 */
export type LanguagesSettings = {
  enabled: boolean;
  base_language: string;
  available: string[];
};

export const DEFAULT_LANGUAGES_SETTINGS: LanguagesSettings = {
  enabled: false,
  base_language: DEFAULT_BASE_LANGUAGE,
  available: [],
};

export function readLanguagesSettings(
  settings: Record<string, unknown> | null | undefined
): LanguagesSettings {
  if (!settings || typeof settings !== "object") return DEFAULT_LANGUAGES_SETTINGS;
  const raw = (settings as Record<string, unknown>).languages;
  if (!raw || typeof raw !== "object") return DEFAULT_LANGUAGES_SETTINGS;

  const r = raw as Record<string, unknown>;
  const enabled = typeof r.enabled === "boolean" ? r.enabled : false;
  const base =
    typeof r.base_language === "string" && BY_CODE.has(r.base_language)
      ? r.base_language
      : DEFAULT_BASE_LANGUAGE;
  const available = Array.isArray(r.available)
    ? r.available.filter(
        (c): c is string => typeof c === "string" && BY_CODE.has(c) && c !== base
      )
    : [];

  return { enabled, base_language: base, available };
}
