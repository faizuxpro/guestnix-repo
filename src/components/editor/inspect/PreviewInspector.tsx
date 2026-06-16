"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EDITOR_INSPECT_LABEL_ATTRIBUTE,
  EDITOR_INSPECT_TARGET_ATTRIBUTE,
  describeEditorInspectTarget,
  parseEditorInspectTarget,
  type EditorInspectTarget,
} from "@/lib/editor-inspect";

const DESKTOP_QUERY = "(min-width: 768px)";
const INACTIVITY_TIMEOUT_MS = 90000;

type HoverOverlay = {
  top: number;
  left: number;
  width: number;
  height: number;
  label: string;
};

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  containerRef: RefObject<HTMLElement | null>;
  onTarget: (target: EditorInspectTarget) => void;
};

export function PreviewInspector({
  enabled,
  onEnabledChange,
  containerRef,
  onTarget,
}: Props) {
  const [isDesktop, setIsDesktop] = useState(false);
  const [hoverOverlay, setHoverOverlay] = useState<HoverOverlay | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  const clearIdleTimer = useCallback(() => {
    if (!idleTimerRef.current) return;
    window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = null;
  }, []);

  const disableInspect = useCallback(() => {
    clearIdleTimer();
    setHoverOverlay(null);
    onEnabledChange(false);
  }, [clearIdleTimer, onEnabledChange]);

  const resetIdleTimer = useCallback(() => {
    if (!enabled) return;
    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(
      disableInspect,
      INACTIVITY_TIMEOUT_MS
    );
  }, [clearIdleTimer, disableInspect, enabled]);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled || isDesktop) return;
    const frame = window.requestAnimationFrame(disableInspect);
    return () => window.cancelAnimationFrame(frame);
  }, [disableInspect, enabled, isDesktop]);

  useEffect(() => {
    if (!enabled) {
      clearIdleTimer();
      const frame = window.requestAnimationFrame(() => setHoverOverlay(null));
      return () => window.cancelAnimationFrame(frame);
    }

    resetIdleTimer();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        disableInspect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearIdleTimer();
    };
  }, [clearIdleTimer, disableInspect, enabled, resetIdleTimer]);

  useEffect(() => {
    if (!enabled || !isDesktop) return;
    const container = containerRef.current;
    if (!container) return;

    const updateHover = (event: PointerEvent) => {
      resetIdleTimer();
      const element = findInspectElement(event.target);
      if (!element) {
        setHoverOverlay(null);
        return;
      }
      setHoverOverlay(readHoverOverlay(container, element));
    };

    const clearHover = (event: PointerEvent) => {
      if (
        event.relatedTarget instanceof Node &&
        container.contains(event.relatedTarget)
      ) {
        return;
      }
      setHoverOverlay(null);
    };

    const handleClick = (event: MouseEvent) => {
      const element = findInspectElement(event.target);
      if (!element) return;

      const target = parseEditorInspectTarget(
        element.getAttribute(EDITOR_INSPECT_TARGET_ATTRIBUTE) ?? ""
      );
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();
      onTarget(target);
      disableInspect();
    };

    container.addEventListener("pointerover", updateHover, true);
    container.addEventListener("pointermove", updateHover, true);
    container.addEventListener("pointerout", clearHover, true);
    container.addEventListener("click", handleClick, true);
    return () => {
      container.removeEventListener("pointerover", updateHover, true);
      container.removeEventListener("pointermove", updateHover, true);
      container.removeEventListener("pointerout", clearHover, true);
      container.removeEventListener("click", handleClick, true);
    };
  }, [
    containerRef,
    disableInspect,
    enabled,
    isDesktop,
    onTarget,
    resetIdleTimer,
  ]);

  if (!isDesktop) return null;

  return (
    <>
      <div className="absolute right-3 top-3 z-50 hidden md:block">
        <Button
          type="button"
          variant={enabled ? "default" : "secondary"}
          size="sm"
          onClick={() => onEnabledChange(!enabled)}
          aria-pressed={enabled}
          className={cn(
            "h-8 gap-1.5 rounded-full border px-3 text-xs shadow-sm",
            enabled &&
              "border-primary bg-primary text-primary-foreground shadow-primary/20"
          )}
        >
          <MousePointerClick className="h-3.5 w-3.5" />
          <span>{enabled ? "Inspecting" : "Inspect"}</span>
        </Button>
      </div>

      {enabled && hoverOverlay ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute z-40 rounded-md border border-primary/80 bg-primary/10 shadow-[0_0_0_3px_rgba(59,130,246,0.18)]"
            style={{
              top: hoverOverlay.top,
              left: hoverOverlay.left,
              width: hoverOverlay.width,
              height: hoverOverlay.height,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute z-50 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-lg"
            style={{
              top: Math.max(8, hoverOverlay.top - 30),
              left: Math.max(8, hoverOverlay.left),
            }}
          >
            {hoverOverlay.label}
          </div>
        </>
      ) : null}
    </>
  );
}

function findInspectElement(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>(`[${EDITOR_INSPECT_TARGET_ATTRIBUTE}]`);
}

function readHoverOverlay(container: HTMLElement, element: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const targetRect = element.getBoundingClientRect();
  const target = parseEditorInspectTarget(
    element.getAttribute(EDITOR_INSPECT_TARGET_ATTRIBUTE) ?? ""
  );
  const label =
    element.getAttribute(EDITOR_INSPECT_LABEL_ATTRIBUTE) ||
    (target ? describeEditorInspectTarget(target) : "Edit");

  return {
    top: targetRect.top - containerRect.top,
    left: targetRect.left - containerRect.left,
    width: targetRect.width,
    height: targetRect.height,
    label,
  };
}
