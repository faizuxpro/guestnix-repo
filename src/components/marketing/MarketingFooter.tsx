import Link from "next/link";
import { BrandLockup } from "@/components/brand/BrandLockup";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Templates", href: "#" },
      { label: "Pricing", href: "/pricing" },
      { label: "Roadmap", href: "#roadmap" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "#" },
      { label: "Partners", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
    ],
  },
] as const;

export function MarketingFooter() {
  return (
    <footer className="bg-white px-5 pb-9 pt-16 text-[color:var(--gn-dark)]">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-11 border-t border-[color:var(--marketing-border)] pt-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex">
              <BrandLockup
                size="md"
                logoClassName="h-9"
              />
            </Link>
            <p className="mt-4 max-w-[250px] text-sm font-semibold leading-6 text-[color:var(--marketing-muted)]">
              The guest experience platform for hosts who take hospitality
              seriously.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 text-xs font-extrabold uppercase tracking-[0.1em] text-[color:var(--marketing-muted)]">
                {column.title}
              </h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-bold text-[color:var(--gn-dark)]/65 transition-colors hover:text-[color:var(--gn-dark)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-11 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--marketing-border)] pt-6 text-sm font-semibold text-[color:var(--marketing-muted)]">
          <span>&copy; 2026 Guestnix. All rights reserved.</span>
          <span>Made with care for the hospitality community.</span>
        </div>
      </div>
    </footer>
  );
}
