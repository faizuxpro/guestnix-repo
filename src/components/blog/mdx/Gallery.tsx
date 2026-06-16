import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Gallery({
  cols = 2,
  children,
}: {
  cols?: 2 | 3;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "not-prose my-8 grid gap-3",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-2 sm:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}
