"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-fetch";
import { formatStoreMoney } from "@/lib/store/public";
import {
  fetchEditorStorefront,
  getCachedEditorStorefront,
  setCachedEditorStorefront,
  type EditorStorefrontAssignment as StorefrontAssignment,
  type EditorStorefrontCatalogItem as CatalogItem,
  type EditorStorefrontData as StorefrontResponse,
  type EditorStorefrontPatchResult,
} from "@/lib/store/editor-storefront-cache";
import { storefrontToPreviewSnapshot } from "@/lib/store/storefront-preview";
import {
  getStorePaymentMethodMeta,
  type StorePaymentMethod,
} from "@/lib/store/payment-methods";
import {
  readStoreSettingsFromGuidebookSettings,
  type StoreIntroSettings,
  type StoreListingStyle,
} from "@/lib/store/settings";
import type { SnapshotStorefront } from "@/lib/store/types";
import { toastApiError } from "@/lib/toast-error";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_MAX, type BottomNavSlot } from "@/types/bottom-nav";
import { useEditorStore } from "@/stores/editor-store";
import {
  EditorPanelShell,
  EditorSection,
  RepeaterGroup,
  SegmentedRow,
  ToggleRow,
} from "../settings-ui";
import { FeaturedNavCard } from "./controls/PanelHeader";
import { SettingsField, SettingsSection } from "./controls/SettingsField";

type Props =
  | { mode: "card"; onSelect: () => void }
  | { mode: "detail" };

function dispatchStorefrontPreview(storefront: SnapshotStorefront | null) {
  window.dispatchEvent(
    new CustomEvent("guestnix:storefront-preview", {
      detail: { storefront },
    })
  );
}

function assignmentPayload(assignments: StorefrontAssignment[]) {
  return assignments.map((assignment, index) => ({
    storeItemId: assignment.storeItemId,
    visible: assignment.visible,
    orderIndex: index,
    maxQuantity: assignment.maxQuantity,
  }));
}

type StorefrontSavePatch = {
  enabled?: boolean;
  paymentMethodIds?: string[];
  items?: ReturnType<typeof assignmentPayload>;
};

function mergeStorefrontSavePatch(
  current: StorefrontSavePatch | null,
  patch: StorefrontSavePatch
): StorefrontSavePatch {
  return {
    ...(current ?? {}),
    ...patch,
  };
}

function normalizeStorefrontData(data: StorefrontResponse): StorefrontResponse {
  return {
    ...data,
    catalogItems: data.catalogItems ?? [],
    paymentMethods: data.paymentMethods ?? [],
    storefront: {
      ...data.storefront,
      paymentMethodIds: data.storefront.paymentMethodIds ?? [],
      items: data.storefront.items
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((assignment, index) => ({ ...assignment, orderIndex: index })),
    },
  };
}

export function StoreFeaturedPageEditor(props: Props) {
  if (props.mode === "card") {
    return (
      <FeaturedNavCard
        icon={<ShoppingBag className="h-4 w-4" />}
        title="Store"
        accent="violet"
        onSelect={props.onSelect}
      />
    );
  }

  return <StoreFeaturedPageDetail />;
}

function StoreFeaturedPageDetail() {
  const guidebookId = useEditorStore((s) => s.guidebookId);
  const guidebookSettings = useEditorStore((s) => s.guidebookSettings);
  const bottomNav = useEditorStore((s) => s.bottomNav);
  const setBottomNav = useEditorStore((s) => s.setBottomNav);
  const applyDraftTouch = useEditorStore((s) => s.applyDraftTouch);
  const setActiveFeaturedView = useEditorStore((s) => s.setActiveFeaturedView);
  const updateGuidebookSettings = useEditorStore(
    (s) => s.updateGuidebookSettings
  );
  const initialStorefrontData = useMemo(
    () =>
      guidebookId
        ? getCachedEditorStorefront(guidebookId)
        : null,
    [guidebookId]
  );
  const initialNormalizedStorefrontData = useMemo(
    () =>
      initialStorefrontData
        ? normalizeStorefrontData(initialStorefrontData)
        : null,
    [initialStorefrontData]
  );
  const [loading, setLoading] = useState(
    () => Boolean(guidebookId) && !initialNormalizedStorefrontData
  );
  const [saving, setSaving] = useState(false);
  const [refreshingStorefront, setRefreshingStorefront] = useState(false);
  const [storefrontId, setStorefrontId] = useState<string | null>(
    () => initialNormalizedStorefrontData?.storefront.id ?? null
  );
  const [enabled, setEnabled] = useState(
    () => initialNormalizedStorefrontData?.storefront.enabled ?? false
  );
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(
    () => initialNormalizedStorefrontData?.catalogItems ?? []
  );
  const [paymentMethods, setPaymentMethods] = useState<StorePaymentMethod[]>(
    () => initialNormalizedStorefrontData?.paymentMethods ?? []
  );
  const [paymentMethodIds, setPaymentMethodIds] = useState<string[]>(
    () => initialNormalizedStorefrontData?.storefront.paymentMethodIds ?? []
  );
  const [assignments, setAssignments] = useState<StorefrontAssignment[]>(
    () => initialNormalizedStorefrontData?.storefront.items ?? []
  );
  const [selectedItemId, setSelectedItemId] = useState("");
  const localDataRef = useRef<StorefrontResponse | null>(
    initialNormalizedStorefrontData
  );
  const pendingSaveRef = useRef<StorefrontSavePatch | null>(null);
  const savingRef = useRef(false);
  const flushStorefrontSaveRef = useRef<(() => Promise<void>) | null>(null);
  const unmountedRef = useRef(false);
  const storeConfig = useMemo(
    () => readStoreSettingsFromGuidebookSettings(guidebookSettings),
    [guidebookSettings]
  );
  const storeConfigRef = useRef(storeConfig);

  useEffect(() => {
    storeConfigRef.current = storeConfig;
  }, [storeConfig]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const hasStoreNav = bottomNav.some((slot) => slot.type === "store");
  const assignedIds = useMemo(
    () => new Set(assignments.map((assignment) => assignment.storeItemId)),
    [assignments]
  );
  const availableCatalogItems = catalogItems.filter(
    (item) => !assignedIds.has(item.id)
  );
  const selectablePaymentMethods = paymentMethods.filter(
    (method) => method.active || paymentMethodIds.includes(method.id)
  );

  const patchStoreIntro = (patch: Partial<StoreIntroSettings>) => {
    updateGuidebookSettings({
      store: {
        ...storeConfig,
        intro: {
          ...storeConfig.intro,
          ...patch,
        },
      },
    });
  };

  const patchStoreListingStyle = (listingStyle: StoreListingStyle) => {
    updateGuidebookSettings({
      store: {
        ...storeConfig,
        listingStyle,
      },
    });
  };

  const hydrate = useCallback((data: StorefrontResponse) => {
    const normalized = normalizeStorefrontData(data);
    localDataRef.current = normalized;
    const storefront = normalized.storefront;
    setStorefrontId(storefront.id);
    setEnabled(storefront.enabled);
    setPaymentMethodIds(storefront.paymentMethodIds);
    setAssignments(storefront.items);
    setCatalogItems(normalized.catalogItems);
    setPaymentMethods(normalized.paymentMethods);
    setSelectedItemId("");
    return normalized;
  }, []);

  const previewSnapshotFromData = useCallback(
    (data: StorefrontResponse) =>
      storefrontToPreviewSnapshot(data.storefront, {
        intro: storeConfigRef.current.intro,
        listingStyle: storeConfigRef.current.listingStyle,
      }),
    []
  );

  const publishLocalStorefront = useCallback(
    (data: StorefrontResponse) => {
      const normalized = normalizeStorefrontData(data);
      localDataRef.current = normalized;
      if (guidebookId) {
        setCachedEditorStorefront(guidebookId, normalized);
      }
      dispatchStorefrontPreview(previewSnapshotFromData(normalized));
      return normalized;
    },
    [guidebookId, previewSnapshotFromData]
  );

  const updateLocalStorefront = useCallback(
    (patch: {
      storefrontId?: string | null;
      enabled?: boolean;
      paymentMethodIds?: string[];
      assignments?: StorefrontAssignment[];
    }) => {
      const base =
        localDataRef.current ??
        normalizeStorefrontData({
          storefront: {
            id: storefrontId,
            enabled,
            paymentMethodIds,
            items: assignments,
          },
          catalogItems,
          paymentMethods,
        });
      const next = publishLocalStorefront({
        ...base,
        storefront: {
          ...base.storefront,
          id:
            patch.storefrontId === undefined
              ? base.storefront.id
              : patch.storefrontId,
          enabled: patch.enabled ?? base.storefront.enabled,
          paymentMethodIds:
            patch.paymentMethodIds ?? base.storefront.paymentMethodIds,
          items: patch.assignments ?? base.storefront.items,
        },
      });

      setStorefrontId(next.storefront.id);
      setEnabled(next.storefront.enabled);
      setPaymentMethodIds(next.storefront.paymentMethodIds);
      setAssignments(next.storefront.items);
      setCatalogItems(next.catalogItems);
      setPaymentMethods(next.paymentMethods);
      return next;
    },
    [
      assignments,
      catalogItems,
      enabled,
      paymentMethodIds,
      paymentMethods,
      publishLocalStorefront,
      storefrontId,
    ]
  );

  const applyStorefrontData = useCallback(
    (data: StorefrontResponse) => {
      const normalized = hydrate(data);
      if (guidebookId) {
        setCachedEditorStorefront(guidebookId, normalized);
      }
      dispatchStorefrontPreview(previewSnapshotFromData(normalized));
    },
    [guidebookId, hydrate, previewSnapshotFromData]
  );

  const load = useCallback(async () => {
    if (!guidebookId) {
      setLoading(false);
      return;
    }

    const cached = getCachedEditorStorefront(guidebookId);
    if (cached) {
      applyStorefrontData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await fetchEditorStorefront(guidebookId);
    setLoading(false);
    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load Store",
      });
      return;
    }
    applyStorefrontData(result.data);
  }, [applyStorefrontData, guidebookId]);

  const refreshStorefrontSources = useCallback(async () => {
    if (!guidebookId || refreshingStorefront) return;

    if (savingRef.current || pendingSaveRef.current) {
      toastApiError(
        {
          kind: "conflict",
          title: "Store is still saving",
          message: "Wait for Store changes to finish saving, then refresh.",
          retryable: false,
          status: 409,
        },
        { title: "Store is still saving" }
      );
      return;
    }

    setRefreshingStorefront(true);
    const result = await fetchEditorStorefront(guidebookId, { force: true });
    if (!unmountedRef.current) setRefreshingStorefront(false);

    if (!result.ok) {
      if (!unmountedRef.current) {
        toastApiError(result.error, {
          title: "Couldn't refresh Store",
        });
      }
      return;
    }

    if (!unmountedRef.current) {
      applyStorefrontData(result.data);
    }
  }, [
    applyStorefrontData,
    guidebookId,
    refreshingStorefront,
  ]);

  useEffect(() => {
    setActiveFeaturedView("store");
  }, [setActiveFeaturedView]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const flushStorefrontSave = useCallback(async () => {
    if (!guidebookId || savingRef.current) return;
    const body = pendingSaveRef.current;
    if (!body) return;

    pendingSaveRef.current = null;
    savingRef.current = true;
    if (!unmountedRef.current) setSaving(true);

    const result = await apiFetch<EditorStorefrontPatchResult>(
      `/api/guidebooks/${guidebookId}/storefront`,
      {
        method: "PATCH",
        body,
      }
    );

    savingRef.current = false;

    if (!result.ok) {
      const queuedAfterFailure = pendingSaveRef.current;
      if (queuedAfterFailure) {
        pendingSaveRef.current = mergeStorefrontSavePatch(
          body,
          queuedAfterFailure
        );
      }
      if (!unmountedRef.current) {
        setSaving(false);
        toastApiError(result.error, {
          title: "Couldn't save Store",
          onRetry: () => {
            pendingSaveRef.current = mergeStorefrontSavePatch(
              body,
              pendingSaveRef.current ?? {}
            );
            void flushStorefrontSaveRef.current?.();
          },
        });
      }
      if (pendingSaveRef.current) {
        void flushStorefrontSaveRef.current?.();
      }
      return;
    }

    applyDraftTouch(result.data);
    const current = localDataRef.current;
    if (
      current &&
      result.data.storefront.id &&
      current.storefront.id !== result.data.storefront.id
    ) {
      updateLocalStorefront({ storefrontId: result.data.storefront.id });
    }

    if (pendingSaveRef.current) {
      void flushStorefrontSaveRef.current?.();
      return;
    }

    if (!unmountedRef.current) setSaving(false);
  }, [applyDraftTouch, guidebookId, updateLocalStorefront]);

  useEffect(() => {
    flushStorefrontSaveRef.current = flushStorefrontSave;
  }, [flushStorefrontSave]);

  const enqueueStorefrontSave = useCallback(
    (patch: StorefrontSavePatch) => {
      pendingSaveRef.current = mergeStorefrontSavePatch(
        pendingSaveRef.current,
        patch
      );
      void flushStorefrontSave();
    },
    [flushStorefrontSave]
  );

  function saveAssignments(nextAssignments: StorefrontAssignment[]) {
    const normalized = nextAssignments.map((assignment, index) => ({
      ...assignment,
      orderIndex: index,
    }));
    setSelectedItemId("");
    const next = updateLocalStorefront({ assignments: normalized });
    enqueueStorefrontSave({ items: assignmentPayload(next.storefront.items) });
  }

  function setStoreEnabled(nextEnabled: boolean) {
    updateLocalStorefront({ enabled: nextEnabled });
    enqueueStorefrontSave({ enabled: nextEnabled });
  }

  function addStoreToNav() {
    if (hasStoreNav || bottomNav.length >= BOTTOM_NAV_MAX) return;
    const next: BottomNavSlot = { type: "store", label: "Store", icon: "" };
    setBottomNav([...bottomNav, next]);
  }

  const addSelectedItem = () => {
    const item = catalogItems.find((catalogItem) => catalogItem.id === selectedItemId);
    if (!item) return;
    const currentAssignments =
      localDataRef.current?.storefront.items ?? assignments;
    if (currentAssignments.some((assignment) => assignment.storeItemId === item.id)) {
      setSelectedItemId("");
      return;
    }
    const next: StorefrontAssignment[] = [
      ...currentAssignments,
      {
        id: `draft-${item.id}`,
        storeItemId: item.id,
        orderIndex: currentAssignments.length,
        visible: true,
        maxQuantity: null,
        item,
      },
    ];
    saveAssignments(next);
  };

  const moveAssignment = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= assignments.length) return;
    const next = assignments.slice();
    [next[index], next[target]] = [next[target], next[index]];
    saveAssignments(next);
  };

  const patchAssignment = (
    index: number,
    patch: Partial<Pick<StorefrontAssignment, "visible" | "maxQuantity">>
  ) => {
    const next = assignments.map((assignment, assignmentIndex) =>
      assignmentIndex === index ? { ...assignment, ...patch } : assignment
    );
    saveAssignments(next);
  };

  const removeAssignment = (index: number) => {
    saveAssignments(assignments.filter((_, assignmentIndex) => assignmentIndex !== index));
  };

  const togglePaymentMethod = (methodId: string, checked: boolean) => {
    const currentIds =
      localDataRef.current?.storefront.paymentMethodIds ?? paymentMethodIds;
    const next = checked
      ? [...currentIds, methodId]
      : currentIds.filter((id) => id !== methodId);
    const deduped = [...new Set(next)];
    const updated = updateLocalStorefront({ paymentMethodIds: deduped });
    enqueueStorefrontSave({
      paymentMethodIds: updated.storefront.paymentMethodIds,
    });
  };

  if (loading) {
    return (
      <EditorPanelShell>
        <p className="text-sm text-muted-foreground">Loading Store...</p>
      </EditorPanelShell>
    );
  }

  return (
    <EditorPanelShell contentClassName="space-y-4">
      {saving ? (
        <p className="text-[11px] font-medium text-muted-foreground" role="status">
          Saving Store changes...
        </p>
      ) : null}
      <EditorSection
        title="Store page"
        description="Optional guidebook page for manual extras and upsells."
        collapsible={false}
      >
        {!enabled ? (
          <div className="grid gap-3 rounded-md border border-dashed border-border bg-muted/20 p-3">
            <div className="flex items-start gap-2">
              <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Store is turned off</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Enable it here first. After that you can add Store to bottom
                  navigation, edit page copy, and assign catalog items.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-fit"
              onClick={() => {
                setStoreEnabled(true);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Enable Store page
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200/70 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <div className="flex min-w-0 items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                  Store page enabled
                </p>
                <p className="text-[11.5px] text-emerald-800 dark:text-emerald-300">
                  Guests will see it after it is in navigation and published.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStoreEnabled(false);
              }}
            >
              Turn off
            </Button>
          </div>
        )}
      </EditorSection>

      {enabled && !hasStoreNav ? (
        <EditorSection
          title="Navigation"
          description="Add Store to the bottom nav so guests can open it."
          defaultExpanded
        >
          <div className="flex items-start gap-2 rounded-md border border-amber-200/70 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
            <AlertTriangle
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] leading-snug text-amber-800 dark:text-amber-300">
                Store is enabled but not in the bottom nav yet.
              </p>
              {bottomNav.length < BOTTOM_NAV_MAX ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 text-[11px]"
                  onClick={addStoreToNav}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Store to nav
                </Button>
              ) : (
                <p className="mt-2 text-[11px] leading-5 text-amber-800 dark:text-amber-300">
                  Bottom nav is full. Remove a nav slot first, then add Store.
                </p>
              )}
            </div>
          </div>
        </EditorSection>
      ) : null}

      {enabled ? (
        <>
          <SettingsSection icon={<Type />} title="Page intro">
            <ToggleRow
              label="Show intro text"
              description="Controls the copy above Store items."
              checked={storeConfig.intro.enabled}
              onCheckedChange={(checked) => patchStoreIntro({ enabled: checked })}
            />

            {storeConfig.intro.enabled ? (
              <div className="space-y-2.5">
                <SettingsField label="Eyebrow">
                  <Input
                    value={storeConfig.intro.eyebrow}
                    maxLength={80}
                    onChange={(event) =>
                      patchStoreIntro({ eyebrow: event.target.value })
                    }
                    className="h-9 text-xs"
                    aria-label="Store intro eyebrow"
                  />
                </SettingsField>
                <SettingsField label="Title">
                  <Input
                    value={storeConfig.intro.title}
                    maxLength={120}
                    onChange={(event) =>
                      patchStoreIntro({ title: event.target.value })
                    }
                    className="h-9 text-xs"
                    aria-label="Store intro title"
                  />
                </SettingsField>
                <SettingsField label="Subtitle">
                  <Input
                    value={storeConfig.intro.subtitle}
                    maxLength={240}
                    onChange={(event) =>
                      patchStoreIntro({ subtitle: event.target.value })
                    }
                    className="h-9 text-xs"
                    aria-label="Store intro subtitle"
                  />
                </SettingsField>
              </div>
            ) : null}
          </SettingsSection>

          <SettingsSection
            icon={<ImageIcon />}
            title="Listing style"
            defaultExpanded
          >
            <SegmentedRow<StoreListingStyle>
              label="Card layout"
              hint="Controls how Store items appear to guests."
              value={storeConfig.listingStyle}
              onChange={patchStoreListingStyle}
              ariaLabel="Store listing style"
              options={[
                {
                  value: "compact",
                  label: "Compact",
                  icon: <ShoppingBag className="h-3.5 w-3.5" />,
                },
                {
                  value: "catalogue",
                  label: "Catalogue",
                  icon: <ImageIcon className="h-3.5 w-3.5" />,
                },
              ]}
            />
          </SettingsSection>

          <EditorSection
            title="Catalog"
            description={`${assignments.length} item${assignments.length === 1 ? "" : "s"} assigned to this Store page`}
            defaultExpanded
          >
            <RepeaterGroup
              label="Catalog items"
              action={
                <StorefrontRefreshButton
                  label="Refresh"
                  ariaLabel="Refresh Store catalog items"
                  refreshing={refreshingStorefront}
                  disabled={saving}
                  onClick={refreshStorefrontSources}
                />
              }
            >
              {catalogItems.length === 0 ? (
                <div className="grid gap-3 rounded-md border border-dashed border-border bg-muted/20 px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold">No catalog items yet</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Add reusable Store items in the host dashboard, then come
                      back here to choose which ones appear in this guidebook.
                    </p>
                  </div>
                  <a
                    href="/dashboard/store?tab=catalogue"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-fit items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
                  >
                    Open Store catalog
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
                    value={selectedItemId}
                    onChange={(event) => setSelectedItemId(event.target.value)}
                    aria-label="Catalog item"
                  >
                    <option value="">Choose catalog item</option>
                    {availableCatalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.itemType} -{" "}
                        {formatStoreMoney(item.priceCents, item.currency)}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addSelectedItem}
                    disabled={!selectedItemId}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              )}
            </RepeaterGroup>

            {catalogItems.length > 0 && availableCatalogItems.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                Every catalog item is already assigned to this Store page.
              </p>
            ) : null}

            <div className="space-y-2">
              {assignments.map((assignment, index) => (
                <div
                  key={assignment.storeItemId}
                  className="rounded-md border border-border/70 bg-muted/10 p-2"
                >
                  <div className="flex items-start gap-2">
                    <div
                      aria-hidden="true"
                      className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-background text-muted-foreground"
                      style={
                        assignment.item.imageUrl
                          ? {
                              backgroundImage: `url(${JSON.stringify(
                                assignment.item.imageUrl
                              )})`,
                              backgroundPosition: "center",
                              backgroundSize: "cover",
                            }
                          : undefined
                      }
                    >
                      {assignment.item.imageUrl ? null : (
                        <ShoppingBag className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold">
                        {assignment.item.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatStoreMoney(
                          assignment.item.priceCents,
                          assignment.item.currency
                        )}
                        {assignment.item.active ? "" : " - inactive"}
                      </p>
                      {assignment.item.description ? (
                        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                          {assignment.item.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Move item up"
                        disabled={index === 0}
                        onClick={() => moveAssignment(index, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Move item down"
                        disabled={index === assignments.length - 1}
                        onClick={() => moveAssignment(index, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={assignment.visible ? "Hide item" : "Show item"}
                        onClick={() =>
                          patchAssignment(index, { visible: !assignment.visible })
                        }
                      >
                        {assignment.visible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove item"
                        onClick={() => removeAssignment(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      Max quantity
                    </span>
                    <Input
                      className="h-8 w-24 text-xs"
                      type="number"
                      min={1}
                      max={999}
                      placeholder="No max"
                      value={assignment.maxQuantity ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;
                        const parsed =
                          value.trim() === "" ? null : Number.parseInt(value, 10);
                        const next = assignments.map((entry, entryIndex) =>
                          entryIndex === index
                            ? {
                                ...entry,
                                maxQuantity:
                                  parsed && Number.isFinite(parsed)
                                    ? Math.max(1, Math.min(999, parsed))
                                    : null,
                              }
                            : entry
                        );
                        updateLocalStorefront({ assignments: next });
                      }}
                      onBlur={() =>
                        saveAssignments(
                          localDataRef.current?.storefront.items ?? assignments
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="min-w-0 border-t border-border/70 pt-3">
              <div className="mb-2 flex items-start gap-2">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">
                    Payment methods
                  </p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    Choose which dashboard payment methods guests can use for this guidebook.
                  </p>
                </div>
                <StorefrontRefreshButton
                  label="Refresh"
                  ariaLabel="Refresh Store payment methods"
                  refreshing={refreshingStorefront}
                  disabled={saving}
                  onClick={refreshStorefrontSources}
                />
              </div>

              {selectablePaymentMethods.length === 0 ? (
                <div className="grid gap-3 rounded-md border border-dashed border-border bg-muted/20 px-3 py-3">
                  <p className="text-xs leading-5 text-muted-foreground">
                    Add payment methods in the host dashboard, then select them
                    here for this guidebook.
                  </p>
                  <a
                    href="/dashboard/store?tab=payments"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-fit items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
                  >
                    Open payment setup
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <div className="grid min-w-0 gap-2">
                  {selectablePaymentMethods.map((method) => (
                    <PaymentMethodSelectTile
                      key={method.id}
                      method={method}
                      checked={paymentMethodIds.includes(method.id)}
                      disabled={false}
                      onCheckedChange={(checked) =>
                        togglePaymentMethod(method.id, checked)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </EditorSection>
        </>
      ) : null}
    </EditorPanelShell>
  );
}

function StorefrontRefreshButton({
  label,
  ariaLabel,
  refreshing,
  disabled,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  refreshing: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      disabled={disabled || refreshing}
      onClick={onClick}
      className="h-7 px-2 text-[11px]"
    >
      <RefreshCw
        className={cn("mr-1 h-3.5 w-3.5", refreshing && "animate-spin")}
        aria-hidden
      />
      {refreshing ? "Refreshing" : label}
    </Button>
  );
}

function PaymentMethodSelectTile({
  method,
  checked,
  disabled,
  onCheckedChange,
}: {
  method: StorePaymentMethod;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const meta = getStorePaymentMethodMeta(method.type);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group flex w-full min-w-0 cursor-pointer appearance-none items-center gap-2 rounded-md border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        checked
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border/70 bg-background hover:border-primary/35 hover:bg-primary/5",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-white shadow-sm transition-transform group-hover:scale-[1.03]"
        style={{ backgroundColor: meta.hue }}
        aria-hidden
      >
        <Icon icon={meta.icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block truncate text-xs font-semibold">
          {method.label || meta.label}
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
          {method.value || meta.valuePlaceholder}
        </span>
      </span>
      <span
        className={cn(
          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-transparent"
        )}
        aria-hidden
      >
        <Check className="h-3 w-3" />
      </span>
    </button>
  );
}
