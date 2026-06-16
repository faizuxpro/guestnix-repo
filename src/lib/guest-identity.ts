export type GuestIdentitySource = "chat" | "store";

export type GuestIdentity = {
  guestName: string | null;
  guestEmail: string | null;
  source: GuestIdentitySource;
  updatedAt: string;
};

export const GUEST_IDENTITY_UPDATED_EVENT =
  "guestnix:guest-identity-updated";

function storageKey(slug: string) {
  return `guestnix_guest_identity_${slug}`;
}

function normalizeEmail(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function normalizeName(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function readGuestIdentity(slug: string): GuestIdentity | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestIdentity>;
    const guestName = normalizeName(parsed.guestName);
    const guestEmail = normalizeEmail(parsed.guestEmail);

    if (!guestName && !guestEmail) return null;

    return {
      guestName,
      guestEmail,
      source: parsed.source === "chat" ? "chat" : "store",
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeGuestIdentity(
  slug: string,
  input: {
    guestName?: string | null;
    guestEmail?: string | null;
    source: GuestIdentitySource;
  }
) {
  if (typeof window === "undefined") return null;

  const existing = readGuestIdentity(slug);
  const guestName = normalizeName(input.guestName) ?? existing?.guestName ?? null;
  const guestEmail =
    normalizeEmail(input.guestEmail) ?? existing?.guestEmail ?? null;

  if (!guestName && !guestEmail) return existing;

  const identity: GuestIdentity = {
    guestName,
    guestEmail,
    source: input.source,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(identity));
    window.dispatchEvent(
      new CustomEvent(GUEST_IDENTITY_UPDATED_EVENT, {
        detail: { slug, identity },
      })
    );
  } catch {
    // Private browsing or storage quota issues should not block guest flows.
  }

  return identity;
}
