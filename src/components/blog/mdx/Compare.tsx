import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

type Cell = boolean | string | ReactNode;

export function Compare({
  left,
  right,
  rows = [],
}: {
  left?: { title: string; subtitle?: string };
  right?: { title: string; subtitle?: string };
  rows?: { feature: string; a: Cell; b: Cell }[];
}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const leftHeader = left ?? { title: "Option A" };
  const rightHeader = right ?? { title: "Option B" };
  return (
    <div className="not-prose my-10 overflow-hidden rounded-2xl border border-neutral-200">
      <div className="grid grid-cols-3 divide-x divide-neutral-200 bg-neutral-50">
        <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Feature
        </div>
        <CompareHeader {...leftHeader} />
        <CompareHeader {...rightHeader} />
      </div>
      <div className="divide-y divide-neutral-200">
        {safeRows.map((r, i) => (
          <div key={i} className="grid grid-cols-3 divide-x divide-neutral-200 text-sm">
            <div className="px-4 py-3 text-neutral-700">{r.feature}</div>
            <CompareCell value={r.a} />
            <CompareCell value={r.b} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="font-semibold text-neutral-900">{title}</p>
      {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
    </div>
  );
}

function CompareCell({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <div className="px-4 py-3 text-green-600">
        <Check className="h-5 w-5" />
      </div>
    );
  }
  if (value === false) {
    return (
      <div className="px-4 py-3 text-neutral-400">
        <X className="h-5 w-5" />
      </div>
    );
  }
  return <div className="px-4 py-3 text-neutral-700">{value}</div>;
}
