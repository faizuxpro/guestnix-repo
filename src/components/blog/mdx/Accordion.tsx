import type { ReactNode } from "react";

export function Accordion({ children }: { children: ReactNode }) {
  return <div className="not-prose my-6 space-y-2">{children}</div>;
}
