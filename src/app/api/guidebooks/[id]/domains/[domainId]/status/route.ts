import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { customDomains, guidebooks } from "@/lib/db/schema";
import { getProvider } from "@/lib/custom-domain-provider";
import { invalidateCustomDomainCache } from "@/lib/custom-domain-resolver";

/**
 * Poll endpoint hit by the dashboard while a verified domain is waiting
 * for TLS issuance. Reconciles the DB row with provider truth.
 */
export async function GET(
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
      status: customDomains.status,
      sslStatus: customDomains.sslStatus,
      verifiedAt: customDomains.verifiedAt,
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

  // No point polling the provider for a pending-DNS row — host hasn't
  // verified yet. Just return current state.
  if (domain.status === "pending") {
    return NextResponse.json({
      status: domain.status,
      sslStatus: domain.sslStatus,
      verified: false,
      misconfigured: false,
    });
  }

  let providerStatus: Awaited<ReturnType<ReturnType<typeof getProvider>["getStatus"]>>;
  try {
    providerStatus = await getProvider().getStatus(domain.domain);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Provider status failed: ${message}` },
      { status: 502 }
    );
  }

  // Once both `verified` and not `misconfigured`, treat the domain as
  // live — bump status to 'active' so middleware actually routes it.
  const now = new Date();
  const nextStatus =
    providerStatus.verified && !providerStatus.misconfigured
      ? "active"
      : domain.status === "active"
        ? "active"
        : "verified";

  const [updated] = await db
    .update(customDomains)
    .set({
      status: nextStatus,
      sslStatus: providerStatus.sslStatus,
      sslError: providerStatus.sslError ?? null,
      lastCheckedAt: now,
      updatedAt: now,
    })
    .where(eq(customDomains.id, domainId))
    .returning();

  // If we just flipped to 'active', clear the resolver cache so the next
  // guest visit picks it up.
  if (nextStatus === "active" && domain.status !== "active") {
    invalidateCustomDomainCache(domain.domain);
  }

  return NextResponse.json({
    status: updated.status,
    sslStatus: updated.sslStatus,
    sslError: updated.sslError,
    verified: providerStatus.verified,
    misconfigured: providerStatus.misconfigured,
    lastCheckedAt: updated.lastCheckedAt?.toISOString() ?? null,
  });
}
