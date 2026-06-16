import { cn } from "@/lib/utils";

export function TagChips({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((t) => (
        <li
          key={t}
          className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-600"
        >
          #{t}
        </li>
      ))}
    </ul>
  );
}
