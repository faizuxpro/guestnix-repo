"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Braces,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Monitor,
  MoreHorizontal,
  Pencil,
  Redo2,
  Save,
  Settings,
  Share2,
  Smartphone,
  Tablet,
  Undo2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFeedbackDialog } from "@/components/ui/feedback-dialog";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { useEditorStore } from "@/stores/editor-store";
import { apiFetch } from "@/lib/api-fetch";
import { withHostPreviewParam } from "@/lib/analytics/host-preview";
import { guidebookPublicPath } from "@/lib/guidebook-public-url";
import {
  GUIDEBOOK_RENAME_MENU_LABEL,
  guidebookRenameSettingsHref,
} from "@/lib/guidebook-settings-links";
import { toastApiError } from "@/lib/toast-error";
import { cn } from "@/lib/utils";
import type { PreviewDevice } from "./PreviewPanel";
import { GuidebookHistoryPanel } from "./GuidebookHistoryPanel";
import { QuickVariablesManager } from "@/components/dashboard/QuickVariablesManager";

type Props = {
  showPreviewToggle: boolean;
  previewOpen: boolean;
  onTogglePreview: () => void;
  previewDevice: PreviewDevice;
  onPreviewDeviceChange: (device: PreviewDevice) => void;
};

const SAVE_WAIT_TIMEOUT_MS = 30000;

function waitForSaveToFinish() {
  if (useEditorStore.getState().saveStatus !== "saving") {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    let unsubscribe = () => {};
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Saving took too long. Try publishing again."));
    }, SAVE_WAIT_TIMEOUT_MS);

    unsubscribe = useEditorStore.subscribe((state) => {
      if (state.saveStatus === "saving") return;
      window.clearTimeout(timeoutId);
      unsubscribe();
      resolve();
    });
  });
}

export function EditorToolbar({
  showPreviewToggle,
  previewOpen,
  onTogglePreview,
  previewDevice,
  onPreviewDeviceChange,
}: Props) {
  const router = useRouter();
  const { requestConfirmation } = useFeedbackDialog();
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [quickVariablesOpen, setQuickVariablesOpen] = useState(false);
  const [quickVariablesRefreshSignal, setQuickVariablesRefreshSignal] =
    useState(0);
  const guidebook = useEditorStore((s) => s.guidebook);
  const guidebookId = useEditorStore((s) => s.guidebookId);
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const isDirty = useEditorStore((s) => s.isDirty);
  const save = useEditorStore((s) => s.save);
  const markPublished = useEditorStore((s) => s.markPublished);
  const markUnpublished = useEditorStore((s) => s.markUnpublished);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.history.past.length > 0);
  const canRedo = useEditorStore((s) => s.history.future.length > 0);

  if (!guidebook || !guidebookId) return null;

  const isPublished = guidebook.status === "published";
  const isOwner = guidebook.accessRole === "owner";
  // True when the host has draft changes that aren't reflected in the
  // latest published snapshot. Covers two cases:
  //   1. Edits made this session but not yet autosaved (`isDirty`).
  //   2. Edits saved to the DB after the last publish (`updatedAt > publishedAt`).
  // Publishing pins `updatedAt = publishedAt`, so right after Publish this
  // is false and stays false until the next save.
  const hasUnpublishedChanges =
    isPublished &&
    (isDirty ||
      (guidebook.publishedAt !== null &&
        new Date(guidebook.updatedAt).getTime() >
          new Date(guidebook.publishedAt).getTime()));
  const publishButtonLabel = publishing
    ? "Publishing..."
    : !isPublished
      ? "Publish"
      : hasUnpublishedChanges
        ? "Publish changes"
        : "Published";
  const publishButtonDisabled =
    !isOwner ||
    publishing ||
    unpublishing ||
    (isPublished && !hasUnpublishedChanges);
  const settingsHref = `/dashboard/guidebooks/${guidebookId}`;
  const renameHref = guidebookRenameSettingsHref(guidebookId);

  const saveButtonLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "error"
        ? "Retry save"
        : isDirty
          ? "Save changes"
          : saveStatus === "saved"
            ? "Saved"
            : "All saved";
  const saveButtonDisabled = saveStatus === "saving";
  const saveButtonToneClass =
    saveStatus === "saving"
      ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
      : saveStatus === "error"
        ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
        : isDirty
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : saveStatus === "saved"
            ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-muted text-muted-foreground hover:bg-muted";

  async function ensureSavedBeforePublish() {
    await waitForSaveToFinish();

    let state = useEditorStore.getState();
    if (state.isDirty || state.saveStatus === "error") {
      await state.save();
      await waitForSaveToFinish();
      state = useEditorStore.getState();
    }

    if (state.isDirty || state.saveStatus === "error") {
      throw new Error("Publish needs a successful save first.");
    }
  }

  async function publishGuidebook() {
    if (!isOwner || (isPublished && !hasUnpublishedChanges)) return;

    setPublishing(true);
    const toastId = toast.loading("Preparing publish...");
    try {
      await ensureSavedBeforePublish();
      toast.loading("Publishing guidebook...", { id: toastId });

      const result = await apiFetch<{
        success: true;
        version?: number;
        publishedAt?: string;
      }>(`/api/guidebooks/${guidebookId}/publish`, { method: "POST" });

      if (!result.ok) {
        toastApiError(result.error, {
          id: toastId,
          title: "Couldn't publish guidebook",
          onRetry: () => void publishGuidebook(),
        });
        return;
      }

      const nextPublishedAt = result.data.publishedAt ?? new Date().toISOString();
      markPublished(nextPublishedAt);
      toast.success(
        result.data.version ? `Published v${result.data.version}` : "Published",
        {
          id: toastId,
          description: "The guest-facing guidebook is up to date.",
        }
      );
      router.refresh();
    } catch (err) {
      toast.error("Couldn't publish guidebook", {
        id: toastId,
        description:
          err instanceof Error
            ? err.message
            : "Save the latest changes and try again.",
      });
    } finally {
      setPublishing(false);
    }
  }

  async function unpublishGuidebook() {
    if (!isOwner || !isPublished) return;

    const confirmed = await requestConfirmation({
      title: "Unpublish this guidebook?",
      description:
        "Guests will no longer be able to open the guidebook link until it is published again.",
      confirmLabel: "Unpublish",
      tone: "warning",
      busyLabel: "Unpublishing...",
    });
    if (!confirmed) return;

    setUnpublishing(true);
    const result = await apiFetch(`/api/guidebooks/${guidebookId}/unpublish`, {
      method: "POST",
    });
    setUnpublishing(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't unpublish guidebook",
        onRetry: () => void unpublishGuidebook(),
      });
      return;
    }

    markUnpublished();
    toast.success("Guidebook unpublished");
    router.refresh();
  }

  function openQuickVariables() {
    setQuickVariablesOpen(true);
    setQuickVariablesRefreshSignal((value) => value + 1);
  }

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="relative flex h-full items-center gap-2 px-2 md:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/dashboard/guidebooks/${guidebookId}`} />}
            aria-label="Back to guidebook settings"
            className="h-7 shrink-0 gap-0 overflow-hidden px-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-0 max-w-0 -translate-x-1 overflow-hidden whitespace-nowrap text-[11px] opacity-0 transition-all duration-200 ease-out group-hover/button:ml-1 group-hover/button:max-w-32 group-hover/button:translate-x-0 group-hover/button:opacity-100">
              Back to dashboard
            </span>
          </Button>
          <div className="hidden md:block">
            <BrandLockup size="sm" showText={false} />
          </div>
          <div className="min-w-0 max-w-[180px] truncate px-1 py-1 text-base font-semibold leading-5 md:max-w-[320px]">
            {guidebook.title}
          </div>
        </div>

        <div className="hidden shrink-0 items-center md:flex">
          <div className="flex items-center gap-1 rounded-full border bg-background p-0.5">
            {(["mobile", "tablet", "desktop"] as PreviewDevice[]).map((d) => {
              const Icon =
                d === "mobile" ? Smartphone : d === "tablet" ? Tablet : Monitor;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => onPreviewDeviceChange(d)}
                  aria-label={`Preview ${d}`}
                  aria-pressed={previewDevice === d}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors",
                    previewDevice === d &&
                      "bg-primary text-primary-foreground shadow-sm"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!isDirty && saveStatus !== "error") return;
              void save();
            }}
            disabled={saveButtonDisabled}
            aria-label={saveButtonLabel}
            className={cn("h-8 px-2 text-xs", saveButtonToneClass)}
          >
            {saveStatus === "saving" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saveButtonLabel}</span>
          </Button>

          {showPreviewToggle && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onTogglePreview}
              aria-label={previewOpen ? "Hide preview" : "Show preview"}
              className="md:hidden"
            >
              {previewOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}

          <GuidebookHistoryPanel guidebookId={guidebookId} />

          <div
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium md:inline-flex",
              !isPublished &&
                "border-muted-foreground/20 bg-muted text-muted-foreground",
              isPublished &&
                !hasUnpublishedChanges &&
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              hasUnpublishedChanges &&
                "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            )}
            aria-live="polite"
          >
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                !isPublished && "bg-muted-foreground/50",
                isPublished && !hasUnpublishedChanges && "bg-emerald-500",
                hasUnpublishedChanges && "bg-amber-500 animate-pulse"
              )}
              aria-hidden
            />
            {!isPublished
              ? "Draft"
              : hasUnpublishedChanges
                ? "Unpublished changes"
                : "Live"}
          </div>

          {!isOwner ? (
            <div className="hidden rounded-full border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground md:inline-flex">
              Shared editor
            </div>
          ) : null}

          {isOwner ? (
            <Button
              type="button"
              size="sm"
              onClick={() => void publishGuidebook()}
              disabled={publishButtonDisabled}
              aria-label={publishButtonLabel}
              className="h-8 px-2.5 text-xs"
            >
              {publishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              <span>{publishButtonLabel}</span>
            </Button>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="More actions"
                />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuItem
                onClick={undo}
                disabled={!canUndo}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={redo}
                disabled={!canRedo}
              >
                <Redo2 className="h-3.5 w-3.5" />
                Redo
              </DropdownMenuItem>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem
                onClick={() => onPreviewDeviceChange("mobile")}
                className="md:hidden"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Mobile preview
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onPreviewDeviceChange("tablet")}
                className="md:hidden"
              >
                <Tablet className="h-3.5 w-3.5" />
                Tablet preview
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onPreviewDeviceChange("desktop")}
                className="md:hidden"
              >
                <Monitor className="h-3.5 w-3.5" />
                Desktop preview
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href={settingsHref} />}>
                <Settings className="h-3.5 w-3.5" />
                All settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openQuickVariables}>
                <Braces className="h-3.5 w-3.5" />
                Quick Variables
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={renameHref} />}>
                <Pencil className="h-3.5 w-3.5" />
                {GUIDEBOOK_RENAME_MENU_LABEL}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`${settingsHref}#sharing`} />}>
                <Share2 className="h-3.5 w-3.5" />
                Sharing and QR
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`${settingsHref}#access`} />}>
                <Lock className="h-3.5 w-3.5" />
                Access
              </DropdownMenuItem>
              {isOwner ? (
                <>
                  <DropdownMenuItem
                    render={<Link href={`${settingsHref}#publishing`} />}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Publishing
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href={`${settingsHref}#collaborators`} />}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Collaborators
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`${settingsHref}#domains`} />}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Domains
                  </DropdownMenuItem>
                </>
              ) : null}
              {isPublished ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      window.open(
                        withHostPreviewParam(
                          guidebookPublicPath(guidebook.slug, guidebookSettings)
                        ),
                        "_blank",
                        "noopener,noreferrer"
                      );
                      router.refresh();
                    }}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    View live
                  </DropdownMenuItem>
                  {isOwner ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      disabled={publishing || unpublishing}
                      onClick={() => void unpublishGuidebook()}
                    >
                      {unpublishing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      Unpublish
                    </DropdownMenuItem>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <QuickVariablesManager
            guidebookId={guidebookId}
            accessRole={guidebook.accessRole}
            initialSettings={guidebookSettings}
            initialStatus={guidebook.status}
            modalOpen={quickVariablesOpen}
            onModalOpenChange={setQuickVariablesOpen}
            refreshSignal={quickVariablesRefreshSignal}
            hideSummary
          />
        </div>
      </div>
    </header>
  );
}
