import type { ReactNode } from "react";

type Column = { title: string; subtitle?: string };
type Row = { feature: string; values: ReactNode[] };

export function ComparisonTable({
  columns,
  rows,
}: {
  columns: Column[];
  rows: Row[];
}) {
  const cols = columns.length;
  return (
    <div className="not-prose my-10 overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Feature
            </th>
            {columns.map((c, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <p className="font-semibold text-neutral-900">{c.title}</p>
                {c.subtitle && <p className="text-xs text-neutral-500">{c.subtitle}</p>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-neutral-200">
              <td className="px-4 py-3 text-neutral-700">{r.feature}</td>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} className="px-4 py-3 text-neutral-700">
                  {r.values[j]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
