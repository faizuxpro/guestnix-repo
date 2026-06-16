export type ChatWidgetPlacement =
  | "bottom-right"
  | "bottom-center"
  | "bottom-left"
  | "top-right"
  | "top-center"
  | "top-left";
export type ChatWidgetSize = "small" | "medium" | "large";
export type ChatWidgetMotion = "lively" | "calm" | "off";
export type ChatWidgetBubbleShape = "auto" | "side" | "center";
export type ChatWidgetGlow = "breathe" | "still" | "off";
export type ChatWidgetColorMode = "multicolor" | "brand";

export type ChatWidgetSettings = {
  placement: ChatWidgetPlacement;
  offsetY: number;
  size: ChatWidgetSize;
  motion: ChatWidgetMotion;
  bubbleShape: ChatWidgetBubbleShape;
  glow: ChatWidgetGlow;
  colorMode: ChatWidgetColorMode;
};

export const DEFAULT_CHAT_WIDGET_SETTINGS: ChatWidgetSettings = {
  placement: "bottom-right",
  offsetY: 0,
  size: "medium",
  motion: "lively",
  bubbleShape: "auto",
  glow: "breathe",
  colorMode: "multicolor",
};

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function readChatWidgetSettings(
  settings: Record<string, unknown> | null | undefined
): ChatWidgetSettings {
  const raw =
    typeof settings?.chat_widget === "object" && settings.chat_widget !== null
      ? (settings.chat_widget as Record<string, unknown>)
      : {};
  const placement =
    raw.placement === "bottom-left" ||
    raw.placement === "bottom-center" ||
    raw.placement === "top-right" ||
    raw.placement === "top-center" ||
    raw.placement === "top-left"
      ? raw.placement
      : "bottom-right";

  return {
    placement,
    offsetY: clampNumber(raw.offsetY, 0, 240, 0),
    size:
      raw.size === "small" || raw.size === "large" ? raw.size : "medium",
    motion:
      raw.motion === "calm" || raw.motion === "off" ? raw.motion : "lively",
    bubbleShape:
      raw.bubbleShape === "side" || raw.bubbleShape === "center"
        ? raw.bubbleShape
        : "auto",
    glow:
      raw.glow === "still" || raw.glow === "off" ? raw.glow : "breathe",
    colorMode: raw.colorMode === "brand" ? "brand" : "multicolor",
  };
}
