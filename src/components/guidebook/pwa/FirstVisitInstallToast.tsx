"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InstallAppCard } from "./InstallAppCard";
import { usePwaInstall } from "./PwaInstallProvider";

const SEEN_KEY = "guestnix:pwa-toast-seen";
/** Delay after `canInstall` becomes true before sliding in. */
const SHOW_DELAY_MS = 3500;

type Props = {
  primaryColor?: string;
};

/**
 * On the guest's first visit to a guidebook, slides the install card down from
 * the top of the screen a few seconds after the install prompt becomes
 * available. Once dismissed or installed, never shows again — the card stays
 * available inside the Host tab.
 */
export function FirstVisitInstallToast({ primaryColor }: Props) {
  const { canInstall } = usePwaInstall();
  const [shown, setShown] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!canInstall) return;
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
    } catch {
      // localStorage blocked — just don't auto-show.
      return;
    }

    const id = window.setTimeout(() => {
      setShown(true);
      try {
        window.localStorage.setItem(SEEN_KEY, String(Date.now()));
      } catch {
        // ignore
      }
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(id);
  }, [canInstall]);

  if (!shown || !canInstall) return null;

  const handleDismiss = () => {
    setClosing(true);
    window.setTimeout(() => {
      setShown(false);
      setClosing(false);
      toast.info("You can install this guide anytime from the Host tab.", {
        duration: 5000,
      });
    }, 220);
  };

  const handleInstalled = () => {
    setClosing(true);
    window.setTimeout(() => setShown(false), 220);
  };

  return (
    <div
      className={
        "pointer-events-none fixed inset-x-0 z-[9999] flex justify-center px-3 transition-all duration-200 " +
        (closing
          ? "-translate-y-4 opacity-0"
          : "translate-y-0 opacity-100")
      }
      style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
    >
      <div className="pointer-events-auto w-full max-w-md">
        <InstallAppCard
          variant="toast"
          primaryColor={primaryColor}
          onDismiss={handleDismiss}
          onInstalled={handleInstalled}
        />
      </div>
    </div>
  );
}
