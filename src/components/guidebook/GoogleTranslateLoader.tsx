"use client";

import { useEffect } from "react";

type Props = {
  baseLanguage: string;
  available: string[];
};

const SCRIPT_ID = "google-translate-script";
const MOUNT_ID = "google_translate_element";

/**
 * Injects the Google Translate embeddable widget into the page. The widget
 * exposes a hidden `<select class="goog-te-combo">` that `LanguageProvider`
 * drives programmatically. We hide all of Google's default UI via CSS and
 * surface our own picker.
 */
export function GoogleTranslateLoader({ baseLanguage, available }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (available.length === 0) return;

    // Mount point (Google requires the div to exist before the script runs).
    let mount = document.getElementById(MOUNT_ID);
    if (!mount) {
      mount = document.createElement("div");
      mount.id = MOUNT_ID;
      mount.setAttribute("aria-hidden", "true");
      document.body.appendChild(mount);
    }

    // Build comma-separated includedLanguages (Google expects the BASE code
    // included so guests can revert to the original).
    const includedLanguages = Array.from(
      new Set([baseLanguage, ...available])
    ).join(",");

    const w = window as unknown as {
      googleTranslateElementInit?: () => void;
      google?: {
        translate?: {
          TranslateElement?: new (
            options: {
              pageLanguage: string;
              includedLanguages?: string;
              autoDisplay?: boolean;
              layout?: number;
            },
            elementId: string
          ) => void;
          InlineLayout?: { SIMPLE: number; HORIZONTAL: number; VERTICAL: number };
        };
      };
    };

    w.googleTranslateElementInit = () => {
      const T = w.google?.translate;
      if (!T?.TranslateElement) return;
      new T.TranslateElement(
        {
          pageLanguage: baseLanguage,
          includedLanguages,
          autoDisplay: false,
          layout: T.InlineLayout?.SIMPLE ?? 0,
        },
        MOUNT_ID
      );
    };

    // Inject the script once. If it's already there from a previous mount,
    // call init manually so the widget re-attaches.
    if (document.getElementById(SCRIPT_ID)) {
      // Widget already initialized — fine. The hidden select persists.
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Intentionally do not remove the script — Google's widget doesn't
      // support clean teardown, and the only consumer (the public page) lasts
      // for the whole session.
    };
  }, [baseLanguage, available]);

  return null;
}
