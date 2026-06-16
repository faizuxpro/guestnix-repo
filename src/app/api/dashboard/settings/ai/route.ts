import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  getMonthlyCap,
  getMonthlyUsage,
  setMonthlyCap,
} from "@/lib/ai/usage";
import { aiSettingsSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [cap, used] = await Promise.all([
    getMonthlyCap(user.id),
    getMonthlyUsage(user.id),
  ]);
  return NextResponse.json({ cap, used });
}

export async function PATCH(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = aiSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await setMonthlyCap(user.id, parsed.data.aiMessageCap);
  const [cap, used] = await Promise.all([
    getMonthlyCap(user.id),
    getMonthlyUsage(user.id),
  ]);
  return NextResponse.json({ cap, used });
}
