import type { ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  Crown,
  MailCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { getNotificationSummary, type NotificationItem } from "@/lib/notifications";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ICONS: Record<string, ElementType> = {
  guidebook_invitation: BookOpen,
  guidebook_invitation_accepted: MailCheck,
  ownership_transfer: Crown,
  ownership_transfer_accepted: UserRoundCheck,
  ownership_transfer_canceled: XCircle,
  system: Bell,
};

function formatRelative(value: string) {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

  if (abs < 60 * 1000) return "just now";
  if (abs < 60 * 60 * 1000) {
    return rtf.format(Math.round(diffMs / (60 * 1000)), "minute");
  }
  if (abs < 24 * 60 * 60 * 1000) {
    return rtf.format(Math.round(diffMs / (60 * 60 * 1000)), "hour");
  }
  if (abs < 30 * 24 * 60 * 60 * 1000) {
    return rtf.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day");
  }
  return formatDate(date);
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const Icon = ICONS[item.type] ?? Bell;
  const content = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors",
        item.href && "hover:border-primary/35 hover:text-primary",
        !item.readAt && "border-primary/25 bg-primary/5"
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-md border",
          !item.readAt
            ? "border-primary/25 bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.title}</span>
          {!item.readAt ? <Badge variant="secondary">Unread</Badge> : null}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
          {item.body}
        </span>
        <span className="mt-2 block text-xs text-muted-foreground">
          {formatRelative(item.createdAt)}
        </span>
      </span>
      {item.href ? <ArrowRight className="mt-1 h-4 w-4 shrink-0" /> : null}
    </div>
  );

  if (!item.href) return content;
  return (
    <Link href={item.href} className="block">
      {content}
    </Link>
  );
}

export default async function NotificationsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/notifications");
  }

  const summary = await getNotificationSummary(user.id, 50);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {summary.unreadCount > 0
              ? `${summary.unreadCount} unread update${summary.unreadCount === 1 ? "" : "s"}`
              : "All updates are read"}
          </p>
        </div>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          <CheckCircle2 className="h-4 w-4" />
          Dashboard
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent updates</CardTitle>
          <CardDescription>Invites, ownership requests, and system messages.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.items.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {summary.items.map((item) => (
                <NotificationRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
