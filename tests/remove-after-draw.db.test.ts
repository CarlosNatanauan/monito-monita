/**
 * Removing a member after the draw, against the DEV database.
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/server/db";
import { assignments, groups, members } from "@/server/db/schema";
import { isSingleLoop } from "@/server/draw";
import {
  acknowledgeReceiverChange,
  countSlipsOpened,
  drawNames,
  getOwnReceiver,
  markSlipOpened,
} from "@/server/draw-service";
import { addExclusion } from "@/server/exclusions";
import { createGroup } from "@/server/groups";
import { getGroupSummary, joinGroup, removeMember } from "@/server/members";

const slugs: string[] = [];

async function drawnGroup(names: string[], exclusions: [string, string][] = []) {
  const { slug } = await createGroup({ name: "Remove after draw", budget: 300, partyDate: "2026-12-19", themes: [] });
  slugs.push(slug);
  const groupId = (await getGroupSummary(slug))!.id;
  const ids: Record<string, string> = {};
  for (const name of names) {
    const r = await joinGroup(slug, name, "1234");
    if (!r.ok) throw new Error(r.message);
    ids[name] = r.memberId;
  }
  for (const [a, b] of exclusions) await addExclusion(groupId, ids[a], ids[b]);
  const drawn = await drawNames(groupId, "draw");
  if (!drawn.ok) throw new Error(drawn.message);
  return { slug, groupId, ids };
}

const rowsOf = (groupId: string) =>
  db()
    .select({ giverId: assignments.giverId, receiverId: assignments.receiverId, changedAt: assignments.receiverChangedAt })
    .from(assignments)
    .where(eq(assignments.groupId, groupId));

afterAll(async () => {
  for (const slug of slugs) await db().delete(groups).where(eq(groups.slug, slug));
  await closeDb();
});

describe("remove after the draw (dev DB)", () => {
  it("patches the loop: only the giver of the removed member changes, and is flagged", async () => {
    const { groupId, ids } = await drawnGroup(["A", "B", "C", "D", "E"]);
    const before = await rowsOf(groupId);
    const giver = before.find((r) => r.receiverId === ids.C)!;
    const removedRow = before.find((r) => r.giverId === ids.C)!;

    expect(await removeMember(groupId, ids.C)).toEqual({ ok: true, mode: "patched" });

    const after = await rowsOf(groupId);
    expect(after).toHaveLength(4);
    expect(isSingleLoop(after)).toBe(true);
    expect(after.some((r) => r.giverId === ids.C || r.receiverId === ids.C)).toBe(false);

    // The giver now has the removed member's receiver, with the notice flag.
    const patched = after.find((r) => r.giverId === giver.giverId)!;
    expect(patched.receiverId).toBe(removedRow.receiverId);
    expect(patched.changedAt).toBeInstanceOf(Date);
    // Everyone else is unaffected.
    for (const row of after.filter((r) => r.giverId !== giver.giverId)) {
      expect(row.changedAt).toBeNull();
      expect(before).toContainEqual({ ...row, changedAt: null });
    }

    const [c] = await db().select({ removedAt: members.removedAt }).from(members).where(eq(members.id, ids.C));
    expect(c.removedAt).toBeInstanceOf(Date);

    // The notice shows until the giver acknowledges it.
    expect((await getOwnReceiver(giver.giverId))?.changedAt).toBeInstanceOf(Date);
    await acknowledgeReceiverChange(giver.giverId);
    expect((await getOwnReceiver(giver.giverId))?.changedAt).toBeNull();
  });

  it("patching clears only the patched giver's opened slip", async () => {
    const { groupId, ids } = await drawnGroup(["A", "B", "C", "D", "E"]);
    for (const id of Object.values(ids)) await markSlipOpened(id);
    const giverId = (await rowsOf(groupId)).find((r) => r.receiverId === ids.C)!.giverId;

    expect(await removeMember(groupId, ids.C)).toEqual({ ok: true, mode: "patched" });

    // They unfold their new monito; everyone else stays opened.
    expect((await getOwnReceiver(giverId))!.slipOpenedAt).toBeNull();
    for (const id of Object.values(ids)) {
      if (id === giverId || id === ids.C) continue;
      expect((await getOwnReceiver(id))!.slipOpenedAt).toBeInstanceOf(Date);
    }
    expect(await countSlipsOpened(groupId)).toEqual({ opened: 3, total: 4 });
  });

  it("refuses a patch that would pair an excluded couple (needs a redraw)", async () => {
    // 4 people, Joy–Joy M excluded → loop is Joy→x→Joy M→y→Joy. Removing
    // x or y would make Joy and Joy M draw each other.
    const { groupId, ids } = await drawnGroup(["Joy", "Joy M", "Tita", "Ben"], [["Joy", "Joy M"]]);
    const before = await rowsOf(groupId);
    expect(await removeMember(groupId, ids.Ben)).toEqual({
      ok: false,
      reason: "NEEDS_REDRAW",
      message: "Kapag tinanggal si Ben, magkakabunot ang dalawang bawal. Kailangan ng redraw para matanggal siya.",
    });
    expect(await rowsOf(groupId)).toEqual(before);
  });

  it("remove + redraw rolls back completely if the redraw is impossible", async () => {
    // 3 left with Joy–Joy M excluded can't be drawn, so nothing changes.
    const { groupId, ids } = await drawnGroup(["Joy", "Joy M", "Tita", "Ben"], [["Joy", "Joy M"]]);
    const before = await rowsOf(groupId);
    expect(await removeMember(groupId, ids.Ben, { redraw: true })).toMatchObject({ ok: false, reason: "IMPOSSIBLE" });
    expect(await rowsOf(groupId)).toEqual(before);
    const [ben] = await db().select({ removedAt: members.removedAt }).from(members).where(eq(members.id, ids.Ben));
    expect(ben.removedAt).toBeNull();
  });

  it("remove + redraw works when the rest can be drawn", async () => {
    const { groupId, ids } = await drawnGroup(["Joy", "Joy M", "Tita", "Ben", "Marco"], [["Joy", "Joy M"]]);
    const result = await removeMember(groupId, ids.Marco, { redraw: true });
    expect(result).toEqual({ ok: true, mode: "redrawn" });
    const after = await rowsOf(groupId);
    expect(after).toHaveLength(4);
    expect(isSingleLoop(after, [[ids.Joy, ids["Joy M"]]])).toBe(true);
    expect(after.every((r) => r.changedAt === null)).toBe(true);
  });

  it("blocks removal when only 3 remain", async () => {
    const { groupId, ids } = await drawnGroup(["A", "B", "C"]);
    const before = await rowsOf(groupId);
    expect(await removeMember(groupId, ids.A)).toMatchObject({ ok: false, reason: "TOO_FEW" });
    expect(await removeMember(groupId, ids.A, { redraw: true })).toMatchObject({ ok: false, reason: "TOO_FEW" });
    expect(await rowsOf(groupId)).toEqual(before);
  });
});
