const HOST_PREVIEW_STORAGE_PREFIX = "guestnix_host_preview_";

export const HOST_PREVIEW_PARAM = "gn_preview";
export const HOST_PREVIEW_VALUE = "host";

const memoryHostPreviewGuidebooks = new Set<string>();

function storageKey(guidebookId: string) {
  return `${HOST_PREVIEW_STORAGE_PREFIX}${guidebookId}`;
}

function hasHostPreviewParam() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(HOST_PREVIEW_PARAM) === HOST_PREVIEW_VALUE;
  } catch {
    return false;
  }
}

function removeHostPreviewParam() {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(HOST_PREVIEW_PARAM)) return;
    url.searchParams.delete(HOST_PREVIEW_PARAM);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  } catch {
    // If URL mutation fails, analytics suppression still works for this page load.
  }
}

export function withHostPreviewParam(href: string) {
  try {
    const isAbsolute = /^https?:\/\//i.test(href);
    const url = new URL(href, "https://guestnix.local");
    url.searchParams.set(HOST_PREVIEW_PARAM, HOST_PREVIEW_VALUE);

    if (isAbsolute) return url.toString();
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}${HOST_PREVIEW_PARAM}=${HOST_PREVIEW_VALUE}`;
  }
}

export function guidebookHostPreviewHref(slug: string) {
  return withHostPreviewParam(`/g/${slug}`);
}

export function isHostPreviewMode(guidebookId: string) {
  if (typeof window === "undefined" || !guidebookId) return false;
  if (memoryHostPreviewGuidebooks.has(guidebookId) || hasHostPreviewParam()) {
    return true;
  }

  try {
    return window.sessionStorage.getItem(storageKey(guidebookId)) === "1";
  } catch {
    return false;
  }
}

export function activateHostPreviewModeFromLocation(guidebookId: string) {
  if (typeof window === "undefined" || !guidebookId) return false;

  const fromUrl = hasHostPreviewParam();
  if (fromUrl) {
    memoryHostPreviewGuidebooks.add(guidebookId);
    try {
      window.sessionStorage.setItem(storageKey(guidebookId), "1");
    } catch {
      // The in-memory flag keeps this page load clean if storage is unavailable.
    }
    removeHostPreviewParam();
    return true;
  }

  return isHostPreviewMode(guidebookId);
}
