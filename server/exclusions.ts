/**
 * Exclusions ("Bawal magkabunot"): pairs who can't draw each other.
 * Stored once per pair, sorted (member_a_id < member_b_id).
 * Only editable while the group is OPEN.
 */
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type Tx } from "./db";
import { exclusions, groups, members } from "./db/schema";
import type { DrawMember } from "./draw-check";
import type { Exclusion } from "./draw";

export interface ExclusionPair {
  id: string;
  memberAId: string;
  memberBId: string;
  memberAName: string;
  memberBName: string;
}

export interface DrawSetup {
  /** Active members, in join order. */
  members: DrawMember[];
  /** Pairs where both members are still active. */
  pairs: ExclusionPair[];
}

/** Sorts two member ids the way the database requires. */
export function sortPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function toExclusions(pairs: ExclusionPair[]): Exclusion[] {
  return pairs.map((p) => [p.memberAId, p.memberBId] as const);
}

const memberA = alias(members, "member_a");
const memberB = alias(members, "member_b");

/**
 * Active members and their exclusion pairs (no assignments involved).
 *
 * The two queries run one after the other on purpose: `tx` may be a
 * transaction (a single connection), where concurrent queries are
 * deprecated in pg and will throw in pg 9.
 */
export async function getDrawSetup(groupId: string, tx: Tx | ReturnType<typeof db> = db()): Promise<DrawSetup> {
  const memberRows = await tx
    .select({ id: members.id, displayName: members.displayName })
    .from(members)
    .where(and(eq(members.groupId, groupId), isNull(members.removedAt)))
    .orderBy(asc(members.joinedAt), asc(members.id));
  const pairRows = await tx
      .select({
        id: exclusions.id,
        memberAId: exclusions.memberAId,
        memberBId: exclusions.memberBId,
        memberAName: memberA.displayName,
        memberBName: memberB.displayName,
      })
      .from(exclusions)
      .innerJoin(memberA, eq(memberA.id, exclusions.memberAId))
      .innerJoin(memberB, eq(memberB.id, exclusions.memberBId))
      .where(and(eq(exclusions.groupId, groupId), isNull(memberA.removedAt), isNull(memberB.removedAt)))
      .orderBy(asc(exclusions.createdAt));
  return { members: memberRows, pairs: pairRows };
}

export type ExclusionResult = { ok: true } | { ok: false; message: string };

async function lockOpenGroup(tx: Tx, groupId: string): Promise<ExclusionResult> {
  const [group] = await tx.select({ status: groups.status }).from(groups).where(eq(groups.id, groupId)).for("update").limit(1);
  if (!group) return { ok: false, message: "Hindi mahanap ang group." };
  if (group.status !== "OPEN") return { ok: false, message: "Na-draw na ang names, kaya hindi na mababago ang mga bawal." };
  return { ok: true };
}

/** Adds "A and B can't draw each other" (both directions). */
export async function addExclusion(groupId: string, firstId: string, secondId: string): Promise<ExclusionResult> {
  if (firstId === secondId) return { ok: false, message: "Pumili ng dalawang magkaibang tao." };
  const [memberAId, memberBId] = sortPair(firstId, secondId);

  return db().transaction(async (tx): Promise<ExclusionResult> => {
    const locked = await lockOpenGroup(tx, groupId);
    if (!locked.ok) return locked;

    const found = await tx
      .select({ id: members.id })
      .from(members)
      .where(and(eq(members.groupId, groupId), isNull(members.removedAt), inArray(members.id, [memberAId, memberBId])));
    if (found.length !== 2) return { ok: false, message: "Wala na sa group ang isa sa kanila." };

    const inserted = await tx
      .insert(exclusions)
      .values({ groupId, memberAId, memberBId })
      .onConflictDoNothing()
      .returning({ id: exclusions.id });
    if (inserted.length === 0) return { ok: false, message: "Nandiyan na ang pair na 'yan." };
    return { ok: true };
  });
}

export async function removeExclusion(groupId: string, exclusionId: string): Promise<ExclusionResult> {
  return db().transaction(async (tx): Promise<ExclusionResult> => {
    const locked = await lockOpenGroup(tx, groupId);
    if (!locked.ok) return locked;
    const removed = await tx
      .delete(exclusions)
      .where(and(eq(exclusions.id, exclusionId), eq(exclusions.groupId, groupId)))
      .returning({ id: exclusions.id });
    if (removed.length === 0) return { ok: false, message: "Wala na ang pair na 'yan." };
    return { ok: true };
  });
}
