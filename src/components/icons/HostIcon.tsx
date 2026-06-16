"use client";

import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { sanitizeSvg, isSvgMarkup } from "@/lib/icons/sanitize";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null | undefined;
  className?: string;
  /** Iconify id used when value is empty. Pass null to render nothing. */
  fallbackIconifyId?: string | null;
  "aria-label"?: string;
};

const ICONIFY_REF_RE = /^[a-z0-9-]+:[a-z0-9-]+$/i;

export function HostIcon({
  value,
  className,
  fallbackIconifyId = "ph:info-fill",
  "aria-label": ariaLabel,
}: Props) {
  const clean = useMemo(() => {
    if (!value) return null;
    if (isSvgMarkup(value)) return sanitizeSvg(value);
    return null;
  }, [value]);

  const iconifyRef = useMemo(() => {
    if (!value || isSvgMarkup(value)) return null;
    const v = value.trim();
    if (ICONIFY_REF_RE.test(v)) return v;
    return null;
  }, [value]);

  if (clean) {
    return (
      <span
        className={cn(
          "host-icon inline-flex shrink-0 items-center justify-center [&_svg]:!size-[1em] [&_svg]:fill-current",
          className
        )}
        aria-label={ariaLabel}
        aria-hidden={ariaLabel ? undefined : true}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  const resolved = iconifyRef ?? fallbackIconifyId;
  if (!resolved) return null;

  return (
    <Icon
      icon={resolved}
      className={cn("host-icon inline-block size-[1em] shrink-0", className)}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    />
  );
}
