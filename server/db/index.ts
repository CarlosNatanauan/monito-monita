/**
 * Postgres client (Neon) via node-postgres + Drizzle. Server-only: never
 * import this from a client component.
 *
 * Follows Neon's recommendation for Vercel Fluid compute: a regular TCP
 * connection pool, registered with `attachDatabasePool` so idle
 * connections are closed before the function instance is suspended.
 *
 * One client for everything:
 *   await db().select().from(groups)
 *   await db().transaction(async (tx) => { ... })   // rolls back on throw
 *
 * The pool is created lazily so builds don't need DATABASE_URL.
 */
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString });
  attachDatabasePool(pool);
  return drizzle({ client: pool, schema });
}

export type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Cached on globalThis so dev hot reloads reuse one pool.
const cache = globalThis as typeof globalThis & { __monitoDb?: Db };

export function db(): Db {
  cache.__monitoDb ??= createDb();
  return cache.__monitoDb;
}

/** Closes the pool. Only for scripts and tests; never call in app code. */
export async function closeDb(): Promise<void> {
  await cache.__monitoDb?.$client.end();
  cache.__monitoDb = undefined;
}
