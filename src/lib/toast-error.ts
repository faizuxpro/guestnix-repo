import { toast } from "sonner";
import type { ApiError } from "./api-errors";

export type ToastErrorOptions = {
  /** When provided and the error is retryable, the toast shows a Retry button. */
  onRetry?: () => void | Promise<void>;
  /** Reuse an existing toast slot, for example after toast.loading(). */
  id?: string | number;
  /** Optional override for the toast title. */
  title?: string;
  /** Optional override for the toast description. */
  description?: string;
  /** Auto-dismiss duration (ms). Defaults vary by kind. */
  duration?: number;
};

/**
 * Shows a sonner toast for an ApiError with a consistent shape:
 *   - title (headline)
 *   - description (one sentence)
 *   - action button: "Retry" for retryable errors, "Sign in" for 401
 *
 * `aborted` errors silently no-op so user-cancelled requests don't spam toasts.
 */
export function toastApiError(error: ApiError, options: ToastErrorOptions = {}) {
  if (error.kind === "aborted") return;

  const title = options.title ?? error.title;
  const description = options.description ?? error.message;

  const action = (() => {
    if (error.kind === "unauthorized") {
      return {
        label: "Sign in",
        onClick: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        },
      };
    }
    if (error.retryable && options.onRetry) {
      return {
        label: "Retry",
        onClick: () => {
          void options.onRetry?.();
        },
      };
    }
    return undefined;
  })();

  const duration = options.duration ?? defaultDurationFor(error.kind);

  toast.error(title, { id: options.id, description, action, duration });
}

function defaultDurationFor(kind: ApiError["kind"]): number {
  switch (kind) {
    case "offline":
      // Keep visible longer — the user may need to reconnect.
      return 8000;
    case "unauthorized":
      return 10000;
    case "validation":
      return 6000;
    default:
      return 5000;
  }
}
