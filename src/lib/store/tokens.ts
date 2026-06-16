import crypto from "node:crypto";

function storeTokenSecret() {
  const configured =
    process.env.STORE_REQUEST_TOKEN_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.DATABASE_URL?.trim();

  if (configured) return configured;

  if (process.env.NODE_ENV !== "production") {
    return "guestnix-dev-store-request-token-secret";
  }

  throw new Error(
    "STORE_REQUEST_TOKEN_SECRET, AUTH_SECRET, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL must be set in production."
  );
}

export function makeStoreRequestId() {
  return crypto.randomUUID();
}

export function makeStoreGuestTokenForRequest(requestId: string) {
  const signature = crypto
    .createHmac("sha256", storeTokenSecret())
    .update(`store-request:${requestId}`)
    .digest("base64url");

  return `${requestId}.${signature}`;
}

export function hashStoreGuestToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function makeStoreRequestCode() {
  return `SR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
