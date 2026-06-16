import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Badge({
  variant = "primary",
  children,
}: {
  variant?: "primary" | "secondary" | "outline";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variant === "primary" && "bg-[var(--marketing-primary)] text-white",
        variant === "secondary" && "bg-neutral-100 text-neutral-800",
        variant === "outline" && "border border-neutral-300 text-neutral-700",
      )}
    >
      {children}
    </span>
  );
}
