"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  TriangleAlert,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-fetch";
import { toastApiError } from "@/lib/toast-error";
import { cn } from "@/lib/utils";
import {
  QUICK_VARIABLE_PRESETS,
  QUICK_VARIABLE_TYPES,
  getQuickVariableDefinitions,
  isQuickVariableSensitive,
  maskQuickVariableValue,
  normalizeQuickVariablesSettings,
  readQuickVariablesFromSettings,
  tokenForQuickVariable,
  type CustomQuickVariableDefinition,
  type QuickVariableDefinition,
  type QuickVariableType,
  type QuickVariableValue,
  type QuickVariablesSettings,
} from "@/lib/quick-variables";

type QuickVariableUsage = {
  key: string;
  count: number;
};

type QuickVariablesApiResponse = {
  presets: typeof QUICK_VARIABLE_PRESETS;
  values: Record<string, QuickVariableValue>;
  custom: CustomQuickVariableDefinition[];
  updatedAt: string | null;
  updatedBy: string | null;
  isPublished: boolean;
  status: string;
  usage: QuickVariableUsage[];
};

type Props = {
  guidebookId: string;
  accessRole: "owner" | "editor";
  initialSettings: Record<string, unknown>;
  initialStatus?: string;
  modalOpen?: boolean;
  onModalOpenChange?: (open: boolean) => void;
  refreshSignal?: number;
  hideSummary?: boolean;
};

type TabMode = "used" | "available" | "custom";

type VisibleVariableRow = {
  definition: QuickVariableDefinition;
  usageCount: number;
  missing: boolean;
  hasValue: boolean;
  needsValue: boolean;
};

const DEFAULT_CUSTOM_TYPE: QuickVariableType = "text";

function toSnakeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]+/, "")
    .slice(0, 48);
}

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

function makePayload(
  quickVariables: QuickVariablesSettings,
  status = "draft"
): QuickVariablesApiResponse {
  return {
    presets: QUICK_VARIABLE_PRESETS,
    values: quickVariables.values,
    custom: quickVariables.custom,
    updatedAt: quickVariables.updated_at,
    updatedBy: quickVariables.updated_by,
    isPublished: status === "published",
    status,
    usage: [],
  };
}

function cloneValues(values: Record<string, QuickVariableValue>) {
  return structuredClone(values) as Record<string, QuickVariableValue>;
}

function cloneCustom(custom: CustomQuickVariableDefinition[]) {
  return structuredClone(custom) as CustomQuickVariableDefinition[];
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function displayValue({
  value,
  sensitive,
}: {
  value: string;
  sensitive: boolean;
}) {
  if (!value) return "Empty";
  return sensitive ? maskQuickVariableValue(value) : value;
}

function readValue(values: Record<string, QuickVariableValue>, key: string) {
  return values[key] ?? { value: "" };
}

function hasMeaningfulValue(value: QuickVariableValue) {
  return value.value.trim().length > 0;
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
  if (!hasTimezone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 16);
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return trimmed.slice(0, 16);
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function inputTypeForDefinition(definition: QuickVariableDefinition) {
  if (definition.type === "datetime") return "datetime-local";
  if (definition.type === "time") return "time";
  if (definition.type === "phone") return "tel";
  if (definition.type === "url") return "url";
  if (definition.key.endsWith("_email")) return "email";
  return "text";
}

function isDateOrTimeInput(definition: QuickVariableDefinition) {
  return definition.type === "datetime" || definition.type === "time";
}

function compactValueRows(payload: QuickVariablesApiResponse) {
  const settings = normalizeQuickVariablesSettings({
    values: payload.values,
    custom: payload.custom,
    updated_at: payload.updatedAt,
    updated_by: payload.updatedBy,
  });
  const definitions = getQuickVariableDefinitions(settings);
  return definitions
    .map((definition) => {
      const value = readValue(payload.values, definition.key);
      return {
        definition,
        value: value.value,
        sensitive:
          value.sensitive ?? isQuickVariableSensitive(definition.key, payload.custom),
      };
    })
    .filter((item) => item.value.trim().length > 0)
    .slice(0, 8);
}

function makeMissingDefinition(key: string, orderIndex: number): QuickVariableDefinition {
  return {
    key,
    label: key
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    type: "text",
    sensitive: false,
    custom: false,
    enabled: false,
    order_index: orderIndex,
  };
}

export function QuickVariablesManager({
  guidebookId,
  initialSettings,
  initialStatus = "draft",
  modalOpen,
  onModalOpenChange,
  refreshSignal = 0,
  hideSummary = false,
}: Props) {
  const initialPayload = useMemo(
    () => makePayload(readQuickVariablesFromSettings(initialSettings), initialStatus),
    [initialSettings, initialStatus]
  );

  const [payload, setPayload] =
    useState<QuickVariablesApiResponse>(initialPayload);
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabMode>("used");
  const [values, setValues] = useState<Record<string, QuickVariableValue>>(
    cloneValues(initialPayload.values)
  );
  const [customFields, setCustomFields] = useState<
    CustomQuickVariableDefinition[]
  >(cloneCustom(initialPayload.custom));
  const [customLabel, setCustomLabel] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [customType, setCustomType] =
    useState<QuickVariableType>(DEFAULT_CUSTOM_TYPE);
  const [customSensitive, setCustomSensitive] = useState(false);

  const resetEditors = useCallback((nextPayload: QuickVariablesApiResponse) => {
    setValues(cloneValues(nextPayload.values));
    setCustomFields(cloneCustom(nextPayload.custom));
  }, []);

  const settingsForValues = useMemo(
    () =>
      normalizeQuickVariablesSettings({
        values,
        custom: customFields,
      }),
    [customFields, values]
  );

  const definitions = useMemo(
    () => getQuickVariableDefinitions(settingsForValues),
    [settingsForValues]
  );
  const definitionsByKey = useMemo(
    () => new Map(definitions.map((definition) => [definition.key, definition])),
    [definitions]
  );
  const usageByKey = useMemo(
    () => new Map(payload.usage.map((usage) => [usage.key, usage.count])),
    [payload.usage]
  );
  const valueRows = useMemo(() => compactValueRows(payload), [payload]);
  const localDirty =
    stableJson(values) !== stableJson(payload.values) ||
    stableJson(customFields) !== stableJson(payload.custom);
  const open = modalOpen ?? internalOpen;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (onModalOpenChange) {
        onModalOpenChange(nextOpen);
        return;
      }
      setInternalOpen(nextOpen);
    },
    [onModalOpenChange]
  );

  const usedRows = useMemo<VisibleVariableRow[]>(() => {
    const rows = payload.usage.map((usage, index) => {
      const definition = definitionsByKey.get(usage.key);
      const value = readValue(values, usage.key);
      const hasValue = hasMeaningfulValue(value);
      return {
        definition:
          definition ??
          makeMissingDefinition(usage.key, definitions.length + index),
        usageCount: usage.count,
        missing: !definition,
        hasValue,
        needsValue: Boolean(definition) && usage.count > 0 && !hasValue,
      };
    });

    return rows.sort((a, b) => {
      if (a.missing !== b.missing) return a.missing ? -1 : 1;
      if (a.needsValue !== b.needsValue) return a.needsValue ? -1 : 1;
      return (
        b.usageCount - a.usageCount ||
        a.definition.label.localeCompare(b.definition.label)
      );
    });
  },
    [definitions.length, definitionsByKey, payload.usage, values]
  );

  const availableRows = useMemo<VisibleVariableRow[]>(
    () =>
      definitions.map((definition) => {
        const usageCount = usageByKey.get(definition.key) ?? 0;
        const value = readValue(values, definition.key);
        const hasValue = hasMeaningfulValue(value);
        return {
          definition,
          usageCount,
          missing: false,
          hasValue,
          needsValue: usageCount > 0 && !hasValue,
        };
      }),
    [definitions, usageByKey, values]
  );

  const usedNeedsValueCount = useMemo(
    () => usedRows.filter((row) => row.needsValue).length,
    [usedRows]
  );

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source =
      tab === "used"
        ? usedRows
        : tab === "custom"
          ? availableRows.filter((row) => row.definition.custom)
          : availableRows;

    return source.filter(({ definition }) => {
      if (!query) return true;
      return (
        definition.label.toLowerCase().includes(query) ||
        definition.key.toLowerCase().includes(query)
      );
    });
  }, [availableRows, search, tab, usedRows]);

  const refreshPayload = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<QuickVariablesApiResponse>(
      `/api/guidebooks/${guidebookId}/quick-variables`
    );
    setLoading(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't load Quick Variables",
      });
      return;
    }

    setPayload(result.data);
    resetEditors(result.data);
  }, [guidebookId, resetEditors]);

  useEffect(() => {
    if (refreshSignal <= 0) return;
    queueMicrotask(() => void refreshPayload());
  }, [refreshSignal, refreshPayload]);

  const openModal = useCallback(() => {
    setOpen(true);
    void refreshPayload();
  }, [refreshPayload, setOpen]);

  async function saveVariables() {
    setSaving(true);
    const result = await apiFetch<QuickVariablesApiResponse>(
      `/api/guidebooks/${guidebookId}/quick-variables`,
      {
        method: "PATCH",
        body: {
          values,
          custom: customFields,
        },
      }
    );
    setSaving(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't save Quick Variables",
        onRetry: () => void saveVariables(),
      });
      return;
    }

    setPayload(result.data);
    resetEditors(result.data);
    toast.success(
      result.data.isPublished
        ? "Quick Variables saved and published"
        : "Quick Variables saved"
    );
  }

  function patchValue(key: string, patch: Partial<QuickVariableValue>) {
    setValues((current) => ({
      ...current,
      [key]: {
        ...readValue(current, key),
        ...patch,
      },
    }));
  }

  function removeCustomField(key: string) {
    setCustomFields((current) =>
      current.filter((field) => field.key !== key).map((field, index) => ({
        ...field,
        order_index: index,
      }))
    );
    setValues((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addCustomField() {
    const key = toSnakeKey(customKey || customLabel);
    const label = customLabel.trim();
    if (!label || !key) {
      toast.error("Add a label and key first");
      return;
    }
    if (!/^[a-z][a-z0-9_]{1,47}$/.test(key)) {
      toast.error("Use lowercase letters, numbers, and underscores");
      return;
    }
    if (
      QUICK_VARIABLE_PRESETS.some((preset) => preset.key === key) ||
      customFields.some((field) => field.key === key)
    ) {
      toast.error("That key is already in use");
      return;
    }
    if (customFields.length >= 20) {
      toast.error("Custom fields are limited to 20");
      return;
    }

    setCustomFields((current) => [
      ...current,
      {
        key,
        label,
        type: customType,
        sensitive: customSensitive,
        order_index: current.length,
        enabled: true,
      },
    ]);
    setCustomLabel("");
    setCustomKey("");
    setCustomType(DEFAULT_CUSTOM_TYPE);
    setCustomSensitive(false);
  }

  return (
    <div className="space-y-4">
      {!hideSummary ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={payload.isPublished ? "secondary" : "outline"}>
                {payload.isPublished ? "Published" : "Not published"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last updated: {formatDate(payload.updatedAt)}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                openModal();
              }}
            >
              Manage Quick Variables
            </Button>
          </div>

          {valueRows.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {valueRows.map(({ definition, value, sensitive }) => (
                <div
                  key={definition.key}
                  className="min-w-0 rounded-md border bg-muted/25 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold">
                      {definition.label}
                    </span>
                    {sensitive ? (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-1 truncate text-sm text-muted-foreground">
                    {displayValue({ value, sensitive })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
              No Quick Variables saved yet.
            </div>
          )}
        </>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90vh,760px)] gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>Quick Variables</DialogTitle>
            <DialogDescription>
              Update reusable guidebook details from one place.
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 gap-3 overflow-hidden p-4 pb-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search variables"
                  className="pl-8"
                />
              </div>
              <div className="flex rounded-md border bg-muted/40 p-0.5">
                {(["used", "available", "custom"] as const).map((item) => {
                  const count =
                    item === "used"
                      ? usedRows.length
                      : item === "custom"
                        ? availableRows.filter((row) => row.definition.custom).length
                        : availableRows.length;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTab(item)}
                      className={cn(
                        "h-8 rounded-[6px] px-2.5 text-xs font-semibold capitalize transition-colors",
                        tab === item
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{item}</span>
                      <span
                        className={cn(
                          "ml-1 rounded-full px-1.5 text-[11px] tabular-nums",
                          tab === item
                            ? "bg-muted text-muted-foreground"
                            : "bg-background/80"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {usedNeedsValueCount > 0 ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                <TriangleAlert className="h-4 w-4 shrink-0" />
                <span className="font-medium">
                  {usedNeedsValueCount} used{" "}
                  {usedNeedsValueCount === 1
                    ? "variable needs"
                    : "variables need"}{" "}
                  values.
                </span>
              </div>
            ) : null}

            <div className="max-h-[50vh] min-h-[320px] overflow-y-auto rounded-md border">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading
                </div>
              ) : visibleRows.length > 0 ? (
                <div className="divide-y">
                  {visibleRows.map(
                    ({ definition, usageCount, missing, needsValue }) => (
                      <QuickVariableRow
                        key={definition.key}
                        definition={definition}
                        value={readValue(values, definition.key)}
                        savedValue={readValue(payload.values, definition.key)}
                        usageCount={usageCount}
                        missing={missing}
                        needsValue={needsValue}
                        live={
                          tab === "used" && payload.isPublished && usageCount > 0
                        }
                        onValueChange={(value) =>
                          patchValue(definition.key, { value })
                        }
                        onRevealChange={(value) =>
                          patchValue(definition.key, { reveal_at: value || null })
                        }
                        onExpiryChange={(value) =>
                          patchValue(definition.key, { expires_at: value || null })
                        }
                        onRemove={
                          definition.custom
                            ? () => removeCustomField(definition.key)
                            : undefined
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  {tab === "used"
                    ? "No Quick Variables are used in this guidebook yet."
                    : "No matching Quick Variables."}
                </div>
              )}

              {tab === "custom" ? (
                <div className="sticky bottom-0 border-t bg-background p-3 shadow-[0_-8px_18px_rgba(15,23,42,0.06)]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">Add custom field</div>
                      <div className="text-xs text-muted-foreground">
                        {customFields.length}/20 custom fields
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr_140px_auto]">
                    <Input
                      value={customLabel}
                      onChange={(event) => {
                        const label = event.target.value;
                        const previousAutoKey = toSnakeKey(customLabel);
                        setCustomLabel(label);
                        setCustomKey((current) =>
                          !current || current === previousAutoKey
                            ? toSnakeKey(label)
                            : current
                        );
                      }}
                      placeholder="Label"
                    />
                    <Input
                      value={customKey}
                      onChange={(event) =>
                        setCustomKey(toSnakeKey(event.target.value))
                      }
                      placeholder="custom_key"
                    />
                    <Select
                      value={customType}
                      onValueChange={(value) =>
                        setCustomType(
                          QUICK_VARIABLE_TYPES.includes(value as QuickVariableType)
                            ? (value as QuickVariableType)
                            : DEFAULT_CUSTOM_TYPE
                        )
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUICK_VARIABLE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Sensitive</Label>
                      <Switch
                        checked={customSensitive}
                        onCheckedChange={setCustomSensitive}
                      />
                      <Button type="button" size="icon-sm" onClick={addCustomField}>
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Add custom field</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="items-center gap-2">
            <div className="mr-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {localDirty ? (
                <span>Unsaved changes</span>
              ) : payload.isPublished ? (
                <span>Saved values are live</span>
              ) : (
                <span>Saved for the next publish</span>
              )}
            </div>
            <Button
              type="button"
              onClick={() => void saveVariables()}
              disabled={saving || loading || !localDirty}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {payload.isPublished ? "Save and publish" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickVariableRow({
  definition,
  value,
  savedValue,
  usageCount,
  missing,
  needsValue,
  live,
  onValueChange,
  onRevealChange,
  onExpiryChange,
  onRemove,
}: {
  definition: QuickVariableDefinition;
  value: QuickVariableValue;
  savedValue: QuickVariableValue;
  usageCount: number;
  missing: boolean;
  needsValue: boolean;
  live: boolean;
  onValueChange: (value: string) => void;
  onRevealChange: (value: string) => void;
  onExpiryChange: (value: string) => void;
  onRemove?: () => void;
}) {
  const sensitive = value.sensitive ?? definition.sensitive;
  const showTextarea =
    definition.type === "notice" || value.value.length > 80;
  const changed = stableJson(value) !== stableJson(savedValue);
  const disabled = missing;
  const token = tokenForQuickVariable(definition.key);
  const showLiveBadge = live && !missing;
  const compactPicker = isDateOrTimeInput(definition);
  const [copied, setCopied] = useState(false);

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Couldn't copy shortcode");
    }
  }

  return (
    <div
      className={cn(
        "grid gap-2.5 bg-background px-3 py-2.5 transition-colors hover:bg-muted/20 lg:grid-cols-[minmax(230px,0.72fr)_minmax(420px,1.5fr)] lg:items-start lg:px-4",
        needsValue && "bg-amber-500/[0.04] hover:bg-amber-500/[0.07]"
      )}
    >
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <div className="min-w-0 truncate text-sm font-semibold leading-tight text-foreground">
                {definition.label}
              </div>
              {showLiveBadge ? (
                <Badge variant="secondary">Live</Badge>
              ) : null}
              {usageCount > 0 ? (
                <Badge variant="outline">{usageCount} used</Badge>
              ) : (
                <Badge variant="outline">Not used</Badge>
              )}
              {definition.custom ? <Badge variant="outline">Custom</Badge> : null}
              {sensitive ? <Badge variant="secondary">Sensitive</Badge> : null}
              {missing ? <Badge variant="destructive">Missing</Badge> : null}
              {needsValue ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                >
                  Needs value
                </Badge>
              ) : null}
              {changed && !missing ? <Badge variant="secondary">Unsaved</Badge> : null}
            </div>
          </div>
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              aria-label={`Remove ${definition.label}`}
              className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>

        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="capitalize">{definition.type}</span>
          <span aria-hidden>|</span>
          <span className="truncate font-mono">{definition.key}</span>
        </div>
      </div>

      <div className="grid min-w-0 gap-2">
        <div className="grid min-w-0 gap-1">
          <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Shortcode
          </Label>
          <div className="flex min-w-0 items-center gap-1.5 rounded-md border bg-muted/25 px-2 py-1">
            <code className="min-w-0 flex-1 truncate font-mono text-[12px] font-semibold text-foreground">
              {token}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => void copyToken()}
              aria-label={`Copy ${definition.label} shortcode`}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 gap-1.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Value
            </Label>
            {savedValue.value && changed ? (
              <div className="min-w-0 truncate text-[11px] text-muted-foreground">
                Saved:{" "}
                {displayValue({
                  value: savedValue.value,
                  sensitive: savedValue.sensitive ?? definition.sensitive,
                })}
              </div>
            ) : null}
          </div>

          {showTextarea ? (
            <Textarea
              value={value.value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={
                missing
                  ? "Create this custom field to set a value"
                  : definition.placeholder ?? definition.label
              }
              maxLength={500}
              disabled={disabled}
              className="min-h-14 resize-y border-border/80 bg-background text-base font-semibold leading-relaxed shadow-inner placeholder:font-normal"
            />
          ) : (
            <Input
              value={
                definition.type === "datetime"
                  ? toDateTimeLocalValue(value.value)
                  : value.value
              }
              onChange={(event) => onValueChange(event.target.value)}
              placeholder={
                missing
                  ? "Create this custom field to set a value"
                  : definition.placeholder ?? definition.label
              }
              maxLength={500}
              disabled={disabled}
              type={inputTypeForDefinition(definition)}
              className={cn(
                "h-9 border-border/80 bg-background text-base font-semibold shadow-inner placeholder:font-normal",
                compactPicker && "w-full max-w-[230px] justify-self-start pr-2"
              )}
            />
          )}
          {compactPicker && !value.value ? (
            <div className="text-[11px] text-muted-foreground">
              {definition.type === "datetime" ? "dd/mm/yyyy, hh:mm" : "hh:mm"}
            </div>
          ) : null}
          {needsValue ? (
            <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
              This shortcode is used in the guidebook but has no saved value.
            </div>
          ) : null}
        </div>

        {!missing && (sensitive || definition.type === "notice" || definition.key === "temporary_notice") ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {sensitive ? (
              <div className="grid gap-1">
                <Label className="text-[11px]">Reveal at</Label>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocalValue(value.reveal_at)}
                  onChange={(event) => onRevealChange(event.target.value)}
                  className="h-8 w-full max-w-[230px] justify-self-start pr-2 text-xs"
                />
                {!value.reveal_at ? (
                  <div className="text-[11px] text-muted-foreground">
                    dd/mm/yyyy, hh:mm. Uses{" "}
                    {tokenForQuickVariable("access_reveal_time")} if empty.
                  </div>
                ) : null}
              </div>
            ) : null}
            {definition.type === "notice" || definition.key === "temporary_notice" ? (
              <div className="grid gap-1">
                <Label className="text-[11px]">Expires at</Label>
                <Input
                  type="datetime-local"
                  value={toDateTimeLocalValue(value.expires_at)}
                  onChange={(event) => onExpiryChange(event.target.value)}
                  className="h-8 w-full max-w-[230px] justify-self-start pr-2 text-xs"
                />
                {!value.expires_at ? (
                  <div className="text-[11px] text-muted-foreground">
                    dd/mm/yyyy, hh:mm
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
