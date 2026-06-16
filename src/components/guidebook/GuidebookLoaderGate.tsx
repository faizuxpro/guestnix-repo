"use client";

import { useEffect, useState } from "react";
import { GuidebookLoadingScreen } from "@/components/guidebook/GuidebookLoadingScreen";
import {
  GUIDEBOOK_LOADER_MIN_DURATION_MS,
  type GuidebookLoaderSettings,
} from "@/lib/guidebook-loader-settings";

type Props = {
  settings: GuidebookLoaderSettings;
  children: React.ReactNode;
};

function elapsedSinceNavigationStart() {
  if (typeof performance === "undefined") return 0;
  return Math.max(0, performance.now());
}

export function GuidebookLoaderGate({ settings, children }: Props) {
  if (!settings.enabled) {
    return <>{children}</>;
  }

  return (
    <MinimumGuidebookLoaderGate settings={settings}>
      {children}
    </MinimumGuidebookLoaderGate>
  );
}

function MinimumGuidebookLoaderGate({ settings, children }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const remaining = Math.max(
      0,
      GUIDEBOOK_LOADER_MIN_DURATION_MS - elapsedSinceNavigationStart()
    );

    const timer = window.setTimeout(() => setVisible(false), remaining);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <div aria-hidden={visible}>{children}</div>
      {visible ? (
        <div className="fixed inset-0 z-[10000]">
          <GuidebookLoadingScreen settings={settings} />
        </div>
      ) : null}
    </>
  );
}
