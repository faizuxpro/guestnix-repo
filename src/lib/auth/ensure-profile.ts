import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export async function ensureProfile(user: User) {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    typeof metadata.full_name === "string" ? metadata.full_name : null;
  const avatarUrl =
    typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  await db
    .insert(profiles)
    .values({
      id: user.id,
      email: user.email ?? "",
      fullName,
      avatarUrl,
    })
    .onConflictDoNothing({ target: profiles.id });
}
