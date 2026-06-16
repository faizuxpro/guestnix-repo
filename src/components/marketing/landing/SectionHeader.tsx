import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  className,
}: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <div
      className={cn("landing-section-header", centered && "is-centered", className)}
      data-reveal
    >
      <p className={cn("landing-label", tone === "dark" && "is-dark")}>{eyebrow}</p>
      <h2 className={cn("landing-h2", tone === "dark" && "is-dark")}>{title}</h2>
      {description ? <p className="landing-header-copy">{description}</p> : null}
    </div>
  );
}
