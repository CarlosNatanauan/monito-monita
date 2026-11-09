/**
 * Neon + Drizzle clients. Server-only: never import this from a client
 * component.
 *
 * - `db()`: Neon HTTP driver. Lowest cold-start latency; use for normal
 *   single queries. HTTP can't run interactive transactions.
 * - `transaction(fn)`: Neon WebSocket pool, opened per call and closed
 *   afterwards (safe on serverless). Use when writes must succeed or fail
 *   together, e.g. saving the draw and setting the group to DRAWN.
 *
 * Node 24 has a global WebSocket, so the `ws` package isn't needed.
 * Clients are created lazily so builds don't need DATABASE_URL.
 */
import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

function createHttpDb() {
  return drizzleHttp({ client: neon(databaseUrl()), schema });
}

export type Db = ReturnType<typeof createHttpDb>;
export type Tx = Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

let httpDb: Db | undefined;

/** Shared HTTP client for everyday queries. */
export function db(): Db {
  httpDb ??= createHttpDb();
  return httpDb;
}

/** Runs `fn` in one interactive transaction; rolls back if it throws. */
export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: databaseUrl() });
  try {
    return await drizzleWs({ client: pool, schema }).transaction(fn);
  } finally {
    await pool.end();
  }
}
