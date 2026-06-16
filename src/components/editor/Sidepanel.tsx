"use client";

import { useMemo } from "react";
import { Layers, Palette, Settings as SettingsIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PagesPanel } from "./panels/PagesPanel";
import { DesignPanel } from "./panels/DesignPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import type {
  EditorContentSubmenu,
  EditorDesignSubmenu,
  EditorPrimaryMenu,
  EditorSettingsSubmenu,
  EditorSubmenuState,
} from "./editor-menu";
import {
  CONTENT_SUBMENU,
  DESIGN_SUBMENU,
  EDITOR_PRIMARY_MENU,
  SETTINGS_SUBMENU,
} from "./editor-menu";

type SubmenuOption = {
  id: string;
  label: string;
};

type Props = {
  activePrimary: EditorPrimaryMenu;
  submenu: EditorSubmenuState;
  onPrimaryChange: (tab: EditorPrimaryMenu) => void;
  onSubmenuChange: (next: Partial<EditorSubmenuState>) => void;
};

const PRIMARY_ICONS: Record<EditorPrimaryMenu, LucideIcon> = {
  content: Layers,
  design: Palette,
  settings: SettingsIcon,
};

export function Sidepanel({
  activePrimary,
  submenu,
  onPrimaryChange,
  onSubmenuChange,
}: Props) {
  const subTabs = useMemo<{
    value: string;
    options: SubmenuOption[];
  }>(() => {
    if (activePrimary === "content") {
      return {
        value: submenu.content,
        options: CONTENT_SUBMENU,
      };
    }
    if (activePrimary === "design") {
      return {
        value: submenu.design,
        options: DESIGN_SUBMENU,
      };
    }
    return {
      value: submenu.settings,
      options: SETTINGS_SUBMENU,
    };
  }, [activePrimary, submenu.content, submenu.design, submenu.settings]);

  const applySubmenu = (nextValue: string) => {
    if (activePrimary === "content") {
      onSubmenuChange({ content: nextValue as EditorContentSubmenu });
      return;
    }
    if (activePrimary === "design") {
      onSubmenuChange({ design: nextValue as EditorDesignSubmenu });
      return;
    }
    onSubmenuChange({ settings: nextValue as EditorSettingsSubmenu });
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="bg-[oklch(0.20_0.005_240)] text-white shadow-[0_1px_0_0_rgba(0,0,0,0.25)]">
        <div className="grid grid-cols-3 gap-px bg-white/8">
          {EDITOR_PRIMARY_MENU.map((tab) => {
            const isActive = activePrimary === tab.id;
            const Icon = PRIMARY_ICONS[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onPrimaryChange(tab.id)}
                aria-pressed={isActive}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-1.5 px-2 py-3.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  isActive
                    ? "bg-[oklch(0.28_0.005_240)] text-white"
                    : "bg-[oklch(0.20_0.005_240)] text-white/55 hover:bg-white/5 hover:text-white"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 h-[3px] transition-all duration-200",
                    isActive
                      ? "bg-accent opacity-100"
                      : "bg-transparent opacity-0"
                  )}
                />
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] transition-transform duration-200",
                    isActive
                      ? "text-accent scale-110"
                      : "text-white/60 group-hover:text-white"
                  )}
                />
                <span className="tracking-wide">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/8">
          <div
            role="tablist"
            className="flex items-center gap-1 overflow-x-auto px-2 pt-2"
          >
            {subTabs.options.map((option) => {
              const isActive = subTabs.value === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => applySubmenu(option.id)}
                  className={cn(
                    "relative shrink-0 rounded-t-md px-3.5 pb-2.5 pt-2 text-sm transition-colors focus-visible:outline-none",
                    isActive
                      ? "bg-white/[0.08] font-semibold text-accent"
                      : "font-medium text-white/45 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <span>{option.label}</span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-[3px] rounded-t-full transition-all duration-200",
                      isActive
                        ? "bg-accent opacity-100"
                        : "bg-transparent opacity-0"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden bg-background">
        {activePrimary === "content" && <PagesPanel mode={submenu.content} />}
        {activePrimary === "design" && <DesignPanel mode={submenu.design} />}
        {activePrimary === "settings" && (
          <SettingsPanel mode={submenu.settings} />
        )}
      </div>
    </div>
  );
}
