/**
 * The party reveal: the organizer starts it, then steps along the loop
 * with Next / Previous. The current step lives on the group row
 * (groups.reveal_step), so a refreshed projector or another device
 * resumes at the same pair. Finishing sets the group to REVEALED.
 *
 * Anonymity:
 * - getRevealView is for the organizer's reveal screen only. While
 *   REVEALING it returns the pair on screen, the pairs revealed so far
 *   that are on the ring, and codenames for the rest of the ring (see
 *   ./reveal-window.ts): never a name from a pair not revealed yet. The
 *   full list only once REVEALED.
 * - getOwnGiver ("Ang nagbigay sa'yo ay…") returns nothing until the
 *   group is REVEALED, checked in the query itself.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type Tx } from "./db";
import { assignments, groups, members, type GroupStatus } from "./db/schema";
import { revealSlipsAt, type RevealSlip } from "./reveal-window";

// --- Pure logic (unit tested) ----------------------------------------------

export interface Pair {
  giverId: string;
  receiverId: string;
}

/**
 * Orders pairs along the loop: starts with the first giver in
 * `giverOrder` (earliest joined), then follows giver → receiver → their
 * receiver… If the pairs somehow aren't one loop, the next unvisited
 * giver in `giverOrder` continues, so every pair still shows exactly once.
 */
export function revealOrder<P extends Pair>(pairs: P[], giverOrder: string[]): P[] {
  const byGiver = new Map(pairs.map((p) => [p.giverId, p]));
  const starts = [...giverOrder.filter((id) => byGiver.has(id)), ...pairs.map((p) => p.giverId)];
  const visited = new Set<string>();
  const ordered: P[] = [];
  for (const start of starts) {
    let current = byGiver.get(start);
    while (current && !visited.has(current.giverId)) {
      visited.add(current.giverId);
      ordered.push(current);
      current = byGiver.get(current.receiverId);
    }
  }
  return ordered;
}

export type RevealMove = "next" | "previous";

/**
 * One Next / Previous from `step` (1-based pair on screen) of `total`.
 * Next on the last pair finishes the reveal; Previous on the first stays.
 */
export function moveStep(step: number, total: number, move: RevealMove): { step: number; finished: boolean } {
  if (move === "previous") return { step: Math.max(1, step - 1), finished: false };
  if (step >= total) return { step: total, finished: true };
  return { step: step + 1, finished: false };
}

// --- Reading -----------------------------------------------------------------

export interface RevealPair {
  giverCodename: string;
  giverName: string;
  receiverName: string;
}

export type { RevealSlip };

export type RevealView =
  | { status: "OPEN"; groupName: string; total: number }
  | { status: "DRAWN"; groupName: string; total: number }
  | { status: "REVEALING"; groupName: string; step: number; total: number; pair: RevealPair; slips: RevealSlip[] }
  | { status: "REVEALED"; groupName: string; total: number; pairs: RevealPair[] };

const giver = alias(members, "giver");
const receiver = alias(members, "receiver");

/** All pairs of a group in reveal order, with names. Server-only. */
async function orderedPairs(groupId: string, tx?: Tx) {
  const q = tx ?? db();
  const rows = await q
    .select({
      giverId: assignments.giverId,
      receiverId: assignments.receiverId,
      giverCodename: giver.codename,
      giverName: giver.displayName,
      giverJoinedAt: giver.joinedAt,
      receiverName: receiver.displayName,
    })
    .from(assignments)
    .innerJoin(giver, eq(giver.id, assignments.giverId))
    .innerJoin(receiver, eq(receiver.id, assignments.receiverId))
    .where(and(eq(assignments.groupId, groupId), isNull(giver.removedAt), isNull(receiver.removedAt)))
    .orderBy(asc(giver.joinedAt), asc(giver.id));
  return revealOrder(
    rows,
    rows.map((r) => r.giverId),
  );
}

const toRevealPair = (p: RevealPair): RevealPair => ({
  giverCodename: p.giverCodename,
  giverName: p.giverName,
  receiverName: p.receiverName,
});

/**
 * What the organizer's reveal screen shows. Pass only a group id verified
 * from the organizer cookie.
 */
export async function getRevealView(groupId: string): Promise<RevealView | null> {
  const [group] = await db()
    .select({ status: groups.status, step: groups.revealStep, name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return null;
  const groupName = group.name;
  const pairs = group.status === "OPEN" ? [] : await orderedPairs(groupId);
  const total = pairs.length;

  if (group.status === "REVEALING") {
    const step = Math.min(Math.max(group.step, 1), total);
    // Only pairs revealed so far (and only those on the ring) leave the server.
    return {
      status: "REVEALING",
      groupName,
      step,
      total,
      pair: toRevealPair(pairs[step - 1]),
      slips: revealSlipsAt(pairs, step),
    };
  }
  if (group.status === "REVEALED") return { status: "REVEALED", groupName, total, pairs: pairs.map(toRevealPair) };
  return { status: group.status, groupName, total };
}

/**
 * "Ang nagbigay sa'yo ay…": who gave to this member. Only after the
 * reveal (the status check is part of the query). Pass only the id of the
 * member verified from the request's own cookie.
 */
export async function getOwnGiver(receiverId: string): Promise<{ displayName: string; codename: string } | null> {
  const [row] = await db()
    .select({ displayName: giver.displayName, codename: giver.codename })
    .from(assignments)
    .innerJoin(groups, eq(groups.id, assignments.groupId))
    .innerJoin(giver, eq(giver.id, assignments.giverId))
    .where(and(eq(assignments.receiverId, receiverId), eq(groups.status, "REVEALED"), isNull(giver.removedAt)))
    .limit(1);
  return row ?? null;
}

// --- Changing ----------------------------------------------------------------

export type RevealResult =
  | { ok: true; changed: boolean; status: GroupStatus }
  | { ok: false; reason: "NOT_FOUND" | "NOT_DRAWN" | "NOT_REVEALING"; message: string };

async function lockGroup(tx: Tx, groupId: string) {
  const [group] = await tx
    .select({ status: groups.status, step: groups.revealStep })
    .from(groups)
    .where(eq(groups.id, groupId))
    .for("update")
    .limit(1);
  return group;
}

/**
 * Starts the reveal on the first pair. After this, redraws and removals
 * are blocked (the loop on screen must not change). Starting again while
 * it's already running is a no-op (double click, second device).
 */
export async function startReveal(groupId: string): Promise<RevealResult> {
  return db().transaction(async (tx): Promise<RevealResult> => {
    const group = await lockGroup(tx, groupId);
    if (!group) return { ok: false, reason: "NOT_FOUND", message: "Hindi mahanap ang group." };
    if (group.status === "REVEALING" || group.status === "REVEALED") {
      return { ok: true, changed: false, status: group.status };
    }
    if (group.status !== "DRAWN") {
      return { ok: false, reason: "NOT_DRAWN", message: "Mag-draw muna ng names bago ang reveal." };
    }
    if ((await orderedPairs(groupId, tx)).length === 0) {
      return { ok: false, reason: "NOT_DRAWN", message: "Mag-draw muna ng names bago ang reveal." };
    }
    await tx.update(groups).set({ status: "REVEALING", revealStep: 1 }).where(eq(groups.id, groupId));
    return { ok: true, changed: true, status: "REVEALING" };
  });
}

/**
 * Next / Previous. `fromStep` is the step the screen was showing: if the
 * server has already moved on (double click, another device), nothing
 * changes and the screen just catches up. Next on the last pair sets the
 * group to REVEALED.
 */
export async function moveReveal(groupId: string, fromStep: number, move: RevealMove): Promise<RevealResult> {
  return db().transaction(async (tx): Promise<RevealResult> => {
    const group = await lockGroup(tx, groupId);
    if (!group) return { ok: false, reason: "NOT_FOUND", message: "Hindi mahanap ang group." };
    if (group.status === "REVEALED") return { ok: true, changed: false, status: "REVEALED" };
    if (group.status !== "REVEALING") {
      return { ok: false, reason: "NOT_REVEALING", message: "Hindi pa nagsisimula ang reveal." };
    }
    if (group.step !== fromStep) return { ok: true, changed: false, status: "REVEALING" };

    const total = (await orderedPairs(groupId, tx)).length;
    const next = moveStep(group.step, total, move);
    if (next.finished) {
      await tx.update(groups).set({ status: "REVEALED" }).where(eq(groups.id, groupId));
      return { ok: true, changed: true, status: "REVEALED" };
    }
    if (next.step === group.step) return { ok: true, changed: false, status: "REVEALING" };
    await tx.update(groups).set({ revealStep: next.step }).where(eq(groups.id, groupId));
    return { ok: true, changed: true, status: "REVEALING" };
  });
}
