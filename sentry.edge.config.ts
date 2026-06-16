import * as Sentry from "@sentry/nextjs";
import {
  scrubSentryEvent,
  telemetryEnvironment,
  telemetryRelease,
} from "@/lib/observability/sentry";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (process.env.NODE_ENV === "production" && dsn) {
  Sentry.init({
    dsn,
    environment: telemetryEnvironment(),
    release: telemetryRelease(),
    tracesSampleRate: 0.05,
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
  });
}
