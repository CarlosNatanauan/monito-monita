/**
 * Exclusions against the DEV database (`npm run test:db`).
 * Each test creates its own group and deletes it afterwards.
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/server/db";
import { exclusions, groups } from "@/server/db/schema";
import { addExclusion, getDrawSetup, removeExclusion, sortPair } from "@/server/exclusions";
import { createGroup } from "@/server/groups";
import { getGroupSummary, joinGroup, removeMember } from "@/server/members";

const slugs: string[] = [];

async function groupWith(...names: string[]) {
  const { slug } = await createGroup({ name: "Exclusions test", budget: 300, partyDate: "2026-12-19", themes: [] });
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

afterAll(async () => {
  for (const slug of slugs) await db().delete(groups).where(eq(groups.slug, slug));
  await closeDb();
});

describe("exclusions (dev DB)", () => {
  it("stores each pair once, sorted, whichever order it was picked in", async () => {
    const { groupId, ids } = await groupWith("Joy", "Joy M", "Ben");
    expect(await addExclusion(groupId, ids["Joy M"], ids.Joy)).toEqual({ ok: true });
    expect(await addExclusion(groupId, ids.Joy, ids["Joy M"])).toEqual({ ok: false, message: "Nandiyan na ang pair na 'yan." });

    const rows = await db().select().from(exclusions).where(eq(exclusions.groupId, groupId));
    expect(rows).toHaveLength(1);
    expect([rows[0].memberAId, rows[0].memberBId]).toEqual(sortPair(ids.Joy, ids["Joy M"]));

    const setup = await getDrawSetup(groupId);
    expect(setup.members.map((m) => m.displayName)).toEqual(["Joy", "Joy M", "Ben"]);
    expect(setup.pairs).toHaveLength(1);
    expect([setup.pairs[0].memberAName, setup.pairs[0].memberBName].sort()).toEqual(["Joy", "Joy M"]);
  });

  it("rejects the same person twice and members of other groups", async () => {
    const a = await groupWith("Joy", "Ben");
    const b = await groupWith("Marco");
    expect(await addExclusion(a.groupId, a.ids.Joy, a.ids.Joy)).toMatchObject({ ok: false });
    expect(await addExclusion(a.groupId, a.ids.Joy, b.ids.Marco)).toMatchObject({ ok: false });
  });

  it("removes a pair, and ignores pairs of removed members", async () => {
    const { groupId, ids } = await groupWith("Joy", "Joy M", "Ben", "Tita");
    await addExclusion(groupId, ids.Joy, ids["Joy M"]);
    await addExclusion(groupId, ids.Ben, ids.Tita);

    await removeMember(groupId, ids.Tita);
    let setup = await getDrawSetup(groupId);
    expect(setup.pairs).toHaveLength(1);

    expect(await removeExclusion(groupId, setup.pairs[0].id)).toEqual({ ok: true });
    expect(await removeExclusion(groupId, setup.pairs[0].id)).toMatchObject({ ok: false });
    setup = await getDrawSetup(groupId);
    expect(setup.pairs).toHaveLength(0);
  });

  it("can't be changed after the draw", async () => {
    const { groupId, ids } = await groupWith("Joy", "Joy M", "Ben");
    await addExclusion(groupId, ids.Joy, ids.Ben);
    const [pair] = (await getDrawSetup(groupId)).pairs;
    await db().update(groups).set({ status: "DRAWN" }).where(eq(groups.id, groupId));
    expect(await addExclusion(groupId, ids.Joy, ids["Joy M"])).toMatchObject({ ok: false });
    expect(await removeExclusion(groupId, pair.id)).toMatchObject({ ok: false });
  });
});
