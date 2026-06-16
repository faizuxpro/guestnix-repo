/**
 * Provider abstraction for custom-domain TLS provisioning.
 *
 * The platform attaching the domain to our app and issuing the TLS cert
 * is the one part of the custom-domain flow that's vendor-specific.
 * Everything else — DB rows, middleware host-routing, DNS verification —
 * is host-agnostic. We isolate the vendor surface behind this interface
 * so swapping providers later (Cloudflare for SaaS, AWS, self-hosted
 * Caddy) is a one-file change.
 *
 * Default provider: Heroku.
 */

import type { DomainKind } from "@/lib/domain-classify";

export type DnsInstruction = {
  recordType: "CNAME" | "A" | "ALIAS";
  name: string;        // what the host enters in their DNS provider
  value: string;       // target value
  description?: string;
};

export type DomainStatus = {
  // Whether the provider has verified the domain belongs to our project
  // (DNS pointing at us).
  verified: boolean;
  // Whether the provider thinks DNS is currently misconfigured (record
  // points elsewhere, missing, etc.).
  misconfigured: boolean;
  sslStatus: "pending" | "active" | "error";
  sslError?: string;
};

export type ProviderData = Record<string, unknown>;

export interface CustomDomainProvider {
  /**
   * Register the domain with the provider. After this returns successfully
   * the provider will begin attempting TLS issuance (Let's Encrypt via
   * Vercel, etc.). The returned id is what we'll pass back to the provider
   * for future status / remove calls.
   */
  addDomain(host: string): Promise<{
    providerDomainId: string;
    providerData?: ProviderData;
  }>;
  removeDomain(host: string): Promise<void>;
  getStatus(host: string): Promise<DomainStatus>;
  /**
   * What DNS records the host should add at their registrar. Apex usually
   * needs ALIAS/ANAME/CNAME flattening or provider A records; subdomains
   * use CNAME.
   */
  dnsInstructionsFor(
    host: string,
    kind: DomainKind,
    providerData?: ProviderData
  ): DnsInstruction[];
}

let cachedProvider: CustomDomainProvider | null = null;

export function getProvider(): CustomDomainProvider {
  if (cachedProvider) return cachedProvider;
  const name = (process.env.CUSTOM_DOMAIN_PROVIDER ?? "heroku").toLowerCase();
  switch (name) {
    case "heroku": {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { HerokuProvider } = require("@/lib/providers/heroku") as {
        HerokuProvider: new () => CustomDomainProvider;
      };
      cachedProvider = new HerokuProvider();
      return cachedProvider;
    }
    case "vercel":
    default: {
      // Lazy import so non-Vercel deployments don't pay the cost of
      // loading the Vercel client. Future providers go here.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { VercelProvider } = require("@/lib/providers/vercel") as {
        VercelProvider: new () => CustomDomainProvider;
      };
      cachedProvider = new VercelProvider();
      return cachedProvider;
    }
  }
}

/**
 * Reset the singleton — only used by tests.
 */
export function _resetProviderForTests() {
  cachedProvider = null;
}
