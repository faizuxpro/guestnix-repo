"use client";

import { useCallback, useState } from "react";
import { Clock3, History, Loader2, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useFeedbackDialog } from "@/components/ui/feedback-dialog";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { cn, getInitials } from "@/lib/utils";

type HistoryActor = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

type HistoryItem = {
  id: string;
  action: string;
  draftRevision: number;
  actorRole: string;
  createdAt: string;
  canRevert: boolean;
  actor: HistoryActor | null;
};

type HistoryResponse = {
  items: HistoryItem[];
};

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function actorLabel(actor: HistoryActor | null) {
  return actor?.fullName?.trim() || actor?.email || "Former collaborator";
}

export function GuidebookHistoryPanel({ guidebookId }: { guidebookId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const { requestConfirmation } = useFeedbackDialog();

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<HistoryResponse>(
      `/api/guidebooks/${guidebookId}/history`
    );
    setLoading(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load history",
        // eslint-disable-next-line react-hooks/immutability
        onRetry: () => void loadHistory(),
      });
      return;
    }

    setItems(result.data.items);
  }, [guidebookId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      void loadHistory();
    }
  };

  const restore = async (item: HistoryItem) => {
    if (!item.canRevert || restoringId) return;

    const confirmed = await requestConfirmation({
      title: "Restore this draft state?",
      description:
        "The current draft will be replaced with the selected saved state.",
      confirmLabel: "Restore",
      busyLabel: "Restoring...",
      tone: "warning",
    });

    if (!confirmed) return;

    setRestoringId(item.id);
    const result = await apiFetch(
      `/api/guidebooks/${guidebookId}/history/${item.id}/revert`,
      { method: "POST" }
    );
    setRestoringId(null);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't restore history",
        onRetry: () => void restore(item),
      });
      return;
    }

    toast.success("Draft restored");
    setOpen(false);
    window.location.reload();
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Version history"
        title="Version history"
        onClick={() => handleOpenChange(true)}
      >
        <History className="h-4 w-4" />
      </Button>
      <SheetContent className="w-[92vw] max-w-md gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </SheetTitle>
          <SheetDescription>Last 10 saved draft changes</SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading history
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Clock3 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No saved changes yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                History appears after the next draft save.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((item) => {
                const actorName = actorLabel(item.actor);
                const isRestoring = restoringId === item.id;
                return (
                  <div key={item.id} className="grid gap-3 p-4">
                    <div className="flex items-start gap-3">
                      <Avatar size="sm" className="mt-0.5">
                        {item.actor?.avatarUrl ? (
                          <AvatarImage src={item.actor.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback>{getInitials(actorName)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            Before {item.action.toLowerCase()}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-5 capitalize",
                              item.actorRole === "owner" &&
                                "border-primary/30 text-primary"
                            )}
                          >
                            {item.actorRole}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {actorName} - {formatHistoryTime(item.createdAt)} - r
                          {item.draftRevision}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      {item.canRevert ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void restore(item)}
                          disabled={Boolean(restoringId)}
                        >
                          {isRestoring ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" disabled>
                          <Lock className="h-3.5 w-3.5" />
                          Locked
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
