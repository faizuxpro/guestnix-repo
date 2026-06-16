export type SavedStoreRequest = {
  requestCode: string;
  resumeUrl: string;
  subtotalLabel: string | null;
  submittedAt: string;
  lastKnownUpdatedAt?: string | null;
  lastSeenAt?: string | null;
};

export const STORE_REQUESTS_UPDATED_EVENT = "guestnix:store-requests-updated";

export function storeRequestStorageKey(slug: string) {
  return `guestnix_store_requests_${slug}`;
}

function safeTime(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function latestTimestamp(
  current: string | null | undefined,
  next: string | null | undefined
) {
  if (!current) return next ?? null;
  if (!next) return current;
  return safeTime(next) > safeTime(current) ? next : current;
}

function dispatchStoreRequestsUpdated(slug: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(STORE_REQUESTS_UPDATED_EVENT, {
      detail: { slug },
    })
  );
}

export function parseStoreRequestResumeUrl(resumeUrl: string) {
  try {
    const url = new URL(
      resumeUrl,
      typeof window === "undefined" ? "http://localhost" : window.location.origin
    );
    const segments = url.pathname.split("/").filter(Boolean);
    const guidebookIndex = segments.findIndex((segment) => segment === "g");
    const storeIndex = segments.findIndex((segment) => segment === "store");
    const requestsIndex = segments.findIndex((segment) => segment === "requests");
    if (
      guidebookIndex === -1 ||
      storeIndex === -1 ||
      requestsIndex === -1 ||
      storeIndex !== guidebookIndex + 2 ||
      requestsIndex !== storeIndex + 1
    ) {
      return null;
    }

    const slug = decodeURIComponent(segments[guidebookIndex + 1] ?? "").trim();
    const token = decodeURIComponent(segments[requestsIndex + 1] ?? "").trim();
    const requestId = token.split(".")[0]?.trim();
    if (!slug || !token || !requestId) return null;

    return {
      requestId,
      slug,
      token,
      path: `${url.pathname}${url.search}`,
      apiPath: `/api/g/${encodeURIComponent(slug)}/store/requests/${encodeURIComponent(
        token
      )}`,
    };
  } catch {
    return null;
  }
}

function storeRequestIdentityKey(slug: string, request: SavedStoreRequest) {
  const parsed = parseStoreRequestResumeUrl(request.resumeUrl);
  if (parsed?.slug === slug) {
    return `request:${parsed.requestId}`;
  }

  return `url:${request.resumeUrl}`;
}

function mergeSavedStoreRequest(
  primary: SavedStoreRequest,
  duplicate: SavedStoreRequest
): SavedStoreRequest {
  return {
    ...primary,
    subtotalLabel: primary.subtotalLabel ?? duplicate.subtotalLabel,
    lastKnownUpdatedAt: latestTimestamp(
      primary.lastKnownUpdatedAt,
      duplicate.lastKnownUpdatedAt
    ),
    lastSeenAt: latestTimestamp(primary.lastSeenAt, duplicate.lastSeenAt),
  };
}

function dedupeSavedStoreRequests(
  slug: string,
  requests: SavedStoreRequest[]
) {
  const seen = new Map<string, number>();
  const deduped: SavedStoreRequest[] = [];

  for (const request of requests) {
    const key = storeRequestIdentityKey(slug, request);
    const existingIndex = seen.get(key);
    if (existingIndex === undefined) {
      seen.set(key, deduped.length);
      deduped.push(request);
      continue;
    }

    deduped[existingIndex] = mergeSavedStoreRequest(
      deduped[existingIndex],
      request
    );
  }

  return deduped;
}

export function readSavedStoreRequests(slug: string): SavedStoreRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storeRequestStorageKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const requests = parsed
      .filter(
        (entry): entry is SavedStoreRequest =>
          entry &&
          typeof entry === "object" &&
          typeof entry.requestCode === "string" &&
          typeof entry.resumeUrl === "string" &&
          typeof entry.submittedAt === "string"
      )
      .map((entry) => ({
        requestCode: entry.requestCode,
        resumeUrl: entry.resumeUrl,
        subtotalLabel:
          typeof entry.subtotalLabel === "string" ? entry.subtotalLabel : null,
        submittedAt: entry.submittedAt,
        lastKnownUpdatedAt:
          typeof entry.lastKnownUpdatedAt === "string"
            ? entry.lastKnownUpdatedAt
            : null,
        lastSeenAt:
          typeof entry.lastSeenAt === "string" ? entry.lastSeenAt : null,
      }));
    return dedupeSavedStoreRequests(slug, requests).slice(0, 5);
  } catch {
    return [];
  }
}

export function writeSavedStoreRequests(
  slug: string,
  requests: SavedStoreRequest[]
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storeRequestStorageKey(slug),
      JSON.stringify(dedupeSavedStoreRequests(slug, requests).slice(0, 5))
    );
    dispatchStoreRequestsUpdated(slug);
  } catch {
    // Private browsing or storage quota issues should not block requests.
  }
}

export function saveStoreRequestLink(
  slug: string,
  request: SavedStoreRequest
) {
  const existing = readSavedStoreRequests(slug);
  const requestKey = storeRequestIdentityKey(slug, request);
  const previous = existing.find(
    (entry) => storeRequestIdentityKey(slug, entry) === requestKey
  );
  const next = [
    {
      ...request,
      lastKnownUpdatedAt:
        request.lastKnownUpdatedAt ??
        previous?.lastKnownUpdatedAt ??
        request.submittedAt,
      lastSeenAt:
        request.lastSeenAt ?? previous?.lastSeenAt ?? request.submittedAt,
    },
    ...existing.filter(
      (entry) => storeRequestIdentityKey(slug, entry) !== requestKey
    ),
  ].slice(0, 5);
  writeSavedStoreRequests(slug, next);
  return next;
}

export function updateStoreRequestKnownAt(input: {
  slug: string;
  requestId: string;
  updatedAt: string;
}) {
  const existing = readSavedStoreRequests(input.slug);
  let changed = false;
  const next = existing.map((entry) => {
    const parsed = parseStoreRequestResumeUrl(entry.resumeUrl);
    if (parsed?.requestId !== input.requestId) return entry;

    const currentKnown = safeTime(entry.lastKnownUpdatedAt);
    const nextKnown = safeTime(input.updatedAt);
    if (nextKnown <= currentKnown) return entry;

    changed = true;
    return {
      ...entry,
      lastKnownUpdatedAt: input.updatedAt,
    };
  });

  if (changed) {
    writeSavedStoreRequests(input.slug, next);
  }

  return next;
}

export function markStoreRequestSeen(input: {
  slug: string;
  requestId: string;
  updatedAt: string;
}) {
  const existing = readSavedStoreRequests(input.slug);
  let changed = false;
  const next = existing.map((entry) => {
    const parsed = parseStoreRequestResumeUrl(entry.resumeUrl);
    if (parsed?.requestId !== input.requestId) return entry;

    changed = true;
    return {
      ...entry,
      lastKnownUpdatedAt: input.updatedAt,
      lastSeenAt: input.updatedAt,
    };
  });

  if (changed) {
    writeSavedStoreRequests(input.slug, next);
  }

  return next;
}

export function hasUnreadStoreRequestUpdate(request: SavedStoreRequest) {
  const knownAt = safeTime(request.lastKnownUpdatedAt);
  const seenAt = safeTime(request.lastSeenAt ?? request.submittedAt);
  return knownAt > seenAt;
}

export function countUnreadStoreRequestUpdates(requests: SavedStoreRequest[]) {
  return requests.filter(hasUnreadStoreRequestUpdate).length;
}
