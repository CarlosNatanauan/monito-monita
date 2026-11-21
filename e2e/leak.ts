/**
 * Anonymity leak checks: no page may expose who is giving to whom, except
 * - a member's own receiver on their own /me (after the draw),
 * - on the organizer's reveal screen during the reveal: the pairs revealed
 *   so far that are on the ring (all of them up to 16 members, a window of
 *   12 around the pair on screen above that), plus codenames of the slips
 *   on the ring; every pair once the group is REVEALED,
 * - a member's own giver on their own /me, only once REVEALED.
 *
 * For each page we capture the final HTML plus every same-origin HTML,
 * RSC (text/x-component), JSON, and text response the page loaded, and
 * search all of it against the real pairs from the dev database.
 */
import { expect, type Page, type Response } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { assignments, groups, members, wishlistItems } from "../server/db/schema";

export interface Truth {
  members: { id: string; name: string; codename: string; removed: boolean }[];
  pairs: { id: string; giverId: string; receiverId: string }[];
  wishes: { memberId: string; title: string; note: string | null }[];
}

/** Ground truth for a group, straight from the database. */
export async function getTruth(slug: string): Promise<Truth> {
  const [group] = await db().select({ id: groups.id }).from(groups).where(eq(groups.slug, slug));
  const [memberRows, pairRows, wishRows] = await Promise.all([
    db()
      .select({ id: members.id, name: members.displayName, codename: members.codename, removedAt: members.removedAt })
      .from(members)
      .where(eq(members.groupId, group.id)),
    db()
      .select({ id: assignments.id, giverId: assignments.giverId, receiverId: assignments.receiverId })
      .from(assignments)
      .where(eq(assignments.groupId, group.id)),
    db()
      .select({ memberId: wishlistItems.memberId, title: wishlistItems.title, note: wishlistItems.note })
      .from(wishlistItems)
      .innerJoin(members, eq(members.id, wishlistItems.memberId))
      .where(eq(members.groupId, group.id)),
  ]);
  return {
    members: memberRows.map((m) => ({ id: m.id, name: m.name, codename: m.codename, removed: m.removedAt !== null })),
    pairs: pairRows,
    wishes: wishRows,
  };
}

const TEXT_TYPES = /text\/html|text\/x-component|application\/json|text\/plain/;

/** Loads `url` and returns everything the page received, as text. */
export async function capturePage(page: Page, url: string): Promise<string> {
  const origin = new URL(page.url() === "about:blank" ? url : page.url(), "http://localhost:3000").origin;
  // Leave the current page first, so a late response of the page before
  // (the reveal screen's 2-second refresh) isn't counted as this page's.
  await page.goto("about:blank");
  const pending: Promise<string>[] = [];
  const onResponse = (response: Response) => {
    const type = response.headers()["content-type"] ?? "";
    if (!response.url().startsWith(origin) || !TEXT_TYPES.test(type)) return;
    pending.push(response.text().catch(() => ""));
  };
  page.on("response", onResponse);
  try {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const html = await page.content();
    const bodies = await Promise.all(pending);
    return [html, ...bodies].join("\n");
  } finally {
    page.off("response", onResponse);
  }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Finds `name` as a whole name in `text`, ignoring places where it's part
 * of an allowed longer name (e.g. "Joy" inside an allowed "Joy M").
 */
function containsName(text: string, name: string, allowedNames: string[]): boolean {
  let haystack = text;
  for (const allowed of allowedNames) {
    if (allowed !== name && allowed.includes(name)) haystack = haystack.split(allowed).join(" ");
  }
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, "u").test(haystack);
}

const PAIR_FIELDS = ["giverId", "receiverId", "giver_id", "receiver_id", "assignments"];

/** Wishlist titles and notes of the given members must not appear. */
function expectNoWishesOf(text: string, truth: Truth, memberIds: Set<string>, label: string) {
  for (const w of truth.wishes) {
    if (!memberIds.has(w.memberId)) continue;
    expect(text, `${label} shows someone else's wish "${w.title}"`).not.toContain(w.title);
    if (w.note) expect(text, `${label} shows someone else's wish note`).not.toContain(w.note);
  }
}

function commonChecks(text: string, truth: Truth, label: string) {
  for (const field of PAIR_FIELDS) expect(text, `${label}: contains "${field}"`).not.toContain(field);
  for (const pair of truth.pairs) expect(text, `${label}: contains an assignment id`).not.toContain(pair.id);
}

/**
 * Organizer page (and its action responses): names are fine (member list),
 * pair data and codenames are not.
 */
export function expectOrganizerPageClean(text: string, truth: Truth) {
  commonChecks(text, truth, "organizer page");
  for (const m of truth.members) {
    expect(text, `organizer page shows the codename of ${m.name}`).not.toContain(m.codename);
  }
  expect(text, "organizer page shows a monito").not.toContain("Ang monito mo");
  expectNoWishesOf(text, truth, new Set(truth.members.map((m) => m.id)), "organizer page");
}

/** Join page (no cookies): no member names or ids at all. */
export function expectJoinPageClean(text: string, truth: Truth) {
  commonChecks(text, truth, "join page");
  for (const m of truth.members) {
    expect(containsName(text, m.name, []), `join page shows the name "${m.name}"`).toBe(false);
    expect(text, `join page contains the member id of ${m.name}`).not.toContain(m.id);
  }
  expectNoWishesOf(text, truth, new Set(truth.members.map((m) => m.id)), "join page");
}

/**
 * A member's /me: only their own name and their own receiver; after the
 * reveal (`revealed`), also their own giver.
 */
export function expectMemberPageClean(
  text: string,
  truth: Truth,
  memberName: string,
  { revealed = false }: { revealed?: boolean } = {},
) {
  const me = truth.members.find((m) => m.name === memberName && !m.removed);
  if (!me) throw new Error(`No active member named ${memberName}`);
  const pair = truth.pairs.find((p) => p.giverId === me.id);
  const receiver = truth.members.find((m) => m.id === pair?.receiverId);
  if (!receiver) throw new Error(`${memberName} has no receiver`);
  const giverId = truth.pairs.find((p) => p.receiverId === me.id)?.giverId;
  const giver = revealed ? truth.members.find((m) => m.id === giverId) : undefined;
  if (revealed && !giver) throw new Error(`${memberName} has no giver`);

  const label = `${memberName}'s /me${revealed ? " (revealed)" : ""}`;
  commonChecks(text, truth, label);
  const allowed = [me.name, receiver.name, ...(giver ? [giver.name] : [])];
  const visible = new Set([me.id, receiver.id, ...(giver ? [giver.id] : [])]);
  for (const other of truth.members) {
    if (visible.has(other.id)) continue;
    expect(containsName(text, other.name, allowed), `${label} shows "${other.name}"`).toBe(false);
    expect(text, `${label} contains the member id of ${other.name}`).not.toContain(other.id);
  }
  // Before the reveal, "who gave to me" is never on the page.
  if (!revealed) expect(text, `${label} shows "Ang nagbigay sa'yo"`).not.toContain("Ang nagbigay sa");
  // Wishlists: only their own and their receiver's.
  const others = new Set(truth.members.filter((m) => m.id !== me.id && m.id !== receiver.id).map((m) => m.id));
  expectNoWishesOf(text, truth, others, label);
  // Their receiver's id isn't needed on the page either.
  expect(text, `${label} contains the receiver's member id`).not.toContain(receiver.id);
}

/** Pairs in the order the reveal screen shows them: from the first giver to join, along the loop. */
export function revealOrderOf(truth: Truth, firstGiverName: string): { giver: string; receiver: string; codename: string }[] {
  const byId = new Map(truth.members.map((m) => [m.id, m]));
  const receiverOf = new Map(truth.pairs.map((p) => [p.giverId, p.receiverId]));
  let current = truth.members.find((m) => m.name === firstGiverName && !m.removed)!.id;
  const order = [];
  for (let i = 0; i < truth.pairs.length; i++) {
    const receiverId = receiverOf.get(current)!;
    order.push({ giver: byId.get(current)!.name, receiver: byId.get(receiverId)!.name, codename: byId.get(current)!.codename });
    current = receiverId;
  }
  return order;
}

/**
 * Loop indices the reveal screen may show at `step` (1-based) of `total`:
 * every slip up to 16, else the window of 12 around the pair on screen plus
 * one hidden slip at each end (offsets -7..+6). Written out here on purpose
 * rather than imported, so the test states the rule on its own.
 */
export function ringIndices(step: number, total: number): number[] {
  if (total <= 16) return Array.from({ length: total }, (_, i) => i);
  const current = step - 1;
  return Array.from({ length: 14 }, (_, k) => (((current + k - 7) % total) + total) % total);
}

/**
 * The organizer's reveal screen during the reveal, at `step` of the loop
 * `order`: names only from pairs revealed so far that are on the ring;
 * codenames only of slips on the ring. No ids, no wishlists. Before the
 * start (step 0) there are no names or codenames at all.
 */
export function expectRevealPageClean(
  text: string,
  truth: Truth,
  order: { giver: string; receiver: string; codename: string }[],
  step: number,
) {
  const label = `reveal screen (step ${step} of ${order.length})`;
  commonChecks(text, truth, label);
  const ring = step === 0 ? [] : ringIndices(step, order.length);
  const shownNames = new Set(ring.filter((i) => i < step).flatMap((i) => [order[i].giver, order[i].receiver]));
  const shownCodenames = new Set(ring.map((i) => order[i].codename));
  const allowed = [...shownNames];
  for (const m of truth.members) {
    expect(text, `${label} contains the member id of ${m.name}`).not.toContain(m.id);
    // As whole words, past the codenames on the ring that contain it: "Pastillas
    // Prince" is hidden even while "Pastillas Princess" shows (server/codenames.ts).
    if (!shownCodenames.has(m.codename)) {
      expect(containsName(text, m.codename, [...shownCodenames]), `${label} shows the codename of ${m.name}`).toBe(false);
    }
    if (shownNames.has(m.name)) continue;
    expect(containsName(text, m.name, allowed), `${label} shows "${m.name}"`).toBe(false);
  }
  expectNoWishesOf(text, truth, new Set(truth.members.map((m) => m.id)), label);
}
