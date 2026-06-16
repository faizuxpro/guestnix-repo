import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { guidebooks, profiles, properties, subscriptions } from "@/lib/db/schema";
import { identifyServerProductUser } from "./posthog-server";

export async function syncProductUserProfile(userId: string) {
  const [[profile], [subscription], [propertyStats], [guidebookStats]] =
    await Promise.all([
      db
        .select({
          onboardingCompleted: profiles.onboardingCompleted,
          plan: profiles.plan,
        })
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1),
      db
        .select({
          billingInterval: subscriptions.billingInterval,
          plan: subscriptions.plan,
          status: subscriptions.status,
        })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1),
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(properties)
        .where(eq(properties.userId, userId)),
      db
        .select({
          count: sql<number>`count(*)::int`,
          publishedCount: sql<number>`count(*) filter (where ${guidebooks.status} = 'published')::int`,
        })
        .from(guidebooks)
        .where(eq(guidebooks.userId, userId)),
    ]);

  await identifyServerProductUser({
    distinctId: userId,
    properties: {
      billing_interval: subscription?.billingInterval ?? null,
      guidebook_count: guidebookStats?.count ?? 0,
      onboarding_completed: profile?.onboardingCompleted ?? false,
      plan_name: subscription?.plan ?? profile?.plan ?? null,
      property_count: propertyStats?.count ?? 0,
      published_guidebook_count: guidebookStats?.publishedCount ?? 0,
      subscription_status: subscription?.status ?? "none",
    },
  });
}
