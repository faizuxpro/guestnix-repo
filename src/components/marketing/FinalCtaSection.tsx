"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MaterialIcon } from "./ui/MaterialIcon";
import { GradientButton } from "./ui/GradientButton";

export function FinalCtaSection() {
  const router = useRouter();
  const [property, setProperty] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = property.trim();
    router.push(name ? `/signup?property=${encodeURIComponent(name)}` : "/signup");
  };

  return (
    <section className="py-20 md:py-28">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[color:var(--marketing-primary)] to-[color:var(--marketing-primary-light)] text-white p-12 md:p-16 text-center">
          <div
            className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[color:var(--marketing-accent)]/20 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Ready to stop repeating yourself?
            </h2>
            <p className="text-lg md:text-xl opacity-90 mb-8 max-w-xl mx-auto">
              Your first guidebook is free. Forever. No credit card.
            </p>
            <form
              onSubmit={onSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
            >
              <div className="relative flex-1">
                <MaterialIcon
                  name="home_work"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60"
                  size={20}
                />
                <input
                  type="text"
                  name="property"
                  value={property}
                  onChange={(e) => setProperty(e.target.value)}
                  placeholder="Your property name"
                  className="w-full pl-12 pr-4 py-4 rounded-full border border-white/20 bg-white/10 backdrop-blur text-white placeholder:text-white/50 focus:ring-2 focus:ring-white focus:outline-none"
                />
              </div>
              <GradientButton
                size="lg"
                type="submit"
                className="!bg-white !text-[color:var(--marketing-primary)] !bg-none hover:!bg-white/90"
              >
                Start free
                <MaterialIcon name="arrow_forward" size={18} />
              </GradientButton>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
