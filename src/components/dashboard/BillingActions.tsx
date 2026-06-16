"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PLAN_KEYS,
  PLAN_MAP,
  planPrice,
  type BillingInterval,
  type PlanKey,
} from "@/lib/billing/plans";

/**
 * Billing management: pick a plan + interval, optionally apply a coupon, then
 * subscribe (provider checkout). While trialing, the host can also switch the
 * plan that defines their trial limits without paying.
 */
export function BillingActions({
  currentPlan,
  currentInterval,
  status,
}: {
  currentPlan: PlanKey | null;
  currentInterval: BillingInterval;
  status: string;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanKey>(currentPlan ?? "plus");
  const [interval, setBillingInterval] = useState<BillingInterval>(currentInterval);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{
    ok: boolean;
    code?: string;
    reason?: string;
    discountType?: string;
    discountValue?: number;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  const trialing = status === "trialing";

  async function applyCoupon() {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await fetch("/api/billing/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        setCoupon({
          ok: true,
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
        });
        setCode(data.code);
        toast.success("Coupon applied.");
      } else {
        setCoupon({ ok: false, reason: data?.reason ?? "That code isn't valid." });
      }
    } catch {
      setCoupon({ ok: false, reason: "Couldn't check that code. Try again." });
    } finally {
      setChecking(false);
    }
  }

  async function subscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          interval,
          couponCode: coupon?.ok ? coupon.code ?? code : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : "Couldn't start checkout. Please try again."
        );
        setLoading(false);
        return;
      }
      window.location.href = data.url as string;
    } catch {
      toast.error("Couldn't start checkout. Please try again.");
      setLoading(false);
    }
  }

  async function switchTrial() {
    setSwitching(true);
    try {
      const res = await fetch("/api/onboarding/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      if (!res.ok) {
        toast.error("Couldn't update your trial plan.");
        setSwitching(false);
        return;
      }
      toast.success("Trial plan updated.");
      router.refresh();
    } catch {
      toast.error("Couldn't update your trial plan.");
    } finally {
      setSwitching(false);
    }
  }

  const couponLabel =
    coupon?.ok && coupon.discountType
      ? coupon.discountType === "percent"
        ? `${coupon.discountValue}% off`
        : `$${((coupon.discountValue ?? 0) / 100).toFixed(2)} off`
      : null;

  const price = planPrice(plan, interval);
  const discountAmount =
    coupon?.ok && coupon.discountType
      ? coupon.discountType === "percent"
        ? price * ((coupon.discountValue ?? 0) / 100)
        : (coupon.discountValue ?? 0) / 100
      : 0;
  const discountedPrice = Math.max(0, price - discountAmount);
  const hasDiscount = coupon?.ok && discountedPrice < price;
  const displayPrice = hasDiscount ? discountedPrice : price;

  function formatPrice(value: number) {
    return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
  }

  function removeCoupon() {
    setCode("");
    setCoupon(null);
  }

  function changeCoupon() {
    setCoupon(null);
  }

  return (
    <div className="space-y-5">
      {/* Plan selection */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PLAN_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPlan(key)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              plan === key
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:bg-muted"
            )}
          >
            <span className="block font-medium">{PLAN_MAP[key].label}</span>
            <span className="text-xs text-muted-foreground">
              ${PLAN_MAP[key].monthly}/mo
            </span>
          </button>
        ))}
      </div>

      {/* Interval */}
      <div className="inline-flex rounded-full border bg-card p-1">
        <button
          type="button"
          onClick={() => setBillingInterval("month")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            interval === "month"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBillingInterval("year")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            interval === "year"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Annual <span className="text-xs opacity-80">(2 mo free)</span>
        </button>
      </div>

      {/* Coupon */}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            placeholder="Coupon code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setCoupon(null);
            }}
            className="max-w-48"
          />
          <Button
            type="button"
            variant="outline"
            onClick={applyCoupon}
            disabled={checking || !code.trim()}
          >
            {checking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply
          </Button>
        </div>
        {coupon?.ok && couponLabel && (
          <p className="text-xs text-emerald-600">
            Coupon applied - {couponLabel}.
          </p>
        )}
        {Boolean(0) && coupon?.ok && couponLabel && (
          <p className="text-xs text-emerald-600">Coupon applied — {couponLabel}.</p>
        )}
        {coupon?.ok && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              Using code {coupon.code ?? code}.
            </span>
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={changeCoupon}
            >
              Change
            </button>
            <button
              type="button"
              className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={removeCoupon}
            >
              Remove
            </button>
          </div>
        )}
        {coupon && !coupon.ok && (
          <p className="text-xs text-rose-600">{coupon.reason}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={subscribe} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Subscribe to {PLAN_MAP[plan].label} ({formatPrice(displayPrice)}
          {interval === "year" ? "/yr" : "/mo"})
        </Button>
        {hasDiscount && (
          <span className="text-sm text-muted-foreground">
            <span className="line-through">{formatPrice(price)}</span>{" "}
            <span className="font-medium text-emerald-600">
              {formatPrice(displayPrice)}
            </span>{" "}
            after coupon
          </span>
        )}
        {trialing && (
          <Button
            variant="ghost"
            onClick={switchTrial}
            disabled={switching}
          >
            {switching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Switch my trial to this plan (no charge)
          </Button>
        )}
      </div>
    </div>
  );
}
