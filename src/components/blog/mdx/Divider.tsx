import { cn } from "@/lib/utils";

export function Divider({ variant = "dots" }: { variant?: "line" | "dots" | "wave" }) {
  if (variant === "line") {
    return <hr className="not-prose my-10 border-t border-neutral-200" />;
  }
  if (variant === "wave") {
    return (
      <div aria-hidden className="not-prose my-10 text-center text-neutral-300 text-2xl">
        ∿ ∿ ∿
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "not-prose my-10 text-center tracking-[0.75em] text-neutral-400",
      )}
    >
      · · ·
    </div>
  );
}
