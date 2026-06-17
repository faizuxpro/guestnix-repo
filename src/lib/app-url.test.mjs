import assert from "node:assert/strict";
import test from "node:test";

const appUrlModule = await import("./app-url.ts");
const { authCallbackUrl, authStatusPath, getBrowserAppOrigin } =
  appUrlModule.default ?? appUrlModule;

test("auth callback URL uses the supplied runtime origin", () => {
  const url = new URL(
    authCallbackUrl(
      authStatusPath("signup", "/login?verified=email"),
      "https://guestnix-staging.herokuapp.com/signup"
    )
  );

  assert.equal(url.origin, "https://guestnix-staging.herokuapp.com");
  assert.equal(url.pathname, "/api/auth/callback");
  assert.equal(
    url.searchParams.get("redirect"),
    "/auth/verified?flow=signup&next=%2Flogin%3Fverified%3Demail"
  );
});

test("browser app origin prefers the host where the auth flow started", () => {
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: {
        origin: "https://preview.guestnix.app",
      },
    },
  });

  try {
    const origin = getBrowserAppOrigin();
    const callback = new URL(authCallbackUrl("/dashboard", origin));

    assert.equal(origin, "https://preview.guestnix.app");
    assert.equal(callback.origin, "https://preview.guestnix.app");
  } finally {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  }
});
