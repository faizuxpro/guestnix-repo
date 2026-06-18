"use client";

import { useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  FileUp,
  Loader2,
  Paintbrush,
  Sparkles,
  TimerReset,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { cn } from "@/lib/utils";

type GuidebookResponse = {
  id: string;
  slug: string;
  title: string;
};

export function GuidebookCreateDropdown({
  label = "New guidebook",
  propertyId,
  size,
  variant,
  className,
}: {
  label?: string;
  propertyId?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
}) {
  const router = useRouter();
  const [creatingAdvanced, setCreatingAdvanced] = useState(false);
  const query = propertyId ? `?property=${propertyId}` : "";

  async function openAdvancedEditor() {
    setCreatingAdvanced(true);
    const result = await apiFetch<GuidebookResponse>("/api/guidebooks", {
      method: "POST",
      body: {
        title: "Sunset Lake House Guide",
        propertyId,
        templateId: "sunset-lakehouse",
      },
    });

    if (!result.ok) {
      setCreatingAdvanced(false);
      toastApiError(result.error, { title: "Couldn't create guidebook" });
      return;
    }

    router.push(`/dashboard/guidebooks/${result.data.id}/editor`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size={size} variant={variant} className={className}>
            <BookOpen className="mr-2 h-4 w-4" />
            {label}
          </Button>
        }
      />
      <DropdownMenuContent className="w-80 p-2" align="end" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 pb-2 pt-1">
            How do you want to start?
          </DropdownMenuLabel>
          <CreateMenuItem
            icon={TimerReset}
            title="Quick start"
            description="Finish the essentials in a guided setup."
            onClick={() => router.push(`/dashboard/guidebooks/new${query}`)}
          />
          <CreateMenuItem
            icon={Paintbrush}
            title="Open in Advanced Editor"
            description="Start from the template and edit every detail."
            trailing={
              creatingAdvanced ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )
            }
            disabled={creatingAdvanced}
            onClick={() => void openAdvancedEditor()}
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <CreateMenuItem
            icon={FileUp}
            title="Import from URL or PDF"
            description="AI draft from an existing listing or PDF."
            badge="Paid plans"
            disabled
            spark
          />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CreateMenuItem({
  icon: Icon,
  title,
  description,
  badge,
  trailing,
  disabled = false,
  spark = false,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  trailing?: React.ReactNode;
  disabled?: boolean;
  spark?: boolean;
  onClick?: () => void;
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onClick={onClick}
      className="items-start gap-3 rounded-lg p-2.5"
    >
      <span
        className={cn(
          "relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg",
          disabled
            ? "bg-muted text-muted-foreground group-focus/dropdown-menu-item:bg-muted group-focus/dropdown-menu-item:text-muted-foreground group-focus/dropdown-menu-item:[&_svg]:text-muted-foreground"
            : "bg-[#092629] text-white group-focus/dropdown-menu-item:bg-[#092629] group-focus/dropdown-menu-item:text-white group-focus/dropdown-menu-item:[&_svg]:text-white"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            disabled ? "!text-muted-foreground" : "!text-white"
          )}
          stroke={disabled ? "currentColor" : "#ffffff"}
        />
        {spark ? (
          <Sparkles
            className={cn(
              "absolute -right-1 -top-1 h-3 w-3",
              disabled ? "!text-muted-foreground" : "!text-white"
            )}
            stroke={disabled ? "currentColor" : "#ffffff"}
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-semibold">
          {title}
          {badge ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="mt-2 shrink-0 text-muted-foreground">
        {trailing ?? (!disabled ? <ArrowRight className="h-4 w-4" /> : null)}
      </span>
    </DropdownMenuItem>
  );
}
