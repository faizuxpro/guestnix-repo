/**
 * One-off backfill: give every existing profile that has no subscription an
 * active "pro" subscription, so guides created before billing existed stay
 * online after this migration. Idempotent — safe to run more than once.
 *
 * Run:  npx tsx scripts/backfill-subscriptions.ts
 *
 * SQL equivalent (Supabase SQL editor), if you'd rather not use tsx:
 *   insert into subscriptions (user_id, plan, status, provider)
 *   select p.id, 'pro', 'active', null
 *   from profiles p
 *   left join subscriptions s on s.user_id = p.id
 *   where s.id is null;
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, isNull } from "drizzle-orm";
import { profiles, subscriptions } from "../src/lib/db/schema";

async function main() {
  // Imported dynamically so dotenv has populated DATABASE_URL before the db
  // module's connection check runs.
  const { db } = await import("../src/lib/db");

  const rows = await db
    .select({ id: profiles.id })
    .from(profiles)
    .leftJoin(subscriptions, eq(subscriptions.userId, profiles.id))
    .where(isNull(subscriptions.id));

  if (rows.length === 0) {
    console.log("No profiles need backfilling.");
    return;
  }

  for (const row of rows) {
    await db
      .insert(subscriptions)
      .values({
        userId: row.id,
        plan: "pro",
        status: "active",
        provider: null,
      })
      .onConflictDoNothing({ target: subscriptions.userId });
  }

  console.log(
    `Backfilled ${rows.length} subscription(s) (grandfathered to PRO / active).`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
