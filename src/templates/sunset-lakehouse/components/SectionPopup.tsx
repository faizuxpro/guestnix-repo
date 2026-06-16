"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TemplatePreviewFocus, TemplateSection } from "../types";
import { SectionCover } from "./SectionCover";
import { SectionHeader } from "./SectionHeader";
import { editorInspectAttributes } from "@/lib/editor-inspect";
import type { GuidebookPublicBasePath } from "@/lib/guidebook-public-url";

type Props = {
  section: TemplateSection | null;
  onClose: () => void;
  slug?: string;
  publicBasePath?: GuidebookPublicBasePath;
  highlighted?: boolean;
  fallbackCoverImage?: string | null;
  guidebookSettings?: Record<string, unknown> | null;
  activePreviewFocus?: TemplatePreviewFocus | null;
  children?: ReactNode;
};

// Keeps previous section rendered during the close animation.
// Uses only derived state + onTransitionEnd — no setState-in-effect.
export function SectionPopup({
  section,
  onClose,
  slug,
  publicBasePath,
  highlighted = false,
  fallbackCoverImage,
  guidebookSettings,
  activePreviewFocus,
  children,
}: Props) {
  const lastSectionRef = useRef<TemplateSection | null>(section);
  const [visible, setVisible] = useState(false);

  if (section) lastSectionRef.current = section;

  // Open state is driven by prop, not stored state.
  // The `is-open` class is applied on next frame so the CSS transition plays.
  useEffect(() => {
    if (!section) {
      setVisible(false);
      return;
    }
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section?.id]);

  const rendered = section ?? lastSectionRef.current;
  if (!rendered) return null;

  const handleTransitionEnd: React.TransitionEventHandler = (e) => {
    if (
      !section &&
      !visible &&
      e.target === e.currentTarget &&
      e.propertyName === "opacity"
    ) {
      lastSectionRef.current = null;
    }
  };

  return (
    <div
      className={`sl-popup-backdrop${visible && section ? " is-open" : ""}`}
      onClick={onClose}
      onTransitionEnd={handleTransitionEnd}
      role="dialog"
      aria-label={rendered.title}
    >
      <div
        className={`sl-popup${highlighted ? " sl-search-highlight" : ""}`}
        data-guidebook-search-target={`section-${rendered.id}`}
        onClick={(e) => e.stopPropagation()}
        {...editorInspectAttributes(
          { kind: "design", focus: "section_background" },
          "Edit section background"
        )}
      >
        <SectionHeader
          section={rendered}
          onClose={onClose}
          slug={slug}
          publicBasePath={publicBasePath}
          closeLabel="Close"
          guidebookSettings={guidebookSettings}
          editorFocused={activePreviewFocus?.kind === "section_title"}
          editorFocusNonce={activePreviewFocus?.nonce}
        />
        <div
          className="sl-popup-body sl-popup-body--with-cover"
          {...editorInspectAttributes(
            { kind: "design", focus: "section_background" },
            "Edit section background"
          )}
        >
          <SectionCover
            section={rendered}
            fallbackImageUrl={fallbackCoverImage}
            guidebookSettings={guidebookSettings}
          />
          {children}
        </div>
      </div>
    </div>
  );
}
