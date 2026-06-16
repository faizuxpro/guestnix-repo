import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import { storeSettings } from "@/lib/db/schema";
import { createServerClient } from "@/lib/supabase/server";
import {
  getDashboardStorePaymentSettings,
  serializeDashboardStoreSettings,
} from "@/lib/store/dashboard-data";
import { normalizeStorePaymentMethods } from "@/lib/store/payment-methods";
import { storeSettingsPatchSchema } from "@/lib/store/validation";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getDashboardStorePaymentSettings(user.id);

  return NextResponse.json({ settings });
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
  const parsed = storeSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await db.query.storeSettings.findFirst({
    where: eq(storeSettings.userId, user.id),
  });
  const paymentMethods =
    parsed.data.paymentMethods === undefined
      ? normalizeStorePaymentMethods(existing?.paymentMethods)
      : normalizeStorePaymentMethods(parsed.data.paymentMethods);
  const paymentInstructions =
    parsed.data.paymentInstructions === undefined
      ? existing?.paymentInstructions ?? null
      : parsed.data.paymentInstructions ?? null;

  const [row] = await db
    .insert(storeSettings)
    .values({
      userId: user.id,
      paymentInstructions,
      paymentMethods,
    })
    .onConflictDoUpdate({
      target: storeSettings.userId,
      set: {
        paymentInstructions,
        paymentMethods,
        updatedAt: new Date(),
      },
    })
    .returning();

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.storePaymentSettingsUpdated,
    properties: {
      source: "dashboard_store",
      status:
        row.paymentInstructions || normalizeStorePaymentMethods(row.paymentMethods).length
          ? "configured"
          : "empty",
    },
  });

  return NextResponse.json({
    settings: serializeDashboardStoreSettings(row),
  });
}
