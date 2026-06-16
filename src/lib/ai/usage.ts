import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatUsage, profiles } from "@/lib/db/schema";

function currentPeriod(): string {
  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${mm}-01`;
}

export async function getMonthlyUsage(userId: string): Promise<number> {
  const period = currentPeriod();
  const row = await db
    .select({ n: chatUsage.aiResponses })
    .from(chatUsage)
    .where(and(eq(chatUsage.userId, userId), eq(chatUsage.periodStart, period)))
    .limit(1);
  return row[0]?.n ?? 0;
}

/**
 * Monthly AI response cap for the user.
 * Returns `null` when unlimited (the default when the host hasn't set one).
 */
export async function getMonthlyCap(userId: string): Promise<number | null> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });
  if (profile?.aiMessageCap == null) return null;
  return profile.aiMessageCap;
}

export async function canAiRespond(
  userId: string
): Promise<{ allowed: boolean; used: number; cap: number | null }> {
  const [used, cap] = await Promise.all([
    getMonthlyUsage(userId),
    getMonthlyCap(userId),
  ]);
  const allowed = cap === null || used < cap;
  return { allowed, used, cap };
}

/**
 * Atomic upsert-increment. Called AFTER the AI response is successfully
 * persisted, so provider failures don't consume quota.
 */
export async function incrementUsage(userId: string): Promise<void> {
  const period = currentPeriod();
  await db
    .insert(chatUsage)
    .values({ userId, periodStart: period, aiResponses: 1 })
    .onConflictDoUpdate({
      target: [chatUsage.userId, chatUsage.periodStart],
      set: {
        aiResponses: sql`${chatUsage.aiResponses} + 1`,
        updatedAt: new Date(),
      },
    });
}

export async function setMonthlyCap(
  userId: string,
  cap: number | null
): Promise<void> {
  await db
    .update(profiles)
    .set({ aiMessageCap: cap, updatedAt: new Date() })
    .where(eq(profiles.id, userId));
}
