import { classifyResponse, classifyThrown, type ApiError } from "./api-errors";

/**
 * Single chokepoint for all client-side fetches. Returns a discriminated union
 * so callers can switch on `result.ok` instead of writing try/catch + ok-check
 * boilerplate at every fetch site, and so every error goes through the same
 * classifier.
 *
 * Typical usage:
 *   const result = await apiFetch<MyShape>("/api/things");
 *   if (!result.ok) { toastApiError(result.error, { onRetry }); return; }
 *   doSomethingWith(result.data);
 *
 * For sites where the response body is empty (DELETE returning 204), pass
 * `parseJson: false` and use the response directly.
 */

export type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  /** Default true. Set false for empty-body responses or non-JSON endpoints. */
  parseJson?: boolean;
};

export type ApiResult<T> =
  | { ok: true; data: T; response: Response }
  | { ok: false; error: ApiError; response?: Response };

function shouldStringify(body: ApiFetchOptions["body"]): body is
  | Record<string, unknown>
  | unknown[] {
  if (body == null) return false;
  if (typeof body !== "object") return false;
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  if (body instanceof URLSearchParams) return false;
  if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream)
    return false;
  return true;
}

export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  options: ApiFetchOptions = {}
): Promise<ApiResult<T>> {
  const { parseJson = true, body, headers, ...rest } = options;

  const init: RequestInit = { ...rest };

  if (body !== undefined && body !== null) {
    if (shouldStringify(body)) {
      init.body = JSON.stringify(body);
      init.headers = {
        "Content-Type": "application/json",
        ...(headers as Record<string, string> | undefined),
      };
    } else {
      init.body = body as BodyInit;
      if (headers) init.headers = headers;
    }
  } else if (headers) {
    init.headers = headers;
  }

  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (err) {
    return { ok: false, error: classifyThrown(err) };
  }

  if (!response.ok) {
    const error = await classifyResponse(response);
    return { ok: false, error, response };
  }

  if (!parseJson || response.status === 204) {
    return { ok: true, data: undefined as T, response };
  }

  try {
    const data = (await response.json()) as T;
    return { ok: true, data, response };
  } catch (err) {
    // Body said ok but JSON parse failed — treat as unknown error so the
    // caller can react instead of silently getting undefined.
    return {
      ok: false,
      error: classifyThrown(err),
      response,
    };
  }
}
