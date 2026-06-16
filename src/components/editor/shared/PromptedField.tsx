"use client";

import { forwardRef, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { QuickVariableInsertMenu } from "./QuickVariableInsertMenu";

const FIELD_BASE_CLASS =
  "w-full rounded-md border border-border/70 bg-background px-2.5 py-2 text-[13px] leading-tight text-foreground outline-none transition-all duration-150 placeholder:text-muted-foreground/60 hover:border-foreground/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-60";

function FieldLabel({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="block text-[12px] font-medium leading-tight text-foreground"
    >
      {label}
    </label>
  );
}

export function HoverLabel({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "block text-[12px] font-medium leading-tight text-foreground",
        className
      )}
    >
      {label}
    </span>
  );
}

type PromptedInputProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric" | "decimal" | "search";
  disabled?: boolean;
  id?: string;
  trailing?: React.ReactNode;
  className?: string;
  enableQuickVariables?: boolean;
};

export const PromptedInput = forwardRef<HTMLInputElement, PromptedInputProps>(
  function PromptedInput(
    {
      label,
      value,
      onChange,
      placeholder,
      type = "text",
      inputMode,
      disabled,
      id,
      trailing,
      className,
      enableQuickVariables = true,
    },
    ref
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const showQuickVariables =
      enableQuickVariables &&
      !disabled &&
      type !== "number" &&
      inputMode !== "numeric" &&
      inputMode !== "decimal";

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const insertToken = (token: string) => {
      const node = inputRef.current;
      const start = node?.selectionStart ?? value.length;
      const end = node?.selectionEnd ?? start;
      const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
      onChange(next);
      window.requestAnimationFrame(() => {
        node?.focus();
        const cursor = start + token.length;
        node?.setSelectionRange(cursor, cursor);
      });
    };

    return (
      <div className={cn("space-y-1.5", className)}>
        <FieldLabel id={inputId} label={label} />
        <div className="relative">
          <input
            ref={setRefs}
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder ?? label}
            type={type}
            inputMode={inputMode}
            disabled={disabled}
            aria-label={label}
            className={cn(
              FIELD_BASE_CLASS,
              (trailing || showQuickVariables) && "pr-11",
              trailing && showQuickVariables && "pr-20"
            )}
          />
          {trailing || showQuickVariables ? (
            <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
              {showQuickVariables ? (
                <QuickVariableInsertMenu onInsert={insertToken} />
              ) : null}
              {trailing}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
);

type PromptedTextareaProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
  enableQuickVariables?: boolean;
};

export const PromptedTextarea = forwardRef<
  HTMLTextAreaElement,
  PromptedTextareaProps
>(function PromptedTextarea(
  {
    label,
    value,
    onChange,
    placeholder,
    rows = 3,
    disabled,
    id,
    className,
    enableQuickVariables = true,
  },
  ref
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const showQuickVariables = enableQuickVariables && !disabled;

  const setRefs = (node: HTMLTextAreaElement | null) => {
    textareaRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const insertToken = (token: string) => {
    const node = textareaRef.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? start;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      node?.focus();
      const cursor = start + token.length;
      node?.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <FieldLabel id={textareaId} label={label} />
      <div className="relative">
        <textarea
          ref={setRefs}
          id={textareaId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? label}
          rows={rows}
          disabled={disabled}
          aria-label={label}
          className={cn(
            FIELD_BASE_CLASS,
            "resize-y",
            showQuickVariables && "pr-11"
          )}
        />
        {showQuickVariables ? (
          <div className="absolute right-1.5 top-1.5">
            <QuickVariableInsertMenu onInsert={insertToken} />
          </div>
        ) : null}
      </div>
    </div>
  );
});
