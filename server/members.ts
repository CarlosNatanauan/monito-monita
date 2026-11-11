/**
 * Members: joining a group, the organizer's view, and removing members.
 *
 * Anonymity: nothing in this file reads the assignments table. The
 * organizer view lists who joined, never who drew whom.
 */
import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { createToken, hashToken, isValidSlug } from "./auth";
import { pickCodename } from "./codenames";
import { db } from "./db";
import { assignments, groups, members, themeWeeks, type GroupStatus } from "./db/schema";
import { cryptoRandomInt, patchLoopOnRemoval, type RandomInt } from "./draw";
import { MIN_MEMBERS_TO_DRAW } from "./draw-check";
import { drawInTransaction } from "./draw-service";
import { getDrawSetup, toExclusions } from "./exclusions";

export const MAX_MEMBERS = 150;
export const NAME_MAX = 40;

// --- Names ---------------------------------------------------------------

/** Trims and collapses whitespace so "  Joy   Cruz " and "Joy Cruz" match. */
export function normalizeDisplayName(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** True if two names count as the same person's name (case-insensitive). */
export function isSameName(a: string, b: string): boolean {
  return normalizeDisplayName(a).toLowerCase() === normalizeDisplayName(b).toLowerCase();
}

export function duplicateNameHint(name: string): string {
  return `May ${normalizeDisplayName(name)} na. Dagdagan ng initial ng apelyido mo.`;
}

export const joinSchema = z.object({
  slug: z.string().refine(isValidSlug, "Hindi mahanap ang group."),
  displayName: z
    .string({ error: "Pakilagay ang pangalan mo." })
    .transform(normalizeDisplayName)
    .pipe(
      z
        .string()
        .min(1, "Pakilagay ang pangalan mo.")
        .max(NAME_MAX, `Hanggang ${NAME_MAX} characters lang ang pangalan.`),
    ),
});

// --- Reads ---------------------------------------------------------------

export interface GroupSummary {
  id: string;
  slug: string;
  name: string;
  partyDate: string;
  budget: number;
  timezone: string;
  status: GroupStatus;
  memberCount: number;
}

/** Public info shown on the join page. Safe for anyone with the link. */
export async function getGroupSummary(slug: string): Promise<GroupSummary | null> {
  if (!isValidSlug(slug)) return null;
  const [row] = await db()
    .select({
      id: groups.id,
      slug: groups.slug,
      name: groups.name,
      partyDate: groups.partyDate,
      budget: groups.budget,
      timezone: groups.timezone,
      status: groups.status,
    })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!row) return null;

  const [{ memberCount }] = await db()
    .select({ memberCount: count() })
    .from(members)
    .where(and(eq(members.groupId, row.id), isNull(members.removedAt)));
  return { ...row, memberCount };
}

export interface OrganizerView {
  group: Omit<GroupSummary, "memberCount">;
  themes: { title: string; startDate: string }[];
  members: { id: string; displayName: string; joinedAt: Date }[];
}

/**
 * Everything the organizer page shows. Deliberately excludes assignments
 * and codenames: the organizer sees who joined, not pairs or aliases.
 */
export async function getOrganizerView(groupId: string): Promise<OrganizerView | null> {
  const [group] = await db()
    .select({
      id: groups.id,
      slug: groups.slug,
      name: groups.name,
      partyDate: groups.partyDate,
      budget: groups.budget,
      timezone: groups.timezone,
      status: groups.status,
    })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return null;

  const [themes, memberRows] = await Promise.all([
    db()
      .select({ title: themeWeeks.title, startDate: themeWeeks.startDate })
      .from(themeWeeks)
      .where(eq(themeWeeks.groupId, groupId))
      .orderBy(asc(themeWeeks.position)),
    db()
      .select({ id: members.id, displayName: members.displayName, joinedAt: members.joinedAt })
      .from(members)
      .where(and(eq(members.groupId, groupId), isNull(members.removedAt)))
      .orderBy(asc(members.joinedAt)),
  ]);

  return { group, themes, members: memberRows };
}

// --- Join ----------------------------------------------------------------

export type JoinResult =
  | { ok: true; memberId: string; codename: string; token: string }
  | { ok: false; reason: "NOT_FOUND" | "CLOSED" | "FULL" | "DUPLICATE_NAME"; message: string };

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const e = error as { cause?: { code?: string; constraint?: string }; code?: string; constraint?: string };
  return (e.cause?.code ?? e.code) === "23505" && (e.cause?.constraint ?? e.constraint) === constraint;
}

/**
 * Adds a member to an open group. Locks the group row so the member cap,
 * the open/closed check, and codename uniqueness can't race.
 */
export async function joinGroup(slug: string, rawName: string): Promise<JoinResult> {
  const displayName = normalizeDisplayName(rawName);
  const token = createToken();

  try {
    return await db().transaction(async (tx): Promise<JoinResult> => {
      const [group] = await tx
        .select({ id: groups.id, status: groups.status })
        .from(groups)
        .where(eq(groups.slug, slug))
        .for("update")
        .limit(1);
      if (!group) return { ok: false, reason: "NOT_FOUND", message: "Hindi mahanap ang group." };
      if (group.status !== "OPEN") {
        return { ok: false, reason: "CLOSED", message: "Sarado na ang sali. Na-draw na ang names." };
      }

      const [{ active }] = await tx
        .select({ active: count() })
        .from(members)
        .where(and(eq(members.groupId, group.id), isNull(members.removedAt)));
      if (active >= MAX_MEMBERS) {
        return { ok: false, reason: "FULL", message: `Puno na ang group (${MAX_MEMBERS} members).` };
      }

      const [sameName] = await tx
        .select({ id: members.id })
        .from(members)
        .where(
          and(
            eq(members.groupId, group.id),
            isNull(members.removedAt),
            sql`lower(${members.displayName}) = lower(${displayName})`,
          ),
        )
        .limit(1);
      if (sameName) return { ok: false, reason: "DUPLICATE_NAME", message: duplicateNameHint(displayName) };

      // Codenames stay unique even against removed members (DB constraint).
      const taken = await tx.select({ codename: members.codename }).from(members).where(eq(members.groupId, group.id));
      const codename = pickCodename(taken.map((t) => t.codename));

      const [member] = await tx
        .insert(members)
        .values({ groupId: group.id, displayName, codename, tokenHash: hashToken(token) })
        .returning({ id: members.id });

      return { ok: true, memberId: member.id, codename, token };
    });
  } catch (error) {
    // Backstop for the DB index (the lock above should make this unreachable).
    if (isUniqueViolation(error, "members_group_active_name_unique")) {
      return { ok: false, reason: "DUPLICATE_NAME", message: duplicateNameHint(displayName) };
    }
    throw error;
  }
}

// --- Remove --------------------------------------------------------------

export type RemoveResult =
  | { ok: true; mode: "removed" | "patched" | "redrawn" }
  | { ok: false; reason: "NOT_FOUND" | "LOCKED" | "TOO_FEW" | "NEEDS_REDRAW" | "IMPOSSIBLE"; message: string };

/** Thrown inside a transaction to roll it back and return a result. */
class Abort extends Error {
  constructor(readonly result: RemoveResult) {
    super("aborted");
  }
}

/**
 * Removes a member (soft delete), in one transaction.
 *
 * - Before the draw: just removed.
 * - After the draw: the loop is patched (whoever had them gets their
 *   receiver, and only that giver is flagged "Na-update ang monito mo").
 *   If the patch would pair an excluded couple, it's refused with
 *   NEEDS_REDRAW; pass `{ redraw: true }` to remove and redraw everyone.
 * - Never after the draw when only 3 remain (2 can't make a loop), and
 *   never after the reveal.
 */
export async function removeMember(
  groupId: string,
  memberId: string,
  options: { redraw?: boolean; random?: RandomInt } = {},
): Promise<RemoveResult> {
  try {
    return await db().transaction(async (tx): Promise<RemoveResult> => {
      const [group] = await tx
        .select({ status: groups.status })
        .from(groups)
        .where(eq(groups.id, groupId))
        .for("update")
        .limit(1);
      if (!group) return { ok: false, reason: "NOT_FOUND", message: "Hindi mahanap ang group." };
      if (group.status === "REVEALED") {
        return { ok: false, reason: "LOCKED", message: "Reveal na, kaya hindi na puwedeng magtanggal." };
      }

      const active = await tx
        .select({ id: members.id, displayName: members.displayName })
        .from(members)
        .where(and(eq(members.groupId, groupId), isNull(members.removedAt)));
      const target = active.find((m) => m.id === memberId);
      if (!target) return { ok: false, reason: "NOT_FOUND", message: "Wala na ang member na 'yan." };

      const markRemoved = () => tx.update(members).set({ removedAt: new Date() }).where(eq(members.id, memberId));

      if (group.status === "OPEN") {
        await markRemoved();
        return { ok: true, mode: "removed" };
      }

      // After the draw.
      if (active.length <= MIN_MEMBERS_TO_DRAW) {
        return {
          ok: false,
          reason: "TOO_FEW",
          message: `${active.length} na lang kayo, kaya hindi na puwedeng magtanggal pagkatapos ng draw. Kailangan ng at least ${MIN_MEMBERS_TO_DRAW} para sa bunutan.`,
        };
      }

      if (options.redraw) {
        await markRemoved();
        const drawn = await drawInTransaction(tx, groupId, options.random ?? cryptoRandomInt);
        if (!drawn.ok) throw new Abort({ ok: false, reason: "IMPOSSIBLE", message: drawn.message });
        return { ok: true, mode: "redrawn" };
      }

      // Sequential: one transaction = one connection (no concurrent queries).
      const rows = await tx
        .select({ giverId: assignments.giverId, receiverId: assignments.receiverId })
        .from(assignments)
        .where(eq(assignments.groupId, groupId));
      const setup = await getDrawSetup(groupId, tx);
      const patch = patchLoopOnRemoval(rows, memberId, toExclusions(setup.pairs));
      if (!patch.ok) {
        return {
          ok: false,
          reason: "NEEDS_REDRAW",
          message: `Kapag tinanggal si ${target.displayName}, magkakabunot ang dalawang bawal. Kailangan ng redraw para matanggal siya.`,
        };
      }

      // Apply the patch: drop the removed member's own row first (frees
      // their receiver), then point their giver at that receiver.
      const giver = rows.find((r) => r.receiverId === memberId)!;
      const removedRow = rows.find((r) => r.giverId === memberId)!;
      await tx.delete(assignments).where(and(eq(assignments.groupId, groupId), eq(assignments.giverId, memberId)));
      await tx
        .update(assignments)
        .set({ receiverId: removedRow.receiverId, receiverChangedAt: new Date() })
        .where(and(eq(assignments.groupId, groupId), eq(assignments.giverId, giver.giverId)));
      // Their monito changed: they unfold a new slip.
      await tx.update(members).set({ slipOpenedAt: null }).where(eq(members.id, giver.giverId));
      await markRemoved();
      return { ok: true, mode: "patched" };
    });
  } catch (error) {
    if (error instanceof Abort) return error.result;
    throw error;
  }
}
