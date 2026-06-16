/**
 * Verify a custom domain after it has been registered with the active
 * provider. The provider gives us the DNS target; the host proves ownership
 * with both the DNS target record and a Guestnix TXT record.
 */

import { NextResponse } from "next/server";
import { Resolver } from "node:dns/promises";
import { and, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { customDomains, guidebooks } from "@/lib/db/schema";
import { invalidateCustomDomainCache } from "@/lib/custom-domain-resolver";

const PROVIDER_NAME = (process.env.CUSTOM_DOMAIN_PROVIDER ?? "heroku")
  .trim()
  .toLowerCase();
const FALLBACK_CNAME =
  process.env.CUSTOM_DOMAIN_CNAME_TARGET?.trim() ||
  process.env.VERCEL_CNAME_TARGET?.trim() ||
  (PROVIDER_NAME === "vercel" ? "cname.vercel-dns.com" : "");

const PUBLIC_DNS_SERVERS = (
  process.env.VERIFY_DNS_SERVERS?.trim() || "1.1.1.1,8.8.8.8"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const publicResolver = new Resolver({ timeout: 5000, tries: 2 });
publicResolver.setServers(PUBLIC_DNS_SERVERS);

async function getAuthoritativeResolver(
  host: string
): Promise<Resolver | null> {
  const labels = host.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    const zone = labels.slice(i).join(".");
    try {
      const nsNames = await publicResolver.resolveNs(zone);
      if (!nsNames.length) continue;
      const ips: string[] = [];
      for (const ns of nsNames) {
        try {
          const a = await publicResolver.resolve4(ns);
          ips.push(...a);
        } catch {
          // Ignore individual NS resolution failures.
        }
        if (ips.length >= 2) break;
      }
      if (!ips.length) continue;
      const auth = new Resolver({ timeout: 5000, tries: 2 });
      auth.setServers(ips);
      return auth;
    } catch {
      // Try the parent zone.
    }
  }
  return null;
}

function providerTarget(providerData: unknown): string {
  if (!providerData || typeof providerData !== "object" || Array.isArray(providerData)) {
    return FALLBACK_CNAME;
  }
  const cname = (providerData as Record<string, unknown>).cname;
  return typeof cname === "string" && cname.trim() ? cname.trim() : FALLBACK_CNAME;
}

async function verifyDns(
  host: string,
  kind: "apex" | "subdomain",
  expectedTarget: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const auth = await getAuthoritativeResolver(host);
  const dns = auth ?? publicResolver;
  const norm = (s: string) => s.toLowerCase().replace(/\.$/, "");
  const expected = norm(expectedTarget);

  if (!expected) {
    return {
      ok: false,
      reason:
        "Custom-domain DNS target is not available yet. Remove and re-add this domain after provider API access is configured.",
    };
  }

  try {
    if (kind === "apex") {
      const ips = await dns.resolve4(host);
      let targetIps: string[] = [];
      try {
        targetIps = await publicResolver.resolve4(expected);
      } catch {
        // Keep the mismatch error below.
      }

      if (!targetIps.some((ip) => ips.includes(ip))) {
        const expectedText =
          targetIps.length > 0 ? ` (${targetIps.join(", ")})` : "";
        return {
          ok: false,
          reason: `Expected apex DNS to point to A records returned by ${expectedTarget}${expectedText}, saw ${ips.join(", ") || "no A records"}.`,
        };
      }
    } else {
      const targets = await dns.resolveCname(host);
      if (!targets.some((t) => norm(t) === expected)) {
        return {
          ok: false,
          reason: `Expected CNAME pointing to ${expectedTarget}, saw ${targets.join(", ") || "no CNAME"}.`,
        };
      }
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return {
      ok: false,
      reason:
        code === "ENOTFOUND" || code === "ENODATA"
          ? "DNS record not found yet - propagation can take a few minutes."
          : `DNS lookup failed: ${(err as Error).message}`,
    };
  }
  return { ok: true };
}

async function verifyTxt(
  host: string,
  expectedToken: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const txtHost = `_guestnix-verify.${host}`;
  const auth = await getAuthoritativeResolver(host);
  const dns = auth ?? publicResolver;
  try {
    const records = await dns.resolveTxt(txtHost);
    const flattened = records.map((r) => r.join(""));
    if (!flattened.includes(expectedToken)) {
      return {
        ok: false,
        reason: `TXT verification record at ${txtHost} did not match.`,
      };
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return {
      ok: false,
      reason:
        code === "ENOTFOUND" || code === "ENODATA"
          ? `TXT record at ${txtHost} not found yet.`
          : `TXT lookup failed: ${(err as Error).message}`,
    };
  }
  return { ok: true };
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; domainId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, domainId } = await params;
  const row = await db
    .select({
      id: customDomains.id,
      domain: customDomains.domain,
      domainKind: customDomains.domainKind,
      verificationToken: customDomains.verificationToken,
      providerData: customDomains.providerData,
    })
    .from(customDomains)
    .innerJoin(guidebooks, eq(customDomains.guidebookId, guidebooks.id))
    .where(
      and(
        eq(customDomains.id, domainId),
        eq(customDomains.guidebookId, id),
        eq(guidebooks.userId, user.id)
      )
    )
    .limit(1);

  if (row.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const domain = row[0];
  if (!domain.verificationToken) {
    return NextResponse.json(
      { error: "Domain has no verification token - re-add it" },
      { status: 400 }
    );
  }

  const kind = domain.domainKind === "apex" ? "apex" : "subdomain";
  const expectedTarget = providerTarget(domain.providerData);

  const dnsResult = await verifyDns(domain.domain, kind, expectedTarget);
  if (!dnsResult.ok) {
    return NextResponse.json({ error: dnsResult.reason }, { status: 400 });
  }

  const txtResult = await verifyTxt(domain.domain, domain.verificationToken);
  if (!txtResult.ok) {
    return NextResponse.json({ error: txtResult.reason }, { status: 400 });
  }

  const now = new Date();
  const [updated] = await db
    .update(customDomains)
    .set({
      status: "verified",
      verifiedAt: now,
      sslStatus: "pending",
      sslError: null,
      lastCheckedAt: now,
      updatedAt: now,
    })
    .where(eq(customDomains.id, domainId))
    .returning();

  invalidateCustomDomainCache(domain.domain);

  return NextResponse.json({
    success: true,
    status: updated.status,
    sslStatus: updated.sslStatus,
    verifiedAt: updated.verifiedAt?.toISOString() ?? null,
  });
}
