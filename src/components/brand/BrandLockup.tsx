import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLockupSize = "sm" | "md" | "lg";
type BrandLockupTone = "default" | "light";

interface BrandLockupProps {
  size?: BrandLockupSize;
  tone?: BrandLockupTone;
  showText?: boolean;
  className?: string;
  iconClassName?: string;
  logoClassName?: string;
  textClassName?: string;
}

const BRAND_ASSETS = {
  full: {
    default: "/brand/Guestnix full Logo (for light bg).svg",
    light: "/brand/Guestnix full logo (for dark bg).svg",
  },
  icon: {
    default: "/brand/Guestnix icon (for light bg).svg",
    light: "/brand/Guestnix icon (for dark bg).svg",
  },
} as const;

const FULL_LOGO_DIMENSIONS = {
  default: { width: 5621, height: 1602 },
  light: { width: 5297, height: 1439 },
} as const;

const ICON_DIMENSIONS = {
  default: { width: 1399, height: 1602 },
  light: { width: 1061, height: 1264 },
} as const;

const SIZE_CLASSES: Record<BrandLockupSize, { icon: string; logo: string }> = {
  sm: {
    icon: "h-6 w-auto",
    logo: "h-7 w-auto",
  },
  md: {
    icon: "h-7 w-auto",
    logo: "h-8 w-auto",
  },
  lg: {
    icon: "h-9 w-auto",
    logo: "h-12 w-auto",
  },
};

export function BrandLockup({
  size = "md",
  tone = "default",
  showText = true,
  className,
  iconClassName,
  logoClassName,
}: BrandLockupProps) {
  const sizeClasses = SIZE_CLASSES[size];
  const assetTone = tone === "light" ? "light" : "default";
  const src = showText
    ? BRAND_ASSETS.full[assetTone]
    : BRAND_ASSETS.icon[assetTone];
  const dimensions = showText
    ? FULL_LOGO_DIMENSIONS[assetTone]
    : ICON_DIMENSIONS[assetTone];

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src={src}
        alt={showText ? "Guestnix" : ""}
        aria-hidden={!showText}
        width={dimensions.width}
        height={dimensions.height}
        priority={size === "lg"}
        className={cn(
          "block shrink-0",
          showText ? sizeClasses.logo : sizeClasses.icon,
          showText ? logoClassName : iconClassName
        )}
      />
    </span>
  );
}
