import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guidebooks, storeRequests } from "@/lib/db/schema";
import {
  createStoreProofSignedUrl,
  uploadStoreProofFile,
  validateStoreProofFile,
} from "@/lib/store/proof-files";
import { hashStoreGuestToken } from "@/lib/store/tokens";
import {
  checkRateLimit,
  clientIpIdentifier,
  rateLimitedResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

async function loadGuestStoreRequest(slug: string, token: string) {
  const tokenHash = hashStoreGuestToken(token);
  const rows = await db
    .select({ request: storeRequests })
    .from(storeRequests)
    .innerJoin(guidebooks, eq(storeRequests.guidebookId, guidebooks.id))
    .where(
      and(
        eq(guidebooks.slug, slug),
        eq(storeRequests.guestAccessTokenHash, tokenHash)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

function proofUploadError(request: typeof storeRequests.$inferSelect) {
  if (request.status === "cancelled") {
    return "This request has been cancelled";
  }

  if (request.status === "new") {
    return "Wait for host approval before sending payment proof";
  }

  if (request.paymentStatus === "not_required") {
    return "Payment is not required for this request";
  }

  if (request.paymentStatus === "external_paid") {
    return "Payment has already been confirmed";
  }

  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const row = await loadGuestStoreRequest(slug, token);

  if (!row?.request.paymentProofUrl) {
    return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });
  }

  try {
    const signedUrl = await createStoreProofSignedUrl(
      row.request.paymentProofUrl
    );
    return NextResponse.redirect(signedUrl);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Payment proof could not be opened";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const uploadLimit = await checkRateLimit(request, {
    scope: "store_request_proof_upload",
    identifier: `${clientIpIdentifier(request)}:${token}`,
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!uploadLimit.allowed) {
    return rateLimitedResponse(uploadLimit);
  }
  const row = await loadGuestStoreRequest(slug, token);

  if (!row) {
    return NextResponse.json({ error: "Store request not found" }, { status: 404 });
  }

  const stateError = proofUploadError(row.request);
  if (stateError) {
    return NextResponse.json({ error: stateError }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const fileError = validateStoreProofFile(file);
  if (fileError || !file) {
    return NextResponse.json(
      { error: fileError ?? "No file provided" },
      { status: 400 }
    );
  }

  try {
    const uploaded = await uploadStoreProofFile({
      requestId: row.request.id,
      file,
    });
    return NextResponse.json(
      {
        proofUrl: uploaded.proofValue,
        fileName: file.name,
      },
      { status: 201 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Payment proof could not be uploaded";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
