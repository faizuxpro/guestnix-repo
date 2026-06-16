import { NextResponse } from "next/server";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { db } from "@/lib/db";
import { storeItems } from "@/lib/db/schema";
import { createServerClient } from "@/lib/supabase/server";
import {
  getDashboardStoreCatalogItems,
  serializeDashboardStoreItem,
} from "@/lib/store/dashboard-data";
import { storeItemCreateSchema } from "@/lib/store/validation";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await getDashboardStoreCatalogItems(user.id);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = storeItemCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(storeItems)
    .values({
      userId: user.id,
      itemType: parsed.data.itemType,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      priceCents: parsed.data.priceCents,
      currency: parsed.data.currency,
      unitLabel: parsed.data.unitLabel ?? null,
      category: parsed.data.category ?? null,
      active: parsed.data.active,
    })
    .returning();

  await trackServerProductEvent({
    distinctId: user.id,
    event: productEvents.storeItemCreated,
    properties: {
      currency: created.currency,
      item_type: created.itemType,
      source: "dashboard_store",
      status: created.active ? "active" : "inactive",
      subtotal_cents: created.priceCents,
    },
  });

  return NextResponse.json(
    { item: serializeDashboardStoreItem(created) },
    { status: 201 }
  );
}
