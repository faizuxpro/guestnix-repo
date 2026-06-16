import Link from "next/link";
import { cn } from "@/lib/utils";

export function Pagination({
  basePath,
  page,
  totalPages,
}: {
  basePath: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pageUrl = (p: number) => (p === 1 ? basePath : `${basePath}?page=${p}`);
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1">
      {page > 1 && (
        <Link
          href={pageUrl(page - 1)}
          className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          ← Previous
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={pageUrl(p)}
          className={cn(
            "rounded-full px-3 py-2 text-sm font-medium",
            p === page
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:bg-neutral-100",
          )}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link
          href={pageUrl(page + 1)}
          className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}
