import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

export function GlassCard({ children, className, ...rest }: Props) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-3xl border border-white/20 bg-white/70 backdrop-blur-md",
        "shadow-[0_20px_40px_rgba(20,27,43,0.15)]",
        className
      )}
    >
      {children}
    </div>
  );
}
