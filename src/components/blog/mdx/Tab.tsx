import type { ReactNode } from "react";

export type TabProps = { label: string; children: ReactNode };

export function Tab({ children }: TabProps) {
  return <div className="prose prose-neutral blog-prose">{children}</div>;
}
