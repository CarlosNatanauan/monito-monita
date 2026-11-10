/**
 * Anonymity leak checks: before the reveal, no page may expose who is
 * giving to whom, except a member's own receiver on their own /me.
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
  members: { id: string; name: string; removed: boolean }[];
  pairs: { id: string; giverId: string; receiverId: string }[];
  wishes: { memberId: string; title: string; note: string | null }[];
}

/** Ground truth for a group, straight from the database. */
export async function getTruth(slug: string): Promise<Truth> {
  const [group] = await db().select({ id: groups.id }).from(groups).where(eq(groups.slug, slug));
  const [memberRows, pairRows, wishRows] = await Promise.all([
    db()
      .select({ id: members.id, name: members.displayName, removedAt: members.removedAt })
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
    members: memberRows.map((m) => ({ id: m.id, name: m.name, removed: m.removedAt !== null })),
    pairs: pairRows,
    wishes: wishRows,
  };
}

const TEXT_TYPES = /text\/html|text\/x-component|application\/json|text\/plain/;

/** Loads `url` and returns everything the page received, as text. */
export async function capturePage(page: Page, url: string): Promise<string> {
  const origin = new URL(page.url() === "about:blank" ? url : page.url(), "http://localhost:3000").origin;
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

/** Organizer page: names are fine (member list), pair data is not. */
export function expectOrganizerPageClean(text: string, truth: Truth) {
  commonChecks(text, truth, "organizer page");
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

/** A member's /me: only their own name and their own receiver. */
export function expectMemberPageClean(text: string, truth: Truth, memberName: string) {
  const me = truth.members.find((m) => m.name === memberName && !m.removed);
  if (!me) throw new Error(`No active member named ${memberName}`);
  const pair = truth.pairs.find((p) => p.giverId === me.id);
  const receiver = truth.members.find((m) => m.id === pair?.receiverId);
  if (!receiver) throw new Error(`${memberName} has no receiver`);

  const label = `${memberName}'s /me`;
  commonChecks(text, truth, label);
  const allowed = [me.name, receiver.name];
  for (const other of truth.members) {
    if (other.id === me.id || other.id === receiver.id) continue;
    expect(containsName(text, other.name, allowed), `${label} shows "${other.name}"`).toBe(false);
    expect(text, `${label} contains the member id of ${other.name}`).not.toContain(other.id);
  }
  // Wishlists: only their own and their receiver's.
  const others = new Set(truth.members.filter((m) => m.id !== me.id && m.id !== receiver.id).map((m) => m.id));
  expectNoWishesOf(text, truth, others, label);
  // Their receiver's id isn't needed on the page either.
  expect(text, `${label} contains the receiver's member id`).not.toContain(receiver.id);
}
