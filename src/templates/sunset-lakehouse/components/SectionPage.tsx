"use client";

import { useEffect, useState, type ReactNode } from "react";
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

export function SectionPage({
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
  const [renderedSection, setRenderedSection] = useState<TemplateSection | null>(
    section
  );
  const [renderedChildren, setRenderedChildren] = useState<ReactNode>(
    children ?? null
  );
  const [visible, setVisible] = useState(Boolean(section));

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (!section) {
        setVisible(false);
        return;
      }
      setRenderedSection(section);
      setRenderedChildren(children ?? null);
      setVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [children, section]);

  if (!renderedSection) return null;

  const handleTransitionEnd: React.TransitionEventHandler<HTMLDivElement> = (e) => {
    if (
      !section &&
      !visible &&
      e.target === e.currentTarget &&
      e.propertyName === "transform"
    ) {
      setRenderedSection(null);
      setRenderedChildren(null);
    }
  };

  return (
    <div className={`sl-fullpage-shell${visible && section ? " is-open" : ""}`}>
      <section
        className={`sl-tab sl-section-page sl-fullpage${
          highlighted ? " sl-search-highlight" : ""
        }`}
        data-guidebook-search-target={`section-${renderedSection.id}`}
        role="region"
        aria-label={renderedSection.title}
        onTransitionEnd={handleTransitionEnd}
        {...editorInspectAttributes(
          { kind: "design", focus: "section_background" },
          "Edit section background"
        )}
      >
        <SectionHeader
          section={renderedSection}
          onClose={onClose}
          slug={slug}
          publicBasePath={publicBasePath}
          closeLabel="Back to guide"
          guidebookSettings={guidebookSettings}
          editorFocused={activePreviewFocus?.kind === "section_title"}
          editorFocusNonce={activePreviewFocus?.nonce}
        />
        <div
          className="sl-popup-body sl-popup-body--with-cover sl-section-page-body"
          {...editorInspectAttributes(
            { kind: "design", focus: "section_background" },
            "Edit section background"
          )}
        >
          <SectionCover
            section={renderedSection}
            fallbackImageUrl={fallbackCoverImage}
            guidebookSettings={guidebookSettings}
          />
          {renderedChildren}
        </div>
      </section>
    </div>
  );
}
