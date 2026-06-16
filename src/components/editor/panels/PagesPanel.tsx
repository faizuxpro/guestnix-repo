"use client";

import { useEffect, useRef, useState } from "react";
import { Home, MapPin, ShoppingBag, User, UserCog } from "lucide-react";
import { useEditorStore } from "@/stores/editor-store";
import { SectionList } from "../SectionList";
import { NavigationPanel } from "../navigation/NavigationPanel";
import {
  HomeFeaturedPageEditor,
  resetHomeFeaturedConfig,
} from "../featured/HomeFeaturedPageEditor";
import {
  HostFeaturedPageEditor,
  resetHostFeaturedConfig,
} from "../featured/HostFeaturedPageEditor";
import { NearbyFeaturedPageEditor } from "../featured/NearbyFeaturedPageEditor";
import { StoreFeaturedPageEditor } from "../featured/StoreFeaturedPageEditor";
import { PropertyHostInfoPanel } from "../featured/PropertyHostInfoPanel";
import {
  FeaturedDetailHeader,
  type PanelAccent,
} from "../featured/controls/PanelHeader";

type Props = {
  mode: "guidebook" | "featured" | "navigation";
};

type FeaturedDetail = "info" | "home" | "host" | "nearby" | "store" | null;

const FEATURED_META: Record<
  Exclude<FeaturedDetail, null>,
  {
    title: string;
    icon: React.ReactNode;
    accent: PanelAccent;
    /** Which preview view to activate. null = leave preview alone (guide tab). */
    previewView: "home" | "host" | "nearby" | "store" | null;
    onReset?: () => void;
  }
> = {
  info: {
    title: "Property & Host info",
    icon: <UserCog className="h-4 w-4" />,
    accent: "slate",
    previewView: "home",
  },
  home: {
    title: "Home / Splash",
    icon: <Home className="h-4 w-4" />,
    accent: "teal",
    previewView: "home",
    onReset: resetHomeFeaturedConfig,
  },
  host: {
    title: "Host / Meet Host",
    icon: <User className="h-4 w-4" />,
    accent: "amber",
    previewView: "host",
    onReset: resetHostFeaturedConfig,
  },
  nearby: {
    title: "Nearby",
    icon: <MapPin className="h-4 w-4" />,
    accent: "indigo",
    previewView: "nearby",
  },
  store: {
    title: "Store",
    icon: <ShoppingBag className="h-4 w-4" />,
    accent: "violet",
    previewView: "store",
  },
};

export function PagesPanel({ mode }: Props) {
  if (mode === "guidebook") {
    return (
      <div className="flex h-full flex-col">
        <SectionList />
      </div>
    );
  }

  if (mode === "navigation") {
    return <NavigationPanel />;
  }

  return <FeaturedPagesPanel />;
}

function FeaturedPagesPanel() {
  const setActiveFeaturedView = useEditorStore((s) => s.setActiveFeaturedView);
  const editorNavigationRequest = useEditorStore(
    (s) => s.editorNavigationRequest
  );
  const [detail, setDetail] = useState<FeaturedDetail>(null);
  const [returnDetail, setReturnDetail] = useState<FeaturedDetail>(null);
  const handledNavigationNonceRef = useRef(0);

  const openDetail = (next: FeaturedDetail, returnTo: FeaturedDetail = null) => {
    setReturnDetail(returnTo);
    setDetail(next);
  };

  const handleBack = () => {
    if (returnDetail) {
      const next = returnDetail;
      setReturnDetail(null);
      setDetail(next);
      return;
    }
    setDetail(null);
  };

  useEffect(() => {
    const meta = detail ? FEATURED_META[detail] : null;
    setActiveFeaturedView(meta?.previewView ?? null);
    return () => {
      setActiveFeaturedView(null);
    };
  }, [detail, setActiveFeaturedView]);

  useEffect(() => {
    if (!editorNavigationRequest) return;
    if (handledNavigationNonceRef.current === editorNavigationRequest.nonce) {
      return;
    }

    const target = editorNavigationRequest.target;
    if (target.kind !== "home" && target.kind !== "featured") return;

    handledNavigationNonceRef.current = editorNavigationRequest.nonce;
    const frame = window.requestAnimationFrame(() => {
      setReturnDetail(null);

      if (target.kind === "home") {
        setDetail("home");
        return;
      }

      if (
        target.view === "host" &&
        (target.focus === "title" ||
          target.focus === "bio" ||
          target.focus === "contact")
      ) {
        setDetail("info");
        return;
      }

      setDetail(target.view);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorNavigationRequest]);

  if (detail) {
    const meta = FEATURED_META[detail];
    return (
      <div className="flex h-full flex-col bg-background">
        <FeaturedDetailHeader
          icon={meta.icon}
          title={meta.title}
          accent={meta.accent}
          onBack={handleBack}
          onReset={meta.onReset}
        />
        <div className="min-h-0 flex-1">
          {detail === "info" && <PropertyHostInfoPanel mode="detail" />}
          {detail === "home" && (
            <HomeFeaturedPageEditor
              mode="detail"
              onOpenPropertyHostInfo={() => openDetail("info", "home")}
            />
          )}
          {detail === "host" && <HostFeaturedPageEditor mode="detail" />}
          {detail === "nearby" && <NearbyFeaturedPageEditor mode="detail" />}
          {detail === "store" && <StoreFeaturedPageEditor mode="detail" />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-4">
      <div className="space-y-2.5">
        <PropertyHostInfoPanel
          mode="card"
          onSelect={() => openDetail("info")}
        />
        <HomeFeaturedPageEditor
          mode="card"
          onSelect={() => openDetail("home")}
        />
        <HostFeaturedPageEditor
          mode="card"
          onSelect={() => openDetail("host")}
        />
        <NearbyFeaturedPageEditor
          mode="card"
          onSelect={() => openDetail("nearby")}
        />
        <StoreFeaturedPageEditor
          mode="card"
          onSelect={() => openDetail("store")}
        />
      </div>
    </div>
  );
}
