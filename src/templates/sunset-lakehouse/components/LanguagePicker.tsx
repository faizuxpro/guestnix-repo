"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/components/guidebook/LanguageContext";
import { getLanguage, LANGUAGES } from "@/lib/languages";
import { editorInspectAttributes } from "@/lib/editor-inspect";

type Props = {
  /**
   * When true, lay out for the splash screen — slightly larger, with a
   * translucent backdrop suitable for image hero backgrounds. When false,
   * matches the small pill style of the topbar Share button.
   */
  variant?: "splash" | "topbar";
};

export function LanguagePicker({ variant = "topbar" }: Props) {
  const ctx = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!ctx) return null;
  const { baseLanguage, available, current, setLanguage } = ctx;
  if (available.length === 0) return null;

  // List = base + available, deduped, in catalog order.
  const codes = Array.from(new Set([baseLanguage, ...available]));
  const ordered = LANGUAGES.filter((l) => codes.includes(l.code));
  const activeInfo = getLanguage(current) ?? getLanguage(baseLanguage);

  return (
    <div
      ref={wrapRef}
      className={`sl-lang-wrap notranslate${variant === "splash" ? " is-splash" : ""}`}
      translate="no"
      {...editorInspectAttributes(
        { kind: "settings", focus: "languages" },
        "Edit languages"
      )}
    >
      <button
        type="button"
        className={variant === "splash" ? "sl-lang-btn-splash" : "sl-lang-btn"}
        onClick={() => setOpen((v) => !v)}
        aria-label="Choose language"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe aria-hidden />
        {variant === "splash" && activeInfo ? (
          <span className="sl-lang-btn-label">{activeInfo.flag_emoji}</span>
        ) : null}
      </button>

      {open && (
        <div className="sl-lang-menu" role="listbox" aria-label="Languages">
          {ordered.map((l) => {
            const isActive = l.code === current;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`sl-lang-item${isActive ? " is-active" : ""}`}
                onClick={() => {
                  setLanguage(l.code);
                  setOpen(false);
                }}
              >
                <span aria-hidden className="sl-lang-flag">
                  {l.flag_emoji}
                </span>
                <span className="sl-lang-name">{l.native_name}</span>
                <span className="sl-lang-meta">{l.name}</span>
                {isActive ? <Check aria-hidden className="sl-lang-check" /> : null}
              </button>
            );
          })}
          <div className="sl-lang-footer">Powered by Google Translate</div>
        </div>
      )}
    </div>
  );
}
