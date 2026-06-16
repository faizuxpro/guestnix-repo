import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-neutral-300 bg-neutral-50 px-1.5 py-0.5 text-xs font-mono shadow-sm">
      {children}
    </kbd>
  );
}
