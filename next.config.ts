import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { setupHoneybadger } from "@honeybadger-io/nextjs";

const honeybadgerApiKey =
  process.env.HONEYBADGER_API_KEY || process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY;
const honeybadgerAssetsUrl =
  process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL ||
  process.env.NEXT_PUBLIC_APP_URL;
const honeybadgerRevision =
  process.env.NEXT_PUBLIC_HONEYBADGER_REVISION ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  process.env.HEROKU_SLUG_COMMIT ||
  process.env.SOURCE_VERSION ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA;

const nextConfig: NextConfig = {
  turbopack: {
    // Keep Turbopack scoped to this repo so it doesn't traverse parent folders.
    root: process.cwd(),
  },

  allowedDevOrigins: ['192.168.*.*','10.43.87.173'],

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          // Lets public guidebook pages register this SW under /g/ or /demo/.
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

const nextConfigWithHoneybadger = setupHoneybadger(
  nextConfig,
  honeybadgerApiKey && honeybadgerAssetsUrl
    ? {
        silent: !process.env.CI,
        disableSourceMapUpload: false,
        webpackPluginOptions: {
          apiKey: honeybadgerApiKey,
          assetsUrl: honeybadgerAssetsUrl,
          ...(honeybadgerRevision ? { revision: honeybadgerRevision } : {}),
        },
      }
    : {
        silent: !process.env.CI,
        disableSourceMapUpload: true,
      },
);

export default withSentryConfig(nextConfigWithHoneybadger, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    automaticVercelMonitors: false,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
