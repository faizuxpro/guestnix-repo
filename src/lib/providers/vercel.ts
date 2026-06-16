/**
 * Vercel implementation of CustomDomainProvider.
 *
 * Uses the Vercel REST API:
 *   POST   /v10/projects/{projectId}/domains       — add
 *   DELETE /v9/projects/{projectId}/domains/{name} — remove
 *   GET    /v6/domains/{name}/config              — DNS status
 *   GET    /v6/domains/{name}                       — TLS / cert status
 *
 * Auth: `Authorization: Bearer ${VERCEL_TOKEN}`.
 * Project: `VERCEL_PROJECT_ID`. If on a team, also pass `?teamId=...`.
 *
 * DNS targets:
 *   - apex      → A record to VERCEL_APEX_IP (default 76.76.21.21)
 *   - subdomain → CNAME to VERCEL_CNAME_TARGET (default cname.vercel-dns.com)
 */

import type { DomainKind } from "@/lib/domain-classify";
import type {
  CustomDomainProvider,
  DnsInstruction,
  DomainStatus,
} from "@/lib/custom-domain-provider";

const VERCEL_API = "https://api.vercel.com";
const APEX_IP = process.env.VERCEL_APEX_IP?.trim() || "76.76.21.21";
const CNAME_TARGET =
  process.env.VERCEL_CNAME_TARGET?.trim() || "cname.vercel-dns.com";

function requireEnv(key: string): string {
  const v = process.env[key]?.trim();
  if (!v) {
    throw new Error(
      `${key} is not set. Custom domains require Vercel API access — see .env.example.`
    );
  }
  return v;
}

function teamQuery(): string {
  const id = process.env.VERCEL_TEAM_ID?.trim();
  return id ? `?teamId=${encodeURIComponent(id)}` : "";
}

async function vercelFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = requireEnv("VERCEL_TOKEN");
  const res = await fetch(`${VERCEL_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // non-JSON body; keep `text` as the only signal
    }
  }
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body
        ? JSON.stringify((body as { error: unknown }).error)
        : text || `Vercel ${res.status} ${res.statusText}`);
    const err = new Error(`Vercel API ${path}: ${message}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return body as T;
}

export class VercelProvider implements CustomDomainProvider {
  async addDomain(host: string): Promise<{ providerDomainId: string }> {
    const projectId = requireEnv("VERCEL_PROJECT_ID");
    const result = await vercelFetch<{ name: string }>(
      `/v10/projects/${encodeURIComponent(projectId)}/domains${teamQuery()}`,
      {
        method: "POST",
        body: JSON.stringify({ name: host }),
      }
    );
    // Vercel keys domain operations by name; treat the name as the id.
    return { providerDomainId: result.name };
  }

  async removeDomain(host: string): Promise<void> {
    const projectId = requireEnv("VERCEL_PROJECT_ID");
    try {
      await vercelFetch(
        `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(host)}${teamQuery()}`,
        { method: "DELETE" }
      );
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      // 404 on remove is fine — we want it gone anyway.
      if (status === 404) return;
      throw err;
    }
  }

  async getStatus(host: string): Promise<DomainStatus> {
    const projectId = requireEnv("VERCEL_PROJECT_ID");

    type VercelConfigResponse = {
      misconfigured?: boolean;
      configuredBy?: string | null;
    };
    type VercelDomainResponse = {
      verified?: boolean;
    };
    // /v6/domains/{name}/config tells us if DNS is configured correctly.
    // (Project-scoped variant under /v9 returns 404 — this is the global
    // endpoint Vercel actually exposes.)
    const config = await vercelFetch<VercelConfigResponse>(
      `/v6/domains/${encodeURIComponent(host)}/config${teamQuery()}`
    );
    // /v9/.../domains/{name} reports verified status (DNS + cert).
    const domain = await vercelFetch<VercelDomainResponse>(
      `/v9/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(host)}${teamQuery()}`
    );

    const misconfigured = config.misconfigured === true;
    const verified = domain.verified === true;

    // Vercel doesn't expose a discrete "cert pending vs active" field on
    // the project-domain endpoint, but: if the domain is verified AND not
    // misconfigured, TLS is effectively active (Vercel issues immediately
    // on successful verification). Otherwise we report pending; explicit
    // errors only surface if Vercel returns an error response, which we
    // throw above.
    const sslStatus: DomainStatus["sslStatus"] =
      verified && !misconfigured ? "active" : "pending";

    return { verified, misconfigured, sslStatus };
  }

  dnsInstructionsFor(host: string, kind: DomainKind): DnsInstruction[] {
    if (kind === "apex") {
      return [
        {
          recordType: "A",
          name: host,
          value: APEX_IP,
          description: "Point your apex domain to Vercel.",
        },
      ];
    }
    return [
      {
        recordType: "CNAME",
        name: host,
        value: CNAME_TARGET,
        description: "Point this subdomain to Vercel.",
      },
    ];
  }
}
