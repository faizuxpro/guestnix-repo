import Link from "next/link";
import { cn } from "@/lib/utils";

export function CTA({
  heading,
  body,
  href,
  label,
  variant = "gradient",
}: {
  heading: string;
  body?: string;
  href: string;
  label: string;
  variant?: "gradient" | "outline" | "solid";
}) {
  const container = cn(
    "not-prose my-10 rounded-2xl p-8 text-center",
    variant === "gradient" &&
      "bg-gradient-to-br from-[var(--marketing-primary)] to-[var(--marketing-primary-light)] text-white",
    variant === "outline" && "border-2 border-neutral-900 bg-white text-neutral-900",
    variant === "solid" && "bg-neutral-900 text-white",
  );

  const button = cn(
    "inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition",
    variant === "gradient" && "bg-white text-neutral-900 hover:bg-neutral-100",
    variant === "outline" && "bg-neutral-900 text-white hover:bg-neutral-800",
    variant === "solid" && "bg-white text-neutral-900 hover:bg-neutral-100",
  );

  return (
    <aside className={container}>
      <h3 className="text-2xl font-bold tracking-tight">{heading}</h3>
      {body && (
        <p
          className={cn(
            "mt-2 text-base",
            variant === "gradient" || variant === "solid" ? "text-white/90" : "text-neutral-600",
          )}
        >
          {body}
        </p>
      )}
      <div className="mt-6">
        <Link href={href} className={button}>
          {label} →
        </Link>
      </div>
    </aside>
  );
}
