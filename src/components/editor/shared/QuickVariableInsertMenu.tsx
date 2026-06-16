"use client";

import { useMemo, useState } from "react";
import { Braces, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trackProductEvent } from "@/lib/analytics/product-client";
import { productEvents } from "@/lib/analytics/product";
import {
  getQuickVariableDefinitions,
  readQuickVariablesFromSettings,
  tokenForQuickVariable,
} from "@/lib/quick-variables";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor-store";

type Props = {
  onInsert: (token: string) => void;
  className?: string;
  disabled?: boolean;
};

export function QuickVariableInsertMenu({
  onInsert,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const guidebookId = useEditorStore((state) => state.guidebookId);
  const guidebookSettings = useEditorStore((state) => state.guidebookSettings);
  const definitions = useMemo(
    () =>
      getQuickVariableDefinitions(
        readQuickVariablesFromSettings(guidebookSettings),
        "draft"
      ),
    [guidebookSettings]
  );
  const visibleDefinitions = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return definitions;
    return definitions.filter(
      (definition) =>
        definition.label.toLowerCase().includes(search) ||
        definition.key.toLowerCase().includes(search)
    );
  }, [definitions, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className={cn("text-muted-foreground", className)}
                    disabled={disabled}
                    aria-label="Insert Quick Variable"
                  />
                }
              >
                <Braces className="h-3.5 w-3.5" />
              </PopoverTrigger>
            }
          />
          <TooltipContent>Insert Quick Variable</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[min(21rem,calc(100vw-2rem))] p-2"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Quick Variables"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="mt-2 max-h-64 overflow-y-auto">
          {visibleDefinitions.length > 0 ? (
            <div className="grid gap-1">
              {visibleDefinitions.map((definition) => {
                const token = tokenForQuickVariable(definition.key);
                return (
                  <button
                    key={definition.key}
                    type="button"
                    onClick={() => {
                      onInsert(token);
                      setOpen(false);
                      trackProductEvent(productEvents.quickVariableInserted, {
                        guidebook_id: guidebookId ?? "",
                        variable_key: definition.key,
                        custom: definition.custom,
                      });
                    }}
                    className="min-w-0 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="block truncate text-xs font-semibold">
                      {definition.label}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                      {token}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              No matching Quick Variables.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
