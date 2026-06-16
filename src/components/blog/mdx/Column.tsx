import type { ReactNode } from "react";

export function Column({ children }: { children: ReactNode }) {
  return <div className="prose prose-neutral blog-prose">{children}</div>;
}
