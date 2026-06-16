import type { ReactNode } from "react";

export function Stats({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}
