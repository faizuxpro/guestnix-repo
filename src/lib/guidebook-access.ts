import crypto from "node:crypto";
import { cookies } from "next/headers";

const PASSWORD_HASH_PREFIX = "gnx-scrypt-v1";
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

function tokenSecret() {
  const secret =
    process.env.AUTH_SECRET?.trim() ||
    process.env.STORE_REQUEST_TOKEN_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.DATABASE_URL?.trim();
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET, STORE_REQUEST_TOKEN_SECRET, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL must be set in production."
    );
  }
  return secret || "guestnix-dev-unlock-token-secret";
}

export function unlockCookieName(guidebookId: string): string {
  return `gn_unlock_${guidebookId}`;
}

export function signUnlockToken(guidebookId: string, passwordVerifier: string): string {
  return crypto
    .createHmac("sha256", tokenSecret())
    .update(`${guidebookId}:${passwordVerifier}`)
    .digest("hex");
}

function readPasswordVerifier(
  settings: Record<string, unknown> | null | undefined
): string {
  if (!settings) return "";
  const hash = settings.password_hash;
  if (typeof hash === "string" && hash.trim()) return hash;
  const legacyPassword = settings.password;
  return typeof legacyPassword === "string" ? legacyPassword : "";
}

export function isGuidebookProtected(
  settings: Record<string, unknown> | null | undefined
): boolean {
  if (!settings) return false;
  if (settings.password_protected !== true) return false;
  return readPasswordVerifier(settings).length > 0;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function passwordMatches(stored: string, submitted: string): boolean {
  if (stored.startsWith(`${PASSWORD_HASH_PREFIX}:`)) {
    return verifyGuidebookPasswordHash(stored, submitted);
  }
  return timingSafeStringEqual(stored, submitted);
}

export function hashGuidebookPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(
    password,
    salt,
    SCRYPT_KEY_LENGTH,
    SCRYPT_OPTIONS
  );
  return [
    PASSWORD_HASH_PREFIX,
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join(":");
}

function verifyGuidebookPasswordHash(stored: string, submitted: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== PASSWORD_HASH_PREFIX) return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  try {
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    const actual = crypto.scryptSync(submitted, salt, expected.length, {
      N,
      r,
      p,
    });
    return timingSafeStringEqual(actual.toString("base64url"), expected.toString("base64url"));
  } catch {
    return false;
  }
}

export function normalizeGuidebookAccessSettingsPatch(
  previousSettings: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...patch };

  if (next.password_protected === false) {
    next.password = null;
    next.password_hash = null;
    return next;
  }

  if (typeof next.password === "string") {
    const password = next.password.trim();
    if (password) {
      next.password_hash = hashGuidebookPassword(password);
      next.password = null;
    } else if (next.password_protected === true) {
      const existingHash = previousSettings.password_hash;
      const existingPassword = previousSettings.password;
      next.password_hash =
        typeof existingHash === "string" && existingHash
          ? existingHash
          : typeof existingPassword === "string" && existingPassword
            ? hashGuidebookPassword(existingPassword)
            : null;
      next.password = null;
    }
  }

  return next;
}

export function upgradeLegacyGuidebookAccessSettings(
  settings: Record<string, unknown>
): { settings: Record<string, unknown>; changed: boolean } {
  const legacyPassword = settings.password;
  const existingHash = settings.password_hash;
  if (
    typeof legacyPassword !== "string" ||
    !legacyPassword ||
    (typeof existingHash === "string" && existingHash)
  ) {
    return { settings, changed: false };
  }

  return {
    settings: {
      ...settings,
      password: null,
      password_hash: hashGuidebookPassword(legacyPassword),
    },
    changed: true,
  };
}

export function redactGuidebookAccessSettingsForClient(
  settings: Record<string, unknown>
): Record<string, unknown> {
  const passwordConfigured = readPasswordVerifier(settings).length > 0;
  const next = { ...settings };
  delete next.password;
  delete next.password_hash;
  next.password_configured = passwordConfigured;
  return next;
}

export async function isGuidebookUnlocked(
  guidebookId: string,
  settings: Record<string, unknown> | null | undefined
): Promise<boolean> {
  if (!isGuidebookProtected(settings)) return true;
  const passwordVerifier = readPasswordVerifier(settings);
  const cookieStore = await cookies();
  const cookie = cookieStore.get(unlockCookieName(guidebookId));
  if (!cookie?.value) return false;
  const expected = signUnlockToken(guidebookId, passwordVerifier);
  return timingSafeStringEqual(cookie.value, expected);
}
