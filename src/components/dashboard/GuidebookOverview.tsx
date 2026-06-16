"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCodeCard } from "./QrCodeCard";
import { Pencil, ExternalLink, Share2, Globe } from "lucide-react";
import { GuidebookCollaboratorsManager } from "./GuidebookCollaboratorsManager";
import { withHostPreviewParam } from "@/lib/analytics/host-preview";

type Props = {
  guidebook: {
    id: string;
    title: string;
    slug: string;
    status: string;
    accessRole: "owner" | "editor";
  };
  publicUrl: string;
  stats?: {
    views7d: number;
    chats: number;
    shares: number;
  };
};

export function GuidebookOverview({ guidebook, publicUrl, stats }: Props) {
  const isPublished = guidebook.status === "published";
  const isOwner = guidebook.accessRole === "owner";
  const hostPreviewUrl = withHostPreviewParam(publicUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{guidebook.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${isPublished ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
              aria-hidden
            />
            <span>{isPublished ? "Published" : "Draft"}</span>
            {!isOwner && <Badge variant="outline">Shared editor</Badge>}
            <span>•</span>
            <code className="text-xs">{publicUrl}</code>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            render={
              <Link href={`/dashboard/guidebooks/${guidebook.id}/editor`} />
            }
          >
            <Pencil className="mr-1 h-4 w-4" /> Edit guidebook
          </Button>
          <Button
            variant="outline"
            render={
              <a
                href={hostPreviewUrl}
                target="_blank"
                rel="noreferrer noopener"
              />
            }
          >
            <ExternalLink className="mr-1 h-4 w-4" /> View live
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(publicUrl);
            }}
          >
            <Share2 className="mr-1 h-4 w-4" /> Copy share link
          </Button>
          {isOwner ? (
            <Button
              variant="outline"
              render={
                <Link href={`/dashboard/guidebooks/${guidebook.id}/domains`} />
              }
            >
              <Globe className="mr-1 h-4 w-4" /> Custom domains
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Views (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats?.views7d ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Chats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats?.chats ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats?.shares ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
        <QrCodeCard url={publicUrl} />
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Share</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Guests scan the QR code or open the public link to view the
              guidebook — no login required.
            </p>
            <p>
              To change branding, sections, or which tabs appear in the bottom
              nav, open the editor.
            </p>
          </CardContent>
        </Card>
      </div>

      {isOwner ? (
        <GuidebookCollaboratorsManager guidebookId={guidebook.id} />
      ) : null}
    </div>
  );
}
