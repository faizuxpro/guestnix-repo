import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { GuidebookMiniEditorQuickFlow } from "@/components/dashboard/GuidebookMiniEditorQuickFlow";
import { createServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function NewGuidebookPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/guidebooks/new");
  }

  const hostProperties = await db
    .select({
      id: properties.id,
      name: properties.name,
      address: properties.address,
      city: properties.city,
      state: properties.state,
      country: properties.country,
    })
    .from(properties)
    .where(eq(properties.userId, user.id))
    .orderBy(properties.createdAt);

  return <GuidebookMiniEditorQuickFlow properties={hostProperties} />;
}
