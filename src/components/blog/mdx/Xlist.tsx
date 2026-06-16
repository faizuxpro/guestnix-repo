import type { ReactNode } from "react";

export function Xlist({ children }: { children: ReactNode }) {
  return <ul className="not-prose my-6 space-y-2">{children}</ul>;
}
