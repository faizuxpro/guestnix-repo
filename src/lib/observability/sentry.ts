const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /email/i,
  /phone/i,
  /message/i,
  /content/i,
];

function isSensitiveKey(key: string) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[Filtered]";
  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item, depth + 1));
  }
  if (!value || typeof value !== "object") return value;

  const scrubbed: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    scrubbed[key] = isSensitiveKey(key)
      ? "[Filtered]"
      : scrubValue(child, depth + 1);
  }
  return scrubbed;
}

export function scrubSentryEvent<T>(event: T): T {
  const next = scrubValue(event) as T;
  if (next && typeof next === "object" && "user" in next) {
    const withUser = next as T & {
      user?: { id?: string | number };
    };
    if (withUser.user) {
      withUser.user = { id: withUser.user.id };
    }
  }
  return next;
}

export function telemetryEnvironment() {
  return process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV;
}

export function telemetryRelease() {
  return (
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA
  );
}
