"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isRtl } from "@/lib/languages";

type LanguageContextValue = {
  baseLanguage: string;
  available: string[];
  /** Currently active language code. Equal to `baseLanguage` when untranslated. */
  current: string;
  /**
   * Switch the page language. Pass the base code to revert to the original.
   * No-op if multi-language is disabled.
   */
  setLanguage: (code: string) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage(): LanguageContextValue | null {
  return useContext(LanguageContext);
}

type Props = {
  baseLanguage: string;
  available: string[];
  /**
   * When true, the provider tracks `current` in React state only and performs
   * no global side effects (no <html lang>/<html dir> mutations, no driving
   * of the Google widget, no cookie writes/reloads). Used by the editor
   * preview, where global mutations would leak into the editor chrome.
   * Google Translate is page-level and cannot scope to a subtree, so the
   * picker UI in preview is decorative — real translation requires the
   * published viewer (or rendering the preview inside an iframe).
   */
  isolated?: boolean;
  children: React.ReactNode;
};

/**
 * Active-language source of truth for the public viewer. Wraps the Google
 * Translate widget but doesn't load it — that's the loader's job. We just
 * read/write its state.
 *
 * Google stores the active translation in the `googtrans` cookie like
 * `/<source>/<target>`. We mirror that into React state via a MutationObserver
 * on <html lang>, which Google flips whenever it (re)translates.
 */
export function LanguageProvider({
  baseLanguage,
  available,
  isolated = false,
  children,
}: Props) {
  const readActive = useCallback((): string => {
    if (typeof document === "undefined") return baseLanguage;
    const lang = document.documentElement.getAttribute("lang") ?? "";
    if (lang === baseLanguage) return baseLanguage;
    for (const code of available) {
      if (lang === code || lang.startsWith(code.split("-")[0])) return code;
    }
    return baseLanguage;
  }, [baseLanguage, available]);

  // Lazy init reads <html lang> on first client render — no synchronous
  // setState in an effect required. Isolated mode starts at the base and
  // never reads global state.
  const [current, setCurrent] = useState<string>(() =>
    isolated ? baseLanguage : readActive()
  );

  // Watch <html lang> for changes (the widget flips it on translate, browsers
  // flip it when a guest uses the built-in translate-this-page menu).
  useEffect(() => {
    if (isolated) return;
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const obs = new MutationObserver(() => {
      const next = readActive();
      setCurrent((prev) => (prev === next ? prev : next));
    });
    obs.observe(root, { attributes: true, attributeFilter: ["lang"] });
    return () => obs.disconnect();
  }, [isolated, readActive]);

  // Mirror current language into <html dir> for RTL languages. Skipped in
  // isolated mode so the editor chrome doesn't flip when the preview picker
  // is used.
  useEffect(() => {
    if (isolated) return;
    if (typeof document === "undefined") return;
    document.documentElement.dir = isRtl(current) ? "rtl" : "ltr";
  }, [isolated, current]);

  const setLanguage = useCallback(
    (code: string) => {
      if (typeof document === "undefined") return;
      // Isolated mode: local state only, no global mutations.
      if (isolated) {
        setCurrent(code);
        return;
      }
      // Reverting to base: Google's widget can't reliably undo its DOM
      // rewrites in-place. Clear the googtrans cookie on every host variant
      // it might have been set on and reload.
      if (code === baseLanguage) {
        const host = window.location.hostname;
        const variants = new Set<string>([host, `.${host}`]);
        const parts = host.split(".");
        if (parts.length > 1) {
          const apex = parts.slice(-2).join(".");
          variants.add(apex);
          variants.add(`.${apex}`);
        }
        const expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
        for (const d of variants) {
          document.cookie = `googtrans=; ${expire}; path=/; domain=${d}`;
        }
        document.cookie = `googtrans=; ${expire}; path=/`;
        window.location.reload();
        return;
      }
      // Drive the hidden Google dropdown — the documented way to switch.
      const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (!select) {
        // Loader hasn't mounted yet. Best effort: set lang attribute and
        // remember the pick; the observer will reconcile when the widget
        // is ready.
        document.documentElement.setAttribute("lang", code);
        return;
      }
      select.value = code;
      select.dispatchEvent(new Event("change"));
    },
    [baseLanguage, isolated]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ baseLanguage, available, current, setLanguage }),
    [baseLanguage, available, current, setLanguage]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}
