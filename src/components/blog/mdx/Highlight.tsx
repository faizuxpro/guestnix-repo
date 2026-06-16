import type { ReactNode } from "react";

export function Highlight({ children }: { children: ReactNode }) {
  return (
    <mark className="bg-[oklch(0.95_0.12_86)] px-1 text-inherit">{children}</mark>
  );
}
