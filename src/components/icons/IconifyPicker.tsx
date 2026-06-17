"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Icon } from "@iconify/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Layers2,
  Library,
  Loader2,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { HostIcon } from "@/components/icons/HostIcon";
import {
  CURATED_CATEGORIES,
  CURATED_ICONS,
  FALLBACK_CURATED_ID,
  type CuratedCategory,
} from "@/lib/icons/curated";
import {
  fetchIconifyCollection,
  fetchIconifySvg,
  listIconifyCollections,
  searchIconify,
  type IconifyCollection,
  type IconifyCollectionSummary,
} from "@/lib/icons/iconify";
import { sanitizeSvg } from "@/lib/icons/sanitize";

const RECENT_STORAGE_KEY = "guestnix:icon-recent";
const RECENT_MAX = 18;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_PAGE_SIZE = 200;
const COLLECTION_PAGE_SIZE = 300;

type LibraryItem = { id: string; url: string; svg: string; createdAt: string };
type MatchingStyleSet = {
  prefix: string;
  name: string;
  total?: number;
  count: number;
  sampleIconId: string;
};

type Props = {
  value: string | null | undefined;
  onChange: (svgMarkup: string) => void;
  ariaLabel?: string;
  triggerClassName?: string;
  iconClassName?: string;
  fallbackIconifyId?: string | null;
};

export function IconifyPicker({
  value,
  onChange,
  ariaLabel = "Pick icon",
  triggerClassName,
  iconClassName,
  fallbackIconifyId = FALLBACK_CURATED_ID,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"curated" | "all" | "upload" | "my">("curated");

  const handlePicked = useCallback(
    (svg: string) => {
      const clean = sanitizeSvg(svg);
      if (!clean) {
        toast.error("Could not load icon");
        return;
      }
      onChange(clean);
      addRecent(clean);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn("text-muted-foreground", triggerClassName)}
            aria-label={ariaLabel}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        }
      >
        <HostIcon
          value={value}
          className={cn("text-sm", iconClassName)}
          fallbackIconifyId={fallbackIconifyId}
        />
      </PopoverTrigger>
      <PopoverContent
        className="flex h-[min(620px,calc(100vh-48px))] w-[min(560px,calc(100vw-24px))] flex-col gap-2 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as typeof tab)}
          className="flex h-full min-h-0 flex-col gap-0"
        >
          <div className="border-b px-2.5 pt-2.5 pb-2">
            <TabsList className="w-full">
              <TabsTrigger value="curated">Curated</TabsTrigger>
              <TabsTrigger value="all">All Icons</TabsTrigger>
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="my">Mine</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="curated" className="m-0 min-h-0 flex-1 overflow-hidden">
            <CuratedTab onPick={handlePicked} currentValue={value} />
          </TabsContent>

          <TabsContent value="all" className="m-0 min-h-0 flex-1 overflow-hidden">
            <AllIconsTab onPick={handlePicked} />
          </TabsContent>

          <TabsContent value="upload" className="m-0 min-h-0 flex-1 overflow-hidden">
            <UploadTab onPicked={handlePicked} />
          </TabsContent>

          <TabsContent value="my" className="m-0 min-h-0 flex-1 overflow-hidden">
            <MyIconsTab onPick={handlePicked} active={tab === "my"} />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

// ─── Curated tab ───────────────────────────────────────────────────────────

function CuratedTab({
  onPick,
  currentValue,
}: {
  onPick: (svg: string) => void;
  currentValue: string | null | undefined;
}) {
  const [category, setCategory] = useState<CuratedCategory | "All">("All");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  const filtered = useMemo(() => {
    let list = CURATED_ICONS;
    if (category !== "All") list = list.filter((i) => i.category === category);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.label.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          (i.keywords ?? []).some((k) => k.includes(q))
      );
    }
    return list;
  }, [category, query]);

  const handlePick = useCallback(
    async (id: string) => {
      setLoadingId(id);
      try {
        const svg = await fetchIconifySvg(id);
        onPick(svg);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load icon");
      } finally {
        setLoadingId(null);
      }
    },
    [onPick]
  );

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <SearchAndCategory
        query={query}
        onQuery={setQuery}
        category={category}
        onCategory={setCategory}
      />

      <div className="-mr-1 flex-1 overflow-y-auto pr-1">
        {recent.length > 0 && !query && category === "All" && (
          <div className="mb-3">
            <div className="mb-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Recently used
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {recent.slice(0, 7).map((svg, i) => (
                <RecentTile key={`recent-${i}`} svg={svg} onPick={onPick} active={svg === currentValue} />
              ))}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState>No matches in this category. Try the All Icons tab.</EmptyState>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {filtered.map((icon) => (
              <IconTile
                key={icon.id}
                iconifyId={icon.id}
                label={icon.label}
                loading={loadingId === icon.id}
                onClick={() => handlePick(icon.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── All Icons tab (Iconify search + set browse) ───────────────────────────

function AllIconsTab({ onPick }: { onPick: (svg: string) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [prefix, setPrefix] = useState<string | null>(null); // pinned set
  const [collections, setCollections] = useState<Record<string, IconifyCollectionSummary>>({});
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  // Full collection of the pinned set (used when prefix is set + no query).
  // Holds every icon name in the set; we paginate locally for rendering.
  const [collectionData, setCollectionData] = useState<IconifyCollection | null>(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionShown, setCollectionShown] = useState(COLLECTION_PAGE_SIZE);

  // Search-mode results (used when there's a query).
  const [results, setResults] = useState<string[]>([]);
  const [searchStart, setSearchStart] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [setPickerOpen, setSetPickerOpen] = useState(false);
  const [, startTransition] = useTransition();

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Persist the SetPicker's scroll position across open/close so the user
  // doesn't have to re-scroll past the same sets every time.
  const setPickerScrollRef = useRef(0);

  const mode: "search" | "browse" | "idle" = useMemo(() => {
    if (debouncedQuery) return "search";
    if (prefix) return "browse";
    return "idle";
  }, [debouncedQuery, prefix]);

  const activeCollection =
    mode === "browse" && prefix && collectionData?.prefix === prefix
      ? collectionData
      : null;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let aborted = false;
    listIconifyCollections()
      .then((data) => {
        if (!aborted) {
          setCollections(data);
          setCollectionsLoaded(true);
        }
      })
      .catch(() => {
        if (!aborted) setCollectionsLoaded(true);
      });
    return () => {
      aborted = true;
    };
  }, []);

  // Fetch the full collection when set is pinned (no query). Lets the user
  // browse every icon in the set, not just the search-capped 999.
  useEffect(() => {
    if (mode !== "browse" || !prefix) return;
    if (collectionData?.prefix === prefix) return;
    const controller = new AbortController();
    setCollectionLoading(true);
    setError(null);
    fetchIconifyCollection(prefix, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        startTransition(() => {
          setCollectionData(data);
          setCollectionShown(COLLECTION_PAGE_SIZE);
        });
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError("Could not load this set.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCollectionLoading(false);
      });
    return () => controller.abort();
  }, [mode, prefix, collectionData?.prefix, startTransition]);

  // Search mode: query against Iconify search API (capped ~999 by API).
  useEffect(() => {
    if (mode !== "search") {
      setResults([]);
      setTotal(0);
      setSearchStart(0);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSearchStart(0);
    searchIconify({
      query: debouncedQuery,
      limit: SEARCH_PAGE_SIZE,
      prefixes: prefix ? [prefix] : undefined,
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        startTransition(() => {
          setResults(res.icons);
          setTotal(res.total);
          setSearchStart(0);
          setCollections((prev) => ({ ...prev, ...res.collections }));
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError("Search failed. Try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mode, debouncedQuery, prefix, startTransition]);

  const loadMoreSearch = useCallback(async () => {
    if (loading || mode !== "search") return;
    setLoading(true);
    try {
      const nextStart = searchStart + SEARCH_PAGE_SIZE;
      const res = await searchIconify({
        query: debouncedQuery,
        limit: SEARCH_PAGE_SIZE,
        start: nextStart,
        prefixes: prefix ? [prefix] : undefined,
      });
      setResults((prev) => [...prev, ...res.icons]);
      setSearchStart(nextStart);
      setCollections((prev) => ({ ...prev, ...res.collections }));
    } catch {
      setError("Could not load more.");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, loading, mode, prefix, searchStart]);

  const loadMoreBrowse = useCallback(() => {
    if (!activeCollection) return;
    setCollectionShown((prev) =>
      Math.min(prev + COLLECTION_PAGE_SIZE, activeCollection.icons.length)
    );
  }, [activeCollection]);

  const selectPrefix = useCallback(
    (nextPrefix: string | null, options?: { clearQuery?: boolean }) => {
      const prefixChanged = nextPrefix !== prefix;
      setPrefix(nextPrefix);
      setSetPickerOpen(false);
      setError(null);
      setCollectionShown(COLLECTION_PAGE_SIZE);
      setCollectionData((prev) =>
        nextPrefix && prev?.prefix === nextPrefix ? prev : null
      );
      if (options?.clearQuery) {
        setQuery("");
        setDebouncedQuery("");
        setResults([]);
        setTotal(0);
        setSearchStart(0);
      } else if (prefixChanged) {
        setResults([]);
        setTotal(0);
        setSearchStart(0);
      }
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [prefix]
  );

  // Determine current view's icons + paging state.
  // Iconify's /collection endpoint returns bare names ("home"); /search returns
  // full IDs ("lucide:home"). Normalize browse-mode names to full IDs so they
  // render via <Icon> and resolve via fetchIconifySvg().
  const visible = useMemo(() => {
    if (mode === "search") return results;
    if (mode === "browse" && activeCollection) {
      return activeCollection.icons
        .slice(0, collectionShown)
        .map((name) => `${activeCollection.prefix}:${name}`);
    }
    return [];
  }, [mode, results, activeCollection, collectionShown]);

  const hasMore = useMemo(() => {
    if (mode === "search") return results.length < total;
    if (mode === "browse" && activeCollection) {
      return collectionShown < activeCollection.icons.length;
    }
    return false;
  }, [mode, results.length, total, activeCollection, collectionShown]);

  const totalCount =
    mode === "search" ? total : activeCollection?.icons.length ?? 0;

  // Infinite-scroll observer for whichever mode is active.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scroller = scrollRef.current;
    if (!sentinel || !scroller || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (mode === "search") loadMoreSearch();
        else if (mode === "browse") loadMoreBrowse();
      },
      { root: scroller, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, mode, loadMoreSearch, loadMoreBrowse]);

  const handlePick = useCallback(
    async (id: string) => {
      setLoadingId(id);
      try {
        const svg = await fetchIconifySvg(id);
        onPick(svg);
      } catch {
        toast.error("Failed to load icon");
      } finally {
        setLoadingId(null);
      }
    },
    [onPick]
  );

  const currentSet = prefix ? collections[prefix] : null;
  const currentSetName = prefix
    ? getCollectionName(
        prefix,
        currentSet,
        collectionData?.prefix === prefix ? collectionData : null
      )
    : "All sets";
  const resultSetSuggestions = useMemo(() => {
    if (mode !== "search" || prefix) return [];
    const byPrefix = new Map<string, MatchingStyleSet>();

    for (const id of results) {
      const iconPrefix = getIconPrefix(id);
      if (!iconPrefix) continue;
      const info = collections[iconPrefix];
      const existing = byPrefix.get(iconPrefix);
      if (existing) {
        existing.count += 1;
      } else {
        byPrefix.set(iconPrefix, {
          prefix: iconPrefix,
          name: getCollectionName(iconPrefix, info),
          total: info?.total,
          count: 1,
          sampleIconId: id,
        });
      }
    }

    return Array.from(byPrefix.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [collections, mode, prefix, results]);
  const isInitialLoading =
    (mode === "search" && loading && results.length === 0) ||
    (mode === "browse" && collectionLoading && !activeCollection);

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              prefix
                ? `Search in ${currentSetName}...`
                : "Search 200,000+ icons..."
            }
            className="pl-7"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="default"
          className="shrink-0"
          onClick={() => setSetPickerOpen((v) => !v)}
          aria-expanded={setPickerOpen}
        >
          <span className="text-xs">
            {currentSetName}
          </span>
          <ChevronDown className="size-3" />
        </Button>
      </div>

      {setPickerOpen && (
        <SetPicker
          collections={collections}
          loaded={collectionsLoaded}
          activePrefix={prefix}
          onSelect={(p) => selectPrefix(p)}
          onClose={() => setSetPickerOpen(false)}
          initialScrollTop={setPickerScrollRef.current}
          onScrollTopChange={(top) => {
            setPickerScrollRef.current = top;
          }}
        />
      )}

      {!setPickerOpen && (
        <>
          {prefix && (
            <ActiveSetHeader
              prefix={prefix}
              name={currentSetName}
              summary={currentSet}
              collection={collectionData?.prefix === prefix ? collectionData : null}
              onClear={() => selectPrefix(null)}
            />
          )}

          {mode === "search" &&
            !prefix &&
            resultSetSuggestions.length > 0 &&
            !isInitialLoading && (
              <MatchingStyleStrip
                sets={resultSetSuggestions}
                onBrowse={(nextPrefix) =>
                  selectPrefix(nextPrefix, { clearQuery: true })
                }
              />
            )}

          {mode !== "idle" && totalCount > 0 && !isInitialLoading && (
            <div className="flex items-center justify-between px-0.5 text-[11px] text-muted-foreground">
              <span>
                {visible.length.toLocaleString()} of {totalCount.toLocaleString()}
                {mode === "browse" && ` in ${currentSetName}`}
              </span>
              {mode === "search" && total >= 999 && (
                <span className="text-amber-600">Refine query - search caps at 999</span>
              )}
            </div>
          )}

          <div ref={scrollRef} className="-mr-1 flex-1 overflow-y-auto pr-1">
            {error ? (
              <EmptyState>{error}</EmptyState>
            ) : mode === "idle" ? (
              <EmptyState>
                Search for an icon, or pin a set (e.g. Solar, Lucide) to browse every icon in that style.
              </EmptyState>
            ) : isInitialLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <EmptyState>No matches found.</EmptyState>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1.5">
                  {visible.map((id) => {
                    const iconPrefix = getIconPrefix(id);
                    const setSummary = iconPrefix ? collections[iconPrefix] : undefined;
                    const setLabel = iconPrefix
                      ? getCollectionName(iconPrefix, setSummary)
                      : undefined;

                    return (
                      <IconTile
                        key={id}
                        iconifyId={id}
                        label={id}
                        loading={loadingId === id}
                        onClick={() => handlePick(id)}
                        setName={!prefix ? iconPrefix : undefined}
                        setLabel={!prefix ? setLabel : undefined}
                        onBrowseSet={
                          !prefix && iconPrefix
                            ? () => selectPrefix(iconPrefix, { clearQuery: true })
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
                {hasMore && (
                  <div
                    ref={sentinelRef}
                    className="flex h-12 items-center justify-center"
                  >
                    {loading ? (
                      <Loader2 className="size-3 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        Loading more...
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Set browsing helpers

function ActiveSetHeader({
  prefix,
  name,
  summary,
  collection,
  onClear,
}: {
  prefix: string;
  name: string;
  summary: IconifyCollectionSummary | null;
  collection: IconifyCollection | null;
  onClear: () => void;
}) {
  const sampleIcon = summary?.samples?.[0]
    ? `${prefix}:${summary.samples[0]}`
    : collection?.icons[0]
      ? `${prefix}:${collection.icons[0]}`
      : null;
  const total = collection?.total ?? summary?.total;

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/35 p-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-foreground shadow-sm">
        {sampleIcon ? (
          <Icon icon={sampleIcon} className="size-5" aria-hidden />
        ) : (
          <Library className="size-4" aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-foreground">{name}</span>
          <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {prefix}
          </span>
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {formatIconCount(total)}
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="shrink-0"
        onClick={onClear}
      >
        <ArrowLeft className="size-3" aria-hidden />
        All sets
      </Button>
    </div>
  );
}

function MatchingStyleStrip({
  sets,
  onBrowse,
}: {
  sets: MatchingStyleSet[];
  onBrowse: (prefix: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Layers2 className="size-3" aria-hidden />
        Matching styles
      </div>
      <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5">
        {sets.map((set) => (
          <button
            key={set.prefix}
            type="button"
            onClick={() => onBrowse(set.prefix)}
            className="flex min-w-[132px] max-w-[164px] items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            title={`Browse ${set.name}`}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <Icon icon={set.sampleIconId} className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-foreground">{set.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">
                {formatIconCount(set.total)}, {formatMatchCount(set.count)}
              </span>
            </span>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

// Set picker overlay

function SetPicker({
  collections,
  loaded,
  activePrefix,
  onSelect,
  onClose,
  initialScrollTop,
  onScrollTopChange,
}: {
  collections: Record<string, IconifyCollectionSummary>;
  loaded: boolean;
  activePrefix: string | null;
  onSelect: (prefix: string | null) => void;
  onClose: () => void;
  initialScrollTop: number;
  onScrollTopChange: (top: number) => void;
}) {
  const [query, setQuery] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const restoredRef = useRef(false);

  // Restore scroll once the collections list has rendered. Skip if user is
  // filtering — saved offset belongs to the unfiltered list.
  useEffect(() => {
    if (restoredRef.current || !loaded || query) return;
    const el = scrollerRef.current;
    if (el && initialScrollTop > 0) {
      el.scrollTop = initialScrollTop;
    }
    restoredRef.current = true;
  }, [loaded, initialScrollTop, query]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = Object.entries(collections).filter(([prefix, info]) => {
      if (!q) return true;
      return (
        prefix.includes(q) ||
        info.name.toLowerCase().includes(q) ||
        (info.category ?? "").toLowerCase().includes(q)
      );
    });
    const byCategory: Record<string, Array<[string, IconifyCollectionSummary]>> = {};
    for (const entry of filtered) {
      const cat = entry[1].category ?? "Other";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(entry);
    }
    return Object.entries(byCategory).sort(([a], [b]) => a.localeCompare(b));
  }, [collections, query]);

  return (
    <div className="-mr-1 flex flex-1 flex-col gap-2 overflow-hidden pr-1">
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sets (Solar, Material, Lucide…)"
            className="pl-7"
            autoFocus
          />
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X className="size-3.5" />
        </Button>
      </div>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          if (query) return;
          onScrollTopChange((e.target as HTMLDivElement).scrollTop);
        }}
      >
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-left text-xs hover:bg-muted",
            activePrefix === null && "border-primary bg-primary/5"
          )}
        >
          <span className="font-medium">All sets</span>
          {activePrefix === null && <Check className="size-3.5 text-primary" />}
        </button>

        {!loaded ? (
          <div className="mt-3 flex justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          grouped.map(([category, sets]) => (
            <div key={category} className="mt-3">
              <div className="mb-1 px-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {category}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {sets.map(([prefix, info]) => {
                  const sample = info.samples?.[0];
                  const isActive = activePrefix === prefix;
                  return (
                    <button
                      key={prefix}
                      type="button"
                      onClick={() => onSelect(prefix)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                        isActive && "border-primary bg-primary/5"
                      )}
                      title={`${info.name} — ${info.total ?? "?"} icons`}
                    >
                      {sample && (
                        <Icon
                          icon={`${prefix}:${sample}`}
                          className="size-4 shrink-0 text-foreground"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{info.name}</div>
                        <div className="truncate text-[10px] text-muted-foreground">
                          {info.total ? `${info.total} icons` : prefix}
                        </div>
                      </div>
                      {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Upload tab ────────────────────────────────────────────────────────────

function UploadTab({ onPicked }: { onPicked: (svg: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.includes("svg") && !file.name.toLowerCase().endsWith(".svg")) {
        toast.error("Please upload an SVG file");
        return;
      }
      if (file.size > 20 * 1024) {
        toast.error("SVG too large (max 20KB)");
        return;
      }
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/icons/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Upload failed");
        }
        if (typeof data.svg !== "string") {
          throw new Error("No SVG returned");
        }
        onPicked(data.svg);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onPicked]
  );

  return (
    <div className="flex h-full flex-col gap-2 p-2.5">
      <div
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:bg-muted/50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        {uploading ? (
          <>
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Uploading…</div>
          </>
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground" />
            <div className="text-sm font-medium">Drop an SVG file</div>
            <div className="text-xs text-muted-foreground">
              Max 20KB. Scripts and external references are stripped.
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Choose file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".svg,image/svg+xml"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Use simple line/fill SVGs without raster images. Uploads are saved to your library so you
          can reuse them in any guidebook.
        </span>
      </div>
    </div>
  );
}

// ─── My Icons tab ──────────────────────────────────────────────────────────

function MyIconsTab({
  onPick,
  active,
}: {
  onPick: (svg: string) => void;
  active: boolean;
}) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (!active || fetched.current) return;
    fetched.current = true;
    setLoading(true);
    fetch("/api/icons/library")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      })
      .finally(() => setLoading(false));
  }, [active]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/icons/library?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Removed");
    } catch {
      toast.error("Could not remove");
    }
  }, []);

  return (
    <div className="flex h-full flex-col p-2.5">
      <div className="-mr-1 flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <EmptyState>{error}</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState>
            Your uploaded SVG icons will appear here. Upload one from the Upload tab.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-6 gap-1.5">
            {items.map((item) => (
              <LibraryTile
                key={item.id}
                item={item}
                onPick={() => onPick(item.svg)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────

function SearchAndCategory({
  query,
  onQuery,
  category,
  onCategory,
}: {
  query: string;
  onQuery: (q: string) => void;
  category: CuratedCategory | "All";
  onCategory: (c: CuratedCategory | "All") => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search curated icons"
          className="pl-7"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        <CategoryChip
          label="All"
          active={category === "All"}
          onClick={() => onCategory("All")}
        />
        {CURATED_CATEGORIES.map((c) => (
          <CategoryChip
            key={c}
            label={c}
            active={category === c}
            onClick={() => onCategory(c)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}

function IconTile({
  iconifyId,
  label,
  loading,
  onClick,
  setName,
  setLabel,
  onBrowseSet,
}: {
  iconifyId: string;
  label: string;
  loading?: boolean;
  onClick: () => void;
  setName?: string | null;
  setLabel?: string;
  onBrowseSet?: () => void;
}) {
  const browseLabel = setLabel ?? setName;
  // Bump key on hover to remount the Icon so SMIL animations (line-md,
  // eos-icons, material-symbols animated, etc.) play again on demand. Static
  // icons just re-render - no visible difference.
  const [replayKey, setReplayKey] = useState(0);
  return (
    <div
      onMouseEnter={() => setReplayKey((k) => k + 1)}
      className="group relative aspect-square rounded-md"
    >
      <button
        type="button"
        onClick={onClick}
        title={label}
        className="flex size-full items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Icon key={replayKey} icon={iconifyId} className="size-6 text-foreground" />
        )}
      </button>
      {setName && (
        <span className="pointer-events-none absolute right-0.5 bottom-0.5 rounded-sm bg-background/90 px-1 text-[8px] font-medium leading-tight text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          {setName}
        </span>
      )}
      {onBrowseSet && browseLabel && !loading && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBrowseSet();
          }}
          className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-md border bg-background/95 text-muted-foreground opacity-0 shadow-sm transition-all hover:border-primary/40 hover:text-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none group-hover:opacity-100 group-focus-within:opacity-100"
          aria-label={`Browse all icons in ${browseLabel}`}
          title={`Browse all icons in ${browseLabel}`}
        >
          <Layers2 className="size-3" aria-hidden />
        </button>
      )}
    </div>
  );
}

function RecentTile({
  svg,
  onPick,
  active,
}: {
  svg: string;
  onPick: (svg: string) => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(svg)}
      className={cn(
        "flex aspect-square items-center justify-center rounded-md border transition-colors hover:bg-muted",
        active ? "border-primary bg-primary/5 text-primary" : "border-transparent text-foreground"
      )}
    >
      <HostIcon value={svg} className="text-2xl" />
    </button>
  );
}

function LibraryTile({
  item,
  onPick,
  onDelete,
}: {
  item: LibraryItem;
  onPick: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onPick}
        className="flex aspect-square w-full items-center justify-center rounded-md border border-transparent text-foreground transition-colors hover:border-border hover:bg-muted"
      >
        <HostIcon value={item.svg} className="text-2xl" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute -top-1 -right-1 hidden size-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground group-hover:flex"
        aria-label="Delete"
      >
        <X className="size-2.5" />
      </button>
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

// Icon-set helpers

function getIconPrefix(iconifyId: string): string | null {
  const separator = iconifyId.indexOf(":");
  if (separator <= 0) return null;
  return iconifyId.slice(0, separator);
}

function getCollectionName(
  prefix: string,
  summary?: IconifyCollectionSummary | null,
  collection?: IconifyCollection | null
): string {
  return summary?.name ?? collection?.title ?? titleizePrefix(prefix);
}

function titleizePrefix(prefix: string): string {
  return prefix
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatIconCount(count: number | undefined): string {
  if (typeof count !== "number" || !Number.isFinite(count)) return "Icon set";
  return `${count.toLocaleString()} ${count === 1 ? "icon" : "icons"}`;
}

function formatMatchCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? "match" : "matches"}`;
}

// Local recent-icon storage

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function addRecent(svg: string) {
  if (typeof window === "undefined") return;
  try {
    const current = readRecent();
    const next = [svg, ...current.filter((v) => v !== svg)].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
