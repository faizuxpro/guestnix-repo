export function Stat({
  value,
  label,
  sublabel,
}: {
  value: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-6">
      <p className="text-4xl font-extrabold tracking-tight text-[var(--marketing-primary)]">
        {value}
      </p>
      <p className="font-semibold text-neutral-900">{label}</p>
      {sublabel && <p className="text-sm text-neutral-500">{sublabel}</p>}
    </div>
  );
}
