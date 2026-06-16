"use client";

import type { ElementType, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  BarChart3,
  Bell,
  CheckCircle2,
  CreditCard,
  Eye,
  FilePlus2,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  UserCircle,
  Users,
  XCircle,
} from "lucide-react";
import {
  DashboardAnnouncementBannerView,
  type DashboardAnnouncement,
} from "@/components/dashboard/DashboardAnnouncementBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-fetch";
import { cn, formatDate } from "@/lib/utils";

type WorkspaceMode = "overview" | "compose" | "analytics";
type CampaignAction = "publish" | "pause" | "archive" | "resume" | "unarchive";

type AudienceFilter = {
  type:
    | "all"
    | "selected"
    | "plan"
    | "subscription_status"
    | "activity_segment";
  userIds?: string[];
  plans?: string[];
  subscriptionStatuses?: string[];
  activitySegment?:
    | "active_7d"
    | "inactive_30d"
    | "no_published_guidebook"
    | "trial_ending_soon";
};

type AnnouncementStats = {
  recipientCount: number;
  viewCount: number;
  clickCount: number;
  dismissedCount: number;
  acknowledgedCount: number;
  snoozedCount: number;
  expandedCount: number;
};

type AnnouncementCampaign = DashboardAnnouncement & {
  status: "draft" | "scheduled" | "active" | "paused" | "archived" | string;
  audienceFilter: AudienceFilter;
  startsAt: string | null;
  endsAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: AnnouncementStats;
};

type AudienceUser = {
  id: string;
  email: string;
  fullName: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  createdAt: string;
  updatedAt: string;
};

type RecipientAnalytics = {
  id: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  plan: string | null;
  subscriptionStatus: string | null;
  state: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  dismissedAt: string | null;
  acknowledgedAt: string | null;
  snoozedUntil: string | null;
  clickedAt: string | null;
  expandedAt: string | null;
  viewCount: number;
  clickCount: number;
};

type CampaignEvent = {
  id: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
};

type CampaignDetail = {
  campaign: AnnouncementCampaign;
  recipients: RecipientAnalytics[];
  recentEvents: CampaignEvent[];
};

type CampaignListResponse = {
  campaigns: AnnouncementCampaign[];
};

type CampaignResponse = {
  campaign: AnnouncementCampaign;
};

type AudiencePreview = {
  count: number;
  sample: AudienceUser[];
};

type FormState = {
  title: string;
  body: string;
  priority: number;
  tone: DashboardAnnouncement["tone"];
  displayMode: DashboardAnnouncement["displayMode"];
  icon: string;
  ctaLabel: string;
  ctaHref: string;
  audienceFilter: AudienceFilter;
  behaviorConfig: DashboardAnnouncement["behaviorConfig"];
  startsAt: string;
  endsAt: string;
};

const PLAN_OPTIONS = ["solo", "plus", "pro", "scale"];
const STATUS_OPTIONS = ["trialing", "active", "past_due", "canceled", "expired"];
const TONE_OPTIONS: DashboardAnnouncement["tone"][] = [
  "info",
  "success",
  "warning",
  "critical",
  "launch",
  "promo",
  "maintenance",
  "billing",
  "security",
];
const MODE_OPTIONS: DashboardAnnouncement["displayMode"][] = [
  "slim",
  "standard",
  "expanded",
  "critical",
  "popin",
];
const ICON_OPTIONS = [
  "megaphone",
  "info",
  "bell",
  "launch",
  "gift",
  "maintenance",
  "billing",
  "security",
  "warning",
  "alert",
];
const FREQUENCY_OPTIONS: DashboardAnnouncement["behaviorConfig"]["frequency"][] = [
  "until_dismissed",
  "once",
  "once_per_session",
  "daily",
  "always",
];
const WORKSPACE_TABS: { key: WorkspaceMode; label: string; icon: ElementType }[] = [
  { key: "overview", label: "Campaigns", icon: Megaphone },
  { key: "compose", label: "Composer", icon: Pencil },
  { key: "analytics", label: "Analytics", icon: Users },
];

function defaultForm(): FormState {
  return {
    title: "New platform update",
    body: "Share a clear, useful update with hosts from the dashboard.",
    priority: 20,
    tone: "info",
    displayMode: "standard",
    icon: "megaphone",
    ctaLabel: "",
    ctaHref: "",
    audienceFilter: { type: "all" },
    behaviorConfig: {
      dismissible: true,
      pinned: false,
      requireAcknowledgement: false,
      snoozeEnabled: false,
      frequency: "until_dismissed",
      snoozeHours: 24,
      autoHideSeconds: null,
    },
    startsAt: "",
    endsAt: "",
  };
}

function toInputDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromInputDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function formFromCampaign(campaign: AnnouncementCampaign): FormState {
  return {
    title: campaign.title,
    body: campaign.body,
    priority: campaign.priority,
    tone: campaign.tone,
    displayMode: campaign.displayMode,
    icon: campaign.icon,
    ctaLabel: campaign.ctaLabel ?? "",
    ctaHref: campaign.ctaHref ?? "",
    audienceFilter: campaign.audienceFilter,
    behaviorConfig: campaign.behaviorConfig,
    startsAt: toInputDate(campaign.startsAt),
    endsAt: toInputDate(campaign.endsAt),
  };
}

function payloadFromForm(form: FormState) {
  return {
    ...form,
    ctaLabel: form.ctaLabel.trim() || null,
    ctaHref: form.ctaHref.trim() || null,
    startsAt: fromInputDate(form.startsAt),
    endsAt: fromInputDate(form.endsAt),
  };
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "active") return "default";
  if (status === "scheduled") return "secondary";
  if (status === "paused") return "destructive";
  return "outline";
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(next) => next && onChange(next as T)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function StatPill({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon?: ElementType;
}) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function DashboardTopbarPreview() {
  return (
    <div className="flex h-14 items-center gap-4 border-b bg-card px-4">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold">Dashboard</p>
          <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Beta
          </span>
        </div>
      </div>
      <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <MessageCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <UserCircle className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
    </div>
  );
}

function DashboardContentPreview() {
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-3">
      <div className="h-24 rounded-lg border bg-muted/40" />
      <div className="h-24 rounded-lg border bg-muted/30" />
      <div className="h-24 rounded-lg border bg-muted/20" />
    </div>
  );
}

function LiveDashboardPreview({
  announcement,
}: {
  announcement: DashboardAnnouncement;
}) {
  const isPopin = announcement.displayMode === "popin";

  return (
    <section className="-mx-4 border-y bg-muted/30 sm:-mx-6 lg:-mx-8">
      <div className="flex h-12 items-center justify-between border-b bg-background px-4 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium">Live host preview</p>
          <p className="truncate text-xs text-muted-foreground">
            Rendered in the dashboard position hosts will see.
          </p>
        </div>
        <Badge variant="outline">{announcement.displayMode}</Badge>
      </div>
      <div className={cn("relative overflow-hidden bg-background", isPopin && "min-h-[22rem]")}>
        {isPopin ? (
          <>
            <DashboardTopbarPreview />
            <DashboardContentPreview />
            <DashboardAnnouncementBannerView
              announcement={announcement}
              expanded
              preview
              previewContext="dashboard"
            />
          </>
        ) : (
          <>
            <DashboardAnnouncementBannerView
              announcement={announcement}
              expanded={announcement.displayMode !== "slim"}
              preview
              previewContext="dashboard"
            />
            <DashboardTopbarPreview />
          </>
        )}
      </div>
    </section>
  );
}

function toggleValue(values: string[] | undefined, value: string) {
  const set = new Set(values ?? []);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

function recipientActionLabel(recipient: RecipientAnalytics) {
  if (recipient.acknowledgedAt) return "Acknowledged";
  if (recipient.clickedAt) return "Clicked CTA";
  if (recipient.dismissedAt) return "Dismissed";
  if (recipient.snoozedUntil) return "Snoozed";
  if (recipient.expandedAt) return "Expanded";
  if (recipient.firstSeenAt) return "Viewed";
  return "No action";
}

function formatMaybeDate(value: string | null) {
  return value ? formatDate(value) : "Never";
}

export function AnnouncementsAdminClient({
  initialCampaigns,
  audienceUsers,
}: {
  initialCampaigns: AnnouncementCampaign[];
  audienceUsers: AudienceUser[];
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [mode, setMode] = useState<WorkspaceMode>("overview");
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [audiencePreview, setAudiencePreview] = useState<AudiencePreview | null>(
    null
  );

  const selectedCampaign = campaigns.find((item) => item.id === selectedId) ?? null;
  const selectedContext =
    selectedCampaign ?? (detail?.campaign.id === selectedId ? detail.campaign : null);
  const previewAnnouncement = useMemo<DashboardAnnouncement>(
    () => ({
      id: selectedId ?? "preview",
      title: form.title || "Announcement title",
      body: form.body || "Announcement body",
      priority: form.priority,
      tone: form.tone,
      displayMode: form.displayMode,
      icon: form.icon,
      ctaLabel: form.ctaLabel.trim() || null,
      ctaHref: form.ctaHref.trim() || null,
      behaviorConfig: form.behaviorConfig,
    }),
    [form, selectedId]
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return audienceUsers.slice(0, 120);
    return audienceUsers
      .filter((user) =>
        [user.email, user.fullName, user.plan, user.subscriptionStatus]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(q))
      )
      .slice(0, 120);
  }, [audienceUsers, search]);

  const filteredRecipients = useMemo(() => {
    const recipients = detail?.recipients ?? [];
    const q = analyticsSearch.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((recipient) =>
      [
        recipient.userEmail,
        recipient.userName,
        recipient.plan,
        recipient.subscriptionStatus,
        recipientActionLabel(recipient),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    );
  }, [analyticsSearch, detail?.recipients]);

  const analyticsCounts = useMemo(() => {
    const recipients = detail?.recipients ?? [];
    return {
      noAction: recipients.filter((row) => !row.firstSeenAt).length,
      viewedOnly: recipients.filter(
        (row) => row.firstSeenAt && !row.clickedAt && !row.dismissedAt && !row.acknowledgedAt
      ).length,
      clicked: recipients.filter((row) => row.clickedAt).length,
      acknowledged: recipients.filter((row) => row.acknowledgedAt).length,
    };
  }, [detail?.recipients]);

  async function refreshCampaigns() {
    const result = await apiFetch<CampaignListResponse>(
      "/api/dashboard/admin/announcements",
      { cache: "no-store" }
    );
    if (result.ok) {
      setCampaigns(result.data.campaigns);
    }
  }

  async function loadDetail(id: string) {
    const result = await apiFetch<CampaignDetail>(
      `/api/dashboard/admin/announcements/${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );
    if (result.ok) {
      setDetail(result.data);
    } else {
      setMessage(result.error.message);
    }
  }

  function startNewCampaign() {
    setSelectedId(null);
    setDetail(null);
    setForm(defaultForm());
    setAudiencePreview(null);
    setMessage(null);
    setMode("compose");
  }

  function editCampaign(campaign: AnnouncementCampaign) {
    setSelectedId(campaign.id);
    setDetail(null);
    setForm(formFromCampaign(campaign));
    setAudiencePreview(null);
    setMessage(null);
    setMode("compose");
  }

  async function openAnalytics(campaign: AnnouncementCampaign) {
    setSelectedId(campaign.id);
    setMessage(null);
    setMode("analytics");
    await loadDetail(campaign.id);
  }

  async function switchWorkspace(nextMode: WorkspaceMode) {
    if (nextMode === "overview") {
      setMode("overview");
      return;
    }

    if (nextMode === "compose") {
      if (!selectedId) {
        startNewCampaign();
        return;
      }

      const campaignToEdit =
        campaigns.find((item) => item.id === selectedId) ??
        (detail?.campaign.id === selectedId ? detail.campaign : null);

      if (campaignToEdit) {
        editCampaign(campaignToEdit);
      } else {
        setMode("compose");
      }
      return;
    }

    if (nextMode === "analytics" && selectedId) {
      setMode("analytics");
      if (detail?.campaign.id !== selectedId) {
        await loadDetail(selectedId);
      }
    }
  }

  async function saveCampaign() {
    setSaving(true);
    setMessage(null);
    const path = selectedId
      ? `/api/dashboard/admin/announcements/${encodeURIComponent(selectedId)}`
      : "/api/dashboard/admin/announcements";
    const result = await apiFetch<CampaignResponse>(path, {
      method: selectedId ? "PATCH" : "POST",
      body: payloadFromForm(form),
    });
    setSaving(false);

    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }

    setSelectedId(result.data.campaign.id);
    setForm(formFromCampaign(result.data.campaign));
    setMessage("Campaign saved.");
    await refreshCampaigns();
  }

  async function runAction(action: CampaignAction, id = selectedId) {
    if (!id) return;
    setSaving(true);
    setMessage(null);
    const result = await apiFetch<CampaignResponse>(
      `/api/dashboard/admin/announcements/${encodeURIComponent(id)}/action`,
      {
        method: "POST",
        body: { action },
      }
    );
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }
    if (selectedId === id) {
      setForm(formFromCampaign(result.data.campaign));
    }
    setMessage(`Campaign ${action === "publish" ? "published" : action + "d"}.`);
    await refreshCampaigns();
    if (mode === "analytics") await loadDetail(id);
  }

  async function deleteCampaign(id = selectedId) {
    if (!id) return;
    const campaign = campaigns.find((item) => item.id === id);
    const ok = window.confirm(
      `Delete "${campaign?.title ?? "this campaign"}" and its analytics history?`
    );
    if (!ok) return;

    setSaving(true);
    const result = await apiFetch(`/api/dashboard/admin/announcements/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error.message);
      return;
    }
    setSelectedId(null);
    setDetail(null);
    setMode("overview");
    setMessage("Campaign deleted.");
    await refreshCampaigns();
  }

  async function previewAudience() {
    setMessage(null);
    const result = await apiFetch<{ audience: AudiencePreview }>(
      "/api/dashboard/admin/announcements/audience",
      {
        method: "POST",
        body: { audienceFilter: form.audienceFilter },
      }
    );
    if (result.ok) setAudiencePreview(result.data.audience);
    else setMessage(result.error.message);
  }

  function patchForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function patchBehavior(patch: Partial<DashboardAnnouncement["behaviorConfig"]>) {
    setForm((current) => ({
      ...current,
      behaviorConfig: { ...current.behaviorConfig, ...patch },
    }));
  }

  function patchAudience(patch: Partial<AudienceFilter>) {
    setForm((current) => ({
      ...current,
      audienceFilter: { ...current.audienceFilter, ...patch },
    }));
  }

  const activeCount = campaigns.filter((campaign) =>
    ["active", "scheduled"].includes(campaign.status)
  ).length;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Platform admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Announcement campaigns
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage dashboard banners, pop-ins, audience targeting, and per-host action analytics.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/dashboard/admin/billing" />}>
            <CreditCard className="h-4 w-4" />
            Billing
          </Button>
          <Button variant="outline" render={<Link href="/dashboard/admin/activity" />}>
            <BarChart3 className="h-4 w-4" />
            Activity
          </Button>
          <Button variant="outline" onClick={() => void refreshCampaigns()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={startNewCampaign}>
            <FilePlus2 className="h-4 w-4" />
            New campaign
          </Button>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-2 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-2">
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon;
            const label =
              tab.key === "compose"
                ? selectedId
                  ? "Edit"
                  : "Create"
                : tab.label;
            return (
              <Button
                key={tab.key}
                variant={mode === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => void switchWorkspace(tab.key)}
                disabled={tab.key === "analytics" && !selectedId}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            );
          })}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto">
          {selectedContext ? (
            <span className="min-w-0 rounded-full border px-2 py-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Selected:</span>{" "}
              <span className="inline-block max-w-56 truncate align-bottom">
                {selectedContext.title}
              </span>
            </span>
          ) : (
            <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
              No campaign selected
            </span>
          )}
          <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
            {activeCount} active/scheduled
          </span>
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border bg-card px-3 py-2 text-sm">{message}</div>
      ) : null}

      {mode === "overview" ? (
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              Multiple active campaigns appear to hosts as a swipeable queue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No campaigns yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="max-w-[280px]">
                        <div className="truncate font-medium">{campaign.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {campaign.startsAt
                            ? `Starts ${formatDate(campaign.startsAt)}`
                            : `Created ${formatDate(campaign.createdAt)}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.displayMode}</TableCell>
                      <TableCell className="text-right">
                        {campaign.stats.recipientCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.stats.viewCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.stats.clickCount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => editCampaign(campaign)} aria-label="Edit campaign">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => void openAnalytics(campaign)} aria-label="View analytics">
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          {campaign.status === "active" || campaign.status === "scheduled" ? (
                            <Button variant="ghost" size="icon-sm" onClick={() => void runAction("pause", campaign.id)} aria-label="Pause campaign">
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : campaign.status === "archived" ? (
                            <Button variant="ghost" size="icon-sm" onClick={() => void runAction("unarchive", campaign.id)} aria-label="Unarchive campaign">
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon-sm" onClick={() => void runAction("publish", campaign.id)} aria-label="Publish campaign">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {campaign.status !== "archived" ? (
                            <Button variant="ghost" size="icon-sm" onClick={() => void runAction("archive", campaign.id)} aria-label="Archive campaign">
                              <Archive className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="icon-sm" onClick={() => void deleteCampaign(campaign.id)} aria-label="Delete campaign">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {mode === "compose" ? (
        <div className="space-y-5">
          <LiveDashboardPreview announcement={previewAnnouncement} />

          <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium">
                {selectedContext ? `Editing: ${selectedContext.title}` : "Creating new campaign"}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedContext?.status === "archived"
                  ? "Archived campaigns are read-only until they are unarchived."
                  : "Save changes first, then publish when the preview and audience are right."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void saveCampaign()}
                disabled={saving || selectedContext?.status === "archived"}
              >
                <Save className="h-4 w-4" />
                {selectedId ? "Save changes" : "Save draft"}
              </Button>
              {selectedId ? (
                <>
                  {selectedContext?.status === "active" || selectedContext?.status === "scheduled" ? (
                    <Button variant="outline" onClick={() => void runAction("pause")} disabled={saving}>
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  ) : selectedContext?.status === "archived" ? (
                    <Button variant="outline" onClick={() => void runAction("unarchive")} disabled={saving}>
                      <RotateCcw className="h-4 w-4" />
                      Unarchive
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => void runAction("publish")} disabled={saving}>
                      <Send className="h-4 w-4" />
                      Publish
                    </Button>
                  )}
                  {selectedContext?.status === "paused" ? (
                    <Button variant="outline" onClick={() => void runAction("resume")} disabled={saving}>
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  ) : null}
                  {selectedContext?.status !== "archived" ? (
                    <Button variant="outline" onClick={() => void runAction("archive")} disabled={saving}>
                      <Archive className="h-4 w-4" />
                      Archive
                    </Button>
                  ) : null}
                  <Button variant="destructive" onClick={() => void deleteCampaign()} disabled={saving}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                  <CardDescription>Short copy works best in banner and pop-in modes.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Field label="Title">
                    <Input value={form.title} onChange={(event) => patchForm({ title: event.target.value })} />
                  </Field>
                  <Field label="Body">
                    <Textarea value={form.body} onChange={(event) => patchForm({ body: event.target.value })} className="min-h-24" />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="CTA label">
                      <Input value={form.ctaLabel} onChange={(event) => patchForm({ ctaLabel: event.target.value })} placeholder="Open settings" />
                    </Field>
                    <Field label="CTA URL" hint="Use /dashboard paths or HTTPS URLs.">
                      <Input value={form.ctaHref} onChange={(event) => patchForm({ ctaHref: event.target.value })} placeholder="/dashboard/settings" />
                    </Field>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audience</CardTitle>
                  <CardAction>
                    <Button variant="outline" size="sm" onClick={() => void previewAudience()}>
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                  </CardAction>
                  <CardDescription>Audience is snapshotted when the campaign is published.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <SelectField
                    label="Audience mode"
                    value={form.audienceFilter.type}
                    options={["all", "selected", "plan", "subscription_status", "activity_segment"] as const}
                    onChange={(type) => patchForm({ audienceFilter: { type } })}
                  />

                  {form.audienceFilter.type === "selected" ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-8" placeholder="Search users" />
                      </div>
                      <div className="max-h-64 overflow-y-auto rounded-lg border">
                        {filteredUsers.map((user) => {
                          const checked = form.audienceFilter.userIds?.includes(user.id);
                          return (
                            <label key={user.id} className="flex cursor-pointer items-start gap-3 border-b px-3 py-2 last:border-0 hover:bg-muted/50">
                              <Checkbox checked={checked} onCheckedChange={() => patchAudience({ userIds: toggleValue(form.audienceFilter.userIds, user.id) })} />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{user.fullName || user.email}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {user.email} - {user.plan ?? "no plan"} - {user.subscriptionStatus ?? "no status"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {form.audienceFilter.type === "plan" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PLAN_OPTIONS.map((plan) => (
                        <label key={plan} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={form.audienceFilter.plans?.includes(plan)} onCheckedChange={() => patchAudience({ plans: toggleValue(form.audienceFilter.plans, plan) })} />
                          {plan}
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {form.audienceFilter.type === "subscription_status" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {STATUS_OPTIONS.map((status) => (
                        <label key={status} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={form.audienceFilter.subscriptionStatuses?.includes(status)} onCheckedChange={() => patchAudience({ subscriptionStatuses: toggleValue(form.audienceFilter.subscriptionStatuses, status) })} />
                          {status.replace(/_/g, " ")}
                        </label>
                      ))}
                    </div>
                  ) : null}

                  {form.audienceFilter.type === "activity_segment" ? (
                    <SelectField
                      label="Activity segment"
                      value={form.audienceFilter.activitySegment ?? "active_7d"}
                      options={["active_7d", "inactive_30d", "no_published_guidebook", "trial_ending_soon"] as const}
                      onChange={(activitySegment) => patchAudience({ activitySegment })}
                    />
                  ) : null}

                  {audiencePreview ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <p className="font-medium">
                        {audiencePreview.count.toLocaleString()} matching host{audiencePreview.count === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {audiencePreview.sample.map((user) => user.fullName || user.email).join(", ") || "No matching users."}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Behavior and style</CardTitle>
                  <CardDescription>Modes now change the actual delivered layout.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Priority">
                      <Input type="number" min={0} max={100} value={form.priority} onChange={(event) => patchForm({ priority: Number(event.target.value) })} />
                    </Field>
                    <SelectField label="Mode" value={form.displayMode} options={MODE_OPTIONS} onChange={(displayMode) => patchForm({ displayMode })} />
                    <SelectField label="Tone" value={form.tone} options={TONE_OPTIONS} onChange={(tone) => patchForm({ tone })} />
                    <SelectField label="Icon" value={form.icon} options={ICON_OPTIONS} onChange={(icon) => patchForm({ icon })} />
                  </div>

                  <SelectField label="Frequency" value={form.behaviorConfig.frequency} options={FREQUENCY_OPTIONS} onChange={(frequency) => patchBehavior({ frequency })} />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Starts at">
                      <Input type="datetime-local" value={form.startsAt} onChange={(event) => patchForm({ startsAt: event.target.value })} />
                    </Field>
                    <Field label="Ends at">
                      <Input type="datetime-local" value={form.endsAt} onChange={(event) => patchForm({ endsAt: event.target.value })} />
                    </Field>
                  </div>

                  <div className="grid gap-3">
                    {[
                      ["Dismissible", "dismissible"],
                      ["Pinned", "pinned"],
                      ["Require acknowledgement", "requireAcknowledgement"],
                      ["Allow snooze", "snoozeEnabled"],
                    ].map(([label, key]) => (
                      <label key={key} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <span>{label}</span>
                        <Switch
                          checked={Boolean(form.behaviorConfig[key as keyof DashboardAnnouncement["behaviorConfig"]])}
                          onCheckedChange={(checked) => patchBehavior({ [key]: checked } as Partial<DashboardAnnouncement["behaviorConfig"]>)}
                        />
                      </label>
                    ))}
                  </div>

                  {form.behaviorConfig.snoozeEnabled ? (
                    <Field label="Snooze hours">
                      <Input type="number" min={1} max={720} value={form.behaviorConfig.snoozeHours} onChange={(event) => patchBehavior({ snoozeHours: Number(event.target.value) })} />
                    </Field>
                  ) : null}

                  <Field label="Auto-hide seconds">
                    <Input
                      type="number"
                      min={3}
                      max={120}
                      value={form.behaviorConfig.autoHideSeconds ?? ""}
                      onChange={(event) => patchBehavior({ autoHideSeconds: event.target.value ? Number(event.target.value) : null })}
                      disabled={form.behaviorConfig.requireAcknowledgement || form.behaviorConfig.pinned || form.displayMode === "popin"}
                    />
                  </Field>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      {mode === "analytics" ? (
        <div className="space-y-5">
          {!detail ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Select a campaign from the Campaigns view to inspect real user actions.
              </CardContent>
            </Card>
          ) : (
            <>
              <section className="flex flex-col gap-3 rounded-lg border bg-card p-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Analytics</p>
                  <h2 className="text-xl font-semibold">{detail.campaign.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    User-level delivery, views, clicks, dismissals, snoozes, and acknowledgements.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => editCampaign(detail.campaign)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => void loadDetail(detail.campaign.id)}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <StatPill label="Recipients" value={detail.campaign.stats.recipientCount} icon={Users} />
                <StatPill label="Views" value={detail.campaign.stats.viewCount} icon={Eye} />
                <StatPill label="Clicks" value={detail.campaign.stats.clickCount} icon={MousePointerClick} />
                <StatPill label="Acknowledged" value={analyticsCounts.acknowledged} icon={CheckCircle2} />
                <StatPill label="Clicked" value={analyticsCounts.clicked} icon={MousePointerClick} />
                <StatPill label="No action" value={analyticsCounts.noAction} icon={XCircle} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                  <CardAction>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                      <Input value={analyticsSearch} onChange={(event) => setAnalyticsSearch(event.target.value)} className="w-64 pl-8" placeholder="Search users/actions" />
                    </div>
                  </CardAction>
                  <CardDescription>
                    {analyticsCounts.viewedOnly.toLocaleString()} viewed without a terminal action.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                        <TableHead>Last seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecipients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                            No matching recipients.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecipients.map((recipient) => (
                          <TableRow key={recipient.id}>
                            <TableCell className="max-w-[280px]">
                              <div className="truncate font-medium">{recipient.userName || recipient.userEmail || recipient.userId}</div>
                              {recipient.userEmail ? (
                                <a
                                  href={`mailto:${recipient.userEmail}`}
                                  className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                                >
                                  {recipient.userEmail}
                                </a>
                              ) : (
                                <div className="truncate text-xs text-muted-foreground">
                                  {recipient.userId}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {recipient.plan ?? "none"}
                              {recipient.subscriptionStatus ? ` / ${recipient.subscriptionStatus}` : ""}
                            </TableCell>
                            <TableCell>
                              <Badge variant={recipientActionLabel(recipient) === "No action" ? "outline" : "secondary"}>
                                {recipientActionLabel(recipient)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{recipient.viewCount}</TableCell>
                            <TableCell className="text-right">{recipient.clickCount}</TableCell>
                            <TableCell>{formatMaybeDate(recipient.lastSeenAt)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent events</CardTitle>
                  <CardDescription>Latest 50 immutable interaction events.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Event</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.recentEvents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                            No events yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        detail.recentEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>{formatDate(event.createdAt)}</TableCell>
                            <TableCell className="max-w-[280px] truncate">
                              {event.userEmail ? (
                                <a
                                  href={`mailto:${event.userEmail}`}
                                  className="hover:text-foreground hover:underline"
                                >
                                  {event.userName || event.userEmail}
                                </a>
                              ) : (
                                event.userName || event.userId
                              )}
                            </TableCell>
                            <TableCell>{event.eventType.replace(/_/g, " ")}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
