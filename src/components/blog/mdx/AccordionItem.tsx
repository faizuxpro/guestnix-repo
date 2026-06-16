import type { ReactNode } from "react";

export function AccordionItem({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-xl border border-neutral-200 bg-white"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-neutral-900">
        <span>{title}</span>
        <span className="shrink-0 text-neutral-400 group-open:rotate-180 transition">▾</span>
      </summary>
      <div className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-700 [&>p:last-child]:mb-0 [&>p]:mb-2">
        {children}
      </div>
    </details>
  );
}
