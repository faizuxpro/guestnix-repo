"use client";

import { BadgeCheck, CreditCard } from "lucide-react";
import { BillingActions } from "@/components/dashboard/BillingActions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLAN_LIMITS, PLAN_MAP, formatLimit } from "@/lib/billing/plans";
import type { BillingSettingsData } from "./types";

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === "active") return "text-emerald-600";
  if (status === "trialing") return "text-amber-600";
  if (status === "canceled" || status === "expired" || status === "past_due") {
    return "text-rose-600";
  }

  return "text-muted-foreground";
}

export function BillingSettingsTab({
  billing,
}: {
  billing: BillingSettingsData;
}) {
  const planInfo = billing.currentPlan
    ? PLAN_MAP[billing.currentPlan]
    : null;
  const limits = billing.currentPlan
    ? PLAN_LIMITS[billing.currentPlan]
    : null;
  const isActive = billing.status === "active";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-primary" />
              Current plan
              {isActive && <BadgeCheck className="h-4 w-4 text-emerald-600" />}
            </CardTitle>
            <CardDescription>
              You are on the{" "}
              <span className="font-medium">{planInfo?.label ?? "-"}</span>{" "}
              plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Status</span>
              <span
                className={`font-medium capitalize ${statusTone(
                  billing.status
                )}`}
              >
                {billing.status}
              </span>
            </div>

            {billing.status === "trialing" && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Trial ends</span>
                  <span>{formatDate(billing.trialEndsAt)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Days left</span>
                  <span className="font-medium">
                    {billing.trialDaysLeft ?? 0}
                  </span>
                </div>
              </>
            )}

            {limits && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Included</span>
                <span className="text-right">
                  {limits.properties}{" "}
                  {limits.properties === 1 ? "property" : "properties"} /{" "}
                  {formatLimit(limits.publishedGuidebooks)} published /{" "}
                  {formatLimit(limits.drafts)} drafts
                </span>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Billing</span>
              <span className="capitalize">{billing.currentInterval}ly</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isActive ? "Change plan" : "Subscribe"}
            </CardTitle>
            <CardDescription>
              {isActive
                ? "Switch your plan or billing period."
                : "Pick a plan and subscribe to keep your guides live after your trial."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillingActions
              currentPlan={billing.currentPlan}
              currentInterval={billing.currentInterval}
              status={billing.status}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing notes</CardTitle>
          <CardDescription>
            Plan limits control how many properties and guidebooks you can keep
            active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Changes made here refresh your subscription state after checkout or
            trial plan updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
