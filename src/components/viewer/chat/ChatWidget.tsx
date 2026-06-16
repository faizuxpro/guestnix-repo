"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/components/guidebook/LanguageContext";
import { useChatStore } from "@/stores/chat-store";
import {
  DEFAULT_CHAT_WIDGET_SETTINGS,
  type ChatWidgetSettings,
} from "@/lib/chat-widget-settings";
import { ChatBotIcon } from "./ChatBotIcon";
import { ChatPanel } from "./ChatPanel";
import "./chat.css";

type Props = {
  guidebookSlug: string;
  propertyName: string;
  hostFirstName: string;
  hostAvatarUrl?: string | null;
  settings?: Partial<ChatWidgetSettings>;
  /**
   * When true (used from the editor preview), render only the floating bot as
   * a visual indicator. The panel itself is suppressed because preview chat
   * would create real sessions and consume AI quota.
   */
  preview?: boolean;
};

type DragPosition = {
  x: number;
  y: number;
};

type RepositionHintSide = "left" | "right" | "top" | "bottom";

const LONG_PRESS_MS = 520;
const REPOSITION_HINT_DELAY_MS = 60_000;
const REPOSITION_HINT_AUTO_HIDE_MS = 30_000;
const REPOSITION_HINT_SIDE_SPACE = 190;
const REPOSITION_HINT_NARROW_WIDTH = 360;
const VIEWPORT_PADDING = 8;
const SHELL_CLOSE_MS = 460;
const DESKTOP_MIN_WIDTH = 768;
const PANEL_MAX_WIDTH = 380;
const PANEL_MAX_HEIGHT = 600;
const AXIS_MOVE_MS = 180;

function clampPosition(position: DragPosition, width: number, height: number) {
  if (typeof window === "undefined") return position;
  return {
    x: Math.min(
      Math.max(VIEWPORT_PADDING, position.x),
      Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING)
    ),
    y: Math.min(
      Math.max(VIEWPORT_PADDING, position.y),
      Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING)
    ),
  };
}

function readStoredDragPosition(storageKey: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DragPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return null;
    }
    return clampPosition({ x: parsed.x, y: parsed.y }, 88, 70);
  } catch {
    return null;
  }
}

function getPanelPositionFromLauncher(rect: DOMRect) {
  if (
    typeof window === "undefined" ||
    window.innerWidth < DESKTOP_MIN_WIDTH
  ) {
    return null;
  }

  const width = Math.min(PANEL_MAX_WIDTH, window.innerWidth - 32);
  const height = Math.min(PANEL_MAX_HEIGHT, window.innerHeight - 48);

  return clampPosition(
    {
      x: rect.left + rect.width / 2 - 44,
      y: rect.top + rect.height / 2 - 39,
    },
    width,
    height
  );
}

function getRepositionHintSide(rect: DOMRect | null): RepositionHintSide {
  if (typeof window === "undefined" || !rect) return "left";

  const spaceLeft = rect.left;
  const spaceRight = window.innerWidth - rect.right;
  const spaceTop = rect.top;
  const spaceBottom = window.innerHeight - rect.bottom;

  if (window.innerWidth >= REPOSITION_HINT_NARROW_WIDTH) {
    if (spaceLeft >= REPOSITION_HINT_SIDE_SPACE || spaceLeft >= spaceRight) {
      return "left";
    }
    if (spaceRight >= REPOSITION_HINT_SIDE_SPACE) {
      return "right";
    }
  }

  return spaceTop >= spaceBottom ? "top" : "bottom";
}

function readStoredHostReadAt(storageKey: string | null) {
  if (typeof window === "undefined" || !storageKey) return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function toMessageTime(value: string | Date) {
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function ChatWidget({
  guidebookSlug,
  propertyName,
  hostFirstName,
  hostAvatarUrl,
  settings,
  preview = false,
}: Props) {
  const storageKey = `guestnix_chat_launcher_position_${guidebookSlug}`;
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dragPosition, setDragPosition] = useState<DragPosition | null>(null);
  const [panelPosition, setPanelPosition] = useState<DragPosition | null>(null);
  const [repositioning, setRepositioning] = useState(false);
  const [repositionHintEligible, setRepositionHintEligible] = useState(false);
  const [repositionHintDismissed, setRepositionHintDismissed] = useState(false);
  const [showRepositionHint, setShowRepositionHint] = useState(false);
  const [repositionHintSide, setRepositionHintSide] =
    useState<RepositionHintSide>("left");
  const [hostReadAt, setHostReadAt] = useState<string | null>(null);
  const sessionId = useChatStore((s) => s.sessionId);
  const messages = useChatStore((s) => s.messages);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const axisMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    offsetX: number;
    offsetY: number;
  }>({
    active: false,
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
  });
  const widgetSettings = useMemo(
    () => ({
      ...DEFAULT_CHAT_WIDGET_SETTINGS,
      ...settings,
    }),
    [settings]
  );
  const style = useMemo(
    () =>
      ({
        "--gnx-chat-offset-y": `${widgetSettings.offsetY}px`,
        ...(dragPosition
          ? {
              "--gnx-chat-drag-left": `${dragPosition.x}px`,
              "--gnx-chat-drag-top": `${dragPosition.y}px`,
            }
          : {}),
        ...(panelPosition
          ? {
              "--gnx-chat-panel-left": `${panelPosition.x}px`,
              "--gnx-chat-panel-top": `${panelPosition.y}px`,
            }
          : {}),
      }) as CSSProperties,
    [dragPosition, panelPosition, widgetSettings.offsetY]
  );
  const iconShape =
    widgetSettings.bubbleShape === "center" ||
    (widgetSettings.bubbleShape === "auto" &&
      widgetSettings.placement.includes("center"))
      ? "center"
      : widgetSettings.placement.endsWith("left")
      ? "tail-left"
      : "tail-right";
  const langCtx = useLanguage();
  const language =
    langCtx && langCtx.current !== langCtx.baseLanguage ? langCtx.current : undefined;
  const hostReadStorageKey = sessionId
    ? `guestnix_chat_host_read_${guidebookSlug}_${sessionId}`
    : null;
  const latestHostMessageAt = useMemo(() => {
    let latest: string | null = null;
    let latestTime = 0;

    for (const message of messages) {
      if (message.role !== "host") continue;
      const time = toMessageTime(message.createdAt);
      if (time > latestTime) {
        latest =
          message.createdAt instanceof Date
            ? message.createdAt.toISOString()
            : message.createdAt;
        latestTime = time;
      }
    }

    return latest;
  }, [messages]);
  const unreadHostCount = useMemo(() => {
    const readTime = hostReadAt ? toMessageTime(hostReadAt) : 0;
    return messages.filter(
      (message) =>
        message.role === "host" && toMessageTime(message.createdAt) > readTime
    ).length;
  }, [hostReadAt, messages]);
  const showUnreadHostBadge = unreadHostCount > 0 && !open && !closing;

  useEffect(() => {
    const resetHandle = window.setTimeout(() => {
      setRepositionHintEligible(false);
      setRepositionHintDismissed(false);
      setShowRepositionHint(false);
    }, 0);

    if (preview) {
      return () => window.clearTimeout(resetHandle);
    }

    const showHandle = window.setTimeout(() => {
      setRepositionHintEligible(true);
    }, REPOSITION_HINT_DELAY_MS);
    return () => {
      window.clearTimeout(resetHandle);
      window.clearTimeout(showHandle);
    };
  }, [guidebookSlug, preview]);

  useEffect(() => {
    if (
      preview ||
      !repositionHintEligible ||
      repositionHintDismissed ||
      showRepositionHint ||
      open ||
      closing
    ) {
      return;
    }

    const handle = window.setTimeout(() => {
      setRepositionHintSide(
        getRepositionHintSide(shellRef.current?.getBoundingClientRect() ?? null)
      );
      setShowRepositionHint(true);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [
    closing,
    open,
    preview,
    repositionHintDismissed,
    repositionHintEligible,
    showRepositionHint,
  ]);

  useEffect(() => {
    if (!showRepositionHint) return;
    const handle = window.setTimeout(() => {
      setShowRepositionHint(false);
      setRepositionHintDismissed(true);
    }, REPOSITION_HINT_AUTO_HIDE_MS);
    return () => window.clearTimeout(handle);
  }, [showRepositionHint]);

  useEffect(() => {
    if (preview) return;
    const handle = window.setTimeout(() => {
      setDragPosition(readStoredDragPosition(storageKey));
    }, 0);
    return () => window.clearTimeout(handle);
  }, [preview, storageKey]);

  useEffect(() => {
    if (!dragPosition || open) return;
    const onResize = () => {
      const rect = shellRef.current?.getBoundingClientRect();
      setDragPosition((current) =>
        current
          ? clampPosition(current, rect?.width ?? 88, rect?.height ?? 70)
          : current
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dragPosition, open]);

  useEffect(() => {
    if (!panelPosition || (!open && !closing)) return;
    const onResize = () => {
      setPanelPosition((current) =>
        current
          ? clampPosition(
              current,
              Math.min(PANEL_MAX_WIDTH, window.innerWidth - 32),
              Math.min(PANEL_MAX_HEIGHT, window.innerHeight - 48)
            )
          : current
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [closing, open, panelPosition]);

  useEffect(() => {
    if (preview) return;
    const handle = window.setTimeout(() => {
      setHostReadAt(readStoredHostReadAt(hostReadStorageKey));
    }, 0);
    return () => window.clearTimeout(handle);
  }, [hostReadStorageKey, preview]);

  useEffect(() => {
    if (preview || !open || !hostReadStorageKey || !latestHostMessageAt) return;
    try {
      window.localStorage.setItem(hostReadStorageKey, latestHostMessageAt);
    } catch {
      // Ignore private browsing/storage quota failures.
    }
    const handle = window.setTimeout(() => {
      setHostReadAt(latestHostMessageAt);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [hostReadStorageKey, latestHostMessageAt, open, preview]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      if (axisMoveTimerRef.current) {
        clearTimeout(axisMoveTimerRef.current);
      }
    },
    []
  );

  const clearLongPressTimer = useCallback(() => {
    if (!longPressTimerRef.current) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }, []);

  const persistDragPosition = useCallback(
    (position: DragPosition) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(position));
      } catch {
        // Ignore private browsing/storage quota failures.
      }
    },
    [storageKey]
  );

  const dismissRepositionHint = useCallback(() => {
    setShowRepositionHint(false);
    setRepositionHintDismissed(true);
  }, []);

  const dismissVisibleRepositionHint = useCallback(() => {
    if (!showRepositionHint) return;
    dismissRepositionHint();
  }, [dismissRepositionHint, showRepositionHint]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (
        preview ||
        open ||
        closing ||
        (event.pointerType === "mouse" && event.button !== 0)
      ) {
        return;
      }
      const shell = shellRef.current;
      if (!shell) return;

      dismissVisibleRepositionHint();
      clearLongPressTimer();
      const rect = shell.getBoundingClientRect();
      const target = event.currentTarget;
      dragRef.current = {
        active: false,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      target.setPointerCapture(event.pointerId);

      longPressTimerRef.current = setTimeout(() => {
        dragRef.current.active = true;
        suppressClickRef.current = true;
        setRepositioning(true);
      }, LONG_PRESS_MS);
    },
    [
      clearLongPressTimer,
      closing,
      dismissVisibleRepositionHint,
      open,
      preview,
    ]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
        return;
      }
      event.preventDefault();
      const rect = shellRef.current?.getBoundingClientRect();
      const next = clampPosition(
        {
          x: event.clientX - dragRef.current.offsetX,
          y: event.clientY - dragRef.current.offsetY,
        },
        rect?.width ?? 88,
        rect?.height ?? 70
      );
      setDragPosition(next);
    },
    []
  );

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      clearLongPressTimer();
      const wasDragging =
        dragRef.current.active && dragRef.current.pointerId === event.pointerId;
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
      setRepositioning(false);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      if (wasDragging) {
        event.preventDefault();
        suppressClickRef.current = true;
        setDragPosition((current) => {
          if (current) persistDragPosition(current);
          return current;
        });
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
    },
    [clearLongPressTimer, persistDragPosition]
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      clearLongPressTimer();
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
      setRepositioning(false);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [clearLongPressTimer]
  );

  const handleClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    if (axisMoveTimerRef.current) {
      clearTimeout(axisMoveTimerRef.current);
    }
    setClosing(true);
    setOpen(false);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (dragPosition && panelPosition) {
        setPanelPosition({ x: panelPosition.x, y: dragPosition.y });
        axisMoveTimerRef.current = setTimeout(() => {
          setPanelPosition(null);
          setClosing(false);
          axisMoveTimerRef.current = null;
        }, AXIS_MOVE_MS);
        return;
      }
      setPanelPosition(null);
      setClosing(false);
    }, SHELL_CLOSE_MS);
  }, [dragPosition, panelPosition]);

  if (preview) {
    return (
      <div className="notranslate" translate="no">
        <div
          ref={shellRef}
          className="gnx-chat-shell"
          data-open="false"
          data-preview="true"
          data-placement={widgetSettings.placement}
          data-size={widgetSettings.size}
          data-motion={widgetSettings.motion}
          data-bubble-shape={widgetSettings.bubbleShape}
          data-glow={widgetSettings.glow}
          data-color-mode={widgetSettings.colorMode}
          data-host-unread="false"
          style={style}
        >
          <span className="gnx-chat-shell-glow" aria-hidden />
          <button
            type="button"
            className="gnx-chat-bot-button"
            aria-label="AI concierge (preview)"
            title="The AI concierge is active for guests. Open the live URL to chat with it."
            onClick={(e) => e.preventDefault()}
          >
            <span className="gnx-chat-bot-float" aria-hidden>
              <span className="gnx-chat-bot-spin">
                <ChatBotIcon className="gnx-chat-bot-icon" shape={iconShape} />
              </span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notranslate" translate="no">
      <div
        ref={shellRef}
        className="gnx-chat-shell"
        data-open={open ? "true" : "false"}
        data-repositioned={
          dragPosition && !panelPosition && !open && !closing ? "true" : "false"
        }
        data-panel-positioned={panelPosition ? "true" : "false"}
        data-closing={closing ? "true" : "false"}
        data-repositioning={repositioning ? "true" : "false"}
        data-placement={widgetSettings.placement}
        data-size={widgetSettings.size}
        data-motion={widgetSettings.motion}
        data-bubble-shape={widgetSettings.bubbleShape}
        data-glow={widgetSettings.glow}
        data-color-mode={widgetSettings.colorMode}
        data-host-unread={showUnreadHostBadge ? "true" : "false"}
        style={style}
      >
        <span className="gnx-chat-shell-glow" aria-hidden />
        {showRepositionHint && !open && !closing && (
          <div
            className="gnx-chat-reposition-hint"
            data-side={repositionHintSide}
            aria-live="polite"
          >
            <span>Long press to reposition me</span>
            <button
              type="button"
              className="gnx-chat-reposition-hint-close"
              onClick={dismissRepositionHint}
              aria-label="Dismiss reposition hint"
            >
              <X size={13} aria-hidden />
            </button>
          </div>
        )}
        <button
          type="button"
          className="gnx-chat-bot-button"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerCancel}
          onLostPointerCapture={handlePointerEnd}
          onClick={(event) => {
            if (suppressClickRef.current) {
              event.preventDefault();
              suppressClickRef.current = false;
              return;
            }
            dismissVisibleRepositionHint();
            if (!open && !closing) {
              const rect = shellRef.current?.getBoundingClientRect();
              const target = rect ? getPanelPositionFromLauncher(rect) : null;
              if (axisMoveTimerRef.current) {
                clearTimeout(axisMoveTimerRef.current);
              }
              if (target && rect) {
                setPanelPosition({ x: target.x, y: rect.top });
                axisMoveTimerRef.current = setTimeout(() => {
                  setPanelPosition(target);
                  setOpen(true);
                  axisMoveTimerRef.current = null;
                }, AXIS_MOVE_MS);
                return;
              }
              setPanelPosition(null);
              setOpen(true);
            }
          }}
          aria-label={
            open || closing
              ? "AI concierge is open"
              : showUnreadHostBadge
                ? `Open AI concierge. ${
                    unreadHostCount > 9 ? "9 or more" : unreadHostCount
                  } unread host ${
                    unreadHostCount === 1 ? "message" : "messages"
                  }. Long press to reposition.`
                : "Open AI concierge. Long press to reposition."
          }
          title={
            open || closing
              ? undefined
              : "Open AI concierge. Long press and drag to move it."
          }
          tabIndex={open || closing ? -1 : 0}
        >
          <span className="gnx-chat-bot-float" aria-hidden>
            <span className="gnx-chat-bot-spin">
              <ChatBotIcon className="gnx-chat-bot-icon" shape={iconShape} />
            </span>
          </span>
          {showUnreadHostBadge && (
            <span className="gnx-chat-unread-badge" aria-hidden>
              {unreadHostCount > 9 ? "9+" : unreadHostCount}
            </span>
          )}
        </button>
        <ChatPanel
          open={open}
          onClose={handleClose}
          guidebookSlug={guidebookSlug}
          propertyName={propertyName}
          hostFirstName={hostFirstName}
          hostAvatarUrl={hostAvatarUrl}
          language={language}
        />
      </div>
    </div>
  );
}
