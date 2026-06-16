"use client";

import { useCallback, useState } from "react";
import { Plus, Share, X, MoreVertical, MonitorDown } from "lucide-react";
import { usePwaInstall } from "./PwaInstallProvider";

type Variant = "inline" | "toast";
type Platform = "ios" | "android-chrome" | "desktop-chromium" | "other";

type Props = {
  /** Visual variant: `inline` for embedding in a page; `toast` for the slide-down banner. */
  variant?: Variant;
  /** Brand primary color (oklch hex). */
  primaryColor?: string;
  /** When provided, the card shows a dismiss button that calls this. */
  onDismiss?: () => void;
  /** Fired after install succeeds (or user dismissed the native prompt). */
  onInstalled?: () => void;
  /**
   * Render the card even when `beforeinstallprompt` hasn't fired yet. The
   * Install button falls back to platform-specific manual instructions. Used
   * for the persistent Host-tab card so it's always discoverable.
   */
  alwaysShow?: boolean;
};

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return "ios";
  if (/Android/.test(ua) && /Chrome|EdgA/.test(ua)) return "android-chrome";
  if (!/Mobi|Android/.test(ua) && /Chrome|Edg(?!iOS)/.test(ua))
    return "desktop-chromium";
  return "other";
}

function ManualInstructions({
  platform,
  bg,
  onClose,
}: {
  platform: Platform;
  bg: string;
  onClose: () => void;
}) {
  let title = "Add to Home Screen";
  let steps: React.ReactNode = null;

  if (platform === "ios") {
    steps = (
      <>
        <li className="flex items-start gap-2">
          <span className="font-semibold">1.</span>
          <span>
            Tap the share button{" "}
            <Share className="inline h-4 w-4 align-text-bottom" /> at the bottom
            of Safari.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-semibold">2.</span>
          <span>
            Scroll and tap <strong>Add to Home Screen</strong>.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-semibold">3.</span>
          <span>
            Tap <strong>Add</strong> to confirm.
          </span>
        </li>
      </>
    );
  } else if (platform === "android-chrome") {
    steps = (
      <>
        <li className="flex items-start gap-2">
          <span className="font-semibold">1.</span>
          <span>
            Tap the menu{" "}
            <MoreVertical className="inline h-4 w-4 align-text-bottom" /> at the
            top right of your browser.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-semibold">2.</span>
          <span>
            Choose <strong>Install app</strong> or{" "}
            <strong>Add to Home screen</strong>.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-semibold">3.</span>
          <span>
            Tap <strong>Install</strong> to confirm.
          </span>
        </li>
      </>
    );
  } else if (platform === "desktop-chromium") {
    title = "Install this guidebook";
    steps = (
      <>
        <li className="flex items-start gap-2">
          <span className="font-semibold">1.</span>
          <span>
            Look for the install icon{" "}
            <MonitorDown className="inline h-4 w-4 align-text-bottom" /> at the
            right of the address bar.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-semibold">2.</span>
          <span>
            Or open the browser menu{" "}
            <MoreVertical className="inline h-4 w-4 align-text-bottom" /> →{" "}
            <strong>Install Guestnix…</strong>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-semibold">3.</span>
          <span>
            Click <strong>Install</strong> to confirm.
          </span>
        </li>
      </>
    );
  } else {
    steps = (
      <>
        <li className="flex items-start gap-2">
          <span className="font-semibold">1.</span>
          <span>Open your browser&rsquo;s menu.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-semibold">2.</span>
          <span>
            Look for <strong>Install app</strong> or{" "}
            <strong>Add to Home screen</strong>.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="font-semibold">3.</span>
          <span>Follow the prompt to confirm.</span>
        </li>
      </>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="How to install"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 text-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-semibold" style={{ color: bg }}>
          {title}
        </h3>
        <ol className="space-y-2 text-sm leading-relaxed text-neutral-700">
          {steps}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: bg }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export function InstallAppCard({
  variant = "inline",
  primaryColor,
  onDismiss,
  onInstalled,
  alwaysShow = false,
}: Props) {
  const { canInstall, isIosEligible, isStandalone, installApp } =
    usePwaInstall();
  const [hintPlatform, setHintPlatform] = useState<Platform | null>(null);

  const handleInstall = useCallback(async () => {
    const outcome = await installApp();
    if (outcome === "accepted" || outcome === "dismissed") {
      onInstalled?.();
      return;
    }
    // No native prompt available — fall back to manual instructions.
    if (outcome === "ios-hint") {
      setHintPlatform("ios");
    } else {
      setHintPlatform(detectPlatform());
    }
  }, [installApp, onInstalled]);

  // Never show after the app has been installed.
  if (isStandalone) return null;
  // Toast variant only fires when we *know* install is possible.
  if (!alwaysShow && !canInstall) return null;

  const bg = primaryColor || "#002927";
  const isToast = variant === "toast";

  return (
    <>
      <div
        className={
          isToast
            ? "flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-2xl"
            : "flex items-center gap-3 rounded-2xl px-4 py-4 text-white shadow-md"
        }
        style={{ backgroundColor: bg }}
        role="region"
        aria-label="Install this guidebook"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Plus className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight">
            Add to Home Screen
          </div>
          <div className="mt-0.5 text-xs opacity-85 leading-snug">
            {isIosEligible
              ? "One tap from your home screen — works offline too."
              : "Install this guide for quick access, even offline."}
          </div>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-white/30 active:translate-y-px"
        >
          Install
        </button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1.5 opacity-75 transition hover:opacity-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {hintPlatform && (
        <ManualInstructions
          platform={hintPlatform}
          bg={bg}
          onClose={() => setHintPlatform(null)}
        />
      )}
    </>
  );
}
