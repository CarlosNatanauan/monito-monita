/**
 * "Edit details" (persona test C5) and the organizer's view of 15-minute PIN
 * locks (C1), against the DEV database (`npm run test:db`). Deletes its
 * groups afterwards. Never point this at production.
 */
import { asc, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { addDays, themeStartDates, todayIn } from "@/lib/theme-weeks";
import { closeDb, db } from "@/server/db";
import { groups, members, themeWeeks } from "@/server/db/schema";
import { drawNames } from "@/server/draw-service";
import { createGroup, editableDetails, updateGroupDetails } from "@/server/groups";
import { getOrganizerView, joinGroup } from "@/server/members";
import { startReveal } from "@/server/reveal";

const slugs: string[] = [];
const today = todayIn("Asia/Manila");
const party = addDays(today, 30);

async function newGroup(people: string[] = []) {
  const created = await createGroup({ name: "Edit test", budget: 300, partyDate: party, themes: ["Soft", "Sweet"] });
  slugs.push(created.slug);
  for (const name of people) {
    const joined = await joinGroup(created.slug, name, "1234");
    if (!joined.ok) throw new Error(joined.message);
  }
  return created;
}

async function stored(groupId: string) {
  const [group] = await db()
    .select({ name: groups.name, budget: groups.budget, partyDate: groups.partyDate })
    .from(groups)
    .where(eq(groups.id, groupId));
  const weeks = await db()
    .select({ title: themeWeeks.title, startDate: themeWeeks.startDate })
    .from(themeWeeks)
    .where(eq(themeWeeks.groupId, groupId))
    .orderBy(asc(themeWeeks.position));
  return { ...group, weeks };
}

afterAll(async () => {
  for (const slug of slugs) await db().delete(groups).where(eq(groups.slug, slug));
  await closeDb();
});

describe("editableDetails", () => {
  it("everything while open, date and themes after the draw, nothing once the reveal starts", () => {
    expect(editableDetails("OPEN")).toEqual({ all: true, any: true });
    expect(editableDetails("DRAWN")).toEqual({ all: false, any: true });
    expect(editableDetails("REVEALING")).toEqual({ all: false, any: false });
    expect(editableDetails("REVEALED")).toEqual({ all: false, any: false });
  });
});

describe("updateGroupDetails (dev DB)", () => {
  it("while open: changes name, budget, date and themes; theme dates follow the new party date", async () => {
    const { groupId } = await newGroup();
    const newParty = addDays(today, 20);
    const result = await updateGroupDetails(groupId, {
      name: "  Bagong pangalan ",
      budget: "800",
      partyDate: newParty,
      themes: ["Red", " Green ", "Gold"],
    });
    expect(result).toEqual({ ok: true });
    const starts = themeStartDates(newParty, 3);
    expect(await stored(groupId)).toEqual({
      name: "Bagong pangalan",
      budget: 800,
      partyDate: newParty,
      weeks: [
        { title: "Red", startDate: starts[0] },
        { title: "Green", startDate: starts[1] },
        { title: "Gold", startDate: starts[2] },
      ],
    });
  });

  it("uses the create form's validation, and changes nothing when it fails", async () => {
    const { groupId } = await newGroup();
    const before = await stored(groupId);
    const result = await updateGroupDetails(groupId, {
      name: "",
      budget: "0",
      partyDate: addDays(today, -1),
      themes: ["ok", " "],
    });
    expect(result).toMatchObject({
      ok: false,
      reason: "INVALID",
      fieldErrors: {
        name: "Pakilagay ang pangalan ng group.",
        budget: "Pakilagay ang budget (₱1 pataas).",
        partyDate: "Dapat ngayon o sa susunod na araw ang party.",
        "themes.1": "Hindi puwedeng blangko ang theme.",
      },
    });
    expect(await stored(groupId)).toEqual(before);
  });

  it("after the draw: the date and themes change; the name and budget stay whatever is posted", async () => {
    const { groupId } = await newGroup(["Ana", "Ben", "Cris"]);
    expect((await drawNames(groupId, "draw")).ok).toBe(true);
    const newParty = addDays(today, 25);
    expect(
      await updateGroupDetails(groupId, { name: "Sneaky", budget: "99999", partyDate: newParty, themes: [] }),
    ).toEqual({ ok: true });
    expect(await stored(groupId)).toEqual({ name: "Edit test", budget: 300, partyDate: newParty, weeks: [] });
  });

  it("once the reveal starts: nothing changes", async () => {
    const { groupId } = await newGroup(["Ana", "Ben", "Cris"]);
    expect((await drawNames(groupId, "draw")).ok).toBe(true);
    expect((await startReveal(groupId)).ok).toBe(true);
    const before = await stored(groupId);
    expect(
      await updateGroupDetails(groupId, { name: "x", budget: "1", partyDate: addDays(today, 5), themes: ["y"] }),
    ).toMatchObject({ ok: false, reason: "LOCKED" });
    expect(await stored(groupId)).toEqual(before);
  });
});

describe("organizer view: PIN locks (dev DB)", () => {
  it("shows a running 15-minute lock separately from a full lock, and drops it once it ends", async () => {
    const { groupId } = await newGroup(["Ana", "Ben", "Cris"]);
    const view = async () => (await getOrganizerView(groupId))!.members;
    const id = (await view()).find((m) => m.displayName === "Ana")!.id;
    const ben = (await view()).find((m) => m.displayName === "Ben")!.id;

    await db().update(members).set({ pinLockedUntil: new Date(Date.now() + 10 * 60_000) }).where(eq(members.id, id));
    await db().update(members).set({ pinLockedAt: new Date() }).where(eq(members.id, ben));
    const locked = await view();
    expect(locked.find((m) => m.id === id)).toMatchObject({ pinTempLocked: true, pinLocked: false });
    expect(locked.find((m) => m.id === ben)).toMatchObject({ pinTempLocked: false, pinLocked: true });
    expect(locked.find((m) => m.displayName === "Cris")).toMatchObject({ pinTempLocked: false, pinLocked: false });

    await db().update(members).set({ pinLockedUntil: new Date(Date.now() - 1000) }).where(eq(members.id, id));
    expect((await view()).find((m) => m.id === id)).toMatchObject({ pinTempLocked: false });
  });
});
