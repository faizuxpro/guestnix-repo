"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Gift,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Coupon = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  appliesTo: string;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  active: boolean;
  archivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  usage: {
    paymentCount: number;
    amountTotal: number;
    lastUsedAt: string | null;
  };
};

type TrialUser = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string | null;
  plan: string | null;
  status: string;
  billingInterval: string;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  propertyCount: number;
  guidebookCount: number;
  publishedGuidebookCount: number;
  paymentCount: number;
  lastActivityAt: string | null;
};

type CouponUsageRow = {
  id: string;
  provider: string;
  providerSaleId: string;
  userId: string | null;
  email: string | null;
  userEmail: string | null;
  fullName: string | null;
  plan: string | null;
  amount: number | null;
  createdAt: string | null;
};

type CouponForm = {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: string;
  appliesTo: string;
  maxRedemptions: string;
  expiresAt: string;
  active: boolean;
};

const EMPTY_COUPON_FORM: CouponForm = {
  code: "",
  discountType: "percent",
  discountValue: "10",
  appliesTo: "all",
  maxRedemptions: "",
  expiresAt: "",
  active: true,
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "None";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "None";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(cents: number | null | undefined) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function localToIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function couponLabel(coupon: Pick<Coupon, "discountType" | "discountValue">) {
  return coupon.discountType === "percent"
    ? `${coupon.discountValue}%`
    : formatMoney(coupon.discountValue);
}

function statusVariant(status: string) {
  if (status === "active" || status === "trialing") return "default";
  if (status === "none") return "outline";
  return "destructive";
}

export function BillingAdminClient({
  initialCoupons,
  initialUsers,
}: {
  initialCoupons: Coupon[];
  initialUsers: TrialUser[];
}) {
  const [tab, setTab] = useState<"coupons" | "trials">("coupons");
  const [coupons, setCoupons] = useState(initialCoupons);
  const [users, setUsers] = useState(initialUsers);
  const [couponSearch, setCouponSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [couponForm, setCouponForm] = useState<CouponForm>(EMPTY_COUPON_FORM);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [usageRows, setUsageRows] = useState<CouponUsageRow[]>([]);
  const [usageTitle, setUsageTitle] = useState("");
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [trialReason, setTrialReason] = useState("");
  const [savingTrial, setSavingTrial] = useState(false);

  const filteredCoupons = useMemo(() => {
    const q = couponSearch.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter((coupon) =>
      [coupon.code, coupon.discountType, coupon.appliesTo]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [coupons, couponSearch]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.email, user.fullName ?? "", user.plan ?? "", user.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [users, userSearch]);

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  async function refreshCoupons() {
    const res = await fetch("/api/dashboard/admin/billing/coupons");
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.coupons) {
      toast.error("Could not refresh coupons.");
      return;
    }
    setCoupons(data.coupons);
  }

  async function refreshTrials() {
    const res = await fetch("/api/dashboard/admin/billing/trials");
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.users) {
      toast.error("Could not refresh users.");
      return;
    }
    setUsers(data.users);
  }

  function editCoupon(coupon: Coupon) {
    setEditingCouponId(coupon.id);
    setCouponForm({
      code: coupon.code,
      discountType: coupon.discountType === "fixed" ? "fixed" : "percent",
      discountValue: String(coupon.discountValue),
      appliesTo: coupon.appliesTo,
      maxRedemptions: coupon.maxRedemptions == null ? "" : String(coupon.maxRedemptions),
      expiresAt: toDatetimeLocal(coupon.expiresAt),
      active: coupon.active,
    });
  }

  function resetCouponForm() {
    setEditingCouponId(null);
    setCouponForm(EMPTY_COUPON_FORM);
  }

  async function saveCoupon(event: FormEvent) {
    event.preventDefault();
    setSavingCoupon(true);
    const payload = {
      code: couponForm.code,
      discountType: couponForm.discountType,
      discountValue: Number(couponForm.discountValue),
      appliesTo: couponForm.appliesTo || "all",
      maxRedemptions: couponForm.maxRedemptions
        ? Number(couponForm.maxRedemptions)
        : null,
      expiresAt: localToIso(couponForm.expiresAt),
      active: couponForm.active,
    };

    try {
      const res = await fetch(
        editingCouponId
          ? `/api/dashboard/admin/billing/coupons/${encodeURIComponent(editingCouponId)}`
          : "/api/dashboard/admin/billing/coupons",
        {
          method: editingCouponId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save coupon.");
        return;
      }
      toast.success(editingCouponId ? "Coupon updated." : "Coupon created.");
      resetCouponForm();
      await refreshCoupons();
    } finally {
      setSavingCoupon(false);
    }
  }

  async function archiveCoupon(coupon: Coupon) {
    const reason = window.prompt(`Archive ${coupon.code}? Add an audit note:`);
    if (reason === null) return;
    const res = await fetch(
      `/api/dashboard/admin/billing/coupons/${encodeURIComponent(coupon.id)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not archive coupon.");
      return;
    }
    toast.success("Coupon archived.");
    await refreshCoupons();
  }

  async function loadUsage(coupon: Coupon) {
    setUsageOpen(true);
    setUsageTitle(coupon.code);
    setUsageRows([]);
    setLoadingUsage(true);
    try {
      const res = await fetch(
        `/api/dashboard/admin/billing/coupons/${encodeURIComponent(coupon.id)}/usage`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not load usage.");
        return;
      }
      setUsageRows(data?.usage ?? []);
    } finally {
      setLoadingUsage(false);
    }
  }

  function selectTrialUser(user: TrialUser) {
    setSelectedUserId(user.id);
    setTrialEndsAt(toDatetimeLocal(user.trialEndsAt));
    setTrialReason("");
  }

  function setTrialOffset(days: number) {
    const date = new Date(Date.now() + days * 86_400_000);
    setTrialEndsAt(toDatetimeLocal(date.toISOString()));
  }

  async function saveTrial(event: FormEvent) {
    event.preventDefault();
    if (!selectedUser) return;
    setSavingTrial(true);
    try {
      const res = await fetch(
        `/api/dashboard/admin/billing/trials/${encodeURIComponent(selectedUser.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trialEndsAt: localToIso(trialEndsAt),
            reason: trialReason,
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not update trial.");
        return;
      }
      toast.success("Trial updated.");
      await refreshTrials();
    } finally {
      setSavingTrial(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Platform admin</p>
          <h1 className="text-2xl font-semibold tracking-tight">Billing controls</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/dashboard/admin/activity" />}>
            <Users className="h-4 w-4" />
            Activity
          </Button>
          <Button variant="outline" render={<Link href="/dashboard/admin/announcements" />}>
            Announcements
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "coupons" | "trials")}
        className="gap-5"
      >
        <TabsList className="w-max justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="coupons" className="px-3">
            <Gift className="h-4 w-4" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="trials" className="px-3">
            <CalendarClock className="h-4 w-4" />
            User trials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="m-0 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={couponSearch}
                    onChange={(event) => setCouponSearch(event.target.value)}
                    placeholder="Search coupons"
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" onClick={() => void refreshCoupons()}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                      <TableHead className="text-right">Payments</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCoupons.map((coupon) => {
                      const archived = Boolean(coupon.archivedAt);
                      const expired =
                        coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now();
                      return (
                        <TableRow key={coupon.id} className={archived ? "opacity-60" : undefined}>
                          <TableCell>
                            <div className="font-mono font-medium">{coupon.code}</div>
                            <div className="text-xs text-muted-foreground">{coupon.appliesTo}</div>
                          </TableCell>
                          <TableCell>{couponLabel(coupon)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                archived || expired || !coupon.active ? "outline" : "default"
                              }
                            >
                              {archived
                                ? "archived"
                                : expired
                                  ? "expired"
                                  : coupon.active
                                    ? "active"
                                    : "inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(coupon.expiresAt)}</TableCell>
                          <TableCell className="text-right">
                            {coupon.redemptionCount}
                            {coupon.maxRedemptions != null ? `/${coupon.maxRedemptions}` : ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              className="font-medium text-primary underline-offset-4 hover:underline"
                              onClick={() => void loadUsage(coupon)}
                            >
                              {coupon.usage.paymentCount}
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                title="Edit coupon"
                                onClick={() => editCoupon(coupon)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                title="Archive coupon"
                                disabled={archived}
                                onClick={() => void archiveCoupon(coupon)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>

            <Card size="sm">
              <CardHeader>
                <CardTitle>{editingCouponId ? "Edit coupon" : "Create coupon"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={(event) => void saveCoupon(event)}>
                  <div className="space-y-1.5">
                    <Label htmlFor="coupon-code">Code</Label>
                    <Input
                      id="coupon-code"
                      value={couponForm.code}
                      onChange={(event) =>
                        setCouponForm((form) => ({ ...form, code: event.target.value }))
                      }
                      placeholder="SUMMER25"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="discount-type">Type</Label>
                      <select
                        id="discount-type"
                        value={couponForm.discountType}
                        onChange={(event) =>
                          setCouponForm((form) => ({
                            ...form,
                            discountType: event.target.value as "percent" | "fixed",
                          }))
                        }
                        className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      >
                        <option value="percent">Percent</option>
                        <option value="fixed">Fixed</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="discount-value">Value</Label>
                      <Input
                        id="discount-value"
                        type="number"
                        min="1"
                        value={couponForm.discountValue}
                        onChange={(event) =>
                          setCouponForm((form) => ({
                            ...form,
                            discountValue: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="applies-to">Applies to</Label>
                    <Input
                      id="applies-to"
                      value={couponForm.appliesTo}
                      onChange={(event) =>
                        setCouponForm((form) => ({ ...form, appliesTo: event.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="max-redemptions">Max uses</Label>
                      <Input
                        id="max-redemptions"
                        type="number"
                        min="1"
                        value={couponForm.maxRedemptions}
                        onChange={(event) =>
                          setCouponForm((form) => ({
                            ...form,
                            maxRedemptions: event.target.value,
                          }))
                        }
                        placeholder="Unlimited"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="expires-at">Expiry</Label>
                      <Input
                        id="expires-at"
                        type="datetime-local"
                        value={couponForm.expiresAt}
                        onChange={(event) =>
                          setCouponForm((form) => ({ ...form, expiresAt: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    Active
                    <Switch
                      checked={couponForm.active}
                      onCheckedChange={(checked) =>
                        setCouponForm((form) => ({ ...form, active: checked }))
                      }
                    />
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={savingCoupon}>
                      {savingCoupon ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                    {editingCouponId ? (
                      <Button type="button" variant="outline" onClick={resetCouponForm}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trials" className="m-0 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search users"
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" onClick={() => void refreshTrials()}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>

              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Trial end</TableHead>
                      <TableHead className="text-right">Content</TableHead>
                      <TableHead>Last activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className={cn(selectedUserId === user.id && "bg-muted/60")}
                      >
                        <TableCell className="max-w-[260px]">
                          <div className="truncate font-medium">
                            {user.fullName || "Unnamed user"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(user.status)}>{user.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.plan ?? "none"}
                          {user.billingInterval ? ` / ${user.billingInterval}` : ""}
                        </TableCell>
                        <TableCell>
                          <div>{formatDateTime(user.trialEndsAt)}</div>
                          {user.trialDaysLeft != null ? (
                            <div className="text-xs text-muted-foreground">
                              {user.trialDaysLeft} days left
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.propertyCount} properties, {user.publishedGuidebookCount}/
                          {user.guidebookCount} guides
                        </TableCell>
                        <TableCell>{formatDateTime(user.lastActivityAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={user.status === "none"}
                            onClick={() => selectTrialUser(user)}
                          >
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Trial adjustment</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedUser ? (
                  <form className="space-y-4" onSubmit={(event) => void saveTrial(event)}>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="font-medium">{selectedUser.fullName || selectedUser.email}</div>
                      <div className="text-xs text-muted-foreground">{selectedUser.id}</div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="trial-ends-at">Trial ends at</Label>
                      <Input
                        id="trial-ends-at"
                        type="datetime-local"
                        value={trialEndsAt}
                        onChange={(event) => setTrialEndsAt(event.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button type="button" variant="outline" onClick={() => setTrialOffset(7)}>
                        +7d
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setTrialOffset(14)}>
                        +14d
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTrialEndsAt(toDatetimeLocal(new Date().toISOString()))}
                      >
                        Now
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="trial-reason">Audit reason</Label>
                      <Textarea
                        id="trial-reason"
                        value={trialReason}
                        onChange={(event) => setTrialReason(event.target.value)}
                        placeholder="Support request, sales approval, churn save..."
                      />
                    </div>
                    <Button type="submit" disabled={savingTrial || trialReason.trim().length < 3}>
                      {savingTrial ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save trial
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a user with an existing subscription row.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{usageTitle} usage</DialogTitle>
            <DialogDescription>Provider payment records that reported this code.</DialogDescription>
          </DialogHeader>
          {loadingUsage ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading usage
            </div>
          ) : (
            <div className="max-h-[520px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No payment usage recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usageRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                        <TableCell className="max-w-[240px]">
                          <div className="truncate font-medium">
                            {row.fullName || row.email || row.userEmail || "Unknown"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {row.userEmail || row.email || row.userId || "No user"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{row.provider}</div>
                          <div className="max-w-[180px] truncate font-mono text-xs text-muted-foreground">
                            {row.providerSaleId}
                          </div>
                        </TableCell>
                        <TableCell>{row.plan ?? "none"}</TableCell>
                        <TableCell className="text-right">{formatMoney(row.amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
