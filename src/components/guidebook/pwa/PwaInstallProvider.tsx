"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  PUBLIC_GUIDEBOOK_BASE_PATH,
  type GuidebookPublicBasePath,
} from "@/lib/guidebook-public-url";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Outcome = "accepted" | "dismissed" | "ios-hint" | "unavailable";

type PwaInstallContextValue = {
  /** True when the page can offer installation (Chrome captured the prompt, OR iOS Safari is detected). */
  canInstall: boolean;
  /** True only when the install path is iOS Safari (no native prompt). */
  isIosEligible: boolean;
  /** True when the page is already running as an installed PWA. */
  isStandalone: boolean;
  /**
   * Trigger install. Returns:
   *  - "accepted" / "dismissed" — native prompt resolved
   *  - "ios-hint" — caller should display manual iOS instructions
   *  - "unavailable" — nothing to do
   */
  installApp: () => Promise<Outcome>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

function isStandaloneNow(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

const noopSubscribe = () => () => {};

export function PwaInstallProvider({
  children,
  publicBasePath = PUBLIC_GUIDEBOOK_BASE_PATH,
}: {
  children: React.ReactNode;
  publicBasePath?: GuidebookPublicBasePath;
}) {
  // Distinguishes SSR (false) from client (true) without setState-in-effect.
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  // Register the service worker (scope /g/) once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const insecure =
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost";
    if (insecure) return;

    navigator.serviceWorker.register("/sw.js", { scope: `${publicBasePath}/` }).catch(() => {
      // silent — install is a progressive enhancement.
    });
  }, [publicBasePath]);

  // Capture beforeinstallprompt + appinstalled.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isStandalone = isClient ? isStandaloneNow() || installed : false;
  const isIosEligible =
    isClient && !isStandalone && isIOS() && isMobile();
  const canInstall = !isStandalone && (promptEvent !== null || isIosEligible);

  const installApp = useCallback(async (): Promise<Outcome> => {
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        setPromptEvent(null);
        return outcome;
      } catch {
        return "unavailable";
      }
    }
    if (isIosEligible) return "ios-hint";
    return "unavailable";
  }, [promptEvent, isIosEligible]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({ canInstall, isIosEligible, isStandalone, installApp }),
    [canInstall, isIosEligible, isStandalone, installApp]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    // Fail-open: if a consumer renders outside the provider (e.g. editor preview),
    // act as if install is unavailable rather than throw.
    return {
      canInstall: false,
      isIosEligible: false,
      isStandalone: false,
      installApp: async () => "unavailable",
    };
  }
  return ctx;
}
