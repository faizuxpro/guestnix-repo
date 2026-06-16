"use client";

import { Tv } from "lucide-react";
import type { StreamingContent } from "../types";

const SERVICE_META: Record<
  NonNullable<StreamingContent["services"][number]["service"]>,
  { label: string; tone: string }
> = {
  netflix: { label: "Netflix", tone: "#e50914" },
  disney_plus: { label: "Disney+", tone: "#0063e5" },
  hulu: { label: "Hulu", tone: "#1ce783" },
  apple_tv: { label: "Apple TV+", tone: "#0a0a0a" },
  prime: { label: "Prime Video", tone: "#1399ff" },
  hbo: { label: "Max (HBO)", tone: "#5822b4" },
  spotify: { label: "Spotify", tone: "#1db954" },
  youtube: { label: "YouTube", tone: "#ff0000" },
  other: { label: "Other", tone: "#6b7280" },
};

const LOGIN_HINT: Record<
  NonNullable<StreamingContent["services"][number]["login_mode"]>,
  string
> = {
  account: "Signed in",
  pairing_code: "Pairing code",
  open: "No login",
  wifi_only: "Use your own account",
};

export function StreamingBlock({
  content,
}: {
  content: Partial<StreamingContent>;
}) {
  const services = Array.isArray(content.services) ? content.services : [];
  if (services.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      {services.map((svc, i) => {
        const meta = SERVICE_META[svc.service] ?? SERVICE_META.other;
        const hint = LOGIN_HINT[svc.login_mode] ?? "";
        const instructions = (svc.instructions ?? "").trim();
        return (
          <div
            key={i}
            className="flex gap-3 rounded-xl border bg-white p-3"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: meta.tone }}
              aria-hidden
            >
              <Tv className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[14px] font-semibold text-neutral-900">
                  {meta.label}
                </p>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  {hint}
                </span>
              </div>
              {instructions ? (
                <p className="mt-1 text-[13px] leading-snug text-neutral-700">
                  {instructions}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
