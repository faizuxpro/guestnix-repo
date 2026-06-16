import { Children, type ReactNode } from "react";

export function Steps({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <ol className="not-prose my-8 space-y-4">
      {items.map((child, i) => (
        <li key={i} className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--marketing-primary)] text-sm font-bold text-white">
            {i + 1}
          </span>
          <div className="flex-1">{child}</div>
        </li>
      ))}
    </ol>
  );
}
