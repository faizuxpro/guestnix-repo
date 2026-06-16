"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BetaTrialExtensionButton } from "@/components/dashboard/BetaTrialExtensionButton";
import { BETA_ENABLED, BETA_TRIAL_EXTENSION_COPY } from "@/lib/beta";
import { cn } from "@/lib/utils";
import { PLAN_MAP, type BillingInterval, type PlanKey } from "@/lib/billing/plans";

export type TrialInfo = {
  status: string;
  isEntitled: boolean;
  plan: PlanKey | null;
  interval: BillingInterval;
  trialDaysLeft: number | null;
};

/**
 * Subscription status card for the dashboard sidebar. Clean teal surface, gold
 * (brand-accent) button — no icons, badges, or alert tints. Hidden for active
 * subscribers. Collapses to a small gold button showing days left.
 */
export function TrialCard({
  status,
  isEntitled,
  plan,
  interval,
  trialDaysLeft,
  collapsed = false,
}: TrialInfo & { collapsed?: boolean }) {
  const [loading, setLoading] = useState(false);

  if (status === "active" || !plan) return null;

  const trialing = status === "trialing" && isEntitled;
  const planLabel = PLAN_MAP[plan].label;
  const days = trialDaysLeft ?? 0;
  const ctaLabel = trialing ? "Upgrade" : "Reactivate";
  const showBetaExtension = BETA_ENABLED && trialing;

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

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={subscribe}
        disabled={loading}
        title={
          trialing
            ? `${days} day${days === 1 ? "" : "s"} left — upgrade`
            : "Trial ended — reactivate"
        }
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground transition-opacity hover:opacity-90"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : trialing ? (
          days
        ) : (
          "!"
        )}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent p-3">
      <p
        className={cn(
          "text-xs",
          trialing ? "text-sidebar-foreground/60" : "text-sidebar-primary"
        )}
      >
        {trialing ? `${planLabel} plan trial` : "Trial ended"}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-sidebar-foreground">
        {trialing
          ? `${days} day${days === 1 ? "" : "s"} left`
          : "Your guides are offline"}
      </p>
      {showBetaExtension && (
        <>
          <p className="mt-2 text-xs leading-snug text-sidebar-foreground/70">
            {BETA_TRIAL_EXTENSION_COPY}
          </p>
          <BetaTrialExtensionButton
            label="Get 7 more days"
            className="mt-2 w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
          />
        </>
      )}
      <Button
        onClick={subscribe}
        disabled={loading}
        size="sm"
        className={cn(
          "w-full bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
          showBetaExtension ? "mt-2" : "mt-3"
        )}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {ctaLabel}
      </Button>
    </div>
  );
}
