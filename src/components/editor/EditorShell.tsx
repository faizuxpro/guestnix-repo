"use client";

import { useEffect, useRef, useState } from "react";
import { EditorProvider } from "./EditorProvider";
import { EditorToolbar } from "./EditorToolbar";
import { Sidepanel } from "./Sidepanel";
import { PreviewPanel, type PreviewDevice } from "./PreviewPanel";
import {
  useEditorStore,
  type EditorSection,
  type GuidebookMeta,
} from "@/stores/editor-store";
import type { EditorStorefrontData } from "@/lib/store/editor-storefront-types";
import { cn } from "@/lib/utils";
import type {
  EditorPrimaryMenu,
  EditorSubmenuState,
} from "./editor-menu";

type Props = {
  initial: {
    guidebook: GuidebookMeta;
    sections: EditorSection[];
    storefront?: EditorStorefrontData;
  };
};

// Keep the editor/preview split fixed, regardless of selected preview device.
const FIXED_EDITOR_WIDTH = "md:w-[30%]";
const FIXED_PREVIEW_WIDTH = "md:w-[70%]";

export function EditorShell({ initial }: Props) {
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor");
  const [device, setDevice] = useState<PreviewDevice>("mobile");
  const [inspectEnabled, setInspectEnabled] = useState(false);
  const [primaryMenu, setPrimaryMenu] = useState<EditorPrimaryMenu>("content");
  const [submenu, setSubmenu] = useState<EditorSubmenuState>({
    content: "guidebook",
    design: "brand",
    settings: "features",
  });
  const editorNavigationRequest = useEditorStore(
    (s) => s.editorNavigationRequest
  );
  const handledNavigationNonceRef = useRef(0);

  useEffect(() => {
    if (!editorNavigationRequest) return;
    if (handledNavigationNonceRef.current === editorNavigationRequest.nonce) {
      return;
    }
    handledNavigationNonceRef.current = editorNavigationRequest.nonce;

    const target = editorNavigationRequest.target;
    const frame = window.requestAnimationFrame(() => {
      setInspectEnabled(false);

      if (target.kind === "design") {
        setPrimaryMenu("design");
        setSubmenu((prev) => ({ ...prev, design: "brand" }));
        return;
      }

      if (target.kind === "settings") {
        setPrimaryMenu("settings");
        setSubmenu((prev) => ({ ...prev, settings: "languages" }));
        return;
      }

      setPrimaryMenu("content");

      if (
        target.kind === "section" ||
        target.kind === "section_index" ||
        target.kind === "block"
      ) {
        setSubmenu((prev) => ({ ...prev, content: "guidebook" }));
        return;
      }

      if (target.kind === "navigation") {
        setSubmenu((prev) => ({ ...prev, content: "navigation" }));
        return;
      }

      setSubmenu((prev) => ({ ...prev, content: "featured" }));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorNavigationRequest]);

  const handleTogglePreview = () => {
    setInspectEnabled(false);
    setMobileView((v) => (v === "editor" ? "preview" : "editor"));
  };

  const handlePreviewDeviceChange = (next: PreviewDevice) => {
    setInspectEnabled(false);
    setDevice(next);
  };

  const handlePrimaryChange = (tab: EditorPrimaryMenu) => {
    setInspectEnabled(false);
    setPrimaryMenu(tab);
  };

  const handleSubmenuChange = (next: Partial<EditorSubmenuState>) => {
    setInspectEnabled(false);
    setSubmenu((prev) => ({
      ...prev,
      ...next,
    }));
  };

  return (
    <EditorProvider initial={initial}>
      <div className="md:hidden">
        <EditorToolbar
          showPreviewToggle
          previewOpen={mobileView === "preview"}
          onTogglePreview={handleTogglePreview}
          previewDevice={device}
          onPreviewDeviceChange={handlePreviewDeviceChange}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "min-h-0 min-w-0 flex-col md:border-r transition-[width] duration-300",
            FIXED_EDITOR_WIDTH,
            mobileView === "editor"
              ? "flex w-full md:flex"
              : "hidden md:flex"
          )}
        >
          <Sidepanel
            activePrimary={primaryMenu}
            submenu={submenu}
            onPrimaryChange={handlePrimaryChange}
            onSubmenuChange={handleSubmenuChange}
          />
        </div>
        <div
          className={cn(
            "min-h-0 min-w-0 flex-col transition-[width] duration-300",
            FIXED_PREVIEW_WIDTH,
            mobileView === "preview"
              ? "flex w-full md:flex"
              : "hidden md:flex"
          )}
        >
          <div className="hidden md:block">
            <EditorToolbar
              showPreviewToggle
              previewOpen={mobileView === "preview"}
              onTogglePreview={handleTogglePreview}
              previewDevice={device}
              onPreviewDeviceChange={handlePreviewDeviceChange}
            />
          </div>
          <div className="min-h-0 flex-1">
            <PreviewPanel
              device={device}
              inspectEnabled={inspectEnabled}
              onInspectEnabledChange={setInspectEnabled}
            />
          </div>
        </div>
      </div>
    </EditorProvider>
  );
}
