"use client";

import { useEffect, useRef, useState } from "react";
import { Navigation, PanelTop } from "lucide-react";
import { EditorPanelShell } from "@/components/editor/settings-ui";
import { BottomNavEditor } from "@/components/editor/design/BottomNavEditor";
import { useEditorStore } from "@/stores/editor-store";
import {
  FeaturedDetailHeader,
  FeaturedNavCard,
} from "@/components/editor/featured/controls/PanelHeader";
import { HeaderEditor } from "./HeaderEditor";

type NavigationDetail = "bottom" | "header" | null;

export function NavigationPanel() {
  const [detail, setDetail] = useState<NavigationDetail>(null);
  const editorNavigationRequest = useEditorStore(
    (s) => s.editorNavigationRequest
  );
  const handledNavigationNonceRef = useRef(0);

  useEffect(() => {
    if (!editorNavigationRequest) return;
    if (handledNavigationNonceRef.current === editorNavigationRequest.nonce) {
      return;
    }
    const target = editorNavigationRequest.target;
    if (target.kind !== "navigation") return;

    handledNavigationNonceRef.current = editorNavigationRequest.nonce;
    const frame = window.requestAnimationFrame(() => {
      setDetail(target.focus === "bottom_nav" ? "bottom" : "header");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorNavigationRequest]);

  if (detail === "bottom") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <FeaturedDetailHeader
          icon={<Navigation className="h-4 w-4" />}
          title="Bottom navigation"
          accent="teal"
          onBack={() => setDetail(null)}
        />
        <div className="min-h-0 flex-1">
          <BottomNavEditor embedded />
        </div>
      </div>
    );
  }

  if (detail === "header") {
    return (
      <div className="flex h-full min-h-0 flex-col bg-background">
        <FeaturedDetailHeader
          icon={<PanelTop className="h-4 w-4" />}
          title="Header"
          accent="slate"
          onBack={() => setDetail(null)}
        />
        <div className="min-h-0 flex-1">
          <HeaderEditor embedded />
        </div>
      </div>
    );
  }

  return (
    <EditorPanelShell
      title="Navigation"
      description="Choose the guest navigation surface to customize."
    >
      <div className="space-y-2.5">
        <FeaturedNavCard
          icon={<PanelTop className="h-4 w-4" />}
          title="Header"
          accent="slate"
          onSelect={() => setDetail("header")}
        />
        <FeaturedNavCard
          icon={<Navigation className="h-4 w-4" />}
          title="Bottom navigation"
          accent="teal"
          onSelect={() => setDetail("bottom")}
        />
      </div>
    </EditorPanelShell>
  );
}
