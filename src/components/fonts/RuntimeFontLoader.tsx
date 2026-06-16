"use client";

import { useEffect } from "react";
import {
  buildFontFaceCss,
  buildGoogleFontsHref,
  type CustomFont,
} from "@/lib/fonts/catalog";

type Props = {
  fontFamilies: string[];
  /**
   * Host-added Google fonts (beyond the curated catalog) and uploaded font
   * files. Google entries are folded into the same Google Fonts <link>;
   * uploaded entries are registered via injected `@font-face` rules.
   */
  customFonts?: CustomFont[] | null;
  /**
   * Unique key per use-site so multiple loaders (e.g. two font pickers + the
   * template viewer) don't fight over the same <link> tag. Defaults to "main".
   */
  id?: string;
};

/**
 * Injects a Google Fonts <link> + optional `@font-face` <style> into <head>
 * for the supplied families. Updates in-place as the user picks new fonts in
 * the editor — the old tags for this `id` are removed before the new ones are
 * added so we never accumulate, and instances with different ids coexist.
 */
export function RuntimeFontLoader({
  fontFamilies,
  customFonts,
  id = "main",
}: Props) {
  const href = buildGoogleFontsHref(fontFamilies, customFonts);
  const faceCss = buildFontFaceCss(customFonts);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const LINK_ATTR = "data-guestnix-fonts";
    const existing = document.querySelector(`link[${LINK_ATTR}="${id}"]`);

    if (!href) {
      existing?.remove();
    } else if (!existing || existing.getAttribute("href") !== href) {
      existing?.remove();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute(LINK_ATTR, id);
      document.head.appendChild(link);
    }

    return () => {
      const stale = document.querySelector(`link[${LINK_ATTR}="${id}"]`);
      stale?.remove();
    };
  }, [href, id]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const STYLE_ATTR = "data-guestnix-font-faces";
    const existing = document.querySelector(`style[${STYLE_ATTR}="${id}"]`);

    if (!faceCss) {
      existing?.remove();
    } else if (!existing || existing.textContent !== faceCss) {
      existing?.remove();
      const style = document.createElement("style");
      style.setAttribute(STYLE_ATTR, id);
      style.textContent = faceCss;
      document.head.appendChild(style);
    }

    return () => {
      const stale = document.querySelector(`style[${STYLE_ATTR}="${id}"]`);
      stale?.remove();
    };
  }, [faceCss, id]);

  return null;
}
