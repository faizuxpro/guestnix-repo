"use client";

import { motion } from "motion/react";
import { MaterialIcon } from "./ui/MaterialIcon";

const STEPS = [
  {
    num: "Step one",
    icon: "dashboard_customize",
    title: "Pick a starting point",
    body: "Choose a template pre-filled with what guests expect: Wi-Fi, check-in, rules, places, FAQ.",
  },
  {
    num: "Step two",
    icon: "edit_document",
    title: "Add your details",
    body: "Block editor feels like Notion. Type, drag, done. Most hosts finish in 30 minutes.",
  },
  {
    num: "Step three",
    icon: "qr_code",
    title: "Share one link",
    body: "QR code in the property, link in booking messages, add it to your listing. One link, forever.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--marketing-primary)]/5 text-[color:var(--marketing-primary)] text-xs font-semibold uppercase tracking-wider mb-4">
            <MaterialIcon name="route" size={14} />
            How it works
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Get started in 3 steps.
          </h2>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            aria-hidden
            className="hidden md:block absolute top-1/2 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed border-[color:var(--marketing-border)]"
          />
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.12, ease: "easeOut" }}
              className="relative bg-[color:var(--marketing-surface-low)] border border-[color:var(--marketing-border)] rounded-3xl p-10 text-center"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-[color:var(--marketing-primary)] border border-[color:var(--marketing-border)] text-xs font-bold">
                {s.num}
              </span>
              <div className="w-20 h-20 mx-auto rounded-full bg-[color:var(--marketing-primary)]/10 text-[color:var(--marketing-primary)] flex items-center justify-center mb-6">
                <MaterialIcon name={s.icon} size={36} />
              </div>
              <h3 className="text-xl font-bold mb-3">{s.title}</h3>
              <p className="text-sm text-[color:var(--marketing-text-variant)] leading-relaxed">
                {s.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
