"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  FileUp,
  LayoutDashboard,
  Loader2,
  Paintbrush,
  Sparkles,
  TimerReset,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { cn } from "@/lib/utils";

type Property = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

type GuidebookResponse = {
  id: string;
  slug: string;
  title: string;
};

const QuickFlow = dynamic(
  () =>
    import("./GuidebookMiniEditorQuickFlow").then(
      (mod) => mod.GuidebookMiniEditorQuickFlow
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid min-h-[320px] place-items-center rounded-xl border bg-white">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Opening quick setup...
        </div>
      </div>
    ),
  }
);

export function GuidebookMiniEditorModal({
  properties,
  sourceOverride,
  onCancel,
  compact = false,
}: {
  properties: Property[];
  sourceOverride?: string | null;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = sourceOverride ?? searchParams.get("source");
  const initialPropertyId = searchParams.get("property") ?? "none";
  const [showQuickFlow, setShowQuickFlow] = useState(false);
  const [creatingEditor, setCreatingEditor] = useState(false);

  if (showQuickFlow) {
    return <QuickFlow properties={properties} sourceOverride={source} />;
  }

  function closeModal() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/dashboard/guidebooks");
  }

  async function openFullEditor() {
    setCreatingEditor(true);
    const propertyId =
      initialPropertyId !== "none" && initialPropertyId !== "new"
        ? initialPropertyId
        : undefined;
    const result = await apiFetch<GuidebookResponse>("/api/guidebooks", {
      method: "POST",
      body: {
        title: "Sunset Lake House Guide",
        propertyId,
        templateId: "sunset-lakehouse",
      },
    });

    if (!result.ok) {
      setCreatingEditor(false);
      toastApiError(result.error, { title: "Couldn't create guidebook" });
      return;
    }

    router.push(`/dashboard/guidebooks/${result.data.id}/editor`);
  }

  return (
    <GuidebookStartChoicePanel
      source={source}
      compact={compact}
      creatingEditor={creatingEditor}
      onQuickStart={() => setShowQuickFlow(true)}
      onAdvancedEditor={() => void openFullEditor()}
      onCancel={closeModal}
    />
  );
}

export function GuidebookStartChoicePanel({
  source,
  compact = false,
  creatingEditor = false,
  onQuickStart,
  onAdvancedEditor,
  onCancel,
  onGoToDashboard,
}: {
  source?: string | null;
  compact?: boolean;
  creatingEditor?: boolean;
  onQuickStart: () => void;
  onAdvancedEditor: () => void;
  onCancel?: () => void;
  onGoToDashboard?: () => void;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-[#fbfcfb] shadow-sm",
        compact ? "mx-auto w-full max-w-5xl" : "mx-auto w-full max-w-6xl"
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b bg-white px-5 py-4">
        <div>
          <Badge variant="secondary" className="mb-2 bg-emerald-50 text-[#07302f]">
            {source === "onboarding" ? "Plan selected" : "Create guidebook"}
          </Badge>
          <h1 className="font-heading text-xl font-semibold text-[#092629]">
            How do you want to start?
          </h1>
        </div>
        {onCancel || onGoToDashboard ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {onGoToDashboard ? (
              <Button onClick={onGoToDashboard} className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Go to dashboard
              </Button>
            ) : null}
            {onCancel ? (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className={cn("grid gap-3 p-4", compact ? "lg:grid-cols-3" : "lg:grid-cols-3")}>
        <StartOptionCard
          tone="fast"
          icon={TimerReset}
          title="I want to do it in 5 minutes"
          description="Fast setup with the mobile preview beside you."
          action="Quick start"
          onClick={onQuickStart}
        />
        <StartOptionCard
          tone="creative"
          icon={Paintbrush}
          title="I love creativity"
          description="Open the Advanced Editor and tune every section."
          action="Open in Advanced Editor"
          actionIcon={creatingEditor ? Loader2 : ExternalLink}
          busy={creatingEditor}
          onClick={onAdvancedEditor}
        />
        <StartOptionCard
          tone="ai"
          icon={FileUp}
          title="Import from URL or PDF"
          description="Share a listing URL or upload a PDF and AI builds the first draft."
          action="Coming soon"
          badge="Paid plans"
          disabled
        />
      </div>
    </section>
  );
}

function StartOptionCard({
  tone,
  icon: Icon,
  title,
  description,
  action,
  actionIcon: ActionIcon = ArrowRight,
  badge,
  busy = false,
  disabled = false,
  onClick,
}: {
  tone: "fast" | "creative" | "ai";
  icon: typeof TimerReset;
  title: string;
  description: string;
  action: string;
  actionIcon?: typeof ArrowRight;
  badge?: string;
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const palette = {
    fast: {
      card: "border-[#b8dbd2] bg-[#f0f8f5] hover:border-[#0e5b55] hover:bg-[#eefaf4]",
      icon: "bg-[#0b3436] text-[#9bf0a7]",
      meta: "Ready in minutes",
    },
    creative: {
      card: "border-[#d9dde5] bg-white hover:border-[#8b6f47] hover:bg-[#fffaf0]",
      icon: "bg-[#f2efe9] text-[#6f4f1f]",
      meta: "Most flexible",
    },
    ai: {
      card: "border-[#dce2e8] bg-[#f6f8fa] opacity-80",
      icon: "bg-white text-[#4b5563]",
      meta: "Import assistant",
    },
  }[tone];

  const content = (
    <>
      <span className="flex items-start justify-between gap-4">
        <span className={cn("grid size-11 place-items-center rounded-lg", palette.icon)}>
          {tone === "ai" ? (
            <span className="relative">
              <Icon className="h-5 w-5" />
              <Sparkles className="absolute -right-2 -top-2 h-3.5 w-3.5" />
            </span>
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </span>
        {badge ? (
          <Badge variant="outline" className="bg-white/70 text-[11px]">
            {badge}
          </Badge>
        ) : (
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-black/5">
            {palette.meta}
          </span>
        )}
      </span>

      <span className="mt-6 flex flex-1 flex-col">
        <span className="block font-heading text-xl font-semibold leading-tight text-[#092629]">
          {title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
        <span className="mt-auto pt-5">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold",
              disabled
                ? "bg-white text-muted-foreground ring-1 ring-border"
                : "bg-[#092629] text-white"
            )}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening...
              </>
            ) : (
              action
            )}
            {!busy ? <ActionIcon className="h-4 w-4" /> : null}
          </span>
        </span>
      </span>
    </>
  );

  if (disabled) {
    return (
      <div
        aria-disabled="true"
        className={cn(
          "relative flex min-h-0 flex-col overflow-hidden rounded-xl border p-5",
          palette.card
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        "group relative flex min-h-0 flex-col overflow-hidden rounded-xl border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-28px_rgba(2,12,27,0.55)]",
        palette.card,
        busy && "cursor-wait opacity-80 hover:translate-y-0"
      )}
    >
      {content}
    </button>
  );
}
