/**
 * Recording data for the demo video, in the DEV database (.env.local) only,
 * through the app's own server functions (joins, PIN hashes, wishlists, the
 * real draw). The group itself is created on camera in R1. Everything is
 * deleted by `deleteRecordingGroup` at the end.
 *
 * The storyboard's group: "Barkada Christmas 2026", party Sat, Dec 19,
 * budget 500, 12 members, Joy is the organizer and draws Carlo.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { closeDb, db } from "../../../../server/db";
import { groups, members } from "../../../../server/db/schema";
import { drawNames, getOwnReceiver, markSlipOpened } from "../../../../server/draw-service";
import { joinGroup } from "../../../../server/members";
import { addWish, wishSchema } from "../../../../server/wishlists";

export const GROUP_NAME = "Barkada Christmas 2026";
export const PIN = "2512";

/** Join order after Joy (Joy joins on camera in R2). */
export const OTHERS = ["Marco", "Carlo", "Bea", "Paolo", "Tita Luz", "Jun", "Aira", "Migs", "Kuya Ben", "Lia", "Nico"];

/**
 * Codenames from the reference screens, where the app's real list has them
 * (server/codenames.ts); otherwise the closest name that list does have.
 */
export const CODENAMES: Record<string, string> = {
  Joy: "Bibingka Bandit",
  Marco: "Mango Float Fairy",
  Carlo: "Egg Pie Eagle",
  Bea: "Christmas Comet",
  Paolo: "Puto Bumbong Pal",
  "Tita Luz": "Queso de Bola Queen",
  Jun: "Hamon Hero",
  Aira: "Parol Patrol",
  Migs: "Leche Flan Legend",
  "Kuya Ben": "Fruit Salad Fan",
  Lia: "Lumpia Lookout",
  Nico: "Buko Pandan Buddy",
};

export const WISHES: Record<string, { title: string; note?: string }[]> = {
  Joy: [{ title: "Tumbler" }, { title: "Scented candle", note: "Vanilla or coffee" }, { title: "Planner 2027" }],
  Marco: [{ title: "Coffee beans", note: "Medium roast" }, { title: "Phone stand" }],
  Carlo: [
    { title: "Socks na makapal" },
    { title: "Card game", note: "Pang-barkada, 4 players up" },
    { title: "Dot grid notebook" },
  ],
  Bea: [{ title: "Hair clips" }, { title: "Mini plant", note: "Yung hindi madaling mamatay" }],
  Paolo: [{ title: "Running cap" }, { title: "Water bottle" }],
  "Tita Luz": [{ title: "Reading glasses case" }, { title: "Polvoron", note: "Ube or cookies and cream" }],
  Jun: [{ title: "Keychain flashlight" }, { title: "Instant noodles bundle" }],
  Aira: [{ title: "Sketchbook" }, { title: "Brush pens" }],
  Migs: [{ title: "Basketball socks" }, { title: "Snack box" }],
  "Kuya Ben": [{ title: "Mug na malaki" }, { title: "Barako coffee" }],
  Lia: [{ title: "Stickers" }, { title: "Lip balm" }],
  Nico: [{ title: "Cable organizer" }, { title: "Pocket notebook" }],
};

/** Opening order on the organizer page (Joy first: she opens hers in scene 05). */
export const OPEN_ORDER = ["Joy", "Marco", "Bea", "Paolo", "Jun", "Aira", "Kuya Ben", "Lia", "Carlo", "Tita Luz", "Migs", "Nico"];

export async function groupBySlug(slug: string) {
  const [g] = await db().select().from(groups).where(eq(groups.slug, slug)).limit(1);
  if (!g) throw new Error(`No group ${slug}`);
  if (g.name !== GROUP_NAME) throw new Error(`Refusing: group ${slug} is "${g.name}"`);
  return g;
}

export async function memberIds(groupId: string): Promise<Record<string, string>> {
  const rows = await db()
    .select({ id: members.id, name: members.displayName })
    .from(members)
    .where(eq(members.groupId, groupId));
  return Object.fromEntries(rows.map((r) => [r.name, r.id]));
}

/** The 11 others join (before Joy), each with a PIN, like on the join page. */
export async function joinOthers(slug: string) {
  for (const name of OTHERS) {
    const joined = await joinGroup(slug, name, PIN);
    if (!joined.ok) throw new Error(`${name}: ${joined.message}`);
  }
}

/** Codenames from the reference screens (two steps, so the unique index never trips). */
export async function setCodenames(groupId: string) {
  const ids = await memberIds(groupId);
  await db().transaction(async (tx) => {
    for (const [name, id] of Object.entries(ids)) {
      await tx.update(members).set({ codename: `tmp ${id}` }).where(eq(members.id, id));
    }
    for (const [name, id] of Object.entries(ids)) {
      const codename = CODENAMES[name];
      if (!codename) throw new Error(`No codename for ${name}`);
      await tx.update(members).set({ codename }).where(eq(members.id, id));
    }
  });
}

export async function addWishlists(groupId: string, only?: string[]) {
  const ids = await memberIds(groupId);
  for (const [name, items] of Object.entries(WISHES)) {
    if (only && !only.includes(name)) continue;
    const id = ids[name];
    if (!id) continue;
    for (const item of items) {
      const added = await addWish(id, wishSchema.parse(item));
      if (!added.ok) throw new Error(`wish for ${name}: ${added.message}`);
    }
  }
}

/**
 * The reveal starts with the first member to join. Joy joined last on
 * camera, so move her join time first (the others keep their order).
 */
export async function joyJoinedFirst(groupId: string) {
  const ids = await memberIds(groupId);
  const order = ["Joy", ...OTHERS];
  const base = Date.now() - 3 * 24 * 3600 * 1000;
  for (const [i, name] of order.entries()) {
    await db()
      .update(members)
      .set({ joinedAt: new Date(base + i * 47 * 60 * 1000) })
      .where(eq(members.id, ids[name]));
  }
}

/** The app's real draw, run again until Joy draws Carlo (1 in 11 per try). */
export async function drawJoyCarlo(groupId: string): Promise<number> {
  const ids = await memberIds(groupId);
  for (let attempt = 1; attempt <= 300; attempt++) {
    const result = await drawNames(groupId, attempt === 1 ? "draw" : "redraw");
    if (!result.ok) throw new Error(result.message);
    const receiver = await getOwnReceiver(ids.Joy);
    if (receiver?.displayName === "Carlo") return attempt;
  }
  throw new Error("Joy never drew Carlo");
}

/** Clears every slip-opened mark (the organizer's "0 of 12"). */
export async function resetOpened(groupId: string) {
  await db().update(members).set({ slipOpenedAt: null }).where(eq(members.groupId, groupId));
}

export async function markOpened(groupId: string, names: string[]) {
  const ids = await memberIds(groupId);
  for (const name of names) await markSlipOpened(ids[name]);
}

export async function setOpenedExactly(groupId: string, names: string[]) {
  const ids = await memberIds(groupId);
  await resetOpened(groupId);
  const list = names.map((n) => ids[n]);
  if (list.length) {
    await db()
      .update(members)
      .set({ slipOpenedAt: sql`now()` })
      .where(and(eq(members.groupId, groupId), inArray(members.id, list)));
  }
}

/** Deletes the recording group (cascades to members, pairs, wishlists, themes). */
export async function deleteRecordingGroup(slug: string): Promise<number> {
  const removed = await db()
    .delete(groups)
    .where(and(eq(groups.slug, slug), eq(groups.name, GROUP_NAME)))
    .returning({ slug: groups.slug });
  return removed.length;
}

export { closeDb };
