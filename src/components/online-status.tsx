"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

/**
 * App-wide banner that appears when `navigator.onLine` flips to false.
 * Sits bottom-center on top of everything (above leaflet, dialogs).
 *
 * Uses `useSyncExternalStore` so the online/offline state is read straight
 * from the browser without a setState-in-effect bounce.
 *
 * Note: `navigator.onLine` is "best-effort". `false` reliably means offline,
 * but `true` doesn't guarantee a working internet connection — for that, the
 * api-fetch classifier still surfaces network/timeout errors after the actual
 * request fails.
 */
export function OfflineIndicator() {
  const online = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  if (online) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 shadow-lg">
      <WifiOff className="h-3.5 w-3.5" />
      <span>
        You&apos;re offline. Changes won&apos;t save until you reconnect.
      </span>
    </div>
  );
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}
