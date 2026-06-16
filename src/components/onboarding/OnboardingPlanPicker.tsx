"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PLAN_KEYS,
  PLAN_MAP,
  PLAN_LIMITS,
  formatLimit,
  TRIAL_DAYS,
  type PlanKey,
  type BillingInterval,
} from "@/lib/billing/plans";

/**
 * Onboarding plan picker. The host picks the plan that defines their trial
 * limits (switchable later); they're charged only when they check out. Posts to
 * /api/onboarding/start-trial then sends them to the dashboard.
 */
export function OnboardingPlanPicker() {
  const router = useRouter();
  const [interval, setBillingInterval] = useState<BillingInterval>("month");
  const [plan, setPlan] = useState<PlanKey>("plus");
  const [loading, setLoading] = useState(false);

  async function startTrial() {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/start-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(
          typeof data?.error === "string"
            ? data.error
            : "Couldn't start your trial. Please try again."
        );
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Couldn't start your trial. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Choose your plan
          </h1>
          <p className="mt-2 text-muted-foreground">
            Start with a {TRIAL_DAYS}-day free trial. No charge today — pick the
            plan that fits and change it anytime during your trial.
          </p>
        </div>

        {/* Billing interval toggle */}
        <div className="mt-6 flex justify-center">
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
              Annual
              <span className="ml-1 text-xs opacity-80">(2 months free)</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_KEYS.map((key) => {
            const info = PLAN_MAP[key];
            const limits = PLAN_LIMITS[key];
            const selected = plan === key;
            const price = interval === "year" ? info.annual : info.monthly;
            const unit = interval === "year" ? "/yr" : "/mo";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setPlan(key)}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card p-5 text-left transition-all",
                  selected
                    ? "border-primary ring-2 ring-primary"
                    : "border-border hover:border-primary/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                    {info.label}
                  </span>
                  {selected && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold">${price}</span>
                  <span className="text-sm text-muted-foreground">{unit}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {info.blurb}
                </p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {limits.properties}{" "}
                    {limits.properties === 1 ? "property" : "properties"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {formatLimit(limits.publishedGuidebooks)} published
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {formatLimit(limits.drafts)} drafts
                  </li>
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-2">
          <Button size="lg" onClick={startTrial} disabled={loading} className="min-w-64">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start my {TRIAL_DAYS}-day free trial
          </Button>
          <p className="text-xs text-muted-foreground">
            No payment required to start. Subscribe anytime before your trial ends.
          </p>
        </div>
      </div>
    </div>
  );
}
