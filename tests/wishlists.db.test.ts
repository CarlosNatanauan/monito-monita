/**
 * Wishlists against the DEV database (`npm run test:db`).
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, db } from "@/server/db";
import { groups } from "@/server/db/schema";
import { drawNames } from "@/server/draw-service";
import { createGroup } from "@/server/groups";
import { getGroupSummary, joinGroup, removeMember } from "@/server/members";
import { addWish, deleteWish, getReceiverWishlist, listWishlist, updateWish, WISHLIST_MAX_ITEMS } from "@/server/wishlists";
import { assignments } from "@/server/db/schema";

const slugs: string[] = [];

async function groupWith(...names: string[]) {
  const { slug } = await createGroup({ name: "Wishlist test", budget: 300, partyDate: "2026-12-19", themes: [] });
  slugs.push(slug);
  const groupId = (await getGroupSummary(slug))!.id;
  const ids: Record<string, string> = {};
  for (const name of names) {
    const r = await joinGroup(slug, name, "1234");
    if (!r.ok) throw new Error(r.message);
    ids[name] = r.memberId;
  }
  return { slug, groupId, ids };
}

const wish = (title: string) => ({ title, url: null, note: null });

afterAll(async () => {
  for (const slug of slugs) await db().delete(groups).where(eq(groups.slug, slug));
  await closeDb();
});

describe("wishlists (dev DB)", () => {
  it("adds, edits, and deletes your own items, in order", async () => {
    const { ids } = await groupWith("Joy");
    await addWish(ids.Joy, wish("Mug"));
    await addWish(ids.Joy, { title: "Plant", url: "https://shopee.ph/plant", note: "small lang" });
    let list = await listWishlist(ids.Joy);
    expect(list.map((i) => i.title)).toEqual(["Mug", "Plant"]);

    expect(await updateWish(ids.Joy, list[0].id, wish("Mug (blue)"))).toEqual({ ok: true });
    expect(await deleteWish(ids.Joy, list[1].id)).toEqual({ ok: true });
    list = await listWishlist(ids.Joy);
    expect(list).toEqual([{ id: list[0].id, title: "Mug (blue)", url: null, note: null }]);
  });

  it(`caps a wishlist at ${WISHLIST_MAX_ITEMS} items, even with parallel adds`, async () => {
    const { ids } = await groupWith("Joy");
    const results = await Promise.all(Array.from({ length: 14 }, (_, i) => addWish(ids.Joy, wish(`Item ${i}`))));
    expect(results.filter((r) => r.ok)).toHaveLength(WISHLIST_MAX_ITEMS);
    expect(await listWishlist(ids.Joy)).toHaveLength(WISHLIST_MAX_ITEMS);
  });

  it("can't edit or delete someone else's items", async () => {
    const { ids } = await groupWith("Joy", "Ben");
    await addWish(ids.Joy, wish("Mug"));
    const [item] = await listWishlist(ids.Joy);
    expect(await updateWish(ids.Ben, item.id, wish("Hacked"))).toMatchObject({ ok: false });
    expect(await deleteWish(ids.Ben, item.id)).toMatchObject({ ok: false });
    expect((await listWishlist(ids.Joy))[0].title).toBe("Mug");
  });

  it("a removed member can't add items", async () => {
    const { groupId, ids } = await groupWith("Joy", "Ben");
    await removeMember(groupId, ids.Joy);
    expect(await addWish(ids.Joy, wish("Mug"))).toMatchObject({ ok: false });
  });

  it("after the draw, a giver reads only their receiver's latest list", async () => {
    const { groupId, ids } = await groupWith("Joy", "Ben", "Marco", "Tita");
    for (const [name, id] of Object.entries(ids)) await addWish(id, wish(`Wish of ${name}`));
    expect(await getReceiverWishlist(ids.Joy)).toEqual([]); // before the draw

    await drawNames(groupId, "draw");
    const rows = await db().select().from(assignments).where(eq(assignments.groupId, groupId));
    const nameOf = Object.fromEntries(Object.entries(ids).map(([n, id]) => [id, n]));
    for (const row of rows) {
      const list = await getReceiverWishlist(row.giverId);
      expect(list.map((i) => i.title)).toEqual([`Wish of ${nameOf[row.receiverId]}`]);
    }

    // Latest version: an edit by the receiver shows up for the giver.
    const joyRow = rows.find((r) => r.giverId === ids.Joy)!;
    const [receiverItem] = await listWishlist(joyRow.receiverId);
    await updateWish(joyRow.receiverId, receiverItem.id, wish("Updated wish"));
    expect((await getReceiverWishlist(ids.Joy)).map((i) => i.title)).toEqual(["Updated wish"]);
  });
});
