/**
 * Test-data cleanup for e2e runs. DEV database only (.env.local).
 * Groups created by e2e tests have names starting with "E2E ".
 */
import { inArray, like } from "drizzle-orm";
import { closeDb, db } from "../server/db";
import { groups } from "../server/db/schema";

export const E2E_PREFIX = "E2E ";

/** Deletes the given groups (cascades to members, themes, etc.). */
export async function deleteGroups(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  await db().delete(groups).where(inArray(groups.slug, slugs));
}

/** Safety net: deletes any leftover e2e groups, then closes the pool. */
export async function deleteAllE2eGroups(): Promise<number> {
  const removed = await db()
    .delete(groups)
    .where(like(groups.name, `${E2E_PREFIX}%`))
    .returning({ slug: groups.slug });
  await closeDb();
  return removed.length;
}
