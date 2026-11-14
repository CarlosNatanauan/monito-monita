/**
 * The party reveal against the DEV database (`npm run test:db`).
 * Each test creates its own group and deletes it afterwards.
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/server/db";
import { assignments, groups } from "@/server/db/schema";
import { drawNames, getOwnReceiver, markSlipOpened } from "@/server/draw-service";
import { createGroup } from "@/server/groups";
import { getGroupSummary, joinGroup, removeMember } from "@/server/members";
import { getOwnGiver, getRevealView, moveReveal, startReveal } from "@/server/reveal";

const slugs: string[] = [];

async function groupWith(names: string[], draw = true) {
  const { slug } = await createGroup({ name: "Reveal test", budget: 300, partyDate: "2026-12-19", themes: [] });
  slugs.push(slug);
  const groupId = (await getGroupSummary(slug))!.id;
  const ids: Record<string, string> = {};
  for (const name of names) {
    const r = await joinGroup(slug, name, "1234");
    if (!r.ok) throw new Error(r.message);
    ids[name] = r.memberId;
  }
  if (draw) {
    const drawn = await drawNames(groupId, "draw");
    if (!drawn.ok) throw new Error(drawn.message);
  }
  return { slug, groupId, ids };
}

/** Finishes the reveal from `step` and returns every pair (for checking what was hidden earlier). */
async function moveAllAndList(groupId: string, step: number) {
  for (let s = step; ; s++) {
    const r = await moveReveal(groupId, s, "next");
    if (r.ok && r.status === "REVEALED") break;
  }
  const view = await getRevealView(groupId);
  if (view?.status !== "REVEALED") throw new Error("not revealed");
  return view.pairs;
}

const statusOf = async (groupId: string) =>
  (await db().select({ status: groups.status, step: groups.revealStep }).from(groups).where(eq(groups.id, groupId)))[0];

afterAll(async () => {
  for (const slug of slugs) await db().delete(groups).where(eq(groups.slug, slug));
  await closeDb();
});

describe("reveal (dev DB)", () => {
  it("can't start before the draw", async () => {
    const { groupId } = await groupWith(["A", "B", "C"], false);
    expect(await startReveal(groupId)).toMatchObject({ ok: false, reason: "NOT_DRAWN" });
    expect(await getRevealView(groupId)).toEqual({ status: "OPEN", groupName: "Reveal test", total: 0 });
  });

  it("before the start: a count only, no pairs", async () => {
    const { groupId } = await groupWith(["A", "B", "C", "D"]);
    expect(await getRevealView(groupId)).toEqual({ status: "DRAWN", groupName: "Reveal test", total: 4 });
  });

  it("steps along the loop one pair at a time, stored on the server, then REVEALED", async () => {
    const { groupId, ids } = await groupWith(["Ana", "Ben", "Cris", "Dina"]);
    const nameOf = new Map(Object.entries(ids).map(([name, id]) => [id, name]));
    const rows = await db().select().from(assignments).where(eq(assignments.groupId, groupId));
    const receiverOf = new Map(rows.map((r) => [nameOf.get(r.giverId)!, nameOf.get(r.receiverId)!]));

    expect(await startReveal(groupId)).toEqual({ ok: true, changed: true, status: "REVEALING" });
    // Starting again (double click, second device) changes nothing.
    expect(await startReveal(groupId)).toEqual({ ok: true, changed: false, status: "REVEALING" });

    const seen: string[] = [];
    for (let step = 1; step <= 4; step++) {
      // A fresh read (refresh / another device) shows the same step.
      const view = await getRevealView(groupId);
      if (view?.status !== "REVEALING") throw new Error("not revealing");
      expect(view.step).toBe(step);
      expect(view.total).toBe(4);
      // The pair on screen, and the ring: names only on the pairs revealed so far.
      expect(Object.keys(view)).toEqual(["status", "groupName", "step", "total", "pair", "slips"]);
      expect(view.slips).toHaveLength(4);
      for (const slip of view.slips) {
        if (slip.index < step) expect(slip.giverName).toBe(seen[slip.index] ?? view.pair.giverName);
        else expect(slip).toEqual({ index: slip.index, codename: expect.any(String) });
      }
      expect(view.pair.receiverName).toBe(receiverOf.get(view.pair.giverName));
      // The first giver is the first to join; then the receiver gives next.
      if (step === 1) expect(view.pair.giverName).toBe("Ana");
      else expect(view.pair.giverName).toBe(receiverOf.get(seen.at(-1)!));
      seen.push(view.pair.giverName);
      // Nobody can see their giver during the reveal.
      for (const id of Object.values(ids)) expect(await getOwnGiver(id)).toBeNull();
      if (step < 4) expect(await moveReveal(groupId, step, "next")).toMatchObject({ ok: true, changed: true });
    }
    expect(new Set(seen).size).toBe(4);

    // Next on the last pair finishes.
    expect(await moveReveal(groupId, 4, "next")).toEqual({ ok: true, changed: true, status: "REVEALED" });
    expect((await statusOf(groupId)).status).toBe("REVEALED");
    const done = await getRevealView(groupId);
    if (done?.status !== "REVEALED") throw new Error("not revealed");
    expect(done.pairs.map((p) => p.giverName)).toEqual(seen);

    // Now everyone sees who gave to them.
    for (const [name, id] of Object.entries(ids)) {
      const giverName = [...receiverOf].find(([, r]) => r === name)![0];
      expect((await getOwnGiver(id))?.displayName).toBe(giverName);
    }
    // And nothing moves after the end.
    expect(await moveReveal(groupId, 4, "previous")).toEqual({ ok: true, changed: false, status: "REVEALED" });
  });

  it("above 16: only the window around the pair on screen leaves the server", async () => {
    const names = Array.from({ length: 30 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`);
    const { groupId } = await groupWith(names);
    await startReveal(groupId);
    for (let step = 1; step < 20; step++) await moveReveal(groupId, step, "next");
    const view = await getRevealView(groupId);
    if (view?.status !== "REVEALING") throw new Error("not revealing");
    expect(view.step).toBe(20);
    // 12 on the ring + one hidden at each end, around pair 20 (index 19).
    expect(view.slips.map((s) => s.index)).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
    const revealed = view.slips.filter((s) => s.giverName);
    expect(revealed.map((s) => s.index)).toEqual([12, 13, 14, 15, 16, 17, 18, 19]);
    expect(revealed.at(-1)?.giverName).toBe(view.pair.giverName);
    // Nothing in the response names a giver whose pair isn't revealed yet.
    const json = JSON.stringify(view);
    const done = await moveAllAndList(groupId, 20);
    for (const [i, pair] of done.entries()) {
      const allowed = (i >= 12 && i <= 19) || i === 20; // revealed in the window, or the receiver on screen
      if (!allowed) expect(json).not.toContain(`"${pair.giverName}"`);
    }
  });

  it("Previous goes back but not before the first; stale steps don't skip pairs", async () => {
    const { groupId } = await groupWith(["A", "B", "C"]);
    await startReveal(groupId);
    expect(await moveReveal(groupId, 1, "previous")).toEqual({ ok: true, changed: false, status: "REVEALING" });
    await moveReveal(groupId, 1, "next");
    // A double tap: the second Next still says "from step 1", so it's ignored.
    expect(await moveReveal(groupId, 1, "next")).toEqual({ ok: true, changed: false, status: "REVEALING" });
    expect((await statusOf(groupId)).step).toBe(2);
    expect(await moveReveal(groupId, 2, "previous")).toMatchObject({ ok: true, changed: true });
    expect((await statusOf(groupId)).step).toBe(1);
  });

  it("parallel Next taps from two devices move exactly one step", async () => {
    const { groupId } = await groupWith(["A", "B", "C", "D", "E"]);
    await startReveal(groupId);
    const results = await Promise.all([moveReveal(groupId, 1, "next"), moveReveal(groupId, 1, "next")]);
    expect(results.filter((r) => r.ok && r.changed)).toHaveLength(1);
    expect((await statusOf(groupId)).step).toBe(2);
  });

  it("once started, no redraw, no removal, and Next/Previous need a running reveal", async () => {
    const { groupId, ids } = await groupWith(["A", "B", "C", "D"]);
    expect(await moveReveal(groupId, 0, "next")).toMatchObject({ ok: false, reason: "NOT_REVEALING" });
    await startReveal(groupId);
    expect(await drawNames(groupId, "redraw")).toMatchObject({ ok: false, reason: "REVEALED" });
    expect(await removeMember(groupId, ids.A)).toMatchObject({ ok: false, reason: "LOCKED" });
  });

  it("a slip opened during or after the reveal still counts once", async () => {
    const { groupId, ids } = await groupWith(["A", "B", "C"]);
    await startReveal(groupId);
    expect(await markSlipOpened(ids.A)).toBe(true);
    expect(await markSlipOpened(ids.A)).toBe(false);
    expect((await getOwnReceiver(ids.A))?.slipOpenedAt).toBeInstanceOf(Date);
  });
});
