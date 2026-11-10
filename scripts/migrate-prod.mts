/**
 * Apply pending migrations to the PRODUCTION database.
 *
 *   npm run db:migrate:prod
 *
 * - Reads DATABASE_URL from .env.production.local only (never .env.local,
 *   never the shell environment).
 * - Refuses to run if it's the same database as .env.local (dev).
 * - Shows the host, database, and pending migrations, then asks you to
 *   type "migrate production" before changing anything.
 */
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { parseEnv } from "node:util";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const PROD_ENV_FILE = ".env.production.local";
const DEV_ENV_FILE = ".env.local";
const MIGRATIONS_FOLDER = "drizzle";
const CONFIRMATION = "migrate production";

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function readDatabaseUrl(file: string): string | undefined {
  if (!existsSync(file)) return undefined;
  return parseEnv(readFileSync(file, "utf8")).DATABASE_URL;
}

const prodUrl = readDatabaseUrl(PROD_ENV_FILE);
if (!prodUrl) fail(`No DATABASE_URL in ${PROD_ENV_FILE}. Create that file first (it's gitignored).`);

let target: URL;
try {
  target = new URL(prodUrl);
} catch {
  fail(`DATABASE_URL in ${PROD_ENV_FILE} isn't a valid connection string.`);
}
if (!["postgres:", "postgresql:"].includes(target.protocol)) fail("DATABASE_URL must start with postgresql://");

const devUrl = readDatabaseUrl(DEV_ENV_FILE);
if (devUrl) {
  try {
    const dev = new URL(devUrl);
    if (dev.hostname === target.hostname && dev.pathname === target.pathname) {
      fail(`${PROD_ENV_FILE} points at the same database as ${DEV_ENV_FILE} (dev). Refusing.`);
    }
  } catch {
    // Unparseable dev URL: nothing to compare against.
  }
}

// Migrations in the repo, from drizzle-kit's journal.
const journal = JSON.parse(readFileSync(`${MIGRATIONS_FOLDER}/meta/_journal.json`, "utf8")) as {
  entries: { tag: string; when: number }[];
};

const pool = new pg.Pool({ connectionString: prodUrl, max: 1 });

try {
  // Which migrations has production already applied? (read-only)
  let appliedCount = 0;
  const table = await pool.query<{ exists: boolean }>(
    "select to_regclass('drizzle.__drizzle_migrations') is not null as exists",
  );
  if (table.rows[0]?.exists) {
    const latest = await pool.query<{ created_at: string }>(
      "select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1",
    );
    const lastApplied = Number(latest.rows[0]?.created_at ?? 0);
    appliedCount = journal.entries.filter((e) => e.when <= lastApplied).length;
  }
  const pending = journal.entries.slice(appliedCount);

  console.log("\n  PRODUCTION migration");
  console.log("  ────────────────────");
  console.log(`  Host:      ${target.hostname}`);
  console.log(`  Database:  ${target.pathname.replace(/^\//, "") || "(default)"}`);
  console.log(`  Applied:   ${appliedCount} of ${journal.entries.length}`);
  console.log(`  Pending:   ${pending.length ? pending.map((e) => e.tag).join(", ") : "none"}\n`);

  if (pending.length === 0) {
    console.log("✔ Production is already up to date. Nothing to do.\n");
    process.exit(0);
  }

  if (!process.stdin.isTTY) fail("Needs an interactive terminal to confirm. Run it yourself in a terminal.");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`  Type "${CONFIRMATION}" to apply ${pending.length} migration(s): `);
  rl.close();
  if (answer.trim() !== CONFIRMATION) fail("Cancelled. Nothing was changed.");

  await migrate(drizzle({ client: pool }), { migrationsFolder: MIGRATIONS_FOLDER });
  console.log(`\n✔ Applied ${pending.length} migration(s) to ${target.hostname}.\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  // Never echo the connection string.
  fail(`Migration failed: ${message.replaceAll(prodUrl, "<DATABASE_URL>")}`);
} finally {
  await pool.end();
}
