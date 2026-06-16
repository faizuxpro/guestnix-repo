"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { GradientButton } from "@/components/marketing/ui/GradientButton";
import { cn } from "@/lib/utils";
import {
  PLAN_KEYS,
  PLAN_MAP,
  PLAN_LIMITS,
  formatLimit,
  type BillingInterval,
} from "@/lib/billing/plans";

export function PricingPlans() {
  const [interval, setInterval] = useState<BillingInterval>("month");

  return (
    <div>
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-[color:var(--marketing-border)] bg-white p-1">
          <button
            type="button"
            onClick={() => setInterval("month")}
            className={cn(
              "rounded-full px-5 py-1.5 text-sm font-semibold transition-colors",
              interval === "month"
                ? "bg-[color:var(--marketing-primary)] text-white"
                : "text-[color:var(--marketing-text-variant)]"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("year")}
            className={cn(
              "rounded-full px-5 py-1.5 text-sm font-semibold transition-colors",
              interval === "year"
                ? "bg-[color:var(--marketing-primary)] text-white"
                : "text-[color:var(--marketing-text-variant)]"
            )}
          >
            Annual
            <span className="ml-1 text-xs opacity-80">2 months free</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_KEYS.map((key) => {
          const info = PLAN_MAP[key];
          const limits = PLAN_LIMITS[key];
          const price = interval === "year" ? info.annual : info.monthly;
          const unit = interval === "year" ? "/yr" : "/mo";
          const popular = key === "pro";
          return (
            <div
              key={key}
              className={cn(
                "relative flex flex-col rounded-3xl bg-white p-6",
                popular
                  ? "border-2 border-[color:var(--marketing-primary)]"
                  : "border border-[color:var(--marketing-border)]"
              )}
            >
              {popular && (
                <span className="absolute right-5 top-5 rounded-full bg-[color:var(--marketing-accent)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--marketing-primary)]">
                  Popular
                </span>
              )}
              <p className="text-sm font-semibold uppercase tracking-wider text-[color:var(--marketing-primary)]">
                {info.label}
              </p>
              <p className="mt-3 text-4xl font-extrabold">${price}</p>
              <p className="text-sm text-muted-foreground">{unit}</p>
              <p className="mt-3 text-sm text-[color:var(--marketing-text-variant)]">
                {info.blurb}
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {limits.properties}{" "}
                  {limits.properties === 1 ? "property" : "properties"}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {formatLimit(limits.publishedGuidebooks)} published guides
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {formatLimit(limits.drafts)} drafts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {limits.customDomain ? "Custom domain" : "Guestnix subdomain"}
                </li>
              </ul>
              <GradientButton href="/signup" className="mt-6 w-full">
                Start free trial
              </GradientButton>
            </div>
          );
        })}
      </div>
    </div>
  );
}
