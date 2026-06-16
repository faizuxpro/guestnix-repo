import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  email: z.email(),
  source: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  console.log("[newsletter] subscribe", parsed.data.email, parsed.data.source ?? "unknown");
  return NextResponse.json({ ok: true });
}
