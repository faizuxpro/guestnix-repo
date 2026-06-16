import * as Sentry from "@sentry/nextjs";
import { feedbackIntegration, replayIntegration } from "@sentry/browser";
import {
  scrubSentryEvent,
  telemetryEnvironment,
  telemetryRelease,
} from "@/lib/observability/sentry";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
