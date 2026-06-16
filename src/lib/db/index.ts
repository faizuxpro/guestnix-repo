import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add the Supabase Postgres connection string to .env.local (see .env.example)."
  );
}

// In dev, Next.js HMR re-evaluates this module on every reload. Without a
// global cache, each reload spins up a fresh `postgres` client without closing
// the old one — Supabase's session pool (15 connections) is exhausted in a
// handful of reloads. Cache on globalThis so HMR reuses the same client.
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(connectionString, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });

