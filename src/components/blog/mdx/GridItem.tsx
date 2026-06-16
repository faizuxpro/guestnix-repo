import type { ReactNode } from "react";

export function GridItem({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-neutral-200 bg-white p-5">{children}</div>;
}
