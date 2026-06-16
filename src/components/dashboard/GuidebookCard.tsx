"use client";

import { useState } from "react";
import Link from "next/link";
import { absoluteUrl, cn, formatDate, getInitials } from "@/lib/utils";
import { withHostPreviewParam } from "@/lib/analytics/host-preview";
import { guidebookPublicPath } from "@/lib/guidebook-public-url";
import {
  GUIDEBOOK_RENAME_MENU_LABEL,
  guidebookRenameSettingsHref,
} from "@/lib/guidebook-settings-links";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Braces,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Link2,
  Loader2,
  Lock,
  MoreVertical,
  Pencil,
  Settings,
  Share2,
  Trash2,
  TriangleAlert,
  Users,
} from "lucide-react";

export interface GuidebookData {
  id: string;
  title: string;
  slug: string;
  status: string;
  accessRole?: "owner" | "editor";
  templateId: string;
  publishedAt: string | null;
  latestPublicationId: string | null;
  createdAt: string;
  updatedAt: string;
  settings?: Record<string, unknown>;
  property: { id: string; name: string } | null;
  viewCount?: number;
  branding?: {
    logo_url?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
  } | null;
  heroData?: {
    property?: {
      tagline?: string | null;
      cover_image_url?: string | null;
      logo_url?: string | null;
    } | null;
  } | null;
}

interface GuidebookCardProps {
  guidebook: GuidebookData;
  onDelete: (id: string) => void;
  onDuplicate: (guidebook: GuidebookData) => void;
  onPublish: (guidebook: GuidebookData) => Promise<void> | void;
  onUnpublish: (guidebook: GuidebookData) => Promise<void> | void;
  onOpenQuickVariables: (guidebook: GuidebookData) => void;
}

export function GuidebookCard({
  guidebook,
  onDelete,
  onDuplicate,
  onPublish,
  onUnpublish,
  onOpenQuickVariables,
}: GuidebookCardProps) {
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);

  const isPublished = guidebook.status === "published";
  const isShared = guidebook.accessRole === "editor";
  const isLive = isPublished;
  const hasUnpublishedChanges =
    isPublished &&
    guidebook.publishedAt !== null &&
    new Date(guidebook.updatedAt).getTime() >
      new Date(guidebook.publishedAt).getTime();

  const editorHref = `/dashboard/guidebooks/${guidebook.id}/editor`;
  const overviewHref = `/dashboard/guidebooks/${guidebook.id}`;
  const renameHref = guidebookRenameSettingsHref(guidebook.id);
  const liveHref = guidebookPublicPath(guidebook.slug, guidebook.settings ?? {});
  const hostPreviewHref = withHostPreviewParam(liveHref);

  const hero = guidebook.heroData?.property;
  const cover = hero?.cover_image_url ?? null;
  const logo = hero?.logo_url ?? guidebook.branding?.logo_url ?? null;
  const tagline = hero?.tagline?.trim() || null;
  const propertyLabel = guidebook.property?.name ?? tagline ?? "No property linked";

  const primary = guidebook.branding?.primary_color || "#0f7d76";
  const coverWash = `linear-gradient(135deg, color-mix(in oklab, ${primary} 9%, white) 0%, color-mix(in oklab, ${primary} 20%, white) 100%)`;
  const logoTintBg = `color-mix(in oklab, ${primary} 16%, white)`;
  const logoTintFg = `color-mix(in oklab, ${primary} 70%, black 30%)`;
  const pillTone = cover
    ? "bg-black/45 text-white"
    : "bg-background/75 text-foreground ring-1 ring-foreground/10";

  const status = isPublished
    ? {
        label: "Published",
        dot: "bg-emerald-500",
      }
    : {
        label: "Draft",
        dot: "bg-slate-400",
      };
  const publishLabel = !isPublished
    ? "Publish"
    : hasUnpublishedChanges
      ? "Publish changes"
      : "Published";

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl(liveHref));
      setCopied(true);
      toast.success("Shareable link copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy - open the live page to share it");
    }
  }

  async function handlePublishClick() {
    if (isShared) return;

    setPublishing(true);
    try {
      await onPublish(guidebook);
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublishClick() {
    if (isShared || !isPublished) return;

    setUnpublishing(true);
    try {
      await onUnpublish(guidebook);
    } finally {
      setUnpublishing(false);
    }
  }

  return (
    <Card
      className={cn(
        "group/gb gap-0 overflow-hidden p-0 ring-foreground/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-foreground/20",
        isShared && "ring-primary/25 hover:ring-primary/35"
      )}
    >
      <div className="relative h-28 w-full overflow-hidden">
        <Link
          href={editorHref}
          aria-label={`Edit ${guidebook.title}`}
          className="absolute inset-0 block"
        >
          {cover ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover/gb:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
            </>
          ) : (
            <div className="relative h-full w-full" style={{ background: coverWash }}>
              <div className="absolute inset-0 text-foreground/[0.05] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:13px_13px]" />
            </div>
          )}
        </Link>

        <span
          className={cn(
            "pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-md",
            pillTone
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>

        {isShared ? (
          <span
            className={cn(
              "pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm backdrop-blur-md",
              pillTone
            )}
          >
            <Users className="h-3 w-3" />
            Shared
          </span>
        ) : null}

        {isPublished ? (
          <span
            className={cn(
              "pointer-events-none absolute right-3 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm backdrop-blur-md",
              isShared ? "bottom-3" : "top-3",
              pillTone
            )}
          >
            <Eye className="h-3 w-3" />
            <span className="tabular-nums">
              {(guidebook.viewCount ?? 0).toLocaleString()}
            </span>
          </span>
        ) : null}
      </div>

      <div className="relative px-4 pb-3 pt-9">
        <div className="absolute -top-6 left-4 z-10 flex size-12 items-center justify-center overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-sm font-semibold"
              style={{ backgroundColor: logoTintBg, color: logoTintFg }}
            >
              {getInitials(guidebook.property?.name ?? guidebook.title)}
            </span>
          )}
        </div>

        <Link
          href={editorHref}
          className="font-heading line-clamp-1 text-base font-medium transition-colors hover:text-primary"
        >
          {guidebook.title}
        </Link>

        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{propertyLabel}</span>
        </p>

        {hasUnpublishedChanges ? (
          <p className="mt-3 flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>This guide is live, but saved changes have not been published yet.</span>
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button className="w-full" render={<Link href={editorHref} />}>
            <Pencil className="h-4 w-4" />
            Open editor
          </Button>
          <Button
            variant="outline"
            className="w-full"
            render={<Link href={overviewHref} />}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>

        {isLive ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className={cn(
                "w-full text-muted-foreground hover:text-foreground",
                copied && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
              render={
                <Link href={hostPreviewHref} target="_blank" rel="noopener" />
              }
            >
              <ExternalLink className="h-4 w-4" />
              View live
            </Button>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
          <span className="truncate text-xs text-muted-foreground">
            Updated {formatDate(guidebook.updatedAt)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  title="More actions"
                  aria-label="More guidebook actions"
                />
              }
            >
              <MoreVertical className="h-4 w-4" />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {!isShared ? (
                <>
                  <DropdownMenuItem onClick={() => onDuplicate(guidebook)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  {!isPublished || hasUnpublishedChanges ? (
                    <DropdownMenuItem
                      disabled={publishing}
                      onClick={() => void handlePublishClick()}
                    >
                      {publishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Globe className="mr-2 h-4 w-4" />
                      )}
                      {publishLabel}
                    </DropdownMenuItem>
                  ) : null}
                  {isPublished ? (
                    <DropdownMenuItem
                      disabled={publishing || unpublishing}
                      onClick={() => void handleUnpublishClick()}
                      className="text-destructive focus:text-destructive"
                    >
                      {unpublishing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <EyeOff className="mr-2 h-4 w-4" />
                      )}
                      Unpublish
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onClick={() => onOpenQuickVariables(guidebook)}>
                <Braces className="mr-2 h-4 w-4" />
                Quick Variables
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={renameHref} />}>
                <Pencil className="mr-2 h-4 w-4" />
                {GUIDEBOOK_RENAME_MENU_LABEL}
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`${overviewHref}#sharing`} />}>
                <Share2 className="mr-2 h-4 w-4" />
                Sharing and QR
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={`${overviewHref}#access`} />}>
                <Lock className="mr-2 h-4 w-4" />
                Access
              </DropdownMenuItem>
              {!isShared ? (
                <>
                  <DropdownMenuItem
                    render={<Link href={`${overviewHref}#publishing`} />}
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Publishing
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href={`${overviewHref}#collaborators`} />}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Collaborators
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`${overviewHref}#domains`} />}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Domains
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(guidebook.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
