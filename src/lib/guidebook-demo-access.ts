import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guidebooks } from "@/lib/db/schema";
import { isDemoGuidebookSettings } from "@/lib/guidebook-public-url";

export async function isDemoGuidebookSlug(slug: string) {
  const guidebook = await db.query.guidebooks.findFirst({
    where: eq(guidebooks.slug, slug),
    columns: { settings: true },
  });

  return isDemoGuidebookSettings(
    guidebook?.settings as Record<string, unknown> | null
  );
}
