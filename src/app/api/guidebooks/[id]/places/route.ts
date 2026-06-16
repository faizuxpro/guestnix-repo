import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  guidebookPlaces,
} from "@/lib/db/schema";
import { createPlaceSchema } from "@/lib/validations";
import {
  requireGuidebookAccess,
  requireGuidebookDraftEdit,
  serializeDraftTouch,
  touchGuidebookDraft,
} from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";

const bulkSyncPlacesSchema = z.object({
  places: z.array(createPlaceSchema).max(300),
});

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
  const access = await requireGuidebookAccess(user.id, id, "editor");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const places = await db
    .select()
    .from(guidebookPlaces)
    .where(eq(guidebookPlaces.guidebookId, id))
    .orderBy(guidebookPlaces.orderIndex);

  return NextResponse.json(places);
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
  const access = await requireGuidebookDraftEdit(user.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createPlaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const last = await db
    .select({ orderIndex: guidebookPlaces.orderIndex })
    .from(guidebookPlaces)
    .where(eq(guidebookPlaces.guidebookId, id))
    .orderBy(desc(guidebookPlaces.orderIndex))
    .limit(1);
  const nextIndex = last[0] ? last[0].orderIndex + 1 : 0;

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Added place",
  });

  const [created] = await db
    .insert(guidebookPlaces)
    .values({
      guidebookId: id,
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      website: parsed.data.website ?? null,
      email: parsed.data.email ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      tags: parsed.data.tags ?? {},
      openingHours: parsed.data.openingHours ?? null,
      orderIndex: nextIndex,
    })
    .returning();

  const draft = await touchGuidebookDraft(id, user.id);

  return NextResponse.json(
    { ...created, _draft: serializeDraftTouch(draft) },
    { status: 201 }
  );
}

export async function PUT(
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
  const access = await requireGuidebookDraftEdit(user.id, id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = bulkSyncPlacesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const deduped = new Map<string, z.infer<typeof createPlaceSchema>>();
  for (const place of parsed.data.places) {
    const key = `${place.name.toLowerCase()}-${place.lat.toFixed(5)}-${place.lng.toFixed(5)}`;
    if (!deduped.has(key)) {
      deduped.set(key, place);
    }
  }

  const incomingPlaces = Array.from(deduped.values());
  const existing = await db
    .select()
    .from(guidebookPlaces)
    .where(eq(guidebookPlaces.guidebookId, id))
    .orderBy(guidebookPlaces.orderIndex);

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: access.role,
    action: "Synced places",
  });

  const existingByKey = new Map<string, (typeof existing)[number]>();
  for (const place of existing) {
    const key = `${place.name.toLowerCase()}-${place.lat.toFixed(5)}-${place.lng.toFixed(5)}`;
    if (!existingByKey.has(key)) {
      existingByKey.set(key, place);
    }
  }

  await db.transaction(async (tx) => {
    const keptIds = new Set<string>();
    const now = new Date();

    for (const [index, place] of incomingPlaces.entries()) {
      const key = `${place.name.toLowerCase()}-${place.lat.toFixed(5)}-${place.lng.toFixed(5)}`;
      const match = existingByKey.get(key);

      if (match) {
        keptIds.add(match.id);
        await tx
          .update(guidebookPlaces)
          .set({
            name: place.name,
            category: place.category,
            description: place.description ?? null,
            lat: place.lat,
            lng: place.lng,
            address: place.address ?? null,
            phone: place.phone ?? null,
            website: place.website ?? null,
            email: place.email ?? null,
            imageUrl: place.imageUrl ?? null,
            tags: place.tags ?? {},
            openingHours: place.openingHours ?? null,
            orderIndex: index,
            updatedAt: now,
          })
          .where(
            and(
              eq(guidebookPlaces.id, match.id),
              eq(guidebookPlaces.guidebookId, id)
            )
          );
      } else {
        const [created] = await tx
          .insert(guidebookPlaces)
          .values({
            guidebookId: id,
            name: place.name,
            category: place.category,
            description: place.description ?? null,
            lat: place.lat,
            lng: place.lng,
            address: place.address ?? null,
            phone: place.phone ?? null,
            website: place.website ?? null,
            email: place.email ?? null,
            imageUrl: place.imageUrl ?? null,
            tags: place.tags ?? {},
            openingHours: place.openingHours ?? null,
            orderIndex: index,
          })
          .returning({ id: guidebookPlaces.id });
        if (created) keptIds.add(created.id);
      }
    }

    const toDelete = existing
      .map((place) => place.id)
      .filter((placeId) => !keptIds.has(placeId));

    if (toDelete.length > 0) {
      await tx
        .delete(guidebookPlaces)
        .where(
          and(
            eq(guidebookPlaces.guidebookId, id),
            inArray(guidebookPlaces.id, toDelete)
          )
        );
    }
  });

  const draft = await touchGuidebookDraft(id, user.id);

  const places = await db
    .select()
    .from(guidebookPlaces)
    .where(eq(guidebookPlaces.guidebookId, id))
    .orderBy(guidebookPlaces.orderIndex);

  return NextResponse.json({
    places,
    count: places.length,
    _draft: serializeDraftTouch(draft),
  });
}
