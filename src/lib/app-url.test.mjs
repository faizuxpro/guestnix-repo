import assert from "node:assert/strict";
import test from "node:test";

const appUrlModule = await import("./app-url.ts");
const { authCallbackUrl, authStatusPath, getAuthRedirectOrigin } =
  appUrlModule.default ?? appUrlModule;

function withEnv(values, run) {
  const previous = {};

  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = values[key];
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("auth callback URL uses the canonical Guestnix origin", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_CANONICAL_HOST: "guestnix.com",
    },
    () => {
      const url = new URL(
        authCallbackUrl(authStatusPath("signup", "/login?verified=email"))
      );

      assert.equal(url.origin, "https://guestnix.com");
      assert.equal(url.pathname, "/api/auth/callback");
      assert.equal(
        url.searchParams.get("redirect"),
        "/auth/verified?flow=signup&next=%2Flogin%3Fverified%3Demail"
      );
    }
  );
});

test("auth redirect origin falls back to guestnix.com without env config", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_CANONICAL_HOST: undefined,
    },
    () => {
      assert.equal(getAuthRedirectOrigin(), "https://guestnix.com");
      assert.equal(new URL(authCallbackUrl("/dashboard")).origin, "https://guestnix.com");
    }
  );
});

test("auth redirect origin ignores localhost app URLs", () => {
  withEnv(
    {
      NEXT_PUBLIC_APP_URL: "https://localhost:3319",
      NEXT_PUBLIC_CANONICAL_HOST: undefined,
    },
    () => {
      assert.equal(getAuthRedirectOrigin(), "https://guestnix.com");
      assert.equal(new URL(authCallbackUrl("/reset-password")).origin, "https://guestnix.com");
    }
  );
});
