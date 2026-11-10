/**
 * The draw against the DEV database (`npm run test:db`).
 * Each test creates its own group and deletes it afterwards.
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/server/db";
import { assignments, groups } from "@/server/db/schema";
import { isSingleLoop } from "@/server/draw";
import { countAssignments, drawNames, getOwnReceiver } from "@/server/draw-service";
import { addExclusion } from "@/server/exclusions";
import { createGroup } from "@/server/groups";
import { getGroupSummary, joinGroup } from "@/server/members";

const slugs: string[] = [];

function seeded(seed: number) {
  let a = seed >>> 0;
  return (max: number) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

async function groupWith(...names: string[]) {
  const { slug } = await createGroup({ name: "Draw test", budget: 300, partyDate: "2026-12-19", themes: [] });
  slugs.push(slug);
  const groupId = (await getGroupSummary(slug))!.id;
  const ids: Record<string, string> = {};
  for (const name of names) {
    const r = await joinGroup(slug, name);
    if (!r.ok) throw new Error(r.message);
    ids[name] = r.memberId;
  }
  return { slug, groupId, ids };
}

const rowsOf = (groupId: string) =>
  db()
    .select({ id: assignments.id, giverId: assignments.giverId, receiverId: assignments.receiverId })
    .from(assignments)
    .where(eq(assignments.groupId, groupId));

afterAll(async () => {
  for (const slug of slugs) await db().delete(groups).where(eq(groups.slug, slug));
  await closeDb();
});

describe("drawNames (dev DB)", () => {
  it("saves one valid loop that respects exclusions, and sets the group to DRAWN", async () => {
    const { slug, groupId, ids } = await groupWith("Joy", "Joy M", "Tita", "Ben");
    await addExclusion(groupId, ids.Joy, ids["Joy M"]);

    expect(await drawNames(groupId, "draw")).toEqual({ ok: true, count: 4 });
    const rows = await rowsOf(groupId);
    expect(rows).toHaveLength(4);
    expect(isSingleLoop(rows, [[ids.Joy, ids["Joy M"]]])).toBe(true);
    expect((await getGroupSummary(slug))?.status).toBe("DRAWN");
    expect(await countAssignments(groupId)).toBe(4);
    expect(await joinGroup(slug, "Late Larry")).toMatchObject({ ok: false, reason: "CLOSED" });
  });

  it("only ever draws once, even with simultaneous clicks", async () => {
    const { groupId } = await groupWith("A", "B", "C", "D", "E");
    const results = await Promise.all(Array.from({ length: 5 }, () => drawNames(groupId, "draw")));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === "ALREADY_DRAWN")).toHaveLength(4);
    expect(await rowsOf(groupId)).toHaveLength(5);
  });

  it("redraw replaces every assignment in one go", async () => {
    const { groupId, ids } = await groupWith("A", "B", "C", "D", "E", "F");
    expect(await drawNames(groupId, "redraw")).toMatchObject({ ok: false, reason: "NOT_DRAWN" });

    await drawNames(groupId, "draw", seeded(1));
    const before = await rowsOf(groupId);
    expect(await drawNames(groupId, "redraw", seeded(2))).toEqual({ ok: true, count: 6 });
    const after = await rowsOf(groupId);

    expect(after).toHaveLength(6);
    expect(isSingleLoop(after)).toBe(true);
    // All old rows are gone (new rows, new ids).
    const beforeIds = new Set(before.map((r) => r.id));
    expect(after.some((r) => beforeIds.has(r.id))).toBe(false);
    // The seeds were chosen so the loop actually changes.
    const pairs = (rows: typeof after) => rows.map((r) => `${r.giverId}>${r.receiverId}`).sort().join();
    expect(pairs(after)).not.toBe(pairs(before));
    expect(Object.keys(ids)).toHaveLength(6);
  });

  it("refuses with too few members or impossible exclusions", async () => {
    const two = await groupWith("A", "B");
    expect(await drawNames(two.groupId, "draw")).toMatchObject({ ok: false, reason: "TOO_FEW" });

    const stuck = await groupWith("Joy", "Joy M", "Tita", "Ben");
    await addExclusion(stuck.groupId, stuck.ids.Joy, stuck.ids["Joy M"]);
    await addExclusion(stuck.groupId, stuck.ids.Joy, stuck.ids.Tita);
    expect(await drawNames(stuck.groupId, "draw")).toEqual({
      ok: false,
      reason: "IMPOSSIBLE",
      message: "Masyadong maraming bawal kay Joy. Tanggalin ang isa sa mga pair niya.",
    });
    expect(await rowsOf(stuck.groupId)).toHaveLength(0);
    expect((await getGroupSummary(stuck.slug))?.status).toBe("OPEN");
  });

  it("refuses after the reveal", async () => {
    const { groupId } = await groupWith("A", "B", "C");
    await drawNames(groupId, "draw");
    await db().update(groups).set({ status: "REVEALED" }).where(eq(groups.id, groupId));
    expect(await drawNames(groupId, "redraw")).toMatchObject({ ok: false, reason: "REVEALED" });
  });
});

describe("getOwnReceiver (dev DB)", () => {
  it("returns exactly the giver's own receiver", async () => {
    const { groupId, ids } = await groupWith("Joy", "Ben", "Marco", "Tita");
    await drawNames(groupId, "draw");
    const rows = await rowsOf(groupId);
    const nameOf = Object.fromEntries(Object.entries(ids).map(([name, id]) => [id, name]));
    for (const row of rows) {
      expect(await getOwnReceiver(row.giverId)).toEqual({ displayName: nameOf[row.receiverId] });
    }
  });

  it("returns nothing before the draw", async () => {
    const { ids } = await groupWith("Joy", "Ben", "Marco");
    expect(await getOwnReceiver(ids.Joy)).toBeNull();
  });
});
