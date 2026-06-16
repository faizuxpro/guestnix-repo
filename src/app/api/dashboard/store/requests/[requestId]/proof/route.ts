import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { storeRequests } from "@/lib/db/schema";
import { createServerClient } from "@/lib/supabase/server";
import { createStoreProofSignedUrl } from "@/lib/store/proof-files";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const requestRow = await db.query.storeRequests.findFirst({
    where: and(eq(storeRequests.id, requestId), eq(storeRequests.userId, user.id)),
  });

  if (!requestRow?.paymentProofUrl) {
    return NextResponse.json({ error: "Payment proof not found" }, { status: 404 });
  }

  try {
    const signedUrl = await createStoreProofSignedUrl(requestRow.paymentProofUrl);
    return NextResponse.redirect(signedUrl);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Payment proof could not be opened";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
