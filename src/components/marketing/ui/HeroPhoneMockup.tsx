"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

const SCREENS = [
  { src: "/marketing/hero-screens/01-welcome.png", alt: "Welcome section" },
  { src: "/marketing/hero-screens/02-wifi.png", alt: "Wi-Fi details" },
  { src: "/marketing/hero-screens/03-checkin.png", alt: "Check-in instructions" },
  { src: "/marketing/hero-screens/04-places.png", alt: "Local places map" },
  { src: "/marketing/hero-screens/05-ai-chat.png", alt: "AI concierge chat" },
];

const INTERVAL_MS = 3500;

export function HeroPhoneMockup() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SCREENS.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const current = SCREENS[index];

  return (
    <div className="relative mx-auto w-[280px] md:w-[320px] aspect-[390/844]">
      <div className="absolute inset-0 rounded-[3rem] bg-slate-900 shadow-[0_40px_80px_rgba(0,41,39,0.25)]" />
      <div className="absolute inset-[10px] rounded-[2.6rem] overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.src}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={current.src}
              alt={current.alt}
              fill
              sizes="(max-width: 768px) 280px, 320px"
              className="object-cover"
              priority={index === 0}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5"
        aria-hidden
      >
        {SCREENS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index
                ? "w-6 bg-[color:var(--marketing-primary)]"
                : "w-1.5 bg-[color:var(--marketing-border)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
