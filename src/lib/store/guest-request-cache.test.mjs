import assert from "node:assert/strict";
import test from "node:test";

const cacheModule = await import("./guest-request-cache.ts");
const {
  hasUnreadStoreRequestUpdate,
  readSavedStoreRequests,
  saveStoreRequestLink,
  storeRequestStorageKey,
} = cacheModule.default ?? cacheModule;

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  clear() {
    this.#values.clear();
  }
}

function installBrowserStorage(origin = "https://guestnix.com") {
  const localStorage = new MemoryStorage();
  const previousWindow = globalThis.window;
  const previousCustomEvent = globalThis.CustomEvent;

  if (typeof globalThis.CustomEvent === "undefined") {
    globalThis.CustomEvent = class CustomEvent extends Event {
      constructor(type, init = {}) {
        super(type);
        this.detail = init.detail;
      }
    };
  }

  globalThis.window = {
    location: { origin },
    localStorage,
    dispatchEvent() {
      return true;
    },
  };

  return () => {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }

    if (previousCustomEvent === undefined) {
      delete globalThis.CustomEvent;
    } else {
      globalThis.CustomEvent = previousCustomEvent;
    }
  };
}

test("dedupes the same store request when the resume URL origin changes", () => {
  const restore = installBrowserStorage();
  try {
    const slug = "harbor-house";
    const token = "request-1.signature";

    saveStoreRequestLink(slug, {
      requestCode: "SR-0001",
      resumeUrl: `https://guestnix.com/g/${slug}/store/requests/${token}`,
      subtotalLabel: "$25.00",
      submittedAt: "2026-06-11T09:00:00.000Z",
    });

    const requests = saveStoreRequestLink(slug, {
      requestCode: "SR-0001",
      resumeUrl: `http://localhost:3000/g/${slug}/store/requests/${token}`,
      subtotalLabel: "$25.00",
      submittedAt: "2026-06-11T09:00:00.000Z",
      lastKnownUpdatedAt: "2026-06-11T10:00:00.000Z",
      lastSeenAt: "2026-06-11T10:00:00.000Z",
    });

    assert.equal(requests.length, 1);
    assert.equal(
      requests[0].resumeUrl,
      `http://localhost:3000/g/${slug}/store/requests/${token}`
    );
    assert.equal(requests[0].lastKnownUpdatedAt, "2026-06-11T10:00:00.000Z");
    assert.equal(requests[0].lastSeenAt, "2026-06-11T10:00:00.000Z");

    assert.deepEqual(readSavedStoreRequests(slug), requests);
  } finally {
    restore();
  }
});

test("collapses legacy duplicated request entries while preserving unread state", () => {
  const restore = installBrowserStorage();
  try {
    const slug = "harbor-house";
    const token = "request-2.signature";
    window.localStorage.setItem(
      storeRequestStorageKey(slug),
      JSON.stringify([
        {
          requestCode: "SR-0002",
          resumeUrl: `https://guestnix.com/g/${slug}/store/requests/${token}`,
          subtotalLabel: "$15.00",
          submittedAt: "2026-06-11T09:00:00.000Z",
          lastKnownUpdatedAt: "2026-06-11T11:00:00.000Z",
          lastSeenAt: "2026-06-11T09:00:00.000Z",
        },
        {
          requestCode: "SR-0002",
          resumeUrl: `https://www.guestnix.com/g/${slug}/store/requests/${token}`,
          subtotalLabel: "$15.00",
          submittedAt: "2026-06-11T09:00:00.000Z",
          lastKnownUpdatedAt: "2026-06-11T10:00:00.000Z",
          lastSeenAt: "2026-06-11T09:30:00.000Z",
        },
      ])
    );

    const requests = readSavedStoreRequests(slug);

    assert.equal(requests.length, 1);
    assert.equal(requests[0].lastKnownUpdatedAt, "2026-06-11T11:00:00.000Z");
    assert.equal(requests[0].lastSeenAt, "2026-06-11T09:30:00.000Z");
    assert.equal(hasUnreadStoreRequestUpdate(requests[0]), true);
  } finally {
    restore();
  }
});
