/**
 * Heroku implementation of CustomDomainProvider.
 *
 * Heroku returns a per-domain DNS target (`cname`) such as
 * `example.herokudns.com`. We store that target in provider_data and show it
 * back to hosts as the CNAME/ALIAS target.
 */

import type { DomainKind } from "@/lib/domain-classify";
import type {
  CustomDomainProvider,
  DnsInstruction,
  DomainStatus,
  ProviderData,
} from "@/lib/custom-domain-provider";

const HEROKU_API = "https://api.heroku.com";

type HerokuDomain = {
  id?: string;
  hostname?: string;
  cname?: string;
  acm_status?: string | null;
  acm_status_reason?: string | null;
};

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is not set. Heroku custom domains require API access.`);
  }
  return value;
}

function appName() {
  return requireEnv("HEROKU_APP_NAME");
}

function normalizeHost(host: string) {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

async function herokuFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${HEROKU_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.heroku+json; version=3",
      "Content-Type": "application/json",
      Authorization: `Bearer ${requireEnv("HEROKU_API_KEY")}`,
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
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : text || `Heroku ${res.status} ${res.statusText}`;
    const err = new Error(`Heroku API ${path}: ${message}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  return body as T;
}

function providerDataFrom(domain: HerokuDomain): ProviderData {
  return {
    cname: domain.cname ?? null,
    hostname: domain.hostname ?? null,
    acmStatus: domain.acm_status ?? null,
    acmStatusReason: domain.acm_status_reason ?? null,
  };
}

function cnameFrom(providerData?: ProviderData): string | null {
  const cname = providerData?.cname;
  return typeof cname === "string" && cname.trim() ? normalizeHost(cname) : null;
}

function isAlreadyRegisteredError(status: number | undefined, message: string) {
  return (
    status === 422 &&
    /already exists|already been taken|already in use|taken/i.test(message)
  );
}

function mapStatus(domain: HerokuDomain): DomainStatus {
  const raw = (domain.acm_status ?? "").trim().toLowerCase();
  const reason = domain.acm_status_reason ?? undefined;

  if (raw.includes("cert issued") || raw === "active" || raw === "issued") {
    return { verified: true, misconfigured: false, sslStatus: "active" };
  }

  if (raw.includes("fail") || raw.includes("error")) {
    return {
      verified: false,
      misconfigured: true,
      sslStatus: "error",
      sslError: reason ?? "Heroku reported an ACM error for this domain.",
    };
  }

  return {
    verified: false,
    misconfigured: false,
    sslStatus: "pending",
    sslError: reason,
  };
}

export class HerokuProvider implements CustomDomainProvider {
  async addDomain(host: string): Promise<{
    providerDomainId: string;
    providerData?: ProviderData;
  }> {
    const normalized = normalizeHost(host);
    const path = `/apps/${encodeURIComponent(appName())}/domains`;

    let domain: HerokuDomain;
    try {
      domain = await herokuFetch<HerokuDomain>(path, {
        method: "POST",
        body: JSON.stringify({ hostname: normalized }),
      });
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      const message = err instanceof Error ? err.message : String(err);
      if (!isAlreadyRegisteredError(status, message)) {
        throw err;
      }
      try {
        domain = await this.getDomain(normalized);
      } catch {
        throw err;
      }
    }

    return {
      providerDomainId: domain.id ?? normalized,
      providerData: providerDataFrom(domain),
    };
  }

  async removeDomain(host: string): Promise<void> {
    const normalized = normalizeHost(host);
    try {
      await herokuFetch(
        `/apps/${encodeURIComponent(appName())}/domains/${encodeURIComponent(normalized)}`,
        { method: "DELETE" }
      );
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 404) return;
      throw err;
    }
  }

  async getStatus(host: string): Promise<DomainStatus> {
    const domain = await this.getDomain(normalizeHost(host));
    return mapStatus(domain);
  }

  dnsInstructionsFor(
    host: string,
    kind: DomainKind,
    providerData?: ProviderData
  ): DnsInstruction[] {
    const target = cnameFrom(providerData);
    if (!target) {
      return [
        {
          recordType: kind === "apex" ? "ALIAS" : "CNAME",
          name: host,
          value: "Pending Heroku DNS target",
          description:
            "Heroku has not returned a DNS target yet. Remove and re-add this domain after Heroku API access is configured.",
        },
      ];
    }

    if (kind === "apex") {
      return [
        {
          recordType: "ALIAS",
          name: host,
          value: target,
          description:
            "Point your root domain to Heroku using ALIAS, ANAME, or CNAME flattening if your DNS provider supports it.",
        },
      ];
    }

    return [
      {
        recordType: "CNAME",
        name: host,
        value: target,
        description: "Point this subdomain to your Guestnix Heroku app.",
      },
    ];
  }

  private async getDomain(host: string) {
    return herokuFetch<HerokuDomain>(
      `/apps/${encodeURIComponent(appName())}/domains/${encodeURIComponent(host)}`
    );
  }
}
