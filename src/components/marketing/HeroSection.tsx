"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { MaterialIcon } from "./ui/MaterialIcon";
import { GradientButton } from "./ui/GradientButton";
import { HeroPhoneMockup } from "./ui/HeroPhoneMockup";

export function HeroSection() {
  const router = useRouter();
  const [property, setProperty] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = property.trim();
    if (name) {
      router.push(`/signup?property=${encodeURIComponent(name)}`);
    } else {
      router.push("/signup");
    }
  };

  return (
    <section className="relative overflow-hidden pt-16 md:pt-24 pb-20">
      <div
        className="pointer-events-none absolute -top-32 -right-40 w-[600px] h-[600px] rounded-full bg-[color:var(--marketing-primary)]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-32 w-[500px] h-[500px] rounded-full bg-[color:var(--marketing-accent)]/10 blur-3xl"
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <motion.div
          className="lg:col-span-7 space-y-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.1 } },
          }}
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[color:var(--marketing-primary)]/5 text-[color:var(--marketing-primary)] text-xs font-semibold uppercase tracking-wider"
          >
            <MaterialIcon name="star" size={14} fill />
            For Airbnb &amp; vacation rental hosts
          </motion.div>

          <motion.h1
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-[color:var(--marketing-text)]"
          >
            Stop answering the same{" "}
            <span className="bg-gradient-to-r from-[color:var(--marketing-primary)] to-[color:var(--marketing-primary-light)] bg-clip-text text-transparent">
              Wi-Fi question
            </span>{" "}
            at 11&nbsp;pm.
          </motion.h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-lg md:text-xl text-[color:var(--marketing-text-variant)] leading-relaxed max-w-xl"
          >
            Build a beautiful digital welcome guide with an AI concierge that
            answers guest questions for you. Free forever for your first
            guidebook.
          </motion.p>

          <motion.form
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onSubmit={onSubmit}
            className="flex flex-col sm:flex-row gap-3 max-w-xl"
          >
            <div className="relative flex-1">
              <MaterialIcon
                name="home_work"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--marketing-muted)]"
                size={20}
              />
              <input
                type="text"
                name="property"
                value={property}
                onChange={(e) => setProperty(e.target.value)}
                placeholder="Your property name (e.g. Oceanview Villa)"
                className="w-full pl-12 pr-4 py-4 rounded-full border border-[color:var(--marketing-border)] bg-white shadow-sm focus:ring-2 focus:ring-[color:var(--marketing-primary)] focus:outline-none text-[color:var(--marketing-text)] placeholder:text-[color:var(--marketing-muted)]"
              />
            </div>
            <GradientButton size="lg" type="submit">
              Create my guidebook
              <MaterialIcon name="arrow_forward" size={18} />
            </GradientButton>
          </motion.form>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-sm text-[color:var(--marketing-muted)]"
          >
            Free forever · No credit card · 5-minute setup
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="lg:col-span-5 pt-8 lg:pt-0"
        >
          <HeroPhoneMockup />
        </motion.div>
      </div>
    </section>
  );
}
