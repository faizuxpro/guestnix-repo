"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { MaterialIcon } from "./ui/MaterialIcon";
import { ComingSoonDialog } from "./ui/ComingSoonDialog";

type Demo = {
  slug: "sunset-template" | "demo-cabin" | "demo-flat";
  name: string;
  location: string;
  badge: string;
  initial: string;
  thumbnail: string;
  bullets: string[];
  live: boolean;
};

const DEMOS: Demo[] = [
  {
    slug: "sunset-template",
    name: "Oceanview Villa",
    location: "Malibu, California",
    badge: "Villa",
    initial: "O",
    thumbnail: "/marketing/templates/oceanview-villa.jpg",
    bullets: [
      "Wi-Fi, pool & beach access",
      "Local surf spots & restaurants",
      "Smart home guide",
    ],
    live: true,
  },
  {
    slug: "demo-cabin",
    name: "Alpine Forest Cabin",
    location: "Chamonix, France",
    badge: "Cabin",
    initial: "A",
    thumbnail: "/marketing/templates/alpine-cabin.jpg",
    bullets: ["Self check-in", "Firewood stove guide", "Hiking trails & maps"],
    live: false,
  },
  {
    slug: "demo-flat",
    name: "City Center Flat",
    location: "London, UK",
    badge: "Apt",
    initial: "C",
    thumbnail: "/marketing/templates/city-flat.jpg",
    bullets: [
      "Keybox / code",
      "Local attractions",
      "Transport recommendations",
    ],
    live: false,
  },
];

export function LiveDemoSection() {
  const [pending, setPending] = useState<Demo | null>(null);

  return (
    <section
      id="demo"
      className="py-20 md:py-28 bg-[color:var(--marketing-surface-low)]"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--marketing-primary)]/5 text-[color:var(--marketing-primary)] text-xs font-semibold uppercase tracking-wider mb-4">
            <MaterialIcon name="visibility" size={14} />
            Live demos
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            See it in action.
          </h2>
          <p className="text-lg text-[color:var(--marketing-text-variant)]">
            Same Guestnix product, three very different properties. Open any
            guide to see exactly what your guests would see.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEMOS.map((d, i) => (
            <motion.article
              key={d.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
              className="group rounded-3xl border border-[color:var(--marketing-border)] bg-white overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="relative h-48 overflow-hidden">
                <Image
                  src={d.thumbnail}
                  alt={d.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-bold text-[color:var(--marketing-text)]">
                  {d.badge}
                </span>
                <span className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white text-[color:var(--marketing-primary)] font-extrabold flex items-center justify-center shadow-md">
                  {d.initial}
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold mb-1">{d.name}</h3>
                <p className="text-sm text-[color:var(--marketing-muted)] mb-4">
                  {d.location}
                </p>
                <ul className="space-y-2 mb-6">
                  {d.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-center gap-2 text-sm text-[color:var(--marketing-text-variant)]"
                    >
                      <MaterialIcon
                        name="check_circle"
                        size={16}
                        className="text-[color:var(--marketing-primary)]"
                      />
                      {b}
                    </li>
                  ))}
                </ul>
                {d.live ? (
                  <Link
                    href={`/demo/${d.slug}`}
                    className="block w-full py-3 text-center rounded-xl font-semibold text-[color:var(--marketing-primary)] border border-[color:var(--marketing-primary)]/30 hover:bg-[color:var(--marketing-primary)]/5 transition-colors"
                  >
                    View live guide
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPending(d)}
                    className="block w-full py-3 text-center rounded-xl font-semibold text-[color:var(--marketing-muted)] border border-[color:var(--marketing-border)] hover:border-[color:var(--marketing-primary)]/30 hover:text-[color:var(--marketing-primary)] transition-colors"
                  >
                    Coming soon
                  </button>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      <ComingSoonDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        propertyName={pending?.name ?? ""}
      />
    </section>
  );
}
