"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Mail, PartyPopper, RefreshCw } from "lucide-react";
import { PLAN_MAP, type BillingInterval, type PlanKey } from "@/lib/billing/plans";
import { SectionHeader } from "./SectionHeader";

const plans = [
  {
    key: "solo",
    tier: "Perfect for a single property",
    name: "Solo",
    description: "Everything you need to launch a beautiful guidebook for your home.",
    features: ["1 Published Guidebook", "2 Drafts", "All Premium Features Unlocked"],
    accent: "accent-blue",
  },
  {
    key: "plus",
    tier: "For professional hosts",
    name: "Plus",
    description: "Elevate your branding and unlock the AI Concierge for guests.",
    features: ["5 Published Guidebooks", "10 Drafts", "All Premium Features Unlocked"],
    accent: "accent-violet",
  },
  {
    key: "pro",
    tier: "Best Value - Growing portfolios",
    name: "Pro",
    description: "Scale your operations with advanced insights and VIP support.",
    features: ["15 Published Guidebooks", "Unlimited Drafts", "All Premium Features Unlocked"],
    accent: "featured",
  },
  {
    key: "scale",
    tier: "For large portfolios",
    name: "Scale",
    description: "Hands-free migration and portfolio-wide reporting.",
    features: ["30 Published Guidebooks", "Unlimited Drafts", "All Premium Features Unlocked"],
    accent: "accent-caramel",
  },
] as const satisfies readonly {
  key: PlanKey;
  tier: string;
  name: string;
  description: string;
  features: readonly string[];
  accent: string;
}[];

type CompareCell =
  | { kind: "text"; value: string }
  | { kind: "included" }
  | { kind: "limited"; note?: string }
  | { kind: "unavailable"; note?: string };

type CompareRow = {
  feature: string;
  solo: CompareCell;
  plus: CompareCell;
  pro: CompareCell;
  scale: CompareCell;
};

const included = { kind: "included" } as const;

const compareRows: CompareRow[] = [
  {
    feature: "Published Guidebooks",
    solo: { kind: "text", value: "1" },
    plus: { kind: "text", value: "5" },
    pro: { kind: "text", value: "15" },
    scale: { kind: "text", value: "30" },
  },
  {
    feature: "Draft Guidebooks",
    solo: { kind: "text", value: "2" },
    plus: { kind: "text", value: "10" },
    pro: { kind: "text", value: "Unlimited" },
    scale: { kind: "text", value: "Unlimited" },
  },
  {
    feature: "Advanced Editor",
    solo: included,
    plus: included,
    pro: included,
    scale: included,
  },
  {
    feature: "Templates & Widgets",
    solo: { kind: "limited" },
    plus: included,
    pro: included,
    scale: included,
  },
  {
    feature: "Password Protection",
    solo: included,
    plus: included,
    pro: included,
    scale: included,
  },
  {
    feature: "Custom Domain",
    solo: { kind: "unavailable" },
    plus: { kind: "unavailable" },
    pro: included,
    scale: included,
  },
  {
    feature: "Remove Guestnix Branding",
    solo: { kind: "unavailable" },
    plus: included,
    pro: included,
    scale: included,
  },
  {
    feature: "AI Concierge Chat",
    solo: { kind: "unavailable" },
    plus: { kind: "unavailable" },
    pro: included,
    scale: included,
  },
  {
    feature: "Guest Upsell Store, Catalog & Payments",
    solo: { kind: "unavailable" },
    plus: included,
    pro: included,
    scale: included,
  },
  {
    feature: "Host Inbox",
    solo: { kind: "unavailable" },
    plus: included,
    pro: included,
    scale: included,
  },
  {
    feature: "Multiple Languages",
    solo: { kind: "unavailable" },
    plus: included,
    pro: included,
    scale: included,
  },
  {
    feature: "Analytics",
    solo: { kind: "unavailable" },
    plus: included,
    pro: included,
    scale: included,
  },
];

function CompareCellContent({ cell }: { cell: CompareCell }) {
  if (cell.kind === "included") {
    return (
      <span className="table-check" aria-label="Included">
        <Check size={13} />
      </span>
    );
  }

  if (cell.kind === "text") {
    return cell.value;
  }

  return (
    <span className={`compare-status is-${cell.kind}`}>
      <span>{cell.kind === "limited" ? "Limited" : "Upgrade"}</span>
      <small>{cell.note ?? "Available in beta"}</small>
    </span>
  );
}

const enterprise = [
  "Multi-client management",
  "Bulk property management",
  "White-label options",
  "Dedicated onboarding",
  "Agency partner tools",
  "Custom integrations",
  "Team permissions",
] as const;

export function PricingSection() {
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [hasInteracted, setHasInteracted] = useState(false);
  const isAnnual = interval === "year";
  const billingUnit = isAnnual ? "/yr" : "/mo";
  const setBillingInterval = (nextInterval: BillingInterval) => {
    setHasInteracted(true);
    setInterval(nextInterval);
  };

  return (
    <section
      className={`landing-section is-tight-top${hasInteracted ? " pricing-has-interacted" : ""}`}
      id="pricing"
    >
      <div className="landing-container">
        <SectionHeader
          eyebrow="Simple, honest pricing"
          align="center"
          title={
            <>
              Everything unlocked.
              <br />
              No catch.
            </>
          }
        />

        <div className="beta-bar" data-reveal data-delay="1">
          <span aria-hidden>
            <PartyPopper size={30} />
          </span>
          <div>
            <h3>Beta Pricing is Live - Grab it before it is gone.</h3>
            <p>
              Every plan includes every feature right now. No feature gates. No
              stripped-down tiers. Full access while we build toward launch.
              Lock in your rate today and keep it.
            </p>
          </div>
          <Link href="/signup" className="landing-btn landing-btn-mint">
            Claim Beta Access
          </Link>
        </div>

        <div className="migration-offer" data-reveal data-delay="2">
          <span className="migration-offer-icon" aria-hidden>
            <RefreshCw size={22} />
          </span>
          <div>
            <p className="migration-offer-label">Free beta migration</p>
            <h3>Already have a PDF, printed binder, or another guidebook?</h3>
            <p>
              Switching to GuestNix should not mean rebuilding everything from
              scratch. During our beta, we will migrate all your existing
              content to GuestNix for free.
            </p>
          </div>
          <a
            href="mailto:migrationservice@guestnix.com"
            className="landing-btn landing-btn-outline migration-offer-link"
          >
            <Mail size={17} aria-hidden />
            Contact Us
          </a>
        </div>

        <div
          className={`billing-toggle ${isAnnual ? "is-annual" : "is-monthly"}`}
          data-reveal
          data-delay="3"
          role="group"
          aria-label="Choose billing interval"
        >
          <button
            type="button"
            className="billing-option"
            aria-pressed={!isAnnual}
            onClick={() => setBillingInterval("month")}
          >
            Monthly
          </button>
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={isAnnual}
            aria-label={isAnnual ? "Switch to monthly pricing" : "Switch to annual pricing"}
            onClick={() => setBillingInterval(isAnnual ? "month" : "year")}
          >
            <span className="sr-only">Toggle billing interval</span>
          </button>
          <button
            type="button"
            className="billing-option"
            aria-pressed={isAnnual}
            onClick={() => setBillingInterval("year")}
          >
            Annual <strong>2 months free</strong>
          </button>
        </div>

        <div className="pricing-grid">
          {plans.map((plan, index) => {
            const price = isAnnual ? PLAN_MAP[plan.key].annual : PLAN_MAP[plan.key].monthly;

            return (
              <article
                key={plan.name}
                className={`pricing-card ${plan.accent}`}
                data-reveal
                data-delay={index + 1}
              >
                <p className="plan-tier">{plan.tier}</p>
                <h3>{plan.name}</h3>
                <p className="plan-price">
                  ${price}
                  <span>{billingUnit}</span>
                </p>
                <p className="plan-desc">{plan.description}</p>
                <i />
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span aria-hidden>
                        <Check size={12} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={
                    plan.accent === "featured"
                      ? "landing-btn landing-btn-mint"
                      : "landing-btn landing-btn-outline"
                  }
                >
                  Start Free Trial
                </Link>
              </article>
            );
          })}
        </div>

        <div className="compare-wrap" data-reveal data-delay="2">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Compare Features</th>
                {plans.map((plan) => {
                  const price = isAnnual ? PLAN_MAP[plan.key].annual : PLAN_MAP[plan.key].monthly;

                  return (
                    <th key={plan.key}>
                      {plan.name}
                      <br />
                      <span>${price}{billingUnit}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  {plans.map((plan) => (
                    <td key={`${row.feature}-${plan.key}`}>
                      <CompareCellContent cell={row[plan.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="enterprise-box" data-reveal data-delay="3">
          <div>
            <h3>Need more than 30 properties?</h3>
            <p>
              Enterprise & Agency Features <span>Coming Soon</span>
            </p>
            <Link href="/signup" className="landing-btn landing-btn-primary">
              Talk to Sales
            </Link>
          </div>
          <div className="enterprise-list">
            {enterprise.map((item) => (
              <span key={item}>
                <Check size={14} aria-hidden />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
