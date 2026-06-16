export type FaqItemProps = { q: string; a: string };

export function FaqItem({ q, a }: FaqItemProps) {
  return (
    <details className="group rounded-xl border border-neutral-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-neutral-900">
        <span>{q}</span>
        <span className="shrink-0 text-neutral-400 group-open:rotate-180 transition">▾</span>
      </summary>
      <div className="border-t border-neutral-200 px-4 py-3 text-sm text-neutral-700">{a}</div>
    </details>
  );
}
