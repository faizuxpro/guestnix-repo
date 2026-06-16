"use client";

import { type VariantProps } from "class-variance-authority";
import { ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  BETA_ENABLED,
  BETA_TRIAL_EXTENSION_COPY,
  BETA_TRIAL_EXTENSION_FORM_URL,
} from "@/lib/beta";
import { cn } from "@/lib/utils";

type BetaTrialExtensionButtonProps = {
  className?: string;
  label?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
};

export function BetaTrialExtensionButton({
  className,
  label = "Extend trial",
  size = "sm",
  variant = "outline",
}: BetaTrialExtensionButtonProps) {
  if (!BETA_ENABLED) return null;

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-1.5", className)}
      aria-label={`${label}: ${BETA_TRIAL_EXTENSION_COPY}`}
      title={BETA_TRIAL_EXTENSION_COPY}
      render={
        <a
          href={BETA_TRIAL_EXTENSION_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
        />
      }
    >
      <span>{label}</span>
      <ExternalLink data-icon="inline-end" className="h-3.5 w-3.5" aria-hidden="true" />
    </Button>
  );
}
