import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { Activity, BookOpen, Clock, CreditCard, Megaphone, ShoppingBag, Users } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { db } from "@/lib/db";
import {
  chatMessages,
  guidebooks,
  hostAssets,
  payments,
  profiles,
  properties,
  storeItems,
  storeRequestMessages,
  storeRequests,
  subscriptions,
} from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type StatRow = {
  userId: string;
  count: number;
  lastAt: Date | string | null;
};

type GuidebookStatRow = StatRow & {
  publishedCount: number;
};

type ActivityRow = {
  at: Date | string | null;
  detail: string;
  kind: string;
  userId: string | null;
};

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timestamp(value: Date | string | null | undefined) {
  return toDate(value)?.getTime() ?? 0;
}

function formatAbsolute(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return "Never";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRelative(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return "Never";
  return `${formatDistanceToNow(date)} ago`;
}

function mapByUser<T extends { userId: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.userId, row]));
}

function maxDate(...values: Array<Date | string | null | undefined>) {
  const dates = values.map(toDate).filter((date): date is Date => Boolean(date));
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime())));
}

function statusVariant(status: string | null | undefined) {
  if (status === "active" || status === "trialing") return "default";
  if (status === "none") return "outline";
  return "destructive";
}

export default async function PlatformActivityPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/admin/activity");
  }

  if (!isPlatformAdmin(user)) {
    notFound();
  }

  const [
    userRows,
    guidebookStatsRows,
    propertyStatsRows,
    assetStatsRows,
    paymentStatsRows,
    storeItemStatsRows,
    storeRequestStatsRows,
    recentGuidebooks,
    recentProperties,
    recentAssets,
    recentPayments,
    recentStoreItems,
    recentStoreRequests,
    recentStoreMessages,
    recentHostReplies,
  ] = await Promise.all([
    db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        onboardingCompleted: profiles.onboardingCompleted,
        profilePlan: profiles.plan,
        profileUpdatedAt: profiles.updatedAt,
        signupAt: profiles.createdAt,
        subscriptionPlan: subscriptions.plan,
        subscriptionStatus: subscriptions.status,
        billingInterval: subscriptions.billingInterval,
        trialEndsAt: subscriptions.trialEndsAt,
      })
      .from(profiles)
      .leftJoin(subscriptions, eq(subscriptions.userId, profiles.id))
      .orderBy(desc(profiles.createdAt))
      .limit(200),
    db
      .select({
        userId: guidebooks.userId,
        count: sql<number>`count(*)::int`,
        publishedCount: sql<number>`count(*) filter (where ${guidebooks.status} = 'published')::int`,
        lastAt: sql<Date | null>`max(${guidebooks.updatedAt})`,
      })
      .from(guidebooks)
      .groupBy(guidebooks.userId),
    db
      .select({
        userId: properties.userId,
        count: sql<number>`count(*)::int`,
        lastAt: sql<Date | null>`max(${properties.updatedAt})`,
      })
      .from(properties)
      .groupBy(properties.userId),
    db
      .select({
        userId: hostAssets.userId,
        count: sql<number>`count(*)::int`,
        lastAt: sql<Date | null>`max(${hostAssets.updatedAt})`,
      })
      .from(hostAssets)
      .groupBy(hostAssets.userId),
    db
      .select({
        userId: payments.userId,
        count: sql<number>`count(*)::int`,
        lastAt: sql<Date | null>`max(${payments.createdAt})`,
      })
      .from(payments)
      .where(sql`${payments.userId} is not null`)
      .groupBy(payments.userId),
    db
      .select({
        userId: storeItems.userId,
        count: sql<number>`count(*)::int`,
        lastAt: sql<Date | null>`max(${storeItems.updatedAt})`,
      })
      .from(storeItems)
      .groupBy(storeItems.userId),
    db
      .select({
        userId: storeRequests.userId,
        count: sql<number>`count(*)::int`,
        lastAt: sql<Date | null>`max(${storeRequests.updatedAt})`,
      })
      .from(storeRequests)
      .groupBy(storeRequests.userId),
    db
      .select({
        userId: guidebooks.userId,
        title: guidebooks.title,
        status: guidebooks.status,
        updatedAt: guidebooks.updatedAt,
      })
      .from(guidebooks)
      .orderBy(desc(guidebooks.updatedAt))
      .limit(40),
    db
      .select({
        userId: properties.userId,
        name: properties.name,
        updatedAt: properties.updatedAt,
      })
      .from(properties)
      .orderBy(desc(properties.updatedAt))
      .limit(30),
    db
      .select({
        userId: hostAssets.userId,
        name: hostAssets.name,
        assetType: hostAssets.assetType,
        updatedAt: hostAssets.updatedAt,
      })
      .from(hostAssets)
      .orderBy(desc(hostAssets.updatedAt))
      .limit(30),
    db
      .select({
        userId: payments.userId,
        plan: payments.plan,
        provider: payments.provider,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(sql`${payments.userId} is not null`)
      .orderBy(desc(payments.createdAt))
      .limit(30),
    db
      .select({
        userId: storeItems.userId,
        name: storeItems.name,
        active: storeItems.active,
        updatedAt: storeItems.updatedAt,
      })
      .from(storeItems)
      .orderBy(desc(storeItems.updatedAt))
      .limit(30),
    db
      .select({
        userId: storeRequests.userId,
        requestCode: storeRequests.requestCode,
        status: storeRequests.status,
        paymentStatus: storeRequests.paymentStatus,
        guidebookTitle: guidebooks.title,
        updatedAt: storeRequests.updatedAt,
      })
      .from(storeRequests)
      .innerJoin(guidebooks, eq(storeRequests.guidebookId, guidebooks.id))
      .orderBy(desc(storeRequests.updatedAt))
      .limit(40),
    db
      .select({
        userId: storeRequests.userId,
        requestCode: storeRequests.requestCode,
        authorType: storeRequestMessages.authorType,
        createdAt: storeRequestMessages.createdAt,
      })
      .from(storeRequestMessages)
      .innerJoin(storeRequests, eq(storeRequestMessages.requestId, storeRequests.id))
      .orderBy(desc(storeRequestMessages.createdAt))
      .limit(40),
    db
      .select({
        userId: chatMessages.senderUserId,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.role, "host"))
      .orderBy(desc(chatMessages.createdAt))
      .limit(30),
  ]);

  const guidebookStats = mapByUser(guidebookStatsRows as GuidebookStatRow[]);
  const propertyStats = mapByUser(propertyStatsRows as StatRow[]);
  const assetStats = mapByUser(assetStatsRows as StatRow[]);
  const paymentStats = mapByUser(
    paymentStatsRows.flatMap((row) =>
      row.userId
        ? [{ userId: row.userId, count: row.count, lastAt: row.lastAt }]
        : []
    )
  );
  const storeItemStats = mapByUser(storeItemStatsRows as StatRow[]);
  const storeRequestStats = mapByUser(storeRequestStatsRows as StatRow[]);

  const users = userRows
    .map((row) => {
      const guidebooksForUser = guidebookStats.get(row.id);
      const propertiesForUser = propertyStats.get(row.id);
      const assetsForUser = assetStats.get(row.id);
      const paymentsForUser = paymentStats.get(row.id);
      const storeItemsForUser = storeItemStats.get(row.id);
      const storeRequestsForUser = storeRequestStats.get(row.id);
      const lastActivityAt = maxDate(
        row.profileUpdatedAt,
        guidebooksForUser?.lastAt,
        propertiesForUser?.lastAt,
        assetsForUser?.lastAt,
        paymentsForUser?.lastAt,
        storeItemsForUser?.lastAt,
        storeRequestsForUser?.lastAt
      );

      return {
        ...row,
        assetCount: assetsForUser?.count ?? 0,
        guidebookCount: guidebooksForUser?.count ?? 0,
        lastActivityAt,
        paymentCount: paymentsForUser?.count ?? 0,
        propertyCount: propertiesForUser?.count ?? 0,
        publishedGuidebookCount: guidebooksForUser?.publishedCount ?? 0,
        storeItemCount: storeItemsForUser?.count ?? 0,
        storeRequestCount: storeRequestsForUser?.count ?? 0,
      };
    })
    .sort((a, b) => timestamp(b.lastActivityAt) - timestamp(a.lastActivityAt));

  const userLabels = new Map(
    userRows.map((row) => [
      row.id,
      row.fullName || row.email || row.id,
    ])
  );

  const recentActivity: ActivityRow[] = [
    ...recentGuidebooks.map((row) => ({
      at: row.updatedAt,
      detail: row.title,
      kind:
        row.status === "published"
          ? "Updated published guidebook"
          : "Updated draft guidebook",
      userId: row.userId,
    })),
    ...recentProperties.map((row) => ({
      at: row.updatedAt,
      detail: row.name,
      kind: "Updated property",
      userId: row.userId,
    })),
    ...recentAssets.map((row) => ({
      at: row.updatedAt,
      detail: `${row.name} (${row.assetType})`,
      kind: "Updated asset",
      userId: row.userId,
    })),
    ...recentPayments.flatMap((row) =>
      row.userId
        ? [
            {
              at: row.createdAt,
              detail: `${row.provider}${row.plan ? ` / ${row.plan}` : ""}`,
              kind: "Payment recorded",
              userId: row.userId,
            },
          ]
        : []
    ),
    ...recentStoreItems.map((row) => ({
      at: row.updatedAt,
      detail: `${row.name} (${row.active ? "active" : "inactive"})`,
      kind: "Updated Store item",
      userId: row.userId,
    })),
    ...recentStoreRequests.map((row) => ({
      at: row.updatedAt,
      detail: `${row.requestCode} / ${row.guidebookTitle} / ${row.status} / ${row.paymentStatus}`,
      kind: "Updated Store request",
      userId: row.userId,
    })),
    ...recentStoreMessages.map((row) => ({
      at: row.createdAt,
      detail: `${row.requestCode} (${row.authorType} message)`,
      kind: "Store message",
      userId: row.userId,
    })),
    ...recentHostReplies.flatMap((row) =>
      row.userId
        ? [
            {
              at: row.createdAt,
              detail: "Host replied to a guest chat",
              kind: "Chat reply",
              userId: row.userId,
            },
          ]
        : []
    ),
  ]
    .sort((a, b) => timestamp(b.at) - timestamp(a.at))
    .slice(0, 50);

  const now = Date.now();
  const active24h = users.filter(
    (row) => now - timestamp(row.lastActivityAt) <= 24 * 60 * 60 * 1000
  ).length;
  const active7d = users.filter(
    (row) => now - timestamp(row.lastActivityAt) <= 7 * 24 * 60 * 60 * 1000
  ).length;
  const publishedGuidebooks = users.reduce(
    (sum, row) => sum + row.publishedGuidebookCount,
    0
  );
  const totalStoreRequests = users.reduce(
    (sum, row) => sum + row.storeRequestCount,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Platform admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            User activity
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/dashboard/admin/billing" />}>
            <CreditCard className="h-4 w-4" />
            Billing
          </Button>
          <Button variant="outline" render={<Link href="/dashboard/admin/announcements" />}>
            <Megaphone className="h-4 w-4" />
            Announcements
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{users.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Active 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{active24h}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Active 7d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{active7d}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Published guides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{publishedGuidebooks}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              Store requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalStoreRequests}</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Users</h2>
          <p className="text-sm text-muted-foreground">
            Internal identity view. PostHog uses the same Supabase user id as
            the person distinct id.
          </p>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Properties</TableHead>
                <TableHead className="text-right">Guidebooks</TableHead>
                <TableHead className="text-right">Published</TableHead>
                <TableHead className="text-right">Store</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>PostHog id</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((row) => {
                const status = row.subscriptionStatus ?? "none";
                return (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[260px]">
                      <div className="truncate font-medium">
                        {row.fullName || "Unnamed user"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {row.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(status)}>{status}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.subscriptionPlan ?? row.profilePlan ?? "none"}
                      {row.billingInterval ? ` / ${row.billingInterval}` : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.propertyCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.guidebookCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.publishedGuidebookCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.storeRequestCount}/{row.storeItemCount}
                    </TableCell>
                    <TableCell>
                      <div>{formatRelative(row.lastActivityAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatAbsolute(row.lastActivityAt)}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[210px] truncate font-mono text-xs">
                      {row.id}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-medium">Recent activity</h2>
          <p className="text-sm text-muted-foreground">
            DB-backed activity from guidebooks, properties, assets, payments,
            Store, and host chat replies.
          </p>
        </div>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((row, index) => (
                <TableRow key={`${row.kind}-${row.userId}-${timestamp(row.at)}-${index}`}>
                  <TableCell>
                    <div>{formatRelative(row.at)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatAbsolute(row.at)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate">
                    {row.userId ? userLabels.get(row.userId) ?? row.userId : "Unknown"}
                  </TableCell>
                  <TableCell>{row.kind}</TableCell>
                  <TableCell className="max-w-[360px] truncate">
                    {row.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
