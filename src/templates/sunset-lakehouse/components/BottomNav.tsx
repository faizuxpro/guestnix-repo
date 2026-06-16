"use client";

import type { CSSProperties, ReactNode } from "react";
import { HostIcon } from "@/components/icons/HostIcon";
import { DEFAULT_ICONS } from "@/lib/icons/defaults";
import { editorInspectAttributes } from "@/lib/editor-inspect";
import {
  DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS,
  createBottomNavElementVars,
  type BottomNavDesignSettings,
} from "@/lib/bottom-nav-settings";
import type { BottomNavSlot, BottomNavBuiltinType } from "@/types/bottom-nav";

export type NavTab = BottomNavBuiltinType;

type Props = {
  slots: BottomNavSlot[];
  design?: BottomNavDesignSettings;
  activeBuiltin: NavTab;
  activeSectionId?: string | null;
  onBuiltin: (tab: NavTab) => void;
  onSection: (sectionId: string) => void;
  storeUnreadCount?: number;
  hidden?: boolean;
};

export function BottomNav({
  slots,
  design = DEFAULT_BOTTOM_NAV_DESIGN_SETTINGS,
  activeBuiltin,
  activeSectionId = null,
  onBuiltin,
  onSection,
  storeUnreadCount = 0,
  hidden = false,
}: Props) {
  const hasActiveSectionSlot = slots.some(
    (slot) =>
      slot.type === "section" &&
      Boolean(activeSectionId) &&
      slot.sectionId === activeSectionId
  );
  const className = [
    "sl-bottomnav",
    `sl-bottomnav--${design.dock.mode}`,
    `sl-bottomnav--style-${design.container.style}`,
    `sl-bottomnav--items-${design.item.layout}`,
    `sl-bottomnav--labels-${design.item.label_visibility}`,
    `sl-bottomnav--label-${design.item.label_case}`,
    `sl-bottomnav--active-${design.active.style}`,
    `sl-bottomnav--motion-${design.behavior.motion}`,
    hidden ? "is-hidden" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = createBottomNavElementVars(design) as CSSProperties;

  const renderContent = (
    slot: BottomNavSlot,
    fallback: string,
    badge: ReactNode
  ) => (
    <span className="sl-navitem-content">
      <span className="sl-navitem-icon" aria-hidden>
        <HostIcon value={slot.icon || fallback} />
      </span>
      {badge}
      <span className="sl-navitem-label">{slot.label}</span>
      <span className="sl-navitem-marker" aria-hidden />
    </span>
  );

  return (
    <nav
      className={className}
      style={style}
      aria-label="Guidebook navigation"
      {...editorInspectAttributes(
        { kind: "navigation", focus: "bottom_nav" },
        "Edit navigation"
      )}
    >
      {slots.map((slot, i) => {
        const key = `${slot.type}-${i}`;
        const fallback = navFallback(slot.type);
        if (slot.type === "link") {
          return (
            <a
              key={key}
              className="sl-navitem"
              href={slot.url || "#"}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={slot.label}
            >
              {renderContent(slot, fallback, null)}
            </a>
          );
        }
        if (slot.type === "section") {
          const active = activeSectionId === slot.sectionId;
          return (
            <button
              key={key}
              type="button"
              className={`sl-navitem${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={slot.label}
              onClick={() => onSection(slot.sectionId)}
            >
              {renderContent(slot, fallback, null)}
            </button>
          );
        }

        const showStoreBadge =
          slot.type === "store" &&
          storeUnreadCount > 0 &&
          design.badge.style !== "hidden";
        const unreadBadge = showStoreBadge ? (
          <span
            className={`sl-navitem-badge sl-navitem-badge--${design.badge.style}`}
            aria-hidden
          >
            {design.badge.style === "dot"
              ? ""
              : storeUnreadCount > 9
              ? "9+"
              : storeUnreadCount}
          </span>
        ) : null;
        const ariaLabel =
          slot.type === "store" && storeUnreadCount > 0
            ? `${slot.label}, ${storeUnreadCount > 9 ? "9 or more" : storeUnreadCount} Store ${
                storeUnreadCount === 1 ? "update" : "updates"
              }`
            : slot.label;
        const active = !hasActiveSectionSlot && activeBuiltin === slot.type;
        return (
          <button
            key={key}
            type="button"
            className={`sl-navitem${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
            aria-label={ariaLabel}
            onClick={() => onBuiltin(slot.type)}
          >
            {renderContent(slot, fallback, unreadBadge)}
          </button>
        );
      })}
    </nav>
  );
}

function navFallback(type: BottomNavSlot["type"]): string {
  switch (type) {
    case "home":
      return DEFAULT_ICONS.NAV_HOME;
    case "guide":
      return DEFAULT_ICONS.NAV_GUIDE;
    case "nearby":
      return DEFAULT_ICONS.NAV_NEARBY;
    case "host":
      return DEFAULT_ICONS.NAV_HOST;
    case "store":
      return DEFAULT_ICONS.PLACE_SHOPPING;
    default:
      return DEFAULT_ICONS.NAV_FALLBACK;
  }
}
