import * as Sentry from "@sentry/nextjs";
import { Honeybadger } from "@honeybadger-io/react";
import { feedbackIntegration, replayIntegration } from "@sentry/browser";
import {
  scrubSentryEvent,
  telemetryEnvironment,
  telemetryRelease,
} from "@/lib/observability/sentry";
import {
  honeybadgerBrowserApiKey,
  honeybadgerEnvironment,
  honeybadgerRevision,
  shouldConfigureHoneybadger,
} from "@/lib/observability/honeybadger";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const honeybadgerApiKey = honeybadgerBrowserApiKey();

if (process.env.NODE_ENV === "production" && dsn) {
  Sentry.init({
    dsn,
    environment: telemetryEnvironment(),
    release: telemetryRelease(),
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    sendDefaultPii: false,
    integrations: [
      replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      feedbackIntegration({
        autoInject: false,
        showBranding: false,
      }),
    ],
    beforeSend: scrubSentryEvent,
  });
}

if (
  !Honeybadger.config.apiKey &&
  shouldConfigureHoneybadger(honeybadgerApiKey)
) {
  Honeybadger.configure({
    apiKey: honeybadgerApiKey,
    environment: honeybadgerEnvironment(),
    revision: honeybadgerRevision(),
    projectRoot: "webpack://_N_E/./",
    reportData: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
