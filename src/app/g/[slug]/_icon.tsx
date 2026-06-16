import { ImageResponse } from "next/og";
import { absoluteAppUrl } from "@/lib/app-url";
import { resolveGuidebookFaviconSource } from "@/lib/guidebook-favicon";
import { fetchPublishedSnapshot } from "@/lib/snapshot";

export const runtime = "nodejs";

const VALID_SIZES = new Set([192, 512]);

function sanitizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return trimmed;
  return fallback;
}

function pickInitial(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "G";
  const codePoint = trimmed.codePointAt(0);
  if (codePoint === undefined) return "G";
  return String.fromCodePoint(codePoint).toUpperCase();
}

function toAbsoluteIconUrl(url: string): string {
  try {
    return new URL(url, absoluteAppUrl("/")).toString();
  } catch {
    return absoluteAppUrl("/");
  }
}

export async function generateGuidebookIcon(slug: string, size: number) {
  if (!VALID_SIZES.has(size)) {
    return new Response("Invalid size", { status: 400 });
  }

  const snap = await fetchPublishedSnapshot(slug);
  if (!snap) {
    return new Response("Not Found", { status: 404 });
  }

  const branding = snap.guidebook.branding as { primary_color?: string };

  const bgColor = sanitizeColor(branding.primary_color, "#002927");
  const source = resolveGuidebookFaviconSource(snap.guidebook);
  const iconUrl = toAbsoluteIconUrl(source.url);
  const initial = pickInitial(snap.guidebook.title);
  const fontSize = Math.round(size * 0.55);
  const isPhoto = source.fit === "cover";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bgColor,
          color: "#faf6ef",
          fontSize,
          fontWeight: 700,
          letterSpacing: 0,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {source.source === "guestnix" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt=""
            style={{
              width: "74%",
              height: "74%",
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              width: isPhoto ? "100%" : "78%",
              height: isPhoto ? "100%" : "78%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderRadius: isPhoto ? "50%" : 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={iconUrl}
              alt={initial}
              style={{
                width: "100%",
                height: "100%",
                objectFit: source.fit,
              }}
            />
          </div>
        )}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
