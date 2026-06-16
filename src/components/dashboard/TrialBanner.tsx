"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BetaTrialExtensionButton } from "@/components/dashboard/BetaTrialExtensionButton";
import { cn } from "@/lib/utils";
import { PLAN_MAP, type BillingInterval, type PlanKey } from "@/lib/billing/plans";

/**
 * Dashboard banner shown to trialing / lapsed hosts. Active subscribers see
 * nothing. "Subscribe" starts a provider checkout for the host's current plan
 * + interval and redirects to it.
 */
export function TrialBanner({
  status,
  isEntitled,
  plan,
  interval,
  trialDaysLeft,
}: {
  status: string;
  isEntitled: boolean;
  plan: PlanKey | null;
  interval: BillingInterval;
  trialDaysLeft: number | null;
}) {
  const [loading, setLoading] = useState(false);

  if (status === "active") return null;
  if (!plan) return null;

  const trialing = status === "trialing" && isEntitled;
  const planLabel = PLAN_MAP[plan].label;

  async function subscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
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

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-sm",
        trialing
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="min-w-0">
          {trialing
            ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your ${planLabel} trial.`
            : "Your trial has ended - your guides are offline. Subscribe to bring them back."}
        </span>
        {trialing && (
          <BetaTrialExtensionButton
            label="Get 7 more days"
            className="border-amber-300 bg-white/80 text-amber-900 hover:bg-white"
          />
        )}
      </div>
      <Button size="sm" onClick={subscribe} disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Subscribe
      </Button>
    </div>
  );
}
