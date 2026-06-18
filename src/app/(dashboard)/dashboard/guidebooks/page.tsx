"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Building2,
  Eye,
  FileCheck2,
  FileText,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GuidebookCard,
  type GuidebookData,
} from "@/components/dashboard/GuidebookCard";
import { QuickVariablesManager } from "@/components/dashboard/QuickVariablesManager";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { useFeedbackDialog } from "@/components/ui/feedback-dialog";

type TabKey = "all" | "owned" | "shared" | "published" | "drafts";
type TabAccent = { bg: string; color: string };

const TABS: Array<{
  value: TabKey;
  label: string;
  icon: ElementType;
  accent: TabAccent;
}> = [
  {
    value: "all",
    label: "All",
    icon: BookOpen,
    accent: { bg: "#EEF4FF", color: "#4D7CFF" },
  },
  {
    value: "owned",
    label: "My guidebooks",
    icon: UserRound,
    accent: { bg: "#ECFFF5", color: "#1FBF8F" },
  },
  {
    value: "shared",
    label: "Shared with me",
    icon: Users,
    accent: { bg: "#F3F0FF", color: "#7C5CFF" },
  },
  {
    value: "published",
    label: "Published",
    icon: FileCheck2,
    accent: { bg: "#FFF8E8", color: "#FFB020" },
  },
  {
    value: "drafts",
    label: "Drafts",
    icon: FileText,
    accent: { bg: "#F4F7F8", color: "#6B7C85" },
  },
];

function tabAccentStyle(accent: TabAccent, active: boolean) {
  if (!active) return undefined;

  return {
    backgroundColor: accent.bg,
    borderColor: `${accent.color}33`,
    color: accent.color,
  };
}

const isPublished = (gb: GuidebookData) => gb.status === "published";
const isSharedGuidebook = (gb: GuidebookData) => gb.accessRole === "editor";

function CountChip({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={cn(
        "ml-1 rounded-full px-1.5 text-[11px] font-medium tabular-nums",
        active
          ? "bg-white/70 text-current ring-1 ring-black/5"
          : "bg-muted-foreground/15"
      )}
    >
      {n}
    </span>
  );
}

export default function GuidebooksPage() {
  return (
    <Suspense fallback={<GuidebooksPageSkeleton />}>
      <GuidebooksContent />
    </Suspense>
  );
}

function GuidebooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyFilterId = searchParams.get("property") ?? "";
  const openCreateOnLoad = searchParams.get("new") === "1";
  const [guidebooks, setGuidebooks] = useState<GuidebookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [autoSelectedShared, setAutoSelectedShared] = useState(false);
  const [query, setQuery] = useState("");
  const [quickVariablesGuidebook, setQuickVariablesGuidebook] =
    useState<GuidebookData | null>(null);
  const [quickVariablesOpen, setQuickVariablesOpen] = useState(false);
  const [quickVariablesRefreshSignal, setQuickVariablesRefreshSignal] =
    useState(0);
  const { requestConfirmation } = useFeedbackDialog();

  const fetchGuidebooks = useCallback(async () => {
    const result = await apiFetch<GuidebookData[]>("/api/guidebooks");
    setLoading(false);
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load guidebooks",
        // eslint-disable-next-line react-hooks/immutability
        onRetry: () => void fetchGuidebooks(),
      });
      return;
    }
    setGuidebooks(result.data);
  }, []);

  useEffect(() => {
    if (openCreateOnLoad) {
      const query = propertyFilterId ? `?property=${propertyFilterId}` : "";
      router.replace(`/dashboard/guidebooks/new${query}`);
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchGuidebooks();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchGuidebooks, openCreateOnLoad, propertyFilterId, router]);

  const scopedGuidebooks = useMemo(() => {
    if (!propertyFilterId) return guidebooks;
    return guidebooks.filter((gb) => gb.property?.id === propertyFilterId);
  }, [guidebooks, propertyFilterId]);

  const selectedProperty = useMemo(
    () =>
      propertyFilterId
        ? guidebooks.find((gb) => gb.property?.id === propertyFilterId)
            ?.property ?? null
        : null,
    [guidebooks, propertyFilterId]
  );

  const counts = useMemo(() => {
    const published = scopedGuidebooks.filter(isPublished).length;
    const shared = scopedGuidebooks.filter(isSharedGuidebook).length;
    return {
      all: scopedGuidebooks.length,
      owned: scopedGuidebooks.length - shared,
      shared,
      published,
      drafts: scopedGuidebooks.length - published,
    };
  }, [scopedGuidebooks]);

  useEffect(() => {
    if (
      !autoSelectedShared &&
      counts.owned === 0 &&
      counts.shared > 0
    ) {
      setTab("shared");
      setAutoSelectedShared(true);
    }
  }, [autoSelectedShared, counts.owned, counts.shared]);

  const totalViews = useMemo(
    () => scopedGuidebooks.reduce((sum, gb) => sum + (gb.viewCount ?? 0), 0),
    [scopedGuidebooks]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedGuidebooks.filter((gb) => {
      const matchesTab =
        tab === "all" ||
        (tab === "owned"
          ? !isSharedGuidebook(gb)
          : tab === "shared"
            ? isSharedGuidebook(gb)
            : tab === "published"
              ? isPublished(gb)
              : !isPublished(gb));
      if (!matchesTab) return false;
      if (!q) return true;
      return (
        gb.title.toLowerCase().includes(q) ||
        gb.slug.toLowerCase().includes(q) ||
        (gb.property?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [scopedGuidebooks, tab, query]);

  async function handleDelete(id: string) {
    const confirmed = await requestConfirmation({
      title: "Delete this guidebook?",
      description:
        "All sections, blocks, guest places, and analytics for this guidebook will be permanently removed.",
      confirmLabel: "Delete guidebook",
      tone: "danger",
      busyLabel: "Deleting...",
    });
    if (!confirmed) {
      return;
    }
    const toastId = toast.loading("Deleting guidebook...");
    const result = await apiFetch(`/api/guidebooks/${id}`, {
      method: "DELETE",
      parseJson: false,
    });
    if (!result.ok) {
      toastApiError(result.error, {
        id: toastId,
        title: "Couldn't delete guidebook",
        onRetry: () => void handleDelete(id),
      });
      return;
    }
    toast.success("Guidebook deleted", {
      id: toastId,
      description: "The guidebook and its data were removed.",
    });
    void fetchGuidebooks();
  }

  async function handleDuplicate(guidebook: GuidebookData) {
    const toastId = toast.loading("Duplicating guidebook...");
    const result = await apiFetch<GuidebookData>(
      `/api/guidebooks/${guidebook.id}/duplicate`,
      {
        method: "POST",
      }
    );

    if (!result.ok) {
      toastApiError(result.error, {
        id: toastId,
        title: "Couldn't duplicate guidebook",
        onRetry: () => void handleDuplicate(guidebook),
      });
      return;
    }
    toast.success("Guidebook duplicated", {
      id: toastId,
      description: "A new draft copy is ready to edit.",
    });
    router.push(`/dashboard/guidebooks/${result.data.id}/editor`);
    void fetchGuidebooks();
  }

  async function handlePublish(guidebook: GuidebookData) {
    const toastId = toast.loading(
      guidebook.status === "published"
        ? "Publishing changes..."
        : "Publishing guidebook..."
    );
    const result = await apiFetch<{ version?: number }>(
      `/api/guidebooks/${guidebook.id}/publish`,
      { method: "POST" }
    );

    if (!result.ok) {
      toastApiError(result.error, {
        id: toastId,
        title: "Couldn't publish guidebook",
        onRetry: () => void handlePublish(guidebook),
      });
      return;
    }

    toast.success(
      result.data.version ? `Published v${result.data.version}` : "Published",
      {
        id: toastId,
        description: "The guest-facing guidebook is up to date.",
      }
    );
    void fetchGuidebooks();
  }

  async function handleUnpublish(guidebook: GuidebookData) {
    const confirmed = await requestConfirmation({
      title: "Unpublish this guidebook?",
      description:
        "Guests will no longer be able to open the guidebook link until it is published again.",
      confirmLabel: "Unpublish",
      tone: "warning",
      busyLabel: "Unpublishing...",
    });
    if (!confirmed) return;

    const toastId = toast.loading("Unpublishing guidebook...");
    const result = await apiFetch(`/api/guidebooks/${guidebook.id}/unpublish`, {
      method: "POST",
    });

    if (!result.ok) {
      toastApiError(result.error, {
        id: toastId,
        title: "Couldn't unpublish guidebook",
        onRetry: () => void handleUnpublish(guidebook),
      });
      return;
    }

    toast.success("Guidebook unpublished", {
      id: toastId,
      description: "The public guidebook link is no longer live.",
    });
    void fetchGuidebooks();
  }

  function openGuidebookOnboarding() {
    const query = propertyFilterId ? `?property=${propertyFilterId}` : "";
    router.push(`/dashboard/guidebooks/new${query}`);
  }

  function handleOpenQuickVariables(guidebook: GuidebookData) {
    setQuickVariablesGuidebook(guidebook);
    setQuickVariablesOpen(true);
    setQuickVariablesRefreshSignal((value) => value + 1);
  }

  function clearPropertyFilter() {
    router.push("/dashboard/guidebooks");
  }

  if (loading) {
    return <GuidebooksPageSkeleton />;
  }

  const hasAny = guidebooks.length > 0;
  const hasScopedGuidebooks = scopedGuidebooks.length > 0;
  const hasPropertyFilter = propertyFilterId.length > 0;
  const propertyFilterLabel = selectedProperty?.name ?? "selected property";

  function getEmptyMessage() {
    const trimmedQuery = query.trim();

    if (hasPropertyFilter && !hasScopedGuidebooks) {
      return "No guidebooks linked to this property yet.";
    }
    if (trimmedQuery) {
      return `No guidebooks match "${trimmedQuery}".`;
    }
    if (tab === "published") {
      return hasPropertyFilter
        ? "No published guidebooks for this property yet. Publish a draft to make it live."
        : "No published guidebooks yet. Publish a draft to make it live.";
    }
    if (tab === "shared") {
      return "No guidebooks have been shared with you yet.";
    }
    if (tab === "owned") {
      return "No guidebooks owned by you here yet.";
    }
    if (tab === "drafts") {
      return hasPropertyFilter
        ? "No drafts for this property."
        : "No drafts - everything is published.";
    }

    return "No guidebooks in this view.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guidebooks</h1>
          <p className="text-muted-foreground">
            {hasPropertyFilter
              ? `Showing guidebooks linked to ${propertyFilterLabel}.`
              : "Create and manage your digital welcome guides."}
            {hasScopedGuidebooks && (
              <>
                {" "}
                <span className="text-foreground/70">
                  {counts.published} live
                </span>
                {totalViews > 0 && (
                  <span className="inline-flex items-center gap-1">
                    {" - "}
                    <Eye className="h-3.5 w-3.5" />
                    {totalViews.toLocaleString()} views
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <Button onClick={openGuidebookOnboarding}>
          <Plus className="mr-2 h-4 w-4" />
          New Guidebook
        </Button>
      </div>

      {hasPropertyFilter && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/35 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              Filtered by{" "}
              <span className="font-medium">{propertyFilterLabel}</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearPropertyFilter}>
            <X className="mr-1 h-3.5 w-3.5" />
            Clear filter
          </Button>
        </div>
      )}

      {!hasAny && !hasPropertyFilter ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">No guidebooks yet</h3>
            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
              Create your first digital guidebook and share it with your guests.
            </p>
            <Button onClick={openGuidebookOnboarding}>
              <Plus className="mr-2 h-4 w-4" />
              Create Guidebook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabKey)}
            className="gap-5"
          >
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
              <div className="shrink-0 pb-1">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                  {TABS.map((item) => {
                    const Icon = item.icon;
                    const active = tab === item.value;
                    return (
                      <TabsTrigger
                        key={item.value}
                        value={item.value}
                        className="border border-border/60 bg-background/80 px-2.5 data-active:shadow-none"
                        style={tabAccentStyle(item.accent, active)}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                        <CountChip n={counts[item.value]} active={active} />
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search guidebooks..."
                  className="pl-8"
                />
              </div>
            </div>
          </Tabs>

          {filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {getEmptyMessage()}
                </p>
                {hasPropertyFilter && !hasScopedGuidebooks && (
                  <Button className="mt-4" onClick={openGuidebookOnboarding}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Guidebook
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((gb) => (
                <GuidebookCard
                  key={gb.id}
                  guidebook={gb}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onPublish={handlePublish}
                  onUnpublish={handleUnpublish}
                  onOpenQuickVariables={handleOpenQuickVariables}
                />
              ))}
            </div>
          )}
        </>
      )}

      {quickVariablesGuidebook ? (
        <QuickVariablesManager
          key={quickVariablesGuidebook.id}
          guidebookId={quickVariablesGuidebook.id}
          accessRole={quickVariablesGuidebook.accessRole ?? "owner"}
          initialSettings={quickVariablesGuidebook.settings ?? {}}
          initialStatus={quickVariablesGuidebook.status}
          modalOpen={quickVariablesOpen}
          onModalOpenChange={setQuickVariablesOpen}
          refreshSignal={quickVariablesRefreshSignal}
          hideSummary
        />
      ) : null}
    </div>
  );
}

function GuidebooksPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-9 w-72" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
