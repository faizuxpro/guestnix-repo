/**
 * Apex vs subdomain detection using the Public Suffix List.
 *
 * The Vercel Domains API call to add a custom domain is the same whether
 * it's apex or subdomain, but the DNS instructions we show the host
 * differ:
 *   - apex      → A record pointing at Vercel's anycast IP
 *   - subdomain → CNAME pointing at Vercel's cname target
 *
 * `psl` correctly handles edge cases like `acme.co.uk` (apex) vs
 * `guide.acme.co.uk` (subdomain) where naïve segment counting fails.
 */

import psl from "psl";

export type DomainKind = "apex" | "subdomain";

export function classifyHost(hostname: string):
  | { kind: DomainKind; host: string; registrableDomain: string }
  | { kind: null; error: string } {
  const trimmed = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!trimmed) {
    return { kind: null, error: "Domain is required" };
  }

  // Basic shape validation: no whitespace, no slashes, must contain a dot,
  // ASCII / punycode characters. Anything fancier is caught by psl.
  if (!/^[a-z0-9.-]+$/.test(trimmed) || !trimmed.includes(".")) {
    return { kind: null, error: "Not a valid domain" };
  }

  const parsed = psl.parse(trimmed);
  if (parsed.error || !parsed.domain) {
    return { kind: null, error: "Not a public domain" };
  }

  const kind: DomainKind = parsed.domain === trimmed ? "apex" : "subdomain";
  return { kind, host: trimmed, registrableDomain: parsed.domain };
}
