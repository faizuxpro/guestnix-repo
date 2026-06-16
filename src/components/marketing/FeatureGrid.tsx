"use client";

import { motion } from "motion/react";
import { MaterialIcon } from "./ui/MaterialIcon";

const FEATURES = [
  {
    icon: "grid_view",
    title: "Block editor",
    body: "Drag blocks for Wi-Fi, check-in, rules, amenities, places, FAQ, and more. No design skills needed.",
  },
  {
    icon: "smart_toy",
    title: "AI concierge",
    body: "Guests ask questions in chat. AI answers from your guidebook so you don't have to.",
  },
  {
    icon: "phone_iphone",
    title: "Mobile-first PWA",
    body: "Works offline, installs like an app. No login, no downloads — just a link.",
  },
  {
    icon: "dashboard_customize",
    title: "Templates",
    body: "Start beautiful. Pick a template seeded with 10 real sections ready to tailor.",
  },
  {
    icon: "palette",
    title: "Custom branding",
    body: "Upload your logo, pick your colors, match your property.",
    tag: "Pro",
  },
  {
    icon: "insights",
    title: "Analytics",
    body: "Views, top sections, chat questions. Understand what guests actually use.",
  },
] as const;

export function FeatureGrid() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--marketing-primary)]/5 text-[color:var(--marketing-primary)] text-xs font-semibold uppercase tracking-wider mb-4">
            <MaterialIcon name="widgets" size={14} />
            Features
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[color:var(--marketing-text)] mb-4">
            Everything your guests need — in one link.
          </h2>
          <p className="text-lg text-[color:var(--marketing-text-variant)]">
            The block editor, AI concierge, and PWA do the work of a 24/7 host
            so you don&apos;t have to.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              className="group rounded-3xl border border-[color:var(--marketing-border)] bg-white p-8 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-2xl bg-[color:var(--marketing-primary)]/10 text-[color:var(--marketing-primary)] flex items-center justify-center mb-5">
                <MaterialIcon name={f.icon} size={24} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-[color:var(--marketing-text)]">
                  {f.title}
                </h3>
                {"tag" in f && f.tag && (
                  <span className="px-2 py-0.5 rounded-full bg-[color:var(--marketing-accent)]/15 text-[color:var(--marketing-accent)] text-[10px] font-bold uppercase tracking-wider">
                    {f.tag}
                  </span>
                )}
              </div>
              <p className="text-sm text-[color:var(--marketing-text-variant)] leading-relaxed">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
