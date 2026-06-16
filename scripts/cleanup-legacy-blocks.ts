/**
 * One-shot cleanup: delete `guidebook_blocks` rows whose `type` was dropped
 * in the Phase 1 widgets refactor.
 *
 * Dropped types:
 *   - rules           → replaced by `text` (variant: "stack")
 *   - amenities       → replaced by `text` (variant: "stack")
 *   - contact         → replaced by `text` (variant: "contacts")
 *   - emergency       → replaced by `emergency_contacts` widget
 *   - places          → replaced by the Nearby featured page
 *   - custom_html, upsell, transport, reviews — ghost types, never had editors
 *
 * Run once against the dev database:
 *
 *   npx tsx scripts/cleanup-legacy-blocks.ts
 *
 * This is idempotent: running it twice is harmless.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import { inArray } from "drizzle-orm";
import postgres from "postgres";
import { guidebookBlocks } from "../src/lib/db/schema";

const DROPPED_TYPES = [
  "rules",
  "amenities",
  "contact",
  "emergency",
  "places",
  "custom_html",
  "upsell",
  "transport",
  "reviews",
] as const;

async function main() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    console.error("DATABASE_URL or POSTGRES_URL is required.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql, { schema: { guidebookBlocks } });

  const before = await db
    .select({ type: guidebookBlocks.type })
    .from(guidebookBlocks)
    .where(inArray(guidebookBlocks.type, DROPPED_TYPES as unknown as string[]));

  const counts: Record<string, number> = {};
  for (const row of before) counts[row.type] = (counts[row.type] ?? 0) + 1;

  console.log("Rows to delete by type:");
  for (const type of DROPPED_TYPES) {
    console.log(`  ${type.padEnd(14)} ${counts[type] ?? 0}`);
  }
  console.log(`Total: ${before.length}`);

  if (before.length === 0) {
    console.log("Nothing to do.");
    await sql.end();
    return;
  }

  const result = await db
    .delete(guidebookBlocks)
    .where(inArray(guidebookBlocks.type, DROPPED_TYPES as unknown as string[]))
    .returning({ id: guidebookBlocks.id });

  console.log(`Deleted ${result.length} block(s).`);

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
