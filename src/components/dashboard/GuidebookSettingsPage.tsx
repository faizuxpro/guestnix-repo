"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Braces,
  Check,
  Copy,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Printer,
  Save,
  Share2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { QrCodeCard } from "@/components/dashboard/QrCodeCard";
import { GuidebookCollaboratorsManager } from "@/components/dashboard/GuidebookCollaboratorsManager";
import { CustomDomainsManager } from "@/components/dashboard/CustomDomainsManager";
import { QuickVariablesManager } from "@/components/dashboard/QuickVariablesManager";
import { useDashboardPageTitle } from "@/components/dashboard/DashboardPageTitle";
import { useFeedbackDialog } from "@/components/ui/feedback-dialog";
import { apiFetch } from "@/lib/api-fetch";
import { withHostPreviewParam } from "@/lib/analytics/host-preview";
import { toastApiError } from "@/lib/toast-error";
import { cn, slugify } from "@/lib/utils";

type GuidebookSettingsModel = {
  id: string;
  title: string;
  slug: string;
  status: string;
  accessRole: "owner" | "editor";
  settings: Record<string, unknown>;
  publishedAt: string | null;
  updatedAt: string;
};

type PatchGuidebookResponse = {
  title: string;
  slug: string;
  settings: Record<string, unknown>;
  status: string;
  publishedAt: string | null;
  updatedAt: string;
};

type Props = {
  guidebook: GuidebookSettingsModel;
  publicUrlBase: string;
  customDomainUrl?: string | null;
  isPlatformAdmin?: boolean;
};

type SectionId =
  | "guidebook"
  | "sharing"
  | "access"
  | "quick_variables"
  | "publishing"
  | "print"
  | "collaborators"
  | "domains"
  | "danger";

type Accent = {
  bg: string;
  color: string;
};

type NavItem = {
  id: SectionId;
  label: string;
  icon: ElementType;
  accent: Accent;
  ownerOnly?: boolean;
};

const ACCENTS: Record<SectionId, Accent> = {
  guidebook: { bg: "#EEF4FF", color: "#4D7CFF" },
  sharing: { bg: "#FFF8E8", color: "#FFB020" },
  access: { bg: "#ECFFF5", color: "#1FBF8F" },
  quick_variables: { bg: "#F7F2FF", color: "#8B5CF6" },
  publishing: { bg: "#FFF3EE", color: "#FF6B3D" },
  print: { bg: "#EFFCF8", color: "#167A62" },
  collaborators: { bg: "#F3F0FF", color: "#7C5CFF" },
  domains: { bg: "#F4F7F8", color: "#6B7C85" },
  danger: { bg: "#FFF1F5", color: "#FF4D7D" },
};

function asBool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function hasStoredGuidebookPassword(settings: Record<string, unknown>) {
  if (settings.password_configured === true) return true;
  const hash = settings.password_hash;
  const password = settings.password;
  return (
    (typeof hash === "string" && hash.length > 0) ||
    (typeof password === "string" && password.length > 0)
  );
}

function SectionShell({
  id,
  icon,
  title,
  kicker,
  accent,
  action,
  children,
  className,
}: {
  id: SectionId;
  icon: ReactNode;
  title: string;
  kicker?: string;
  accent: Accent;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const style = {
    "--section-bg": accent.bg,
    "--section-color": accent.color,
    borderColor: `${accent.color}33`,
    boxShadow: `0 18px 42px ${accent.color}10`,
  } as CSSProperties;

  return (
    <section
      id={id}
      data-guidebook-settings-section
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-lg border bg-background",
        className
      )}
      style={style}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[linear-gradient(90deg,var(--section-bg),transparent_72%)] px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-[var(--section-color)] shadow-sm ring-1 ring-black/5">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight">{title}</h2>
            {kicker ? (
              <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                {kicker}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4 md:p-5">
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

export function GuidebookSettingsPage({
  guidebook,
  publicUrlBase,
  customDomainUrl = null,
  isPlatformAdmin: canManageDemoSettings = false,
}: Props) {
  const router = useRouter();
  const { requestConfirmation } = useFeedbackDialog();
  const isOwner = guidebook.accessRole === "owner";

  const [savedTitle, setSavedTitle] = useState(guidebook.title);
  const [savedSlug, setSavedSlug] = useState(guidebook.slug);
  const [title, setTitle] = useState(guidebook.title);
  const [slug, setSlug] = useState(guidebook.slug);
  const [status, setStatus] = useState(guidebook.status);
  const [publishedAt, setPublishedAt] = useState(guidebook.publishedAt);
  const [updatedAt, setUpdatedAt] = useState(guidebook.updatedAt);

  const [passwordProtected, setPasswordProtected] = useState(
    asBool(guidebook.settings.password_protected)
  );
  const [savedPasswordProtected, setSavedPasswordProtected] = useState(
    asBool(guidebook.settings.password_protected)
  );
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState("");
  const [passwordConfigured, setPasswordConfigured] = useState(
    hasStoredGuidebookPassword(guidebook.settings)
  );
  const [demoEnabled, setDemoEnabled] = useState(
    asBool(guidebook.settings.demo_enabled)
  );
  const [savedDemoEnabled, setSavedDemoEnabled] = useState(
    asBool(guidebook.settings.demo_enabled)
  );

  const [detailsSaving, setDetailsSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [demoSaving, setDemoSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("guidebook");
  const [hoveredSection, setHoveredSection] = useState<SectionId | null>(null);

  const publicUrlOrigin = publicUrlBase.replace(/\/(?:g|demo)$/, "");
  const savedPublicUrlBase = `${publicUrlOrigin}${savedDemoEnabled ? "/demo" : "/g"}`;
  const draftPublicUrlBase = `${publicUrlOrigin}${demoEnabled ? "/demo" : "/g"}`;
  const savedPublicUrl = `${savedPublicUrlBase}/${savedSlug}`;
  const draftPublicUrl = `${draftPublicUrlBase}/${slug || "..."}`;
  const primaryShareUrl = customDomainUrl ?? savedPublicUrl;
  const savedHostPreviewUrl = withHostPreviewParam(primaryShareUrl);
  const printPreviewUrl = `/dashboard/guidebooks/${guidebook.id}/print`;
  const isPublished = status === "published";
  const hasUnpublishedChanges =
    isPublished &&
    publishedAt !== null &&
    new Date(updatedAt).getTime() > new Date(publishedAt).getTime();
  const publishButtonLabel = !isPublished
    ? "Publish"
    : hasUnpublishedChanges
      ? "Publish changes"
      : "Published";
  const publishButtonDisabled =
    publishing || (isPublished && !hasUnpublishedChanges);

  const detailsDirty =
    title.trim() !== savedTitle || (isOwner && slug !== savedSlug);
  const accessDirty =
    passwordProtected !== savedPasswordProtected || password !== savedPassword;
  const demoDirty = demoEnabled !== savedDemoEnabled;
  const dashboardPageTitle = useMemo(
    () => ({
      title: savedTitle || "Untitled guidebook",
      subtitle: "Guidebook settings",
    }),
    [savedTitle]
  );

  useDashboardPageTitle(dashboardPageTitle);

  const navItems = useMemo<NavItem[]>(
    () =>
      [
        {
          id: "guidebook" as const,
          label: "Guidebook",
          icon: BookOpen,
          accent: ACCENTS.guidebook,
        },
        {
          id: "sharing" as const,
          label: "Sharing",
          icon: Share2,
          accent: ACCENTS.sharing,
        },
        {
          id: "access" as const,
          label: "Access",
          icon: Lock,
          accent: ACCENTS.access,
        },
        {
          id: "quick_variables" as const,
          label: "Quick Variables",
          icon: Braces,
          accent: ACCENTS.quick_variables,
        },
        {
          id: "publishing" as const,
          label: "Publishing",
          icon: Globe,
          accent: ACCENTS.publishing,
          ownerOnly: true,
        },
        {
          id: "print" as const,
          label: "Print",
          icon: Printer,
          accent: ACCENTS.print,
          ownerOnly: true,
        },
        {
          id: "collaborators" as const,
          label: "Collaborators",
          icon: UserPlus,
          accent: ACCENTS.collaborators,
          ownerOnly: true,
        },
        {
          id: "domains" as const,
          label: "Domains",
          icon: Globe,
          accent: ACCENTS.domains,
          ownerOnly: true,
        },
        {
          id: "danger" as const,
          label: "Danger",
          icon: Trash2,
          accent: ACCENTS.danger,
          ownerOnly: true,
        },
      ].filter((item) => isOwner || !item.ownerOnly),
    [isOwner]
  );
  const visualSection = hoveredSection ?? activeSection;

  useEffect(() => {
    const observers = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => section !== null);
    if (observers.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveSection(visible.target.id as SectionId);
        }
      },
      {
        rootMargin: "-22% 0px -58% 0px",
        threshold: [0.08, 0.25, 0.55],
      }
    );

    observers.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [navItems]);

  async function saveDetails() {
    const nextTitle = title.trim();
    const nextSlug = slugify(slug);
    if (!nextTitle) {
      toast.error("Guidebook title is required");
      return;
    }
    if (isOwner && !nextSlug) {
      toast.error("URL slug is required");
      return;
    }

    setDetailsSaving(true);
    const result = await apiFetch<PatchGuidebookResponse>(
      `/api/guidebooks/${guidebook.id}`,
      {
        method: "PATCH",
        body: {
          title: nextTitle,
          ...(isOwner ? { slug: nextSlug } : {}),
        },
      }
    );
    setDetailsSaving(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't save guidebook details",
        onRetry: () => void saveDetails(),
      });
      return;
    }

    setSavedTitle(result.data.title);
    setTitle(result.data.title);
    setSavedSlug(result.data.slug);
    setSlug(result.data.slug);
    setUpdatedAt(result.data.updatedAt);
    toast.success("Guidebook details saved");
  }

  async function saveAccess() {
    if (!isOwner) return;
    if (passwordProtected && !passwordConfigured && !password.trim()) {
      toast.error("Set a password before enabling password protection");
      return;
    }

    setAccessSaving(true);
    const result = await apiFetch<PatchGuidebookResponse>(
      `/api/guidebooks/${guidebook.id}`,
      {
        method: "PATCH",
        body: {
          settings: {
            password_protected: passwordProtected,
            password: passwordProtected ? password : null,
          },
        },
      }
    );
    setAccessSaving(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't save access settings",
        onRetry: () => void saveAccess(),
      });
      return;
    }

    const nextSettings = result.data.settings ?? {};
    setPasswordProtected(asBool(nextSettings.password_protected));
    setSavedPasswordProtected(asBool(nextSettings.password_protected));
    setPassword("");
    setSavedPassword("");
    setPasswordConfigured(hasStoredGuidebookPassword(nextSettings));
    setUpdatedAt(result.data.updatedAt);
    toast.success("Access settings saved");
  }

  async function saveDemoSetting() {
    if (!canManageDemoSettings || !isOwner) return;

    setDemoSaving(true);
    const result = await apiFetch<PatchGuidebookResponse>(
      `/api/guidebooks/${guidebook.id}`,
      {
        method: "PATCH",
        body: {
          settings: {
            demo_enabled: demoEnabled,
          },
        },
      }
    );
    setDemoSaving(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't save demo setting",
        onRetry: () => void saveDemoSetting(),
      });
      return;
    }

    const nextEnabled = asBool(result.data.settings?.demo_enabled);
    setDemoEnabled(nextEnabled);
    setSavedDemoEnabled(nextEnabled);
    setUpdatedAt(result.data.updatedAt);
    toast.success(nextEnabled ? "Demo URL enabled" : "Demo URL disabled");
  }

  async function publishGuidebook() {
    if (!isOwner) return;
    if (isPublished && !hasUnpublishedChanges) return;

    setPublishing(true);
    const result = await apiFetch<{
      success: true;
      version?: number;
      publishedAt?: string;
    }>(`/api/guidebooks/${guidebook.id}/publish`, { method: "POST" });
    setPublishing(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't publish guidebook",
        onRetry: () => void publishGuidebook(),
      });
      return;
    }

    const nextPublishedAt = result.data.publishedAt ?? new Date().toISOString();
    setStatus("published");
    setPublishedAt(nextPublishedAt);
    setUpdatedAt(nextPublishedAt);
    toast.success(
      result.data.version ? `Published v${result.data.version}` : "Published"
    );
    router.refresh();
  }

  async function unpublishGuidebook() {
    if (!isOwner) return;

    const confirmed = await requestConfirmation({
      title: "Unpublish this guidebook?",
      description:
        "Guests will no longer be able to open the guidebook link until it is published again.",
      confirmLabel: "Unpublish",
      tone: "warning",
      busyLabel: "Unpublishing...",
    });
    if (!confirmed) return;

    setPublishing(true);
    const result = await apiFetch(`/api/guidebooks/${guidebook.id}/unpublish`, {
      method: "POST",
    });
    setPublishing(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't unpublish guidebook",
        onRetry: () => void unpublishGuidebook(),
      });
      return;
    }

    const now = new Date().toISOString();
    setStatus("draft");
    setPublishedAt(null);
    setUpdatedAt(now);
    toast.success("Guidebook unpublished");
    router.refresh();
  }

  async function deleteGuidebook() {
    if (!isOwner) return;

    const confirmed = await requestConfirmation({
      title: `Delete "${savedTitle}"?`,
      description:
        "This permanently removes the guidebook, sections, blocks, places, and analytics.",
      confirmLabel: "Delete guidebook",
      tone: "danger",
      busyLabel: "Deleting...",
    });
    if (!confirmed) return;

    setDeleting(true);
    const result = await apiFetch(`/api/guidebooks/${guidebook.id}`, {
      method: "DELETE",
      parseJson: false,
    });
    setDeleting(false);

    if (!result.ok) {
      toastApiError(result.error, {
        title: "Couldn't delete guidebook",
        onRetry: () => void deleteGuidebook(),
      });
      return;
    }

    toast.success("Guidebook deleted");
    router.push("/dashboard/guidebooks");
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(primaryShareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast.success(
        customDomainUrl ? "Custom domain link copied" : "Guidebook link copied"
      );
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/dashboard/guidebooks" />}
        >
          <ArrowLeft className="h-4 w-4" />
          All guidebooks
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/dashboard/guidebooks/${guidebook.id}/editor`} />}
          >
            <BookOpen className="h-4 w-4" />
            Open editor
          </Button>
          {isPublished ? (
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={savedHostPreviewUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
            >
              <ExternalLink className="h-4 w-4" />
              View live
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border bg-background shadow-sm">
        <div className="flex flex-col gap-4 bg-[linear-gradient(135deg,var(--muted),transparent_68%)] p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-background/80 text-muted-foreground"
                >
                  Current guidebook
                </Badge>
                <Badge variant={isPublished ? "default" : "secondary"}>
                  {isPublished ? "Published" : "Draft"}
                </Badge>
                {hasUnpublishedChanges ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  >
                    Unpublished changes
                  </Badge>
                ) : null}
                {!isOwner ? <Badge variant="outline">Shared editor</Badge> : null}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Guidebook settings
                </p>
                <h1 className="mt-1 break-words text-2xl font-bold tracking-tight md:text-3xl">
                  {savedTitle || "Untitled guidebook"}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{savedSlug || "no-slug"}</span>
                </span>
                <span className="break-all">{primaryShareUrl}</span>
                {customDomainUrl ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  >
                    Custom domain primary
                  </Badge>
                ) : null}
              </div>
              {customDomainUrl ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Guestnix app link also exists:</span>
                  <span className="break-all">{savedPublicUrl}</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void copyLink()}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied
                  ? "Copied"
                  : customDomainUrl
                    ? "Copy custom link"
                    : "Copy link"}
              </Button>
              {isOwner ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void publishGuidebook()}
                  disabled={publishButtonDisabled}
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  {publishButtonLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 border-y bg-background/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6 lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = visualSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors",
                  active
                    ? "border-transparent"
                    : "border-border bg-background text-muted-foreground"
                )}
                style={
                  active
                    ? ({
                        backgroundColor: item.accent.bg,
                        color: item.accent.color,
                      } as CSSProperties)
                    : undefined
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </a>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <div className="sticky top-6 rounded-lg border bg-background p-2 shadow-sm">
            <div className="mb-2 rounded-md bg-muted/55 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                This guidebook
              </div>
              <div className="mt-0.5 truncate text-xs font-medium">
                {savedTitle || "Untitled guidebook"}
              </div>
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.id;
                const tracked = visualSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onMouseEnter={() => setHoveredSection(item.id)}
                    onMouseLeave={() => setHoveredSection(null)}
                    onFocus={() => setHoveredSection(item.id)}
                    onBlur={() => setHoveredSection(null)}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "group relative flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-all",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    style={
                      tracked
                        ? ({
                            backgroundColor: item.accent.bg,
                            color: item.accent.color,
                          } as CSSProperties)
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "absolute inset-y-1 left-0 w-0.5 rounded-full opacity-0 transition-opacity",
                        tracked && "opacity-100"
                      )}
                      style={{ backgroundColor: item.accent.color }}
                    />
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                      style={
                        tracked
                          ? {
                              backgroundColor: "#ffffff",
                              color: item.accent.color,
                            }
                          : undefined
                      }
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="space-y-4">
          <SectionShell
            id="guidebook"
            icon={<BookOpen className="h-4 w-4" />}
            title="Guidebook"
            kicker={detailsDirty ? "Unsaved changes" : savedTitle}
            accent={ACCENTS.guidebook}
            action={
              <Button
                type="button"
                size="sm"
                onClick={() => void saveDetails()}
                disabled={detailsSaving || !detailsDirty}
              >
                {detailsSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="guidebook-title">Title</Label>
                <Input
                  id="guidebook-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                />
              </div>
            </div>
          </SectionShell>

          <SectionShell
            id="sharing"
            icon={<Share2 className="h-4 w-4" />}
            title="Sharing"
            kicker={savedSlug}
            accent={ACCENTS.sharing}
            action={
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void copyLink()}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied" : customDomainUrl ? "Copy custom" : "Copy"}
              </Button>
            }
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="guidebook-slug">URL slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-md border bg-muted px-2 py-2 text-xs text-muted-foreground">
                      {demoEnabled ? "/demo/" : "/g/"}
                    </span>
                    <Input
                      id="guidebook-slug"
                      value={slug}
                      onChange={(event) => setSlug(slugify(event.target.value))}
                      disabled={!isOwner}
                      maxLength={80}
                    />
                  </div>
                  <p className="break-all text-xs text-muted-foreground">
                    {detailsDirty ? draftPublicUrl : savedPublicUrl}
                  </p>
                  {!isOwner ? (
                    <p className="text-xs text-muted-foreground">
                      Only the guidebook owner can change the URL slug.
                    </p>
                  ) : null}
                </div>

                {canManageDemoSettings && isOwner ? (
                  <div className="rounded-md border bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label htmlFor="demo-guidebook" className="text-sm">
                          Demo guidebook URL
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Serve this guidebook at /demo/{savedSlug || "slug"} and show the demo badge.
                        </p>
                      </div>
                      <Switch
                        id="demo-guidebook"
                        checked={demoEnabled}
                        onCheckedChange={setDemoEnabled}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge variant={demoEnabled ? "default" : "secondary"}>
                        {demoEnabled ? "Demo URL on" : "Demo URL off"}
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void saveDemoSetting()}
                        disabled={demoSaving || !demoDirty}
                      >
                        {demoSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save demo setting
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {isPublished ? (
                    <Button
                      type="button"
                      variant="outline"
                      render={
                        <a
                          href={savedHostPreviewUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        />
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                      View live
                    </Button>
                  ) : null}
                  {isOwner ? (
                    <Button
                      type="button"
                      onClick={() => void saveDetails()}
                      disabled={detailsSaving || !detailsDirty}
                    >
                      {detailsSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save URL
                    </Button>
                  ) : null}
                </div>
              </div>
              <QrCodeCard
                url={primaryShareUrl}
                urlLabel={customDomainUrl ? "Custom domain" : "Guestnix app link"}
                secondaryUrl={customDomainUrl ? savedPublicUrl : undefined}
                secondaryUrlLabel="Guestnix app link"
              />
            </div>
          </SectionShell>

          <SectionShell
            id="access"
            icon={<Lock className="h-4 w-4" />}
            title="Access"
            kicker={passwordProtected ? "Password on" : "Password off"}
            accent={ACCENTS.access}
            action={
              isOwner ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveAccess()}
                  disabled={accessSaving || !accessDirty}
                >
                  {accessSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  Save
                </Button>
              ) : null
            }
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="password-protected" className="text-sm">
                    Password protection
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Guests enter a password before viewing the guidebook.
                  </p>
                </div>
                <Switch
                  id="password-protected"
                  checked={passwordProtected}
                  disabled={!isOwner}
                  onCheckedChange={setPasswordProtected}
                />
              </div>

              {passwordProtected ? (
                <div className="grid gap-2">
                  <Label htmlFor="guidebook-password">Password</Label>
                  <Input
                    id="guidebook-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={!isOwner}
                    maxLength={100}
                    placeholder={
                      passwordConfigured
                        ? "Leave blank to keep current password"
                        : "Set a guest password"
                    }
                    autoComplete="new-password"
                  />
                  {passwordConfigured ? (
                    <p className="text-xs text-muted-foreground">
                      A password is already configured. Enter a new one only if
                      you want to change it.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!isOwner ? (
                <p className="text-xs text-muted-foreground">
                  Only the guidebook owner can change access settings.
                </p>
              ) : null}
            </div>
          </SectionShell>

          <SectionShell
            id="quick_variables"
            icon={<Braces className="h-4 w-4" />}
            title="Quick Variables"
            kicker="Fast-changing guest details"
            accent={ACCENTS.quick_variables}
          >
            <QuickVariablesManager
              guidebookId={guidebook.id}
              accessRole={guidebook.accessRole}
              initialSettings={guidebook.settings}
              initialStatus={guidebook.status}
            />
          </SectionShell>

          {isOwner ? (
            <SectionShell
              id="publishing"
              icon={<Globe className="h-4 w-4" />}
              title="Publishing"
              kicker={
                isPublished
                  ? hasUnpublishedChanges
                    ? "Changes ready"
                    : "Live"
                  : "Draft"
              }
              accent={ACCENTS.publishing}
              action={
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void publishGuidebook()}
                  disabled={publishButtonDisabled}
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                  {publishButtonLabel}
                </Button>
              }
            >
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {isPublished ? "Guidebook is published" : "Guidebook is a draft"}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isPublished
                          ? hasUnpublishedChanges
                            ? "Saved changes are waiting to be published."
                            : "Guests can open the guidebook link."
                          : "Publish when you are ready for guests to view it."}
                      </p>
                    </div>
                    <Badge variant={isPublished ? "default" : "secondary"}>
                      {isPublished
                        ? hasUnpublishedChanges
                          ? "Changes saved"
                          : "Live"
                        : "Draft"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isPublished ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void unpublishGuidebook()}
                      disabled={publishing}
                    >
                      Unpublish
                    </Button>
                  ) : null}
                </div>
              </div>
            </SectionShell>
          ) : null}

          {isOwner ? (
            <SectionShell
              id="print"
              icon={<Printer className="h-4 w-4" />}
              title="Print"
              kicker={isPublished ? "Published snapshot" : "Publish required"}
              accent={ACCENTS.print}
              action={
                isPublished ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    render={<Link href={printPreviewUrl} />}
                  >
                    <Printer className="h-4 w-4" />
                    Open preview
                  </Button>
                ) : null
              }
            >
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {isPublished
                          ? "Print template is ready"
                          : "Publish to create a print version"}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isPublished
                          ? hasUnpublishedChanges
                            ? "The print preview uses the last published version."
                            : "The print preview uses the current live guidebook."
                          : "The print template is generated from a published guidebook snapshot."}
                      </p>
                    </div>
                    <Badge variant={isPublished ? "default" : "secondary"}>
                      {isPublished ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={!isPublished}
                    render={isPublished ? <Link href={printPreviewUrl} /> : undefined}
                  >
                    <Printer className="h-4 w-4" />
                    Open print preview
                  </Button>
                  {hasUnpublishedChanges ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void publishGuidebook()}
                      disabled={publishing}
                    >
                      {publishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Globe className="h-4 w-4" />
                      )}
                      Publish changes
                    </Button>
                  ) : null}
                </div>
              </div>
            </SectionShell>
          ) : null}

          {isOwner ? (
            <SectionShell
              id="collaborators"
              icon={<UserPlus className="h-4 w-4" />}
              title="Collaborators"
              kicker="Editors and ownership"
              accent={ACCENTS.collaborators}
            >
              <GuidebookCollaboratorsManager guidebookId={guidebook.id} />
            </SectionShell>
          ) : null}

          {isOwner ? (
            <SectionShell
              id="domains"
              icon={<Globe className="h-4 w-4" />}
              title="Domains"
              kicker="Custom URLs"
              accent={ACCENTS.domains}
            >
              <CustomDomainsManager
                guidebookId={guidebook.id}
                guidebookSlug={savedSlug}
              />
            </SectionShell>
          ) : null}

          {isOwner ? (
            <SectionShell
              id="danger"
              icon={<Trash2 className="h-4 w-4" />}
              title="Danger"
              kicker="Permanent action"
              accent={ACCENTS.danger}
              action={
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void deleteGuidebook()}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
              }
              className="border-destructive/30"
            >
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Delete guidebook</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This removes the guidebook and its related data.
                  </p>
                </div>
                <Separator />
                <p className="text-xs font-medium text-destructive">
                  Use Delete in the section header when you are sure.
                </p>
              </div>
            </SectionShell>
          ) : null}
        </div>
      </div>
    </div>
  );
}
