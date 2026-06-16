import Link from "next/link";
import { getCategory, type CategorySlug } from "@/lib/blog/taxonomy";
import { cn } from "@/lib/utils";

export function CategoryChip({
  slug,
  className,
}: {
  slug: CategorySlug;
  className?: string;
}) {
  const c = getCategory(slug);
  return (
    <Link
      href={`/blog/category/${slug}`}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        "text-white/95 hover:brightness-110 transition",
        className,
      )}
      style={{ background: c.accent }}
    >
      {c.name}
    </Link>
  );
}
