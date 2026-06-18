"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  hideLabel?: string;
  revealLabel?: string;
};

function PasswordInput({
  className,
  disabled,
  hideLabel = "Hide password",
  revealLabel = "Show password",
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <div className="relative">
      <Input
        type={isVisible ? "text" : "password"}
        className={cn("pr-10", className)}
        disabled={disabled}
        {...props}
      />
      <button
        type="button"
        className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled}
        aria-label={isVisible ? hideLabel : revealLabel}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((visible) => !visible)}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export { PasswordInput };
