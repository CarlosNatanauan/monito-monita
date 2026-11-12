/**
 * Name + PIN against the DEV database (`npm run test:db`): hashing,
 * coming back, lockout counts, unlock, reset, and device sessions.
 * Each test creates its own group and deletes it afterwards.
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { findMemberByToken, isRemovedMemberToken } from "@/server/auth";
import { closeDb, db } from "@/server/db";
import { groups, members, memberSessions } from "@/server/db/schema";
import { drawNames } from "@/server/draw-service";
import { createGroup } from "@/server/groups";
import { getGroupSummary, getOrganizerView, joinGroup, reissueMemberLink, removeMember } from "@/server/members";
import { comeBack, MAX_SESSIONS_PER_MEMBER, setOwnPin, unlockMemberPin, verifyPin } from "@/server/pin";

const slugs: string[] = [];

async function newGroup() {
  const { slug } = await createGroup({ name: "PIN test", budget: 300, partyDate: "2026-12-19", themes: [] });
  slugs.push(slug);
  const summary = await getGroupSummary(slug);
  return { slug, groupId: summary!.id };
}

async function joined(slug: string, name: string, pin = "1234") {
  const result = await joinGroup(slug, name, pin);
  if (!result.ok) throw new Error(`join failed: ${result.reason}`);
  return result;
}

async function pinRow(memberId: string) {
  const [row] = await db()
    .select({
      pinHash: members.pinHash,
      failed: members.pinFailedAttempts,
      lockedUntil: members.pinLockedUntil,
      lockedAt: members.pinLockedAt,
    })
    .from(members)
    .where(eq(members.id, memberId));
  return row;
}

const inMinutes = (n: number) => new Date(Date.now() + n * 60_000);

afterAll(async () => {
  for (const slug of slugs) await db().delete(groups).where(eq(groups.slug, slug));
  await closeDb();
});

describe("PIN hashing (dev DB)", () => {
  it("stores only a salted scrypt hash of the PIN", async () => {
    const { slug } = await newGroup();
    const [a, b] = [await joined(slug, "Ana", "0420"), await joined(slug, "Ben", "0420")];
    const [rowA, rowB] = [await pinRow(a.memberId), await pinRow(b.memberId)];
    expect(rowA.pinHash).toMatch(/^scrypt\$/);
    expect(rowA.pinHash).not.toContain("0420");
    // Same PIN, different salt: nothing shows two members share a PIN.
    expect(rowA.pinHash).not.toBe(rowB.pinHash);
    expect(await verifyPin("0420", rowA.pinHash)).toBe(true);
    expect(await verifyPin("0421", rowA.pinHash)).toBe(false);
  });
});

describe("comeBack (dev DB)", () => {
  it("right name + PIN gives a new device token; the old one keeps working", async () => {
    const { slug } = await newGroup();
    const ana = await joined(slug, "Ana Cruz", "1111");
    const back = await comeBack(slug, "  ana   CRUZ ", "1111");
    expect(back).toMatchObject({ ok: true, memberId: ana.memberId });
    if (!back.ok) return;
    expect(back.token).not.toBe(ana.token);
    expect(await findMemberByToken(slug, back.token)).toMatchObject({ id: ana.memberId, hasPin: true });
    expect(await findMemberByToken(slug, ana.token)).toMatchObject({ id: ana.memberId });
    // Only the session's hash is stored.
    const sessions = await db().select().from(memberSessions).where(eq(memberSessions.memberId, ana.memberId));
    expect(sessions).toHaveLength(1);
    expect(JSON.stringify(sessions)).not.toContain(back.token);
  });

  it("every failure looks the same: unknown name, wrong PIN, bad input, other group", async () => {
    const { slug } = await newGroup();
    const other = await newGroup();
    await joined(slug, "Ana", "1111");
    for (const [s, name, pin] of [
      [slug, "Anna", "1111"],
      [slug, "Ana", "1112"],
      [slug, "Ana", "111"],
      [slug, "", "1111"],
      [other.slug, "Ana", "1111"],
      ["../nope", "Ana", "1111"],
    ]) {
      expect(await comeBack(s, name, pin), `${s} ${name} ${pin}`).toEqual({ ok: false });
    }
  });

  it("fails for removed members and members without a PIN", async () => {
    const { slug, groupId } = await newGroup();
    const ana = await joined(slug, "Ana", "1111");
    await joined(slug, "Ben", "2222");
    await db().update(members).set({ pinHash: null }).where(eq(members.id, ana.memberId));
    expect(await comeBack(slug, "Ana", "1111")).toEqual({ ok: false });
    // Without a PIN, wrong tries aren't counted (nothing to lock).
    expect((await pinRow(ana.memberId)).failed).toBe(0);

    const ben = (await getOrganizerView(groupId))!.members.find((m) => m.displayName === "Ben")!;
    await removeMember(groupId, ben.id);
    expect(await comeBack(slug, "Ben", "2222")).toEqual({ ok: false });
  });

  it("still works after the draw", async () => {
    const { slug, groupId } = await newGroup();
    await joined(slug, "Ana", "1111");
    await joined(slug, "Ben", "2222");
    await joined(slug, "Cris", "3333");
    expect((await drawNames(groupId, "draw")).ok).toBe(true);
    expect((await joinGroup(slug, "Dan", "4444")).ok).toBe(false);
    expect(await comeBack(slug, "cris", "3333")).toMatchObject({ ok: true });
  });

  it("keeps only the newest sessions per member", async () => {
    const { slug } = await newGroup();
    const ana = await joined(slug, "Ana", "1111");
    const tokens: string[] = [];
    for (let i = 0; i < MAX_SESSIONS_PER_MEMBER + 2; i++) {
      const back = await comeBack(slug, "Ana", "1111");
      if (back.ok) tokens.push(back.token);
    }
    const sessions = await db().select().from(memberSessions).where(eq(memberSessions.memberId, ana.memberId));
    expect(sessions).toHaveLength(MAX_SESSIONS_PER_MEMBER);
    expect(await findMemberByToken(slug, tokens.at(-1)!)).not.toBeNull();
    expect(await findMemberByToken(slug, tokens[0])).toBeNull();
  });
});

describe("PIN lockout (dev DB)", () => {
  it("5 wrong → 15-minute lock (even the right PIN fails), then 10 → locked until unlocked", async () => {
    const { slug, groupId } = await newGroup();
    const ana = await joined(slug, "Ana", "1111");

    for (let i = 0; i < 4; i++) expect(await comeBack(slug, "Ana", "0000")).toEqual({ ok: false });
    expect(await pinRow(ana.memberId)).toMatchObject({ failed: 4, lockedUntil: null, lockedAt: null });

    expect(await comeBack(slug, "Ana", "0000")).toEqual({ ok: false });
    const five = await pinRow(ana.memberId);
    expect(five.failed).toBe(5);
    expect(five.lockedUntil!.getTime()).toBeGreaterThan(inMinutes(14).getTime());
    expect(five.lockedUntil!.getTime()).toBeLessThanOrEqual(inMinutes(15).getTime() + 1000);

    // Locked: the right PIN fails, and tries during the lock aren't counted.
    expect(await comeBack(slug, "Ana", "1111")).toEqual({ ok: false });
    expect(await comeBack(slug, "Ana", "0000")).toEqual({ ok: false });
    expect((await pinRow(ana.memberId)).failed).toBe(5);

    // 16 minutes later: open again; 5 more wrong → full lock.
    const later = inMinutes(16);
    for (let i = 0; i < 5; i++) expect(await comeBack(slug, "Ana", "0000", later)).toEqual({ ok: false });
    const ten = await pinRow(ana.memberId);
    expect(ten.failed).toBe(10);
    expect(ten.lockedAt).not.toBeNull();
    expect(await comeBack(slug, "Ana", "1111", inMinutes(60 * 24))).toEqual({ ok: false });

    // The organizer sees it, by name only.
    const view = await getOrganizerView(groupId);
    expect(view!.members.find((m) => m.id === ana.memberId)?.pinLocked).toBe(true);

    expect(await unlockMemberPin(groupId, ana.memberId)).toBe(true);
    expect(await pinRow(ana.memberId)).toMatchObject({ failed: 0, lockedUntil: null, lockedAt: null });
    expect((await getOrganizerView(groupId))!.members.find((m) => m.id === ana.memberId)?.pinLocked).toBe(false);
    expect(await comeBack(slug, "Ana", "1111")).toMatchObject({ ok: true });
  });

  it("a right PIN resets the count", async () => {
    const { slug } = await newGroup();
    const ana = await joined(slug, "Ana", "1111");
    for (let i = 0; i < 3; i++) await comeBack(slug, "Ana", "0000");
    expect((await pinRow(ana.memberId)).failed).toBe(3);
    expect(await comeBack(slug, "Ana", "1111")).toMatchObject({ ok: true });
    expect((await pinRow(ana.memberId)).failed).toBe(0);
  });

  it("counts parallel wrong guesses one by one", async () => {
    const { slug } = await newGroup();
    const ana = await joined(slug, "Ana", "1111");
    const results = await Promise.all(Array.from({ length: 8 }, () => comeBack(slug, "Ana", "0000")));
    expect(results.every((r) => !r.ok)).toBe(true);
    // The 6th–8th arrive during the lock and don't count.
    const row = await pinRow(ana.memberId);
    expect(row.failed).toBe(5);
    expect(row.lockedUntil).not.toBeNull();
  });

  it("unlock only works on the organizer's own group", async () => {
    const { slug } = await newGroup();
    const other = await newGroup();
    const ana = await joined(slug, "Ana", "1111");
    expect(await unlockMemberPin(other.groupId, ana.memberId)).toBe(false);
  });
});

describe("reset PIN and new links (dev DB)", () => {
  it("Get new link ends every device session; Reset PIN clears the PIN and the lock", async () => {
    const { slug, groupId } = await newGroup();
    const ana = await joined(slug, "Ana", "1111");
    const back = await comeBack(slug, "Ana", "1111");
    if (!back.ok) throw new Error("come back failed");
    for (let i = 0; i < 5; i++) await comeBack(slug, "Ana", "0000");

    // A plain new link keeps the PIN (and its lock).
    const plain = await reissueMemberLink(groupId, ana.memberId);
    if (!plain.ok) throw new Error("reissue failed");
    expect(await findMemberByToken(slug, back.token)).toBeNull();
    expect(await findMemberByToken(slug, ana.token)).toBeNull();
    expect(await findMemberByToken(slug, plain.token)).toMatchObject({ id: ana.memberId, hasPin: true });
    expect((await pinRow(ana.memberId)).failed).toBe(5);

    const reset = await reissueMemberLink(groupId, ana.memberId, { resetPin: true });
    if (!reset.ok) throw new Error("reissue failed");
    expect(await pinRow(ana.memberId)).toMatchObject({ pinHash: null, failed: 0, lockedUntil: null, lockedAt: null });
    expect(await findMemberByToken(slug, reset.token)).toMatchObject({ hasPin: false });
    // No PIN yet: coming back fails until they set one.
    expect(await comeBack(slug, "Ana", "1111")).toEqual({ ok: false });

    // They set a new PIN on /me, once.
    expect(await setOwnPin(ana.memberId, "2468")).toBe(true);
    expect(await setOwnPin(ana.memberId, "1357")).toBe(false);
    expect(await comeBack(slug, "Ana", "1111")).toEqual({ ok: false });
    expect(await comeBack(slug, "Ana", "2468")).toMatchObject({ ok: true });
  });

  it("a removed member's device session reads as removed", async () => {
    const { slug, groupId } = await newGroup();
    const ana = await joined(slug, "Ana", "1111");
    await joined(slug, "Ben", "2222");
    const back = await comeBack(slug, "Ana", "1111");
    if (!back.ok) throw new Error("come back failed");
    await removeMember(groupId, ana.memberId);
    expect(await findMemberByToken(slug, back.token)).toBeNull();
    expect(await isRemovedMemberToken(slug, back.token)).toBe(true);
  });
});
