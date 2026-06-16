"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { HostIcon } from "@/components/icons/HostIcon";
import { blockColorOverrideVars } from "@/lib/block-colors";
import type {
  WidgetAnimation,
  WidgetColorRole,
  WidgetQrSize,
  WifiContent,
  WifiLayout,
  WifiPasswordDisplay,
  WifiStyle,
} from "../types";

function wifiQrString({
  ssid,
  password,
}: {
  ssid: string;
  password: string;
}) {
  const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:WPA;S:${esc(ssid)};P:${esc(password)};;`;
}

function qrImageUrl(value: string, size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&data=${encodeURIComponent(value)}`;
}

const WIFI_STYLES: WifiStyle[] = [
  "brand_card",
  "light_card",
  "split_qr",
  "ticket",
  "minimal",
  "terminal",
  "glass",
  "brutalist",
];

const COLOR_ROLES: WidgetColorRole[] = ["primary", "secondary", "accent"];
const QR_SIZES: WidgetQrSize[] = ["small", "medium", "large"];
const LAYOUTS: WifiLayout[] = ["stacked", "split", "compact"];
const PASSWORD_DISPLAYS: WifiPasswordDisplay[] = ["plain", "code", "hidden"];
const ANIMATIONS: WidgetAnimation[] = [
  "style_default",
  "none",
  "lift",
  "glow",
  "pulse",
];

const QR_PIXELS: Record<WidgetQrSize, number> = {
  small: 120,
  medium: 160,
  large: 200,
};

function coerce<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T
): T {
  return values.includes(value as T) ? (value as T) : fallback;
}

function displayPassword(value: string, mode: WifiPasswordDisplay) {
  if (mode === "hidden") return "••••••••";
  return value;
}

export function WifiBlock({ content }: { content: Partial<WifiContent> }) {
  const [copied, setCopied] = useState(false);
  const ssid = content.network_name?.trim() || "";
  const password = content.password?.trim() || "";
  const notes = content.notes?.trim() || "";
  const title = content.title?.trim() || "Stay connected";
  const eyebrow = content.eyebrow?.trim() || "Wi-Fi Access";
  const icon = content.icon?.trim() || "ph:wifi-high-fill";
  const showQr = content.show_qr !== false && ssid.length > 0;
  const style = coerce(content.style, WIFI_STYLES, "brand_card");
  const config =
    typeof content.config === "object" && content.config !== null
      ? content.config
      : undefined;
  const accentRole = coerce(config?.accent_role, COLOR_ROLES, "accent");
  const qrSize = coerce(config?.qr_size, QR_SIZES, "medium");
  const layout = coerce(config?.layout, LAYOUTS, "stacked");
  const passwordDisplay = coerce(
    config?.password_display,
    PASSWORD_DISPLAYS,
    "code"
  );
  const animation = coerce(config?.animation, ANIMATIONS, "style_default");
  const qrPixels = QR_PIXELS[qrSize];

  const qr = useMemo(
    () => (showQr ? qrImageUrl(wifiQrString({ ssid, password }), qrPixels) : null),
    [ssid, password, qrPixels, showQr]
  );

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  if (!ssid && !password) return null;

  return (
    <div
      className="sl-wifi"
      data-style={style}
      data-color-role={accentRole}
      data-layout={layout}
      data-qr-size={qrSize}
      data-password-display={passwordDisplay}
      data-animation={animation}
      style={
        blockColorOverrideVars([
          {
            value: config?.accent_color,
            colorVar: "--sl-wifi-color",
            rgbVar: "--sl-wifi-color-rgb",
            contrastVar: "--sl-wifi-contrast",
          },
        ]) as CSSProperties
      }
    >
      <div className="sl-wifi-head">
        <span className="sl-wifi-icon" aria-hidden>
          <HostIcon value={icon} />
        </span>
        <div>
          {eyebrow ? <span className="sl-wifi-eyebrow">{eyebrow}</span> : null}
          {title ? <h3 className="sl-wifi-title">{title}</h3> : null}
        </div>
      </div>

      <div className="sl-wifi-body">
        <div className="sl-wifi-fields">
          {ssid && (
            <div className="sl-wifi-field">
              <span className="lbl">Network</span>
              <strong>{ssid}</strong>
            </div>
          )}
          {password && (
            <div className="sl-wifi-field">
              <span className="lbl">Password</span>
              <span className="sl-wifi-secret">
                <strong>{displayPassword(password, passwordDisplay)}</strong>
                <button
                  className="sl-wifi-copy"
                  onClick={copy}
                  type="button"
                  aria-label="Copy password"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </span>
            </div>
          )}
        </div>

        {qr && (
          <div className="sl-wifi-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={qrPixels} height={qrPixels} alt="Wi-Fi QR code" />
          </div>
        )}
      </div>

      {notes ? <p className="sl-wifi-note">{notes}</p> : null}
    </div>
  );
}
