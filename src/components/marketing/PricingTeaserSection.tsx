"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { MaterialIcon } from "./ui/MaterialIcon";
import { GradientButton } from "./ui/GradientButton";

const FREE = [
  "1 guidebook",
  "All blocks + templates",
  "AI chat (10/mo)",
  "Guestnix branding",
  "guestnix.com/g/slug",
];

const PRO = [
  "Unlimited guidebooks",
  "All blocks + templates",
  "Unlimited AI chat",
  "Remove branding",
  "Custom domain",
  "Advanced analytics",
];

export function PricingTeaserSection() {
  return (
    <section className="py-20 md:py-28 bg-[color:var(--marketing-surface-low)]">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--marketing-primary)]/5 text-[color:var(--marketing-primary)] text-xs font-semibold uppercase tracking-wider mb-4">
            <MaterialIcon name="sell" size={14} />
            Pricing
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Free forever. Or unlock more for $12/mo.
          </h2>
          <p className="text-lg text-[color:var(--marketing-text-variant)]">
            No credit card on free. Cancel anytime on Pro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-3xl border border-[color:var(--marketing-border)] bg-white p-8"
          >
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-1">Free</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">$0</span>
                <span className="text-[color:var(--marketing-muted)]">/forever</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-[color:var(--marketing-text-variant)]"
                >
                  <MaterialIcon
                    name="check_circle"
                    size={18}
                    className="text-[color:var(--marketing-primary)]"
                  />
                  {f}
                </li>
              ))}
            </ul>
            <GradientButton href="/signup" className="w-full">
              Start free
            </GradientButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
            className="rounded-3xl border-2 border-[color:var(--marketing-primary)] bg-gradient-to-br from-[color:var(--marketing-primary)] to-[color:var(--marketing-primary-light)] text-white p-8 relative"
          >
            <span className="absolute top-5 right-5 px-3 py-1 rounded-full bg-[color:var(--marketing-accent)] text-[color:var(--marketing-primary)] text-xs font-bold uppercase tracking-wider">
              Recommended
            </span>
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-1">Pro</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">$12</span>
                <span className="opacity-70">/month or $99/year</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {PRO.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <MaterialIcon
                    name="check_circle"
                    size={18}
                    className="text-white"
                    fill
                  />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/pricing"
              className="block w-full py-3 text-center rounded-full font-semibold bg-white text-[color:var(--marketing-primary)] hover:opacity-90 transition-opacity"
            >
              Compare plans →
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
