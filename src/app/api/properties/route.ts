import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { analyticsEvents, guidebooks, properties } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createPropertySchema } from "@/lib/validations";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { canCreateProperty } from "@/lib/billing/entitlements";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { syncProductUserProfile } from "@/lib/analytics/product-user";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .select()
    .from(properties)
    .where(eq(properties.userId, user.id))
    .orderBy(properties.createdAt);

  const propertyIds = result.map((property) => property.id);
  if (propertyIds.length === 0) {
    return NextResponse.json([]);
  }

  const linkedGuidebooks = await db
    .select({
      id: guidebooks.id,
      propertyId: guidebooks.propertyId,
      status: guidebooks.status,
      updatedAt: guidebooks.updatedAt,
    })
    .from(guidebooks)
    .where(
      and(
        eq(guidebooks.userId, user.id),
        inArray(guidebooks.propertyId, propertyIds)
      )
    );

  const guidebookIds = linkedGuidebooks.map((guidebook) => guidebook.id);
  const viewCounts = new Map<string, number>();
  if (guidebookIds.length > 0) {
    const rows = await db
      .select({
        guidebookId: analyticsEvents.guidebookId,
        views: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .where(
        and(
          inArray(analyticsEvents.guidebookId, guidebookIds),
          eq(analyticsEvents.eventType, "page_view")
        )
      )
      .groupBy(analyticsEvents.guidebookId);

    for (const row of rows) {
      viewCounts.set(row.guidebookId, row.views);
    }
  }

  const metrics = new Map<
    string,
    {
      guidebookCount: number;
      publishedGuidebookCount: number;
      draftGuidebookCount: number;
      viewCount: number;
      lastGuidebookUpdatedAt: Date | null;
    }
  >();

  for (const guidebook of linkedGuidebooks) {
    if (!guidebook.propertyId) continue;

    const current =
      metrics.get(guidebook.propertyId) ??
      {
        guidebookCount: 0,
        publishedGuidebookCount: 0,
        draftGuidebookCount: 0,
        viewCount: 0,
        lastGuidebookUpdatedAt: null,
      };

    current.guidebookCount += 1;
    if (guidebook.status === "published") {
      current.publishedGuidebookCount += 1;
    } else {
      current.draftGuidebookCount += 1;
    }
    current.viewCount += viewCounts.get(guidebook.id) ?? 0;
    if (
      !current.lastGuidebookUpdatedAt ||
      guidebook.updatedAt > current.lastGuidebookUpdatedAt
    ) {
      current.lastGuidebookUpdatedAt = guidebook.updatedAt;
    }

    metrics.set(guidebook.propertyId, current);
  }

  const enriched = result.map((property) => {
    const propertyMetrics = metrics.get(property.id);
    return {
      ...property,
      guidebookCount: propertyMetrics?.guidebookCount ?? 0,
      publishedGuidebookCount:
        propertyMetrics?.publishedGuidebookCount ?? 0,
      draftGuidebookCount: propertyMetrics?.draftGuidebookCount ?? 0,
      viewCount: propertyMetrics?.viewCount ?? 0,
      lastGuidebookUpdatedAt:
        propertyMetrics?.lastGuidebookUpdatedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const guard = await canCreateProperty(user.id);
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 402 });
  }

  const body = await request.json();
  const parsed = createPropertySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await ensureProfile(user);

    const [propertyCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(properties)
      .where(eq(properties.userId, user.id));
    const nextPropertyCount = (propertyCountRow?.count ?? 0) + 1;

    const [property] = await db
      .insert(properties)
      .values({
        userId: user.id,
        name: parsed.data.name,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        country: parsed.data.country,
        postalCode: parsed.data.postalCode,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        timezone: parsed.data.timezone,
      })
      .returning();

    await Promise.all([
      trackServerProductEvent({
        distinctId: user.id,
        event: productEvents.propertyCreated,
        properties: {
          is_first: nextPropertyCount === 1,
          property_count: nextPropertyCount,
          source: "dashboard",
        },
      }),
      syncProductUserProfile(user.id),
    ]);

    return NextResponse.json(property, { status: 201 });
  } catch (err) {
    console.error("POST /api/properties failed", err);
    return NextResponse.json(
      { error: { name: ["Could not create property. Please try again."] } },
      { status: 500 }
    );
  }
}
