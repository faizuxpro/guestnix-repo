"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type PanelAccent = "teal" | "amber" | "indigo" | "slate" | "violet";

const ACCENT_STYLES: Record<
  PanelAccent,
  {
    headerBg: string;
    block: string;
    icon: string;
  }
> = {
  teal: {
    headerBg: "bg-primary/5",
    block: "bg-primary/15",
    icon: "text-primary",
  },
  amber: {
    headerBg: "bg-amber-50 dark:bg-amber-500/8",
    block: "bg-amber-200/70 dark:bg-amber-500/25",
    icon: "text-amber-700 dark:text-amber-400",
  },
  indigo: {
    headerBg: "bg-indigo-50 dark:bg-indigo-500/8",
    block: "bg-indigo-200/70 dark:bg-indigo-500/25",
    icon: "text-indigo-700 dark:text-indigo-400",
  },
  slate: {
    headerBg: "bg-slate-100 dark:bg-slate-700/20",
    block: "bg-slate-300/60 dark:bg-slate-600/40",
    icon: "text-slate-700 dark:text-slate-300",
  },
  violet: {
    headerBg: "bg-violet-50 dark:bg-violet-500/8",
    block: "bg-violet-200/70 dark:bg-violet-500/25",
    icon: "text-violet-700 dark:text-violet-400",
  },
};

/* -------------------------------------------------------------------------- */
/* PanelHeader — collapsible header (legacy, used by PropertyHostInfoPanel)   */
/* -------------------------------------------------------------------------- */

type PanelHeaderProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent: PanelAccent;
  open: boolean;
  onReset?: () => void;
  resetLabel?: string;
};

export function PanelHeader({
  icon,
  title,
  subtitle,
  accent,
  open,
  onReset,
  resetLabel = "Reset",
}: PanelHeaderProps) {
  const styles = ACCENT_STYLES[accent];
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={cn("flex w-full items-stretch", styles.headerBg)}>
      <CollapsibleTrigger
        render={
          <button
            type="button"
            className="group flex flex-1 items-center text-left transition-colors hover:bg-black/[0.02]"
          />
        }
      >
        <span
          className={cn(
            "ml-3 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border/60 bg-background/80 transition-colors",
            styles.block,
            styles.icon,
            "[&_svg]:h-4 [&_svg]:w-4 [&_svg]:stroke-[2]"
          )}
          aria-hidden
        >
          {icon}
        </span>

        <div className="flex flex-1 items-center justify-between gap-3 px-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground/70 transition-transform group-hover:text-foreground",
              open && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>

      {open && onReset ? (
        <div
          className="flex shrink-0 items-center gap-1 pr-3"
          onClick={(e) => e.stopPropagation()}
        >
          {confirming ? (
            <>
              <span className="text-[10.5px] font-medium text-muted-foreground">
                Reset?
              </span>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setConfirming(false);
                }}
                className="rounded-md bg-destructive px-2 py-1 text-[10.5px] font-semibold text-white shadow-sm transition-colors hover:bg-destructive/90 hover:text-white"
              >
                Yes, reset
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md border border-border/70 px-2 py-1 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              title={resetLabel}
              aria-label={resetLabel}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              {resetLabel}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* FeaturedNavCard — nav-style clickable card for the Featured Pages list     */
/* -------------------------------------------------------------------------- */

type FeaturedNavCardProps = {
  icon: React.ReactNode;
  title: string;
  accent: PanelAccent;
  onSelect?: () => void;
  trailing?: React.ReactNode;
  disabled?: boolean;
  badge?: string;
};

export function FeaturedNavCard({
  icon,
  title,
  accent,
  onSelect,
  trailing,
  disabled,
  badge,
}: FeaturedNavCardProps) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border/70 bg-background shadow-sm",
        disabled && "opacity-65"
      )}
    >
      <div className={cn("flex items-stretch", styles.headerBg)}>
        <button
          type="button"
          onClick={disabled ? undefined : onSelect}
          disabled={disabled}
          aria-disabled={disabled}
          className={cn(
            "group flex flex-1 items-stretch text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
            disabled
              ? "cursor-not-allowed"
              : "hover:bg-black/[0.03]"
          )}
        >
          <span
            className={cn(
              "ml-3 grid h-9 w-9 shrink-0 place-items-center self-center rounded-md border border-border/60 bg-background/80 transition-colors",
              styles.block,
              styles.icon,
              "[&_svg]:h-4 [&_svg]:w-4 [&_svg]:stroke-[2]"
            )}
            aria-hidden
          >
            {icon}
          </span>
          <div className="flex flex-1 items-center justify-between gap-3 px-3 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <p className="truncate text-[14px] font-semibold leading-tight">
                {title}
              </p>
              {badge ? (
                <span className="shrink-0 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {badge}
                </span>
              ) : null}
            </div>
            {!disabled ? (
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            ) : null}
          </div>
        </button>
        {trailing ? (
          <div
            className="flex shrink-0 items-center gap-1 pr-3"
            onClick={(e) => e.stopPropagation()}
          >
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* DetailHeader — back button + title for the Featured detail view            */
/* -------------------------------------------------------------------------- */

type DetailHeaderProps = {
  icon: React.ReactNode;
  title: string;
  accent: PanelAccent;
  onBack: () => void;
  onReset?: () => void;
  resetLabel?: string;
};

export function FeaturedDetailHeader({
  icon,
  title,
  accent,
  onBack,
  onReset,
  resetLabel = "Reset",
}: DetailHeaderProps) {
  const styles = ACCENT_STYLES[accent];
  const [confirming, setConfirming] = useState(false);

  return (
    <div
      className={cn(
        "flex items-stretch border-b border-border/70",
        styles.headerBg
      )}
    >
      <button
        type="button"
        onClick={onBack}
        className={cn(
          "grid w-12 shrink-0 place-items-center transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          styles.block,
          styles.icon
        )}
        aria-label="Back"
      >
        <ChevronDown
          aria-hidden
          className="h-5 w-5 rotate-90"
          strokeWidth={2.25}
        />
      </button>

      <div className="flex flex-1 items-center justify-between gap-3 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className={cn("inline-flex items-center", styles.icon)}
          >
            {icon}
          </span>
          <p className="truncate text-[14px] font-semibold leading-tight">
            {title}
          </p>
        </div>

        {onReset ? (
          <div
            className="flex shrink-0 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {confirming ? (
              <>
                <span className="text-[10.5px] font-medium text-muted-foreground">
                  Reset?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onReset();
                    setConfirming(false);
                  }}
                  className="rounded-md bg-destructive px-2 py-1 text-[10.5px] font-semibold text-white shadow-sm transition-colors hover:bg-destructive/90 hover:text-white"
                >
                  Yes, reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-md border border-border/70 px-2 py-1 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                title={resetLabel}
                aria-label={resetLabel}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                {resetLabel}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
