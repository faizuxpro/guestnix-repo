import type { ReactNode } from "react";

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <p className="mb-1 font-semibold text-neutral-900">{title}</p>
      <div className="text-sm text-neutral-700 [&>p:last-child]:mb-0 [&>p]:mb-2">{children}</div>
    </>
  );
}
