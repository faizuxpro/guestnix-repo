import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { customDomains, guidebooks } from "@/lib/db/schema";
import { getProvider } from "@/lib/custom-domain-provider";
import { invalidateCustomDomainCache } from "@/lib/custom-domain-resolver";

export async function DELETE(
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

  // Ownership check by joining customDomains → guidebooks. Confirms the
  // domain belongs to a guidebook owned by the requesting user.
  const row = await db
    .select({
      id: customDomains.id,
      domain: customDomains.domain,
      providerDomainId: customDomains.providerDomainId,
      status: customDomains.status,
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

  // Tell the provider first. If it errors we keep the DB row so the host
  // can retry; if the provider says "already gone" the helper swallows it.
  if (row[0].providerDomainId) {
    try {
      await getProvider().removeDomain(row[0].domain);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Provider removal failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  await db.delete(customDomains).where(eq(customDomains.id, domainId));
  invalidateCustomDomainCache(row[0].domain);

  return NextResponse.json({ success: true });
}
