/**
 * Running the draw and reading results.
 *
 * Anonymity: the only function here that returns pair data is
 * getOwnReceiver, which takes the viewer's own member id (from their
 * cookie) and returns only their receiver's name. Slip opens are shown to
 * the organizer as a count only.
 */
import { and, count, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, type Tx } from "./db";
import { assignments, groups, members } from "./db/schema";
import { cryptoRandomInt, drawLoop, type RandomInt } from "./draw";
import { describeDrawFailure, MIN_MEMBERS_TO_DRAW, TOO_FEW_MESSAGE } from "./draw-check";
import { getDrawSetup, toExclusions } from "./exclusions";

export type DrawMode = "draw" | "redraw";

export type DrawNamesResult =
  | { ok: true; count: number }
  | {
      ok: false;
      reason: "NOT_FOUND" | "ALREADY_DRAWN" | "NOT_DRAWN" | "REVEALED" | "TOO_FEW" | "IMPOSSIBLE";
      message: string;
    };

/**
 * Draws names (or redraws) in one transaction: locks the group row, runs
 * drawLoop, replaces assignments, and sets the group to DRAWN.
 *
 * The row lock plus the status check means a double click, two tabs, or a
 * retry can only ever produce one draw.
 */
export async function drawNames(
  groupId: string,
  mode: DrawMode,
  random: RandomInt = cryptoRandomInt,
): Promise<DrawNamesResult> {
  return db().transaction(async (tx): Promise<DrawNamesResult> => {
    const [group] = await tx
      .select({ status: groups.status })
      .from(groups)
      .where(eq(groups.id, groupId))
      .for("update")
      .limit(1);
    if (!group) return { ok: false, reason: "NOT_FOUND", message: "Hindi mahanap ang group." };
    if (group.status === "REVEALED") {
      return { ok: false, reason: "REVEALED", message: "Reveal na, kaya hindi na puwedeng mag-draw ulit." };
    }
    if (mode === "draw" && group.status !== "OPEN") {
      return { ok: false, reason: "ALREADY_DRAWN", message: "Na-draw na ang names." };
    }
    if (mode === "redraw" && group.status !== "DRAWN") {
      return { ok: false, reason: "NOT_DRAWN", message: "Hindi pa na-draw ang names." };
    }

    return drawInTransaction(tx, groupId, random);
  });
}

/**
 * The draw itself, inside a transaction that has already locked the group
 * row: draws the active members, replaces all assignments, sets DRAWN.
 */
export async function drawInTransaction(tx: Tx, groupId: string, random: RandomInt): Promise<DrawNamesResult> {
  const setup = await getDrawSetup(groupId, tx);
  if (setup.members.length < MIN_MEMBERS_TO_DRAW) {
    return { ok: false, reason: "TOO_FEW", message: TOO_FEW_MESSAGE };
  }

  const result = drawLoop(
    setup.members.map((m) => m.id),
    toExclusions(setup.pairs),
    random,
  );
  if (!result.ok) {
    const names = new Map(setup.members.map((m) => [m.id, m.displayName]));
    return {
      ok: false,
      reason: "IMPOSSIBLE",
      message: describeDrawFailure(result, (id) => names.get(id) ?? "isang member"),
    };
  }

  await tx.delete(assignments).where(eq(assignments.groupId, groupId));
  await tx.insert(assignments).values(result.assignments.map((a) => ({ groupId, ...a })));
  // Everyone has a new monito: everyone unfolds a new slip.
  await tx.update(members).set({ slipOpenedAt: null }).where(eq(members.groupId, groupId));
  await tx.update(groups).set({ status: "DRAWN" }).where(eq(groups.id, groupId));
  return { ok: true, count: result.assignments.length };
}

/** How many people have a monito. A number only, never pairs. */
export async function countAssignments(groupId: string): Promise<number> {
  const [row] = await db().select({ n: count() }).from(assignments).where(eq(assignments.groupId, groupId));
  return row?.n ?? 0;
}

const giver = alias(members, "giver");

/**
 * The viewer's own receiver, and whether they've already unfolded the slip.
 * Pass only the id of the member verified from the request's own cookie
 * (getMemberSession), never an id from input.
 */
export async function getOwnReceiver(
  giverId: string,
): Promise<{ displayName: string; changedAt: Date | null; slipOpenedAt: Date | null } | null> {
  const [row] = await db()
    .select({
      displayName: members.displayName,
      changedAt: assignments.receiverChangedAt,
      slipOpenedAt: giver.slipOpenedAt,
    })
    .from(assignments)
    .innerJoin(members, eq(members.id, assignments.receiverId))
    .innerJoin(giver, eq(giver.id, assignments.giverId))
    .where(and(eq(assignments.giverId, giverId), isNull(members.removedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * The viewer unfolded their slip (their own row only). Only counts once,
 * and only while they actually have a monito.
 */
export async function markSlipOpened(memberId: string): Promise<void> {
  const [mine] = await db()
    .select({ id: assignments.id })
    .from(assignments)
    .innerJoin(groups, eq(groups.id, assignments.groupId))
    .where(and(eq(assignments.giverId, memberId), eq(groups.status, "DRAWN")))
    .limit(1);
  if (!mine) return;
  await db()
    .update(members)
    .set({ slipOpenedAt: new Date() })
    .where(and(eq(members.id, memberId), isNull(members.slipOpenedAt), isNull(members.removedAt)));
}

/**
 * Whether this member has opened their slip, without touching their
 * receiver (for the organizer page's own "Buksan ang slip mo" step).
 */
export async function hasOpenedOwnSlip(memberId: string): Promise<boolean> {
  const [row] = await db()
    .select({ at: members.slipOpenedAt })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);
  return Boolean(row?.at);
}

/** "8 of 12 have opened their slip": counts only, never who. */
export async function countSlipsOpened(groupId: string): Promise<{ opened: number; total: number }> {
  const [row] = await db()
    .select({ total: count(), opened: count(members.slipOpenedAt) })
    .from(assignments)
    .innerJoin(members, eq(members.id, assignments.giverId))
    .where(and(eq(assignments.groupId, groupId), isNull(members.removedAt)));
  return { opened: row?.opened ?? 0, total: row?.total ?? 0 };
}

/** The viewer acknowledges "Na-update ang monito mo" (their own row only). */
export async function acknowledgeReceiverChange(giverId: string): Promise<void> {
  await db().update(assignments).set({ receiverChangedAt: null }).where(eq(assignments.giverId, giverId));
}
