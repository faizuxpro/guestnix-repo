"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode, AnchorHTMLAttributes } from "react";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold text-white " +
  "bg-[image:var(--marketing-primary-gradient)] " +
  "shadow-[0_4px_14px_rgba(0,0,0,0.22)] " +
  "transition-all duration-200 " +
  "hover:shadow-[0_8px_20px_rgba(0,0,0,0.32)] hover:scale-[1.02] " +
  "active:scale-[0.98] " +
  "disabled:opacity-60 disabled:pointer-events-none disabled:hover:scale-100";

const SIZES = {
  default: "px-6 py-2.5 text-sm",
  lg: "px-8 py-4 text-base",
} as const;

type Size = keyof typeof SIZES;

type BaseProps = {
  children: ReactNode;
  size?: Size;
  className?: string;
};

type ButtonVariantProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & { href?: undefined };
type LinkVariantProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href"> & { href: string };

type GradientButtonProps = ButtonVariantProps | LinkVariantProps;

export function GradientButton(props: GradientButtonProps) {
  const { children, className, size = "default" } = props;
  const classes = cn(BASE, SIZES[size], className);

  if ("href" in props && props.href) {
    const { href, children: _c, size: _s, className: _cn, ...rest } = props;
    void _c;
    void _s;
    void _cn;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { children: _c, size: _s, className: _cn, ...rest } = props as ButtonVariantProps;
  void _c;
  void _s;
  void _cn;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
