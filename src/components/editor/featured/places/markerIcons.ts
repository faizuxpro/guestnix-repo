import type * as Leaflet from "leaflet";
import { PLACE_CATEGORIES } from "@/lib/constants";
import { nearbyCategoryMeta } from "@/lib/nearby-categories";
import { sanitizeSvg } from "@/lib/icons/sanitize";

export type MarkerVariant = "saved" | "suggestion" | "focused";

type LeafletLib = typeof Leaflet;
type IconBank = Map<string, Leaflet.DivIcon>;

const cache = new WeakMap<LeafletLib, Record<MarkerVariant, IconBank>>();
const homeIconCache = new WeakMap<LeafletLib, Leaflet.DivIcon>();

const PIN_VIEWBOX_WIDTH = 64;
const PIN_VIEWBOX_HEIGHT = 75;
const PIN_TIP_Y = 67;
const PIN_COLOR_CX = 31.75;
const PIN_COLOR_CY = 28.75;
const PIN_COLOR_R = 22.75;
const PIN_SHELL_PATH =
  "M31.7489 0C16.45 0 4 12.5363 4 27.9493C4 49.8494 29.1405 65.4617 30.2104 66.4113C30.6333 66.7899 31.1808 66.9994 31.7483 67C32.3159 67.0006 32.8638 66.7921 33.2874 66.4144C34.3573 65.4617 59.4978 49.8494 59.4978 27.9493C59.4978 12.5363 47.0478 0 31.7489 0ZM31.7489 43.165C23.2485 43.165 16.3329 36.2493 16.3329 27.7489C16.3329 19.2485 23.2485 12.3329 31.7489 12.3329C40.2493 12.3329 47.165 19.2485 47.165 27.7489C47.165 36.2493 40.2493 43.165 31.7489 43.165Z";
const HOME_PIN_VIEWBOX_WIDTH = 107;
const HOME_PIN_VIEWBOX_HEIGHT = 130;
const HOME_PIN_TIP_Y = 129.752;
const HOME_PIN_WIDTH = 58;
const HOME_PIN_HEIGHT = 70;

type PinOptions = {
  width: number;
  height: number;
  color: string;
  iconSvg: string;
  iconColor: string;
  iconFontSize: number;
};

function sizedSvg(rawSvg: string, sizePx: number, color: string): string {
  const clean = sanitizeSvg(rawSvg);
  if (!clean) return "";
  // Force size + color on the root <svg> element. Strip any pre-existing
  // width/height/style attrs first — HTML parsers keep the first occurrence
  // of a duplicate attribute, so simply appending new ones is a no-op when
  // the source SVG already declares width="1em" height="1em".
  return clean.replace(/<svg([^>]*)>/, (_match, attrs: string) => {
    const cleaned = attrs
      .replace(/\s(width|height|style)\s*=\s*"[^"]*"/gi, "")
      .replace(/\s(width|height|style)\s*=\s*'[^']*'/gi, "");
    return `<svg${cleaned} width="${sizePx}" height="${sizePx}" style="color:${color}">`;
  });
}

function buildPinHtml(opts: PinOptions): string {
  const { width, height, color, iconSvg, iconColor, iconFontSize } = opts;
  const iconLeftPct = (PIN_COLOR_CX / PIN_VIEWBOX_WIDTH) * 100;
  const iconTopPct = (PIN_COLOR_CY / PIN_VIEWBOX_HEIGHT) * 100;
  const inner = sizedSvg(iconSvg, iconFontSize, iconColor);
  return `
    <div style="position:relative;width:${width}px;height:${height}px;">
      <svg width="${width}" height="${height}" viewBox="0 0 ${PIN_VIEWBOX_WIDTH} ${PIN_VIEWBOX_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <path d="${PIN_SHELL_PATH}" fill="#ffffff" style="filter:drop-shadow(0 4px 4px rgba(0,0,0,.25));" />
        <circle cx="${PIN_COLOR_CX}" cy="${PIN_COLOR_CY}" r="${PIN_COLOR_R}" fill="${color}" />
      </svg>
      <div style="position:absolute;top:${iconTopPct}%;left:${iconLeftPct}%;transform:translate(-50%,-50%);pointer-events:none;line-height:1;display:flex;align-items:center;justify-content:center;">
        ${inner}
      </div>
    </div>
  `;
}

function buildHomePinHtml(width: number, height: number): string {
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${HOME_PIN_VIEWBOX_WIDTH} ${HOME_PIN_VIEWBOX_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
      <path d="M53.2186 0C23.8741 0 0 23.8741 0 53.2186C0 76.8781 15.5905 97.6207 38.125 104.265L49.8182 127.65C50.1337 128.282 50.6189 128.813 51.2195 129.184C51.82 129.556 52.5121 129.752 53.2181 129.752C53.9241 129.752 54.6162 129.556 55.2167 129.184C55.8172 128.813 56.3025 128.282 56.618 127.65L68.3109 104.265C90.8467 97.6219 106.437 76.8781 106.437 53.2186C106.437 23.8741 82.5631 0 53.2186 0Z" fill="#042129"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M46.4001 28.0982C50.4037 24.9943 56.0338 24.9943 60.0374 28.0982L72.6645 37.8905C73.9788 38.9056 75.0434 40.2081 75.7766 41.6982C76.5098 43.1883 76.8922 44.8265 76.8945 46.4872V62.196C76.8945 68.2492 71.9281 73.1216 65.8458 73.1216H40.5917C34.5094 73.1216 29.543 68.2499 29.543 62.196V46.4872C29.543 43.1268 31.1064 39.959 33.773 37.8905L46.4001 28.0982Z" fill="#6FEF8B"/>
      <path d="M64.2295 56.3129C63.124 55.2075 61.3318 55.2075 60.2263 56.3129C56.3573 60.1821 50.0842 60.1821 46.2151 56.3129C45.1097 55.2075 43.3174 55.2075 42.2119 56.3129C41.1064 57.4185 41.1064 59.2106 42.2119 60.3162C48.2919 66.3962 58.1495 66.3962 64.2295 60.3162C65.335 59.2107 65.335 57.4185 64.2295 56.3129Z" fill="#042129"/>
    </svg>
  `;
}

function variantSpec(variant: MarkerVariant) {
  switch (variant) {
    case "suggestion":
      return { width: 34, height: 40, iconFontSize: 16 };
    case "focused":
      return { width: 50, height: 58, iconFontSize: 24 };
    case "saved":
    default:
      return { width: 41, height: 48, iconFontSize: 20 };
  }
}

function iconAnchor(spec: { width: number; height: number }): [number, number] {
  return [spec.width / 2, (spec.height * PIN_TIP_Y) / PIN_VIEWBOX_HEIGHT];
}

function homeIconAnchor(spec: { width: number; height: number }): [number, number] {
  return [
    (spec.width * 53.2186) / HOME_PIN_VIEWBOX_WIDTH,
    (spec.height * HOME_PIN_TIP_Y) / HOME_PIN_VIEWBOX_HEIGHT,
  ];
}

export function getMarkerIcon(
  leafletLib: LeafletLib,
  category: string,
  variant: MarkerVariant
): Leaflet.DivIcon {
  let banks = cache.get(leafletLib);
  if (!banks) {
    banks = {
      saved: new Map(),
      suggestion: new Map(),
      focused: new Map(),
    };
    cache.set(leafletLib, banks);
  }
  const bank = banks[variant];
  const key = (PLACE_CATEGORIES as readonly string[]).includes(category)
    ? category
    : "other";
  let icon = bank.get(key);
  if (!icon) {
    const meta = nearbyCategoryMeta(key);
    const spec = variantSpec(variant);
    icon = leafletLib.divIcon({
      className: "custom-marker",
      html: buildPinHtml({
        width: spec.width,
        height: spec.height,
        color: meta.color,
        iconSvg: meta.icon,
        iconColor: "#ffffff",
        iconFontSize: spec.iconFontSize,
      }),
      iconSize: [spec.width, spec.height],
      iconAnchor: iconAnchor(spec),
      popupAnchor: [0, -(iconAnchor(spec)[1] - 4)],
    });
    bank.set(key, icon);
  }
  return icon;
}

export function getHomeIcon(leafletLib: LeafletLib): Leaflet.DivIcon {
  const cached = homeIconCache.get(leafletLib);
  if (cached) return cached;
  const spec = { width: HOME_PIN_WIDTH, height: HOME_PIN_HEIGHT };
  const anchor = homeIconAnchor(spec);
  const icon = leafletLib.divIcon({
    className: "custom-marker home-marker",
    html: buildHomePinHtml(spec.width, spec.height),
    iconSize: [spec.width, spec.height],
    iconAnchor: anchor,
    popupAnchor: [0, -(anchor[1] - 4)],
  });
  homeIconCache.set(leafletLib, icon);
  return icon;
}
