import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { ensureProfile } from "@/lib/auth/ensure-profile";
import { profileSettingsSchema } from "@/lib/validations";

export const runtime = "nodejs";

type ProfileRow = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

function readMetadataString(user: User, key: string) {
  const value = (user.user_metadata as Record<string, unknown> | null)?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeProfile(user: User, profile: ProfileRow | null) {
  return {
    id: user.id,
    email: user.email ?? profile?.email ?? "",
    fullName: profile ? profile.fullName : readMetadataString(user, "full_name"),
    avatarUrl: profile ? profile.avatarUrl : readMetadataString(user, "avatar_url"),
  };
}

async function getCurrentUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function getProfile(userId: string) {
  const [profile] = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  return profile ?? null;
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(user);
  const profile = await getProfile(user.id);

  return NextResponse.json(normalizeProfile(user, profile));
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = profileSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  await ensureProfile(user);

  const metadata = {
    ...(user.user_metadata as Record<string, unknown> | null),
    full_name: parsed.data.fullName,
    avatar_url: parsed.data.avatarUrl,
  };

  const admin = createAdminClient();
  const { error: metadataError } = await admin.auth.admin.updateUserById(
    user.id,
    { user_metadata: metadata }
  );

  if (metadataError) {
    return NextResponse.json({ error: metadataError.message }, { status: 500 });
  }

  const [profile] = await db
    .update(profiles)
    .set({
      email: user.email ?? "",
      fullName: parsed.data.fullName,
      avatarUrl: parsed.data.avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id))
    .returning({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      avatarUrl: profiles.avatarUrl,
    });

  return NextResponse.json(normalizeProfile(user, profile ?? null));
}
