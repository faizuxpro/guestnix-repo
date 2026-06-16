import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebookPlaces } from "@/lib/db/schema";
import { updatePlaceSchema } from "@/lib/validations";
import {
  requireGuidebookDraftEdit,
  serializeDraftTouch,
  touchGuidebookDraft,
} from "@/lib/guidebook-permissions";
import { recordGuidebookChangeSnapshot } from "@/lib/guidebook-history";
import { PLACE_UNAVAILABLE_MESSAGE } from "@/lib/guidebook-error-copy";

async function verifyPlaceAccess(
  userId: string,
  guidebookId: string,
  placeId: string
) {
  const access = await requireGuidebookDraftEdit(userId, guidebookId);
  if (!access.ok) {
    return {
      ok: false as const,
      status: access.status,
      error: access.error,
    };
  }

  const row = await db
    .select({
      guidebookId: guidebookPlaces.guidebookId,
      placeId: guidebookPlaces.id,
    })
    .from(guidebookPlaces)
    .where(
      and(
        eq(guidebookPlaces.id, placeId),
        eq(guidebookPlaces.guidebookId, guidebookId)
      )
    )
    .limit(1);

  const item = row[0];
  if (!item) {
    return {
      ok: false as const,
      status: 404 as const,
      error: PLACE_UNAVAILABLE_MESSAGE,
    };
  }

  return { ok: true as const, ...item, role: access.role };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; placeId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, placeId } = await params;
  const owned = await verifyPlaceAccess(user.id, id, placeId);
  if (!owned.ok) {
    return NextResponse.json(
      { error: owned.error },
      { status: owned.status }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = updatePlaceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const patch = parsed.data;

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: owned.role,
    action: "Updated place",
  });

  const [updated] = await db
    .update(guidebookPlaces)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.category !== undefined ? { category: patch.category } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description ?? null }
        : {}),
      ...(patch.lat !== undefined ? { lat: patch.lat } : {}),
      ...(patch.lng !== undefined ? { lng: patch.lng } : {}),
      ...(patch.address !== undefined ? { address: patch.address ?? null } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone ?? null } : {}),
      ...(patch.website !== undefined ? { website: patch.website ?? null } : {}),
      ...(patch.email !== undefined ? { email: patch.email ?? null } : {}),
      ...(patch.imageUrl !== undefined
        ? { imageUrl: patch.imageUrl ?? null }
        : {}),
      ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
      ...(patch.openingHours !== undefined
        ? { openingHours: patch.openingHours ?? null }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(guidebookPlaces.id, placeId),
        eq(guidebookPlaces.guidebookId, id)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: PLACE_UNAVAILABLE_MESSAGE },
      { status: 404 }
    );
  }

  const draft = await touchGuidebookDraft(id, user.id);

  return NextResponse.json({ ...updated, _draft: serializeDraftTouch(draft) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; placeId: string }> }
) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, placeId } = await params;
  const owned = await verifyPlaceAccess(user.id, id, placeId);
  if (!owned.ok) {
    return NextResponse.json(
      { error: owned.error },
      { status: owned.status }
    );
  }

  await recordGuidebookChangeSnapshot({
    guidebookId: id,
    actorId: user.id,
    actorRole: owned.role,
    action: "Deleted place",
  });

  const [deleted] = await db
    .delete(guidebookPlaces)
    .where(
      and(
        eq(guidebookPlaces.id, placeId),
        eq(guidebookPlaces.guidebookId, id)
      )
    )
    .returning({ id: guidebookPlaces.id });

  if (!deleted) {
    return NextResponse.json(
      { error: PLACE_UNAVAILABLE_MESSAGE },
      { status: 404 }
    );
  }

  const draft = await touchGuidebookDraft(id, user.id);

  return NextResponse.json({ success: true, _draft: serializeDraftTouch(draft) });
}
