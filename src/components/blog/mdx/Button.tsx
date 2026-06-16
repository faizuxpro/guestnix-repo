import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Button({
  href,
  variant = "primary",
  children,
}: {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition no-underline";
  return (
    <Link
      href={href}
      className={cn(
        base,
        variant === "primary" && "bg-[var(--marketing-primary)] text-white hover:brightness-110",
        variant === "secondary" && "bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
        variant === "ghost" && "text-[var(--marketing-primary)] hover:underline",
      )}
    >
      {children}
    </Link>
  );
}
