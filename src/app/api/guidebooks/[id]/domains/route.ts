import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { customDomains, guidebooks } from "@/lib/db/schema";
import { classifyHost } from "@/lib/domain-classify";
import { getProvider } from "@/lib/custom-domain-provider";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";

type DomainRow = {
  id: string;
  domain: string;
  status: string;
  domainKind: string;
  verificationToken: string | null;
  verifiedAt: Date | null;
  providerDomainId: string | null;
  providerData: unknown;
  sslStatus: string;
  sslError: string | null;
  lastCheckedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function serializeDomain(row: DomainRow) {
  const provider = getProvider();
  const kind = row.domainKind === "apex" ? "apex" : "subdomain";
  const providerData =
    row.providerData && typeof row.providerData === "object" && !Array.isArray(row.providerData)
      ? (row.providerData as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    domain: row.domain,
    status: row.status,
    domainKind: kind,
    verificationToken: row.verificationToken,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    providerDomainId: row.providerDomainId,
    sslStatus: row.sslStatus,
    sslError: row.sslError,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    dnsInstructions: provider.dnsInstructionsFor(row.domain, kind, providerData),
    verificationTxt: row.verificationToken
      ? {
          recordType: "TXT" as const,
          name: `_guestnix-verify.${row.domain}`,
          value: row.verificationToken,
          description:
            "Proves you control DNS for this domain (prevents domain hijacking).",
        }
      : null,
  };
}

async function requireOwnedGuidebook(guidebookId: string, userId: string) {
  return db.query.guidebooks.findFirst({
    where: and(eq(guidebooks.id, guidebookId), eq(guidebooks.userId, userId)),
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const guidebook = await requireOwnedGuidebook(id, user.id);
  if (!guidebook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.guidebookId, id));

  return NextResponse.json(rows.map(serializeDomain));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const guidebook = await requireOwnedGuidebook(id, user.id);
  if (!guidebook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let payload: { domain?: unknown };
  try {
    payload = (await request.json()) as { domain?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof payload.domain !== "string") {
    return NextResponse.json(
      { error: { domain: ["Domain is required"] } },
      { status: 400 }
    );
  }

  const classified = classifyHost(payload.domain);
  if (classified.kind === null) {
    return NextResponse.json(
      { error: { domain: [classified.error] } },
      { status: 400 }
    );
  }

  // Block obvious mistakes: pointing our own canonical host at our own
  // app would create a routing loop.
  const canonical = (process.env.NEXT_PUBLIC_CANONICAL_HOST ?? "").toLowerCase();
  if (canonical && (classified.host === canonical || classified.host === `www.${canonical}`)) {
    return NextResponse.json(
      { error: { domain: ["This is the Guestnix domain — pick your own."] } },
      { status: 400 }
    );
  }

  // Globally unique — another host can't claim a domain we're already serving.
  const conflict = await db
    .select({ id: customDomains.id })
    .from(customDomains)
    .where(eq(customDomains.domain, classified.host))
    .limit(1);
  if (conflict.length > 0) {
    return NextResponse.json(
      { error: { domain: ["Domain already in use"] } },
      { status: 409 }
    );
  }

  const verificationToken = randomBytes(24).toString("hex");
  let providerDomainId: string;
  let providerData: Record<string, unknown> = {};

  try {
    const result = await getProvider().addDomain(classified.host);
    providerDomainId = result.providerDomainId;
    providerData = result.providerData ?? {};
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Provider registration failed";
    return NextResponse.json(
      { error: `Provider registration failed: ${message}` },
      { status: 502 }
    );
  }

  const [row] = await db
    .insert(customDomains)
    .values({
      guidebookId: id,
      userId: user.id,
      domain: classified.host,
      domainKind: classified.kind,
      verificationToken,
      providerDomainId,
      providerData,
      status: "pending",
      sslStatus: "pending",
    })
    .returning();

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.customDomainAdded,
    properties: {
      guidebook_id: id,
      domain_kind: classified.kind,
      status: "pending",
    },
  });

  return NextResponse.json(serializeDomain(row), { status: 201 });
}
