import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { guidebooks, guidebookPublications } from "@/lib/db/schema";
import { buildSnapshot, uploadSnapshot } from "@/lib/snapshot";
import { canPublish, checkEntitled } from "@/lib/billing/entitlements";
import { requireGuidebookAccess } from "@/lib/guidebook-permissions";
import { productEvents } from "@/lib/analytics/product";
import { trackServerProductEvent } from "@/lib/analytics/posthog-server";
import { syncProductUserProfile } from "@/lib/analytics/product-user";
import { upgradeLegacyGuidebookAccessSettings } from "@/lib/guidebook-access";
import { isDemoGuidebookSettings } from "@/lib/guidebook-public-url";

export async function POST(
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

  const access = await requireGuidebookAccess(user.id, id, "owner");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.error },
      { status: access.status }
    );
  }
  const guidebook = access.guidebook;

  // Publishing an already-published guide doesn't consume a new slot, so
  // only enforce the published-count limit on a draft → published transition.
  // Either way, the host must be entitled (block when a trial has lapsed).
  const guard =
    guidebook.status === "published"
      ? await checkEntitled(user.id)
      : await canPublish(user.id);
  if (!guard.allowed) {
    return NextResponse.json({ error: guard.reason }, { status: 402 });
  }

  const latest = await db
    .select({ version: guidebookPublications.version })
    .from(guidebookPublications)
    .where(eq(guidebookPublications.guidebookId, id))
    .orderBy(desc(guidebookPublications.version))
    .limit(1);
  const nextVersion = (latest[0]?.version ?? 0) + 1;

  const upgradedAccess = upgradeLegacyGuidebookAccessSettings(
    (guidebook.settings ?? {}) as Record<string, unknown>
  );
  if (upgradedAccess.changed) {
    await db
      .update(guidebooks)
      .set({ settings: upgradedAccess.settings, updatedAt: new Date() })
      .where(eq(guidebooks.id, id));
  }

  const snapshot = await buildSnapshot(id, nextVersion);

  // Storage write FIRST so a DB-side failure leaves an orphaned blob (which
  // the next publish overwrites) rather than a publication row pointing at
  // a missing snapshot (which would 404 the public page).
  let uploaded: Awaited<ReturnType<typeof uploadSnapshot>>;
  try {
    uploaded = await uploadSnapshot(guidebook.slug, nextVersion, snapshot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Snapshot upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const publishedAt = new Date();
  const [publication] = await db
    .insert(guidebookPublications)
    .values({
      guidebookId: id,
      version: nextVersion,
      slug: guidebook.slug,
      snapshotPath: uploaded.path,
      snapshotBytes: uploaded.bytes,
      snapshotChecksum: uploaded.checksum,
      publishedBy: user.id,
      publishedAt,
    })
    .returning();

  await db
    .update(guidebooks)
    .set({
      status: "published",
      publishedAt,
      latestPublicationId: publication.id,
      updatedAt: publishedAt,
    })
    .where(eq(guidebooks.id, id));

  // Drop any cached version of the public page so guests see the new
  // snapshot on next request. revalidatePath works on Vercel and on any
  // host honoring Next.js's data cache.
  revalidatePath(`/g/${guidebook.slug}`);
  if (isDemoGuidebookSettings(snapshot.guidebook.settings)) {
    revalidatePath(`/demo/${guidebook.slug}`);
  }

  await Promise.all([
    trackServerProductEvent({
      distinctId: user.id,
      event: productEvents.guidebookPublished,
      properties: {
        guidebook_id: id,
        is_first: nextVersion === 1,
        publication_version: nextVersion,
        status: guidebook.status === "published" ? "republished" : "published",
      },
    }),
    syncProductUserProfile(user.id),
  ]);

  return NextResponse.json({
    success: true,
    version: nextVersion,
    publishedAt: publishedAt.toISOString(),
    publicUrl: uploaded.publicUrl,
  });
}
