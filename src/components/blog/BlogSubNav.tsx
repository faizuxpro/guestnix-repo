"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES, CATEGORY_SLUGS } from "@/lib/blog/taxonomy";
import { cn } from "@/lib/utils";

export function BlogSubNav() {
  const pathname = usePathname();
  const items = [
    { href: "/blog", label: "All" },
    ...CATEGORY_SLUGS.map((slug) => ({
      href: `/blog/category/${slug}`,
      label: CATEGORIES[slug].name,
    })),
  ];
  return (
    <div className="border-b border-neutral-200 bg-white/60 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center gap-1 overflow-x-auto h-12">
        {items.map((i) => {
          const active = pathname === i.href;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition",
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100",
              )}
            >
              {i.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
