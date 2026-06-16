/**
 * Classifies thrown errors and non-OK fetch responses into a tagged union
 * so the UI can show the right message and action for each cause.
 *
 * Why: today every catch block says "fetch failed" or "could not save", which
 * doesn't help the user tell apart "I lost wifi" from "the server is down"
 * from "your session expired". The classifier returns a small, stable contract
 * with a human title, a body sentence that suggests the next step, and a
 * retryable flag so toasts can show a Retry action where it makes sense.
 */

export type ApiErrorKind =
  | "offline"
  | "network"
  | "timeout"
  | "aborted"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "server"
  | "provider"
  | "unknown";

export type ApiError = {
  kind: ApiErrorKind;
  /** Short headline for the toast or banner. */
  title: string;
  /** One sentence body — explains and suggests a next step. */
  message: string;
  /** Whether the failure makes sense to retry with the same input. */
  retryable: boolean;
  /** HTTP status if the failure came from a response. */
  status?: number;
  /** Raw error body (e.g. zod fieldErrors) for callers that want detail. */
  details?: unknown;
  /** The underlying thrown error, for logging. */
  cause?: unknown;
};

const GENERIC_NETWORK_RE = /Failed to fetch|NetworkError|Load failed|network error/i;
const TIMEOUT_RE = /timeout|timed out|deadline|ETIMEDOUT/i;

function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  // navigator.onLine is best-effort — true doesn't guarantee internet, but
  // false is a very reliable "offline" signal.
  return navigator.onLine !== false;
}

function readMessageFromBody(body: unknown): {
  message: string | null;
  fieldErrors: Record<string, string[]> | null;
} {
  if (body === null || typeof body !== "object") {
    return { message: null, fieldErrors: null };
  }
  const candidate = (body as { error?: unknown }).error;
  if (typeof candidate === "string") {
    return { message: candidate, fieldErrors: null };
  }
  if (candidate && typeof candidate === "object") {
    // Zod's fieldErrors shape: { fieldName: string[] }
    const obj = candidate as Record<string, unknown>;
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        fieldErrors[key] = value.filter(
          (v): v is string => typeof v === "string"
        );
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      const first = Object.entries(fieldErrors)[0];
      const firstMessage = first?.[1]?.[0] ?? null;
      return { message: firstMessage, fieldErrors };
    }
  }
  return { message: null, fieldErrors: null };
}

/**
 * Inspect a non-OK Response and return an ApiError. Reads the JSON body once;
 * pass the parsed body in if you already consumed it.
 */
export async function classifyResponse(
  response: Response,
  options?: { parsedBody?: unknown; context?: string }
): Promise<ApiError> {
  const body =
    options?.parsedBody !== undefined
      ? options.parsedBody
      : await response.clone().json().catch(() => null);
  const { message: bodyMessage, fieldErrors } = readMessageFromBody(body);
  const status = response.status;

  if (status === 401) {
    return {
      kind: "unauthorized",
      title: "Sign in required",
      message: "Your session expired. Sign in again to continue.",
      retryable: false,
      status,
      details: fieldErrors ?? body,
    };
  }
  if (status === 403) {
    return {
      kind: "forbidden",
      title: "Not allowed",
      message: bodyMessage ?? "You don't have permission for this action.",
      retryable: false,
      status,
      details: fieldErrors ?? body,
    };
  }
  if (status === 404) {
    const notFoundMessage =
      bodyMessage && bodyMessage.trim().toLowerCase() !== "not found"
        ? bodyMessage
        : null;
    return {
      kind: "not_found",
      title: "No longer available",
      message:
        notFoundMessage ??
        "This may have been deleted, moved, or you no longer have access.",
      retryable: false,
      status,
      details: body,
    };
  }
  if (status === 409) {
    return {
      kind: "conflict",
      title: "Conflict",
      message:
        bodyMessage ??
        "Someone else updated this first. Refresh and try again.",
      retryable: false,
      status,
      details: fieldErrors ?? body,
    };
  }
  if (status === 422 || (status === 400 && fieldErrors)) {
    return {
      kind: "validation",
      title: "Couldn't save",
      message: bodyMessage ?? "Some fields look off. Fix them and try again.",
      retryable: false,
      status,
      details: fieldErrors ?? body,
    };
  }
  if (status === 400) {
    return {
      kind: "validation",
      title: "Couldn't save",
      message: bodyMessage ?? "That request wasn't quite right.",
      retryable: false,
      status,
      details: body,
    };
  }
  if (status === 429) {
    return {
      kind: "rate_limited",
      title: "Slow down",
      message:
        bodyMessage ??
        "Too many requests in a short time. Wait a moment and try again.",
      retryable: true,
      status,
      details: body,
    };
  }
  if (status === 502 || status === 503 || status === 504) {
    // Upstream provider problems (Overpass, Wikipedia, Stripe, Supabase).
    // If the server gave us a friendly message, prefer it.
    return {
      kind: "provider",
      title: "Service unavailable",
      message:
        bodyMessage ??
        "An upstream service is having trouble. Try again in a moment.",
      retryable: true,
      status,
      details: body,
    };
  }
  if (status >= 500) {
    return {
      kind: "server",
      title: "Server error",
      message:
        bodyMessage ??
        "Something went wrong on our end. Try again in a moment.",
      retryable: true,
      status,
      details: body,
    };
  }
  // Anything else (e.g. 3xx that fetch propagated) we treat as unknown.
  return {
    kind: "unknown",
    title: "Something went wrong",
    message: bodyMessage ?? `Request failed (${status}). Try again.`,
    retryable: true,
    status,
    details: body,
  };
}

/**
 * Inspect a thrown error (from a try/catch around fetch, or any async error)
 * and return an ApiError. Distinguishes offline / network / timeout / abort
 * so the UI can show the right message.
 */
export function classifyThrown(error: unknown): ApiError {
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      kind: "aborted",
      title: "Cancelled",
      message: "Request cancelled.",
      retryable: false,
      cause: error,
    };
  }
  if (error instanceof TypeError && GENERIC_NETWORK_RE.test(error.message)) {
    if (!isOnline()) {
      return {
        kind: "offline",
        title: "You're offline",
        message:
          "Check your internet connection — your changes will save once you reconnect.",
        retryable: true,
        cause: error,
      };
    }
    return {
      kind: "network",
      title: "Connection issue",
      message:
        "We couldn't reach the server. Check your connection or try again in a moment.",
      retryable: true,
      cause: error,
    };
  }
  if (error instanceof Error && TIMEOUT_RE.test(error.message)) {
    return {
      kind: "timeout",
      title: "Request timed out",
      message: "This took longer than expected. Try again.",
      retryable: true,
      cause: error,
    };
  }
  // Catch-all
  const message = error instanceof Error ? error.message : String(error);
  return {
    kind: "unknown",
    title: "Something went wrong",
    message: message || "Unexpected error. Try again.",
    retryable: true,
    cause: error,
  };
}
