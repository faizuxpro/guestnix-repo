import type { ReactNode } from "react";

export function Columns({ children }: { children: ReactNode }) {
  return <div className="not-prose my-8 grid gap-6 md:grid-cols-2">{children}</div>;
}
