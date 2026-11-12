/**
 * Name + PIN: a member's way back on another device (docs/TECH.md
 * "Identity without accounts").
 *
 * - The PIN is 4 digits, stored only as a salted scrypt hash. PINs don't
 *   need to be unique and are never compared across members.
 * - Coming back: active member with that name (case/space-insensitive) +
 *   the right PIN → a NEW device token (member_sessions). Their original
 *   token keeps working, so other devices stay logged in.
 * - Every failure looks the same to the caller: unknown name, wrong PIN,
 *   locked, removed, or no PIN set. Each runs one scrypt so the timing
 *   doesn't tell them apart either.
 * - Guessing: 5 wrong tries lock the member for 15 minutes; 10 lock them
 *   until the organizer unlocks. Tries during a lock don't count (and
 *   aren't checked). A correct PIN or an unlock resets the count.
 *
 * Pure helpers at the top (unit tested), database functions below.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, isNull, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { createToken, hashToken, isValidSlug } from "./auth";
import { db, type Tx } from "./db";
import { groups, members, memberSessions } from "./db/schema";
import { normalizeDisplayName } from "./names";

// --- PIN format ------------------------------------------------------------

export const PIN_LENGTH = 4;
const PIN_PATTERN = /^\d{4}$/;

export const PIN_REQUIRED_MESSAGE = "Pakilagay ang 4-digit PIN.";

export const pinSchema = z
  .string({ error: PIN_REQUIRED_MESSAGE })
  .trim()
  .regex(PIN_PATTERN, PIN_REQUIRED_MESSAGE);

export function isWellFormedPin(pin: unknown): pin is string {
  return typeof pin === "string" && PIN_PATTERN.test(pin);
}

// --- Lockout (pure) --------------------------------------------------------

export const PIN_LOCK_AFTER = 5;
export const PIN_LOCK_MINUTES = 15;
export const PIN_FULL_LOCK_AFTER = 10;

export interface PinLockState {
  failedAttempts: number;
  /** Temporary lock: no tries until this time. */
  lockedUntil: Date | null;
  /** Full lock: no tries until the organizer unlocks. */
  lockedAt: Date | null;
}

export type PinLockStatus = "open" | "temporary" | "full";

export const PIN_UNLOCKED: PinLockState = { failedAttempts: 0, lockedUntil: null, lockedAt: null };

export function pinLockStatus(state: PinLockState, now: Date): PinLockStatus {
  if (state.lockedAt) return "full";
  if (state.lockedUntil && state.lockedUntil.getTime() > now.getTime()) return "temporary";
  return "open";
}

/** The state after one more wrong PIN (only call when the status is "open"). */
export function afterWrongPin(state: PinLockState, now: Date): PinLockState {
  const failedAttempts = state.failedAttempts + 1;
  if (failedAttempts >= PIN_FULL_LOCK_AFTER) {
    return { failedAttempts, lockedUntil: null, lockedAt: state.lockedAt ?? now };
  }
  if (failedAttempts % PIN_LOCK_AFTER === 0) {
    return { failedAttempts, lockedUntil: new Date(now.getTime() + PIN_LOCK_MINUTES * 60_000), lockedAt: null };
  }
  return { failedAttempts, lockedUntil: state.lockedUntil, lockedAt: null };
}

// --- Hashing ---------------------------------------------------------------
// Format: scrypt$N$r$p$<salt base64url>$<hash base64url>
// N=2^14, r=8 (16 MB, ~50 ms). A 4-digit PIN can't be made strong offline
// by any hash; the lockout and IP limit are the real protection. The slow
// salted hash just keeps a database leak from showing PINs at a glance.

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_BYTES = 16;

function scryptKey(pin: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPin(pin: string): Promise<string> {
  if (!isWellFormedPin(pin)) throw new Error("Invalid PIN");
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptKey(pin, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/** Same cost as a real check, for failures that have no hash to check against. */
const DUMMY_SALT = randomBytes(SALT_BYTES);
async function burnPinCheck(pin: string): Promise<false> {
  await scryptKey(String(pin).slice(0, 16), DUMMY_SALT, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return false;
}

/** True if `pin` matches `stored`. Always does one scrypt, even when `stored` is missing. */
export async function verifyPin(pin: string, stored: string | null): Promise<boolean> {
  const parts = stored?.split("$") ?? [];
  if (!isWellFormedPin(pin) || parts.length !== 6 || parts[0] !== "scrypt") return burnPinCheck(pin);
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptKey(pin, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// --- Device sessions -------------------------------------------------------

/** Newest device sessions kept per member; older ones are dropped. */
export const MAX_SESSIONS_PER_MEMBER = 10;

async function createMemberSession(tx: Tx, memberId: string): Promise<string> {
  const token = createToken();
  await tx.insert(memberSessions).values({ memberId, tokenHash: hashToken(token) });
  const keep = tx
    .select({ id: memberSessions.id })
    .from(memberSessions)
    .where(eq(memberSessions.memberId, memberId))
    .orderBy(desc(memberSessions.createdAt))
    .limit(MAX_SESSIONS_PER_MEMBER);
  await tx
    .delete(memberSessions)
    .where(and(eq(memberSessions.memberId, memberId), notInArray(memberSessions.id, keep)));
  return token;
}

// --- Coming back -----------------------------------------------------------

export const COME_BACK_FAILED = "Mali ang pangalan o PIN";

/** One failure shape for every reason; callers show COME_BACK_FAILED. */
export type ComeBackResult = { ok: true; memberId: string; token: string } | { ok: false };

/**
 * Name + PIN → a new device token for that member. Works in any group
 * status (only new joins close at the draw).
 */
export async function comeBack(slug: string, rawName: string, pin: string, now = new Date()): Promise<ComeBackResult> {
  const name = normalizeDisplayName(rawName);
  if (!isValidSlug(slug) || !name || !isWellFormedPin(pin)) {
    await burnPinCheck(pin);
    return { ok: false };
  }

  const [candidate] = await db()
    .select({ id: members.id })
    .from(members)
    .innerJoin(groups, eq(groups.id, members.groupId))
    .where(and(eq(groups.slug, slug), isNull(members.removedAt), sql`lower(${members.displayName}) = lower(${name})`))
    .limit(1);
  if (!candidate) {
    await burnPinCheck(pin);
    return { ok: false };
  }

  // Lock the member row so parallel guesses are counted one by one.
  return db().transaction(async (tx): Promise<ComeBackResult> => {
    const [m] = await tx
      .select({
        pinHash: members.pinHash,
        failedAttempts: members.pinFailedAttempts,
        lockedUntil: members.pinLockedUntil,
        lockedAt: members.pinLockedAt,
        removedAt: members.removedAt,
      })
      .from(members)
      .where(eq(members.id, candidate.id))
      .for("update")
      .limit(1);
    if (!m || m.removedAt || !m.pinHash || pinLockStatus(m, now) !== "open") {
      await burnPinCheck(pin);
      return { ok: false };
    }

    if (!(await verifyPin(pin, m.pinHash))) {
      const next = afterWrongPin(m, now);
      await tx
        .update(members)
        .set({ pinFailedAttempts: next.failedAttempts, pinLockedUntil: next.lockedUntil, pinLockedAt: next.lockedAt })
        .where(eq(members.id, candidate.id));
      return { ok: false };
    }

    if (m.failedAttempts > 0 || m.lockedUntil) {
      await tx
        .update(members)
        .set(PIN_UNLOCKED_COLUMNS)
        .where(eq(members.id, candidate.id));
    }
    const token = await createMemberSession(tx, candidate.id);
    return { ok: true, memberId: candidate.id, token };
  });
}

// --- Setting, unlocking ----------------------------------------------------

/** Columns that clear a lock and the wrong-try count. */
export const PIN_UNLOCKED_COLUMNS = { pinFailedAttempts: 0, pinLockedUntil: null, pinLockedAt: null } as const;

/**
 * "Mag-set ng PIN" on /me, for a member who has none (joined before PINs,
 * or the organizer reset it). Never overwrites an existing PIN.
 */
export async function setOwnPin(memberId: string, pin: string): Promise<boolean> {
  const pinHash = await hashPin(pin);
  const rows = await db()
    .update(members)
    .set({ pinHash, ...PIN_UNLOCKED_COLUMNS })
    .where(and(eq(members.id, memberId), isNull(members.pinHash), isNull(members.removedAt)))
    .returning({ id: members.id });
  return rows.length === 1;
}

/** Organizer: lifts a lock and resets the wrong-try count. */
export async function unlockMemberPin(groupId: string, memberId: string): Promise<boolean> {
  const rows = await db()
    .update(members)
    .set(PIN_UNLOCKED_COLUMNS)
    .where(and(eq(members.id, memberId), eq(members.groupId, groupId), isNull(members.removedAt)))
    .returning({ id: members.id });
  return rows.length === 1;
}
