const DEFAULT_SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

type SafeUrlOptions = {
  allowRelative?: boolean;
  protocols?: ReadonlySet<string>;
};

export function normalizeSafeUrl(
  value: string | null | undefined,
  options: SafeUrlOptions = {}
) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const allowRelative = options.allowRelative ?? true;
  const protocols = options.protocols ?? DEFAULT_SAFE_PROTOCOLS;

  if (allowRelative && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return protocols.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function isSafeHttpUrl(value: string | null | undefined) {
  return (
    normalizeSafeUrl(value, {
      allowRelative: false,
      protocols: new Set(["http:", "https:"]),
    }) !== null
  );
}
