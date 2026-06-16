/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const postgres = require('postgres');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const sql = postgres(process.env.DATABASE_URL);
const sqlFile = path.resolve(__dirname, '../supabase/migrations/016_lock_down_public_rls.sql');

(async () => {
  try {
    const script = fs.readFileSync(sqlFile, 'utf8');
    console.log('Applying RLS policies using', sqlFile);
    await sql.unsafe(script);
    console.log('RLS policies applied successfully.');
  } catch (error) {
    console.error('Failed to apply RLS policies:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
