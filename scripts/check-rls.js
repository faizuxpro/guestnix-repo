/* eslint-disable @typescript-eslint/no-require-imports */
const dotenv = require('dotenv');
const postgres = require('postgres');

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

(async () => {
  try {
    const tables = await sql`select tablename from pg_tables where schemaname='public' order by tablename`;
    console.log('TABLES:');
    tables.forEach((row) => console.log(`  ${row.tablename}`));

    const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class join pg_namespace on pg_class.relnamespace=pg_namespace.oid where pg_namespace.nspname='public' and relkind='r' order by relname`;
    console.log('RLS STATUS:');
    rls.forEach((row) => console.log(`  ${row.relname} row_security=${row.relrowsecurity} force_row_security=${row.relforcerowsecurity}`));
    const unprotected = rls.filter((row) => !row.relrowsecurity);

    const policies = await sql`select polname, polrelid::regclass::text as rel, polcmd, polpermissive from pg_policy order by rel, polname`;
    console.log('POLICIES:');
    policies.forEach((row) => console.log(`  ${row.rel} ${row.polname} cmd=${row.polcmd} permissive=${row.polpermissive}`));

    if (unprotected.length > 0) {
      console.error(
        `RLS is disabled on ${unprotected.length} public table(s): ${unprotected
          .map((row) => row.relname)
          .join(', ')}`
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
