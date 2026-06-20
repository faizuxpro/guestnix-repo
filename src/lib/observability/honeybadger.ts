const HEROKU_REVISION =
  process.env.HEROKU_SLUG_COMMIT || process.env.SOURCE_VERSION;

export function honeybadgerBrowserApiKey() {
  return process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY;
}

export function honeybadgerServerApiKey() {
  return process.env.HONEYBADGER_API_KEY || honeybadgerBrowserApiKey();
}

export function honeybadgerEnvironment() {
  return (
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV
  );
}

export function honeybadgerRevision() {
  return (
    process.env.NEXT_PUBLIC_HONEYBADGER_REVISION ||
    process.env.NEXT_PUBLIC_APP_VERSION ||
    HEROKU_REVISION ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA
  );
}

export function honeybadgerAssetsUrl() {
  return (
    process.env.NEXT_PUBLIC_HONEYBADGER_ASSETS_URL ||
    process.env.NEXT_PUBLIC_APP_URL
  );
}

export function shouldConfigureHoneybadger(apiKey: string | undefined) {
  return process.env.NODE_ENV === "production" && Boolean(apiKey);
}
