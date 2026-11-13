/**
 * Joining and removing members against the DEV database (`npm run test:db`).
 * Each test creates its own group and deletes it afterwards.
 */
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { findMemberByToken, hashToken, markLinkOpened } from "@/server/auth";
import { closeDb, db } from "@/server/db";
import { groups, members } from "@/server/db/schema";
import { createGroup } from "@/server/groups";
import {
  getGroupSummary,
  getOrganizerView,
  joinGroup,
  MAX_MEMBERS,
  NAME_TAKEN_MESSAGE,
  reissueMemberLink,
  removeMember,
} from "@/server/members";

const slugs: string[] = [];

async function newGroup() {
  const { slug } = await createGroup({ name: "Members test", budget: 300, partyDate: "2026-12-19", themes: [] });
  slugs.push(slug);
  const summary = await getGroupSummary(slug);
  return { slug, groupId: summary!.id };
}

afterAll(async () => {
  for (const slug of slugs) await db().delete(groups).where(eq(groups.slug, slug));
  await closeDb();
});

describe("joinGroup (dev DB)", () => {
  it("adds a member with a codename and a working token (hash only stored)", async () => {
    const { slug, groupId } = await newGroup();
    const result = await joinGroup(slug, "  Joy  ", "1234");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [row] = await db().select().from(members).where(eq(members.id, result.memberId));
    expect(row).toMatchObject({ groupId, displayName: "Joy", codename: result.codename, removedAt: null });
    expect(row.tokenHash).toBe(hashToken(result.token));
    expect(JSON.stringify(row)).not.toContain(result.token);
    expect(await findMemberByToken(slug, result.token)).toMatchObject({ id: result.memberId, displayName: "Joy" });
    expect((await getGroupSummary(slug))?.memberCount).toBe(1);
  });

  it("creates nothing for a taken name (case/space-insensitive), with a message that doesn't repeat it", async () => {
    const { slug, groupId } = await newGroup();
    expect((await joinGroup(slug, "Joy", "1234")).ok).toBe(true);
    const taken = await joinGroup(slug, "  JOY ", "5678");
    expect(taken).toEqual({ ok: false, reason: "NAME_TAKEN", message: NAME_TAKEN_MESSAGE });
    expect(NAME_TAKEN_MESSAGE.toLowerCase()).not.toContain("joy");
    expect(await db().select().from(members).where(eq(members.groupId, groupId))).toHaveLength(1);
    expect((await joinGroup(slug, "Joy C.", "1234")).ok).toBe(true);
  });

  it("allows the same name in a different group", async () => {
    const a = await newGroup();
    const b = await newGroup();
    expect((await joinGroup(a.slug, "Joy", "1234")).ok).toBe(true);
    expect((await joinGroup(b.slug, "Joy", "1234")).ok).toBe(true);
  });

  it("lets only one of many simultaneous same-name joins through", async () => {
    const { slug, groupId } = await newGroup();
    const results = await Promise.all(Array.from({ length: 8 }, () => joinGroup(slug, "Marco", "1234")));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === "NAME_TAKEN")).toHaveLength(7);
    const rows = await db().select().from(members).where(eq(members.groupId, groupId));
    expect(rows).toHaveLength(1);
  });

  it("gives unique codenames even when many join at once", async () => {
    const { slug, groupId } = await newGroup();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => joinGroup(slug, `Member ${i}`, "1234")));
    expect(results.every((r) => r.ok)).toBe(true);
    const rows = await db().select({ codename: members.codename }).from(members).where(eq(members.groupId, groupId));
    expect(new Set(rows.map((r) => r.codename)).size).toBe(20);
  });

  it("closes joining after the draw", async () => {
    const { slug, groupId } = await newGroup();
    await db().update(groups).set({ status: "DRAWN" }).where(eq(groups.id, groupId));
    expect(await joinGroup(slug, "Late Larry", "1234")).toMatchObject({ ok: false, reason: "CLOSED" });
  });

  it(`caps groups at ${MAX_MEMBERS} active members`, async () => {
    const { slug, groupId } = await newGroup();
    await db()
      .insert(members)
      .values(
        Array.from({ length: MAX_MEMBERS }, (_, i) => ({
          groupId,
          displayName: `Bulk ${i}`,
          codename: `Bulk codename ${i}`,
          tokenHash: hashToken(`bulk-${slug}-${i}`),
        })),
      );
    expect(await joinGroup(slug, "One too many", "1234")).toMatchObject({ ok: false, reason: "FULL" });

    // Removing someone opens a spot again.
    const [first] = await db().select({ id: members.id }).from(members).where(eq(members.groupId, groupId)).limit(1);
    expect(await removeMember(groupId, first.id)).toEqual({ ok: true, mode: "removed" });
    expect((await joinGroup(slug, "One too many", "1234")).ok).toBe(true);
  });

  it("returns NOT_FOUND for an unknown group", async () => {
    expect(await joinGroup("zzzzzzzzzzzz", "Joy", "1234")).toMatchObject({ ok: false, reason: "NOT_FOUND" });
  });
});

describe("removeMember (dev DB)", () => {
  it("soft-removes before the draw, frees the name, and hides them from lists and login", async () => {
    const { slug, groupId } = await newGroup();
    const joy = await joinGroup(slug, "Joy", "1234");
    if (!joy.ok) throw new Error(joy.message);

    expect(await removeMember(groupId, joy.memberId)).toEqual({ ok: true, mode: "removed" });
    expect(await removeMember(groupId, joy.memberId)).toMatchObject({ ok: false, reason: "NOT_FOUND" });

    const [row] = await db().select().from(members).where(eq(members.id, joy.memberId));
    expect(row.removedAt).toBeInstanceOf(Date);
    expect(await findMemberByToken(slug, joy.token)).toBeNull();
    expect((await getOrganizerView(groupId))?.members).toEqual([]);
    expect((await getGroupSummary(slug))?.memberCount).toBe(0);

    // The name is free again (new member, new codename).
    const again = await joinGroup(slug, "joy", "1234");
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.codename).not.toBe(joy.codename);
  });

  it("refuses after the reveal", async () => {
    const { slug, groupId } = await newGroup();
    const marco = await joinGroup(slug, "Marco", "1234");
    if (!marco.ok) throw new Error(marco.message);
    await db().update(groups).set({ status: "REVEALED" }).where(eq(groups.id, groupId));
    expect(await removeMember(groupId, marco.memberId)).toMatchObject({ ok: false, reason: "LOCKED" });
    const active = await db().select().from(members).where(and(eq(members.id, marco.memberId), isNull(members.removedAt)));
    expect(active).toHaveLength(1);
  });

  it("can't remove a member of another group", async () => {
    const a = await newGroup();
    const b = await newGroup();
    const joy = await joinGroup(a.slug, "Joy", "1234");
    if (!joy.ok) throw new Error(joy.message);
    expect(await removeMember(b.groupId, joy.memberId)).toMatchObject({ ok: false, reason: "NOT_FOUND" });
  });
});

describe("getOrganizerView (dev DB)", () => {
  it("lists members and group details, never pairs or codenames", async () => {
    const { slug, groupId } = await newGroup();
    await joinGroup(slug, "Joy", "1234");
    await joinGroup(slug, "Marco", "1234");
    const view = await getOrganizerView(groupId);
    expect(view?.members.map((m) => m.displayName)).toEqual(["Joy", "Marco"]);
    for (const m of view!.members) {
      expect(Object.keys(m).sort()).toEqual(["displayName", "id", "joinedAt", "linkStatus", "pinLocked", "slipOpened"]);
      expect(m.slipOpened).toBe(false);
      expect(m.linkStatus).toBe("none");
      expect(m.pinLocked).toBe(false);
    }
    const json = JSON.stringify(view);
    for (const forbidden of [
      "receiver",
      "giver",
      "assignment",
      "codename",
      "tokenHash",
      "organizerTokenHash",
      "pinHash",
      "scrypt",
    ]) {
      expect(json).not.toContain(forbidden);
    }
  });
});

describe("reissueMemberLink (dev DB)", () => {
  it("gives a new working token; the old one stops working", async () => {
    const { slug, groupId } = await newGroup();
    const joy = await joinGroup(slug, "Joy", "1234");
    if (!joy.ok) throw new Error(joy.message);

    const result = await reissueMemberLink(groupId, joy.memberId);
    if (!result.ok) throw new Error(result.message);
    expect(result).toEqual({ ok: true, token: expect.any(String), displayName: "Joy" });
    expect(result.token).not.toBe(joy.token);
    expect(await findMemberByToken(slug, joy.token)).toBeNull();
    expect((await findMemberByToken(slug, result.token))?.id).toBe(joy.memberId);
    // Only the hash is stored.
    const [row] = await db().select({ tokenHash: members.tokenHash }).from(members).where(eq(members.id, joy.memberId));
    expect(row.tokenHash).toBe(hashToken(result.token));
  });

  it("only for active members of the organizer's own group", async () => {
    const a = await newGroup();
    const b = await newGroup();
    const joy = await joinGroup(a.slug, "Joy", "1234");
    const ben = await joinGroup(a.slug, "Ben", "1234");
    if (!joy.ok || !ben.ok) throw new Error("join failed");
    expect(await reissueMemberLink(b.groupId, joy.memberId)).toMatchObject({ ok: false, reason: "NOT_FOUND" });
    await removeMember(a.groupId, ben.memberId);
    expect(await reissueMemberLink(a.groupId, ben.memberId)).toMatchObject({ ok: false, reason: "NOT_FOUND" });
    expect(await findMemberByToken(a.slug, joy.token)).not.toBeNull();
  });

  it("shows the organizer only whether the new link was opened", async () => {
    const { slug, groupId } = await newGroup();
    const joy = await joinGroup(slug, "Joy", "1234");
    if (!joy.ok) throw new Error(joy.message);
    const status = async () => (await getOrganizerView(groupId))!.members[0].linkStatus;

    // Using an original (never reissued) link changes nothing.
    await markLinkOpened(joy.memberId);
    expect(await status()).toBe("none");

    await reissueMemberLink(groupId, joy.memberId);
    expect(await status()).toBe("new-unopened");
    await markLinkOpened(joy.memberId);
    expect(await status()).toBe("new-opened");

    // Reissuing again starts over.
    await reissueMemberLink(groupId, joy.memberId);
    expect(await status()).toBe("new-unopened");
  });
});
