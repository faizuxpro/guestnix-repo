"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SettingOption<T extends string = string> = {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type ChoicePresentation = "auto" | "segmented" | "select";

export function EditorPanelShell({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "h-full min-w-0 overflow-y-auto overflow-x-hidden bg-background",
        className
      )}
    >
      {title || description || actions ? (
        <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {title ? (
                <h2 className="truncate text-sm font-semibold leading-tight text-foreground">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-1 text-xs leading-snug text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </header>
      ) : null}
      <div className={cn("min-w-0 space-y-4 p-4", contentClassName)}>
        {children}
      </div>
    </div>
  );
}

export function EditorSection({
  icon,
  title,
  description,
  defaultExpanded = false,
  collapsible = true,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!collapsible) {
    return (
      <section className={cn("space-y-2.5", className)}>
        <header className="flex min-w-0 items-center gap-2 border-b border-border/55 pb-1.5">
          {icon ? (
            <span
              aria-hidden
              className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5"
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-muted-foreground">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground/75">
                {description}
              </p>
            ) : null}
          </div>
        </header>
        <div className="space-y-2.5">{children}</div>
      </section>
    );
  }

  return (
    <section className={cn("overflow-hidden rounded-md border border-border/65 bg-background", className)}>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full min-w-0 items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {icon ? (
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5"
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-foreground">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block truncate text-[11px] leading-snug text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            expanded ? "rotate-180" : ""
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="space-y-2.5 border-t border-border/60 px-3 py-3">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function SettingRow({
  label,
  hint,
  inline = false,
  children,
  className,
}: {
  label: string;
  hint?: string;
  inline?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (inline) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium leading-tight text-foreground">
            {label}
          </p>
          {hint ? (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
        <div className="min-w-0 flex-[1.3]">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="space-y-0.5">
        <label className="block text-[12px] font-medium leading-tight text-foreground">
          {label}
        </label>
        {hint ? (
          <p className="text-[11px] leading-snug text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  id,
  disabled,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border/45 py-2 last:border-b-0",
        className
      )}
    >
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[13px] font-medium leading-tight text-foreground">
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
            {description}
          </span>
        ) : null}
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        size="sm"
      />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  presentation = "auto",
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<SettingOption<T>>;
  ariaLabel?: string;
  className?: string;
  presentation?: ChoicePresentation;
}) {
  const useSelect =
    presentation === "select" ||
    (presentation === "auto" && options.length >= 3);

  if (useSelect) {
    return (
      <OptionSelect
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel={ariaLabel}
        className={className}
      />
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex w-full items-center gap-0.5 rounded-md border border-border/70 bg-muted/30 p-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            disabled={opt.disabled}
            className={cn(
              "flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2 py-1.5 text-[12px] font-medium leading-none transition",
              selected
                ? "bg-background text-foreground shadow-sm ring-1 ring-inset ring-border/70"
                : "text-muted-foreground hover:text-foreground",
              opt.disabled && "cursor-not-allowed opacity-45"
            )}
          >
            {opt.icon ? (
              <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">
                {opt.icon}
              </span>
            ) : null}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedRow<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
  ariaLabel,
  className,
  presentation,
}: {
  label: string;
  hint?: string;
  value: T;
  onChange: (next: T) => void;
  options: Array<SettingOption<T>>;
  ariaLabel?: string;
  className?: string;
  presentation?: ChoicePresentation;
}) {
  return (
    <SettingRow label={label} hint={hint} className={className}>
      <SegmentedControl
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel={ariaLabel}
        presentation={presentation}
      />
    </SettingRow>
  );
}

export function OptionSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  placeholder,
  className,
  contentClassName,
  disabled,
}: {
  value?: T | "";
  onChange: (next: T) => void;
  options: Array<SettingOption<T>>;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
}) {
  const selectedOption = options.find((option) => option.value === value);
  const selectValue = selectedOption ? selectedOption.value : null;

  return (
    <Select<T>
      value={selectValue}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "h-9 w-full rounded-md border-border/70 bg-background px-2.5 text-xs font-medium shadow-none",
          className
        )}
        aria-label={ariaLabel}
      >
        <SelectValue className="sr-only" placeholder={placeholder} />
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 text-left",
            selectedOption ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {selectedOption?.icon ? (
            <span className="shrink-0 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
              {selectedOption.icon}
            </span>
          ) : null}
          <span className="truncate">
            {selectedOption?.label ?? placeholder}
          </span>
        </span>
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="text-xs"
          >
            <span className="flex min-w-0 items-center gap-2">
              {option.icon ? (
                <span className="shrink-0 text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
                  {option.icon}
                </span>
              ) : null}
              <span className="truncate">{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SelectRow<T extends string>({
  label,
  hint,
  inline = false,
  value,
  onChange,
  options,
  placeholder,
  className,
  contentClassName,
  disabled,
}: {
  label: string;
  hint?: string;
  inline?: boolean;
  value?: T | "";
  onChange: (next: T) => void;
  options: Array<SettingOption<T>>;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  disabled?: boolean;
}) {
  return (
    <SettingRow label={label} hint={hint} inline={inline} className={className}>
      <OptionSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        contentClassName={contentClassName}
        disabled={disabled}
      />
    </SettingRow>
  );
}

export function DisclosureGroup({
  label,
  children,
  defaultExpanded = false,
  className,
}: {
  label: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/45 hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            expanded ? "rotate-180" : ""
          )}
        />
        {label}
      </button>
      {expanded ? (
        <div className="space-y-2.5 border-l border-border/55 pl-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function RepeaterGroup({
  label,
  action,
  empty,
  children,
  className,
}: {
  label: string;
  action?: React.ReactNode;
  empty?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const hasChildren = Boolean(children);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium leading-tight text-foreground">
          {label}
        </p>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {hasChildren ? (
        <div className="space-y-2">{children}</div>
      ) : empty ? (
        <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {empty}
        </div>
      ) : null}
    </div>
  );
}

export function SettingGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-md border border-border/65 bg-muted/20 p-2.5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ToggleChip({
  active,
  label,
  icon,
  onToggle,
}: {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "group flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] font-medium transition",
        active
          ? "border-primary/35 bg-primary/10 text-primary"
          : "border-border/70 bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "grid h-3.5 w-3.5 place-items-center rounded-full transition-colors",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted/70 text-transparent"
        )}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      {icon ? <span className="text-foreground/70">{icon}</span> : null}
      <span className="truncate">{label}</span>
    </button>
  );
}
