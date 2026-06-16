import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { guidebooks } from "@/lib/db/schema";
import {
  isGuidebookProtected,
  passwordMatches,
  signUnlockToken,
  unlockCookieName,
} from "@/lib/guidebook-access";
import {
  checkRateLimit,
  clientIpIdentifier,
  rateLimitedResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const unlockSchema = z.object({
  password: z.string().min(1).max(100),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const limit = await checkRateLimit(request, {
    scope: `guidebook_unlock:${slug}`,
    identifier: clientIpIdentifier(request),
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return rateLimitedResponse(limit);
  }

  const body = await request.json().catch(() => null);
  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  const guidebook = await db.query.guidebooks.findFirst({
    where: and(eq(guidebooks.slug, slug), eq(guidebooks.status, "published")),
  });
  if (!guidebook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const settings = (guidebook.settings ?? {}) as Record<string, unknown>;
  if (!isGuidebookProtected(settings)) {
    return NextResponse.json({ success: true });
  }

  const hash = settings.password_hash;
  const legacyPassword = settings.password;
  const stored =
    typeof hash === "string" && hash
      ? hash
      : typeof legacyPassword === "string"
        ? legacyPassword
        : "";
  if (!passwordMatches(stored, parsed.data.password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: unlockCookieName(guidebook.id),
    value: signUnlockToken(guidebook.id, stored),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
