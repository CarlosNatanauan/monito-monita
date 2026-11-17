/**
 * Test-data cleanup for e2e runs. DEV database only (.env.local).
 * Groups created by e2e tests have names starting with "E2E ".
 */
import { and, eq, exists, inArray, like, or } from "drizzle-orm";
import { closeDb, db } from "../server/db";
import { groups, members } from "../server/db/schema";

export const E2E_PREFIX = "E2E ";

/** Deletes the given groups (cascades to members, themes, etc.). */
export async function deleteGroups(slugs: string[]): Promise<void> {
  if (slugs.length === 0) return;
  await db().delete(groups).where(inArray(groups.slug, slugs));
}

/**
 * Safety net: deletes any leftover e2e groups (and demo groups an e2e
 * visitor started: their visitor's name starts with "E2E "), then closes
 * the pool.
 */
export async function deleteAllE2eGroups(): Promise<number> {
  const e2eDemo = and(
    eq(groups.isDemo, true),
    exists(
      db()
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.groupId, groups.id), like(members.displayName, `${E2E_PREFIX}%`))),
    ),
  );
  const removed = await db()
    .delete(groups)
    .where(or(like(groups.name, `${E2E_PREFIX}%`), e2eDemo))
    .returning({ slug: groups.slug });
  await closeDb();
  return removed.length;
}
