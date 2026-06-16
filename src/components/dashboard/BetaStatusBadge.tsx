"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BETA_ENABLED, BETA_STATUS_TOOLTIP } from "@/lib/beta";

export function BetaStatusBadge() {
  if (!BETA_ENABLED) return null;

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label="Guestnix is currently in beta"
        className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
      >
        <Info className="h-3 w-3" aria-hidden="true" />
        <span className="hidden sm:inline">Currently in beta</span>
        <span className="sm:hidden">Beta</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-left leading-relaxed">
        {BETA_STATUS_TOOLTIP}
      </TooltipContent>
    </Tooltip>
  );
}
