"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string; level: 2 | 3 };

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const prose = document.querySelector(".blog-prose");
    if (!prose) return;
    const nodes = Array.from(prose.querySelectorAll("h2, h3")) as HTMLHeadingElement[];
    const items: Heading[] = nodes
      .filter((n) => n.id)
      .map((n) => ({
        id: n.id,
        text: n.textContent?.replace(/#\s*$/, "").trim() ?? "",
        level: (n.tagName === "H2" ? 2 : 3) as 2 | 3,
      }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadings(items);
  }, []);

  useEffect(() => {
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0% -70% 0%", threshold: 0 },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (!headings.length) return null;

  return (
    <nav aria-label="Table of contents" className="text-sm">
      <p className="mb-3 font-semibold uppercase tracking-wider text-xs text-neutral-500">
        On this page
      </p>
      <ul className="space-y-2 border-l border-neutral-200">
        {headings.map((h) => (
          <li key={h.id} className={cn(h.level === 3 && "ml-4")}>
            <a
              href={`#${h.id}`}
              className={cn(
                "block border-l-2 -ml-[1px] pl-3 py-1 transition",
                activeId === h.id
                  ? "border-[var(--marketing-primary)] text-neutral-900 font-medium"
                  : "border-transparent text-neutral-500 hover:text-neutral-900",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
