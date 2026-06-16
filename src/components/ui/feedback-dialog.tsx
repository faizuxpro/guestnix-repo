"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Link2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FeedbackTone = "default" | "danger" | "warning" | "success";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: FeedbackTone;
  busyLabel?: string;
};

type PromptOptions = {
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: FeedbackTone;
};

type FeedbackDialogContextValue = {
  requestConfirmation: (options: ConfirmOptions) => Promise<boolean>;
  requestTextInput: (options: PromptOptions) => Promise<string | null>;
};

type ActiveDialog =
  | ({ type: "confirm" } & Required<
      Pick<ConfirmOptions, "title" | "confirmLabel" | "cancelLabel" | "tone">
    > &
      Pick<ConfirmOptions, "description" | "busyLabel">)
  | ({ type: "prompt" } & Required<
      Pick<
        PromptOptions,
        | "title"
        | "confirmLabel"
        | "cancelLabel"
        | "tone"
        | "label"
        | "defaultValue"
        | "placeholder"
      >
    > &
      Pick<PromptOptions, "description">);

const FeedbackDialogContext = createContext<FeedbackDialogContextValue | null>(
  null
);

const toneStyles: Record<
  FeedbackTone,
  {
    icon: ElementType;
    iconWrap: string;
    iconColor: string;
    accent: string;
    confirmVariant: "default" | "destructive";
  }
> = {
  default: {
    icon: Info,
    iconWrap: "bg-primary/10 ring-primary/15",
    iconColor: "text-primary",
    accent: "bg-primary",
    confirmVariant: "default",
  },
  danger: {
    icon: ShieldAlert,
    iconWrap: "bg-destructive/10 ring-destructive/15",
    iconColor: "text-destructive",
    accent: "bg-destructive",
    confirmVariant: "destructive",
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: "bg-warning/15 ring-warning/20",
    iconColor: "text-amber-700 dark:text-amber-300",
    accent: "bg-warning",
    confirmVariant: "default",
  },
  success: {
    icon: CheckCircle2,
    iconWrap: "bg-success/10 ring-success/20",
    iconColor: "text-success",
    accent: "bg-success",
    confirmVariant: "default",
  },
};

export function FeedbackDialogProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const resolverRef = useRef<((value: boolean | string | null) => void) | null>(
    null
  );

  const settle = useCallback((value: boolean | string | null) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setSubmitting(false);
    setActiveDialog(null);
    setPromptValue("");
    resolver?.(value);
  }, []);

  const requestConfirmation = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        if (resolverRef.current) {
          resolverRef.current(false);
        }
        resolverRef.current = (value) => resolve(value === true);
        setActiveDialog({
          type: "confirm",
          title: options.title,
          description: options.description,
          confirmLabel: options.confirmLabel ?? "Confirm",
          cancelLabel: options.cancelLabel ?? "Cancel",
          tone: options.tone ?? "default",
          busyLabel: options.busyLabel,
        });
      }),
    []
  );

  const requestTextInput = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        if (resolverRef.current) {
          resolverRef.current(null);
        }
        const defaultValue = options.defaultValue ?? "";
        resolverRef.current = (value) =>
          resolve(typeof value === "string" ? value : null);
        setPromptValue(defaultValue);
        setActiveDialog({
          type: "prompt",
          title: options.title,
          description: options.description,
          label: options.label ?? "Value",
          defaultValue,
          placeholder: options.placeholder ?? "",
          confirmLabel: options.confirmLabel ?? "Apply",
          cancelLabel: options.cancelLabel ?? "Cancel",
          tone: options.tone ?? "default",
        });
      }),
    []
  );

  const value = useMemo(
    () => ({
      requestConfirmation,
      requestTextInput,
    }),
    [requestConfirmation, requestTextInput]
  );

  const tone = activeDialog?.tone ?? "default";
  const styles = toneStyles[tone];
  const Icon = activeDialog?.type === "prompt" ? Link2 : styles.icon;

  const submit = () => {
    if (!activeDialog) return;
    setSubmitting(true);
    if (activeDialog.type === "prompt") {
      settle(promptValue);
      return;
    }
    settle(true);
  };

  return (
    <FeedbackDialogContext.Provider value={value}>
      {children}
      <Dialog
        open={Boolean(activeDialog)}
        onOpenChange={(open) => {
          if (!open && activeDialog) {
            settle(activeDialog.type === "prompt" ? null : false);
          }
        }}
      >
        <DialogContent
          className="overflow-hidden border-border/90 p-0 shadow-2xl sm:max-w-md"
          showCloseButton={false}
        >
          <div className={cn("h-1.5 w-full", styles.accent)} />
          {activeDialog ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <div className="space-y-5 p-5">
                <DialogHeader className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                  <span
                    className={cn(
                      "mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ring-1",
                      styles.iconWrap
                    )}
                    aria-hidden
                  >
                    <Icon className={cn("h-5 w-5", styles.iconColor)} />
                  </span>
                  <div className="min-w-0 space-y-2">
                    <DialogTitle className="text-lg leading-tight">
                      {activeDialog.title}
                    </DialogTitle>
                    {activeDialog.description ? (
                      <DialogDescription className="leading-relaxed">
                        {activeDialog.description}
                      </DialogDescription>
                    ) : null}
                  </div>
                </DialogHeader>

                {activeDialog.type === "prompt" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="feedback-dialog-input">
                      {activeDialog.label}
                    </Label>
                    <Input
                      id="feedback-dialog-input"
                      value={promptValue}
                      onChange={(event) => setPromptValue(event.target.value)}
                      placeholder={activeDialog.placeholder}
                      autoFocus
                    />
                  </div>
                ) : null}
              </div>

              <DialogFooter className="m-0 rounded-none">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    settle(activeDialog.type === "prompt" ? null : false)
                  }
                  disabled={submitting}
                >
                  {activeDialog.cancelLabel}
                </Button>
                <Button
                  type="submit"
                  variant={styles.confirmVariant}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  {submitting && activeDialog.type === "confirm"
                    ? activeDialog.busyLabel ?? "Working..."
                    : activeDialog.confirmLabel}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </FeedbackDialogContext.Provider>
  );
}

export function useFeedbackDialog() {
  const context = useContext(FeedbackDialogContext);
  if (!context) {
    throw new Error(
      "useFeedbackDialog must be used within FeedbackDialogProvider"
    );
  }
  return context;
}
