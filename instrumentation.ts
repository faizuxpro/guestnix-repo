import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

function toHoneybadgerNotice(error: unknown) {
  if (error instanceof Error || typeof error === "string") {
    return error;
  }

  return new Error("Unknown Next.js request error");
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./honeybadger.server.config");
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./honeybadger.edge.config");
    await import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const honeybadger =
    process.env.NEXT_RUNTIME === "edge"
      ? await import("./honeybadger.edge.config")
      : await import("./honeybadger.server.config");

  await Promise.allSettled([
    Sentry.captureRequestError(error, request, context),
    honeybadger.default.notifyAsync(toHoneybadgerNotice(error), {
      context: {
        path: request.path,
        method: request.method,
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
      },
    }),
  ]);
};
