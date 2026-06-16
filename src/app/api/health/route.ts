import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type HealthStatus = "ok" | "error";

export async function GET() {
  const checks: { app: HealthStatus; database: HealthStatus } = {
    app: "ok",
    database: "ok",
  };

  try {
    await db.execute(sql`select 1`);
  } catch {
    checks.database = "error";
  }

  const ok = checks.app === "ok" && checks.database === "ok";

  return NextResponse.json(
    {
      ok,
      service: "guestnix",
      time: new Date().toISOString(),
      checks,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
