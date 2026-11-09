/**
 * Database constraint smoke tests. Runs against the DEV database in
 * .env.local (`npm run test:db`), inside one transaction that is always
 * rolled back, so nothing is left behind. Never point this at production.
 */
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db, type Tx } from "@/server/db";
import * as s from "@/server/db/schema";

class Rollback extends Error {}

/** Postgres error details (drizzle wraps the pg error in `cause`). */
function pgError(e: unknown): { constraint?: string; code?: string } {
  const err = e as { cause?: { constraint?: string; code?: string }; constraint?: string; code?: string };
  return { constraint: err.cause?.constraint ?? err.constraint, code: err.cause?.code ?? err.code };
}

let savepoint = 0;
async function rejects(tx: Tx, fn: () => Promise<unknown>) {
  const name = `sp${++savepoint}`;
  await tx.execute(sql.raw(`savepoint ${name}`));
  try {
    await fn();
    return { constraint: "(allowed)", code: undefined };
  } catch (e) {
    return pgError(e);
  } finally {
    await tx.execute(sql.raw(`rollback to savepoint ${name}`));
  }
}

afterAll(async () => {
  await closeDb();
});

describe("database constraints (dev, rolled back)", () => {
  it("enforces uniqueness, integrity, and cascades", async () => {
    const run = db().transaction(async (tx) => {
      const [g1, g2] = await tx
        .insert(s.groups)
        .values([
          { slug: "smoke-1", name: "Smoke 1", budget: 300, partyDate: "2026-12-19", organizerTokenHash: "h-org-1" },
          { slug: "smoke-2", name: "Smoke 2", budget: 300, partyDate: "2026-12-19", organizerTokenHash: "h-org-2" },
        ])
        .returning();
      const [a, b, c, d] = await tx
        .insert(s.members)
        .values(["A", "B", "C", "D"].map((x) => ({ groupId: g1.id, displayName: x, codename: `Code ${x}`, tokenHash: `h-${x}` })))
        .returning();
      const [x] = await tx
        .insert(s.members)
        .values({ groupId: g2.id, displayName: "X", codename: "Code X", tokenHash: "h-X" })
        .returning();

      expect(g1.status).toBe("OPEN");
      expect(g1.timezone).toBe("Asia/Manila");

      const group = (o: Partial<s.NewGroup>) => tx.insert(s.groups).values({ slug: "smoke-x", name: "x", budget: 1, partyDate: "2026-12-19", organizerTokenHash: "h-org-x", ...o });

      expect((await rejects(tx, () => group({ slug: "smoke-1" }))).constraint).toBe("groups_slug_unique");
      expect((await rejects(tx, () => group({ organizerTokenHash: "h-org-1" }))).constraint).toBe("groups_organizer_token_hash_unique");
      expect((await rejects(tx, () => group({ budget: -1 }))).constraint).toBe("groups_budget_non_negative");
      expect((await rejects(tx, () => tx.execute(sql`update groups set status = 'PARTY' where id = ${g1.id}`))).code).toBe("22P02");
      expect(
        (await rejects(tx, () => tx.insert(s.members).values({ groupId: g1.id, displayName: "E", codename: "Code E", tokenHash: "h-A" }))).constraint,
      ).toBe("members_token_hash_unique");
      expect(
        (await rejects(tx, () => tx.insert(s.members).values({ groupId: g1.id, displayName: "E", codename: "Code A", tokenHash: "h-E" }))).constraint,
      ).toBe("members_group_codename_unique");

      // Assignments
      const assign = (giverId: string, receiverId: string) => tx.insert(s.assignments).values({ groupId: g1.id, giverId, receiverId });
      expect((await rejects(tx, () => assign(a.id, a.id))).constraint).toBe("assignments_no_self_draw");
      expect((await rejects(tx, () => assign(a.id, x.id))).constraint).toBe("assignments_receiver_fk");
      expect((await rejects(tx, () => assign(x.id, a.id))).constraint).toBe("assignments_giver_fk");

      // Only A→B exists, so each of these breaks exactly one rule.
      await assign(a.id, b.id);
      expect((await rejects(tx, () => assign(a.id, c.id))).constraint).toBe("assignments_group_giver_unique");
      expect((await rejects(tx, () => assign(c.id, b.id))).constraint).toBe("assignments_group_receiver_unique");

      // Exclusions: stored once, sorted, same group only
      const [lo, hi] = [a.id, b.id].sort();
      const exclude = (memberAId: string, memberBId: string) => tx.insert(s.exclusions).values({ groupId: g1.id, memberAId, memberBId });
      expect((await rejects(tx, () => exclude(hi, lo))).constraint).toBe("exclusions_ordered_pair");
      await exclude(lo, hi);
      expect((await rejects(tx, () => exclude(lo, hi))).constraint).toBe("exclusions_pair_unique");
      const [p, q] = [a.id, x.id].sort();
      expect((await rejects(tx, () => exclude(p, q))).constraint).toMatch(/^exclusions_member_[ab]_fk$/);

      // Theme weeks
      await tx.insert(s.themeWeeks).values({ groupId: g1.id, title: "Something soft", startDate: "2026-11-30", position: 0 });
      expect(
        (await rejects(tx, () => tx.insert(s.themeWeeks).values({ groupId: g1.id, title: "Dup", startDate: "2026-12-07", position: 0 }))).constraint,
      ).toBe("theme_weeks_group_position_unique");

      // Cascade: deleting a group removes everything in it
      await tx.insert(s.assignments).values([
        { groupId: g1.id, giverId: b.id, receiverId: c.id },
        { groupId: g1.id, giverId: c.id, receiverId: d.id },
        { groupId: g1.id, giverId: d.id, receiverId: a.id },
      ]);
      await tx.insert(s.wishlistItems).values({ memberId: a.id, title: "Mug na cute", position: 0 });
      await tx.delete(s.groups).where(eq(s.groups.id, g1.id));
      const left = await tx.execute<{ n: string }>(sql`select (
        (select count(*) from members where group_id = ${g1.id}) +
        (select count(*) from assignments where group_id = ${g1.id}) +
        (select count(*) from exclusions where group_id = ${g1.id}) +
        (select count(*) from wishlist_items where member_id = ${a.id}) +
        (select count(*) from theme_weeks where group_id = ${g1.id})
      )::text as n`);
      expect(left.rows[0].n).toBe("0");

      throw new Rollback();
    });
    await expect(run).rejects.toBeInstanceOf(Rollback);

    // Nothing was left behind.
    const smoke = await db().select({ id: s.groups.id }).from(s.groups).where(sql`${s.groups.slug} like 'smoke-%'`);
    expect(smoke).toHaveLength(0);
  });
});
