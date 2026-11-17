/**
 * One-click demo against the DEV database (`npm run test:db`): what a demo
 * group holds, expiry and cleanup, Reset demo, and above all that cleanup
 * and reset can only ever delete demo groups. Every group made here is
 * deleted afterwards. Never point this at production.
 */
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getThemeStatus } from "@/lib/theme-status";
import { todayIn } from "@/lib/theme-weeks";
import { findMemberByToken, findOrganizerByToken } from "@/server/auth";
import { closeDb, db } from "@/server/db";
import { assignments, exclusions, groups, members, themeWeeks, wishlistItems } from "@/server/db/schema";
import {
  countActiveDemos,
  createDemoGroup,
  deleteDemoGroup,
  deleteExpiredDemos,
  DEMO_TTL_HOURS,
  resetDemo,
  startDemo,
} from "@/server/demo";
import { getOwnReceiver } from "@/server/draw-service";
import { createGroup, isDemoGroup } from "@/server/groups";
import { getGroupSummary, joinGroup } from "@/server/members";

const createdIds: string[] = [];

afterAll(async () => {
  if (createdIds.length > 0) await db().delete(groups).where(inArray(groups.id, createdIds));
  await closeDb();
});

async function realGroup(name = "Demo cleanup: real group"): Promise<string> {
  const { groupId } = await createGroup({ name, budget: 300, partyDate: "2026-12-19", themes: [] });
  createdIds.push(groupId);
  return groupId;
}

async function demo(visitor = "Migs", now?: Date) {
  const created = await createDemoGroup(visitor, now ? { now } : {});
  createdIds.push(created.groupId);
  return created;
}

const exists = async (groupId: string) =>
  (await db().select({ id: groups.id }).from(groups).where(eq(groups.id, groupId))).length === 1;

/** Moves a group's demo expiry (or its creation time) into the past. */
const expire = (groupId: string) =>
  db()
    .update(groups)
    .set({ demoExpiresAt: sql`now() - interval '1 minute'` })
    .where(eq(groups.id, groupId));

describe("createDemoGroup (dev DB)", () => {
  it("builds a drawn demo group: visitor first, 8 made-up members, wishlists, themes, one bawal pair", async () => {
    const before = Date.now();
    const created = await demo("Migs");

    const [group] = await db().select().from(groups).where(eq(groups.id, created.groupId));
    expect(group).toMatchObject({ isDemo: true, status: "DRAWN", slug: created.slug });
    const ttl = group.demoExpiresAt!.getTime() - before;
    expect(ttl).toBeGreaterThan(DEMO_TTL_HOURS * 3600_000 - 60_000);
    expect(ttl).toBeLessThan(DEMO_TTL_HOURS * 3600_000 + 60_000);
    expect(await isDemoGroup(created.groupId)).toBe(true);

    const people = await db()
      .select({ id: members.id, name: members.displayName, opened: members.slipOpenedAt, pin: members.pinHash })
      .from(members)
      .where(and(eq(members.groupId, created.groupId), isNull(members.removedAt)))
      .orderBy(asc(members.joinedAt));
    expect(people).toHaveLength(9);
    // The visitor joined first (the reveal starts with their slip), and their slip is still folded.
    expect(people[0]).toMatchObject({ name: "Migs", opened: null });
    expect(people.filter((p) => p.opened !== null).length).toBeGreaterThan(0);

    // Both tokens work, for this group only; only their hashes are stored.
    expect(await findOrganizerByToken(created.slug, created.organizerToken)).toEqual({
      groupId: created.groupId,
      slug: created.slug,
    });
    expect((await findMemberByToken(created.slug, created.memberToken))?.displayName).toBe("Migs");
    expect(JSON.stringify(group)).not.toContain(created.organizerToken);

    // One loop: everyone gives once and receives once, nobody to themselves.
    const pairs = await db().select().from(assignments).where(eq(assignments.groupId, created.groupId));
    expect(pairs).toHaveLength(9);
    expect(new Set(pairs.map((p) => p.giverId)).size).toBe(9);
    expect(new Set(pairs.map((p) => p.receiverId)).size).toBe(9);
    const next = new Map(pairs.map((p) => [p.giverId, p.receiverId]));
    let at = people[0].id;
    for (let i = 0; i < 9; i++) at = next.get(at)!;
    expect(at).toBe(people[0].id);
    const seen = new Set<string>();
    for (let i = 0, id = people[0].id; i < 9; i++, id = next.get(id)!) seen.add(id);
    expect(seen.size).toBe(9);

    // The bawal pair is respected (both directions).
    const [pair] = await db().select().from(exclusions).where(eq(exclusions.groupId, created.groupId));
    expect(pair).toBeDefined();
    expect(next.get(pair.memberAId)).not.toBe(pair.memberBId);
    expect(next.get(pair.memberBId)).not.toBe(pair.memberAId);

    // The visitor's monito has a wishlist; made-up members all have one.
    expect(await getOwnReceiver(people[0].id)).toMatchObject({ slipOpenedAt: null });
    const wishes = await db()
      .select({ memberId: wishlistItems.memberId })
      .from(wishlistItems)
      .where(inArray(wishlistItems.memberId, people.map((p) => p.id)));
    expect(new Set(wishes.map((w) => w.memberId)).size).toBe(8);

    // Theme weeks around today: one of them is this week's.
    const weeks = await db()
      .select({ title: themeWeeks.title, startDate: themeWeeks.startDate })
      .from(themeWeeks)
      .where(eq(themeWeeks.groupId, created.groupId))
      .orderBy(asc(themeWeeks.position));
    expect(getThemeStatus(weeks, group.partyDate, todayIn("Asia/Manila"))).toMatchObject({ kind: "current" });
  });

  it("is closed to joining from a shared link, and the summary says it's a demo", async () => {
    const created = await demo("Bisita");
    expect(await joinGroup(created.slug, "Stranger", "1234")).toMatchObject({ ok: false, reason: "CLOSED" });
    expect(await getGroupSummary(created.slug)).toMatchObject({ isDemo: true, memberCount: 9 });
  });
});

describe("demo cleanup (dev DB)", () => {
  it("deletes expired demos, keeps live demos, never touches a real group however old", async () => {
    const real = await realGroup();
    await db()
      .update(groups)
      .set({ createdAt: sql`now() - interval '400 days'` })
      .where(eq(groups.id, real));
    const expired = await demo();
    const live = await demo();
    await expire(expired.groupId);

    expect(await deleteExpiredDemos()).toBeGreaterThanOrEqual(1);
    expect(await exists(expired.groupId)).toBe(false);
    expect(await exists(live.groupId)).toBe(true);
    expect(await exists(real)).toBe(true);
    // Cascades: nothing of the expired demo is left.
    expect(await db().select().from(members).where(eq(members.groupId, expired.groupId))).toHaveLength(0);
  });

  it("can't delete a real group even when every demo counts as expired", async () => {
    const real = await realGroup("Demo cleanup: real group, far future");
    const realIds = (await db().select({ id: groups.id }).from(groups).where(eq(groups.isDemo, false))).map((g) => g.id);
    expect(realIds).toContain(real);

    // Far in the future: every demo in the dev DB has expired by then.
    await deleteExpiredDemos(new Date("2999-01-01T00:00:00Z"));

    const left = await db().select({ id: groups.id }).from(groups).where(inArray(groups.id, realIds));
    expect(left).toHaveLength(realIds.length);
    expect(await db().select({ id: groups.id }).from(groups).where(eq(groups.isDemo, true))).toHaveLength(0);
  });

  it("the database refuses a real group with an expiry, or a demo without one", async () => {
    const real = await realGroup("Demo cleanup: constraint");
    await expect(
      db().update(groups).set({ demoExpiresAt: new Date() }).where(eq(groups.id, real)),
    ).rejects.toMatchObject({ cause: { constraint: "groups_demo_expiry" } });
    await expect(db().update(groups).set({ isDemo: true }).where(eq(groups.id, real))).rejects.toMatchObject({
      cause: { constraint: "groups_demo_expiry" },
    });
    expect(await isDemoGroup(real)).toBe(false);
  });

  it("counts only live demos toward the cap; a new demo clears expired ones first", async () => {
    const expired = await demo();
    await expire(expired.groupId);
    const live = await countActiveDemos();
    const started = await startDemo("Ana");
    expect(started.ok).toBe(true);
    if (started.ok) createdIds.push(started.groupId);
    expect(await exists(expired.groupId)).toBe(false);
    expect(await countActiveDemos()).toBe(live + 1);
  });
});

describe("Reset demo (dev DB)", () => {
  it("rebuilds a fresh demo for the visitor and deletes the old one", async () => {
    const old = await demo("Migs");
    await db().update(groups).set({ status: "REVEALED" }).where(eq(groups.id, old.groupId));
    const reset = await resetDemo(old.groupId, "Migs");
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    createdIds.push(reset.groupId);
    expect(await exists(old.groupId)).toBe(false);
    expect(reset.slug).not.toBe(old.slug);
    const [fresh] = await db().select().from(groups).where(eq(groups.id, reset.groupId));
    expect(fresh).toMatchObject({ isDemo: true, status: "DRAWN", revealStep: 0 });
    expect((await findMemberByToken(reset.slug, reset.memberToken))?.displayName).toBe("Migs");
  });

  it("refuses a real group and leaves it alone", async () => {
    const real = await realGroup("Demo reset: real group");
    expect(await deleteDemoGroup(real)).toBe(false);
    expect(await resetDemo(real, "Migs")).toMatchObject({ ok: false, reason: "NOT_DEMO" });
    expect(await exists(real)).toBe(true);
  });
});
