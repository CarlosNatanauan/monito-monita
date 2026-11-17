/**
 * Identity without accounts (docs/TECH.md "Identity without accounts").
 *
 * - Tokens: 32 random bytes, base64url. Only a SHA-256 hash is stored.
 *   (A fast hash is fine here: tokens are high-entropy random values, not
 *   passwords, so brute-forcing a hash is not feasible.)
 * - One httpOnly cookie per group and role (member / organizer), scoped to
 *   that group's path (/g/<slug>), valid ~90 days.
 * - Personal links (/g/<slug>/me?t=TOKEN, /g/<slug>/admin?t=TOKEN) are
 *   swapped for the cookie in proxy.ts, then redirected to the clean URL.
 * - A member's token is either their original one (members.token_hash) or
 *   a device session from coming back with name + PIN (member_sessions).
 *   Both work the same everywhere, including as a personal link.
 *
 * Pure helpers are at the top (unit tested); request helpers that read
 * cookies or the database are at the bottom.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "./db";
import { groups, members, memberSessions } from "./db/schema";

export type Role = "member" | "organizer";

export const TOKEN_BYTES = 32;
/** base64url of 32 bytes is always 43 characters. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HASH_PATTERN = /^[0-9a-f]{64}$/;
const SLUG_PATTERN = /^[a-z0-9]{6,32}$/;

export const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // ~90 days

// --- Pure helpers -------------------------------------------------------

/** A new random secret token (URL-safe). */
export function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** True if the string has the exact shape of a token we issued. */
export function isWellFormedToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_PATTERN.test(token);
}

/** SHA-256 hex digest of a token. This is what the database stores. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time check that `token` hashes to `storedHash`. */
export function tokenMatchesHash(token: string, storedHash: string): boolean {
  if (!isWellFormedToken(token) || !HASH_PATTERN.test(storedHash)) return false;
  const actual = createHash("sha256").update(token, "utf8").digest();
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && SLUG_PATTERN.test(slug);
}

/** Cookie name for a group and role, e.g. `mm_o_k3x9...`. */
export function authCookieName(role: Role, slug: string): string {
  if (!isValidSlug(slug)) throw new Error("Invalid group slug");
  return `mm_${role === "organizer" ? "o" : "m"}_${slug}`;
}

export interface AuthCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
}

/**
 * Cookie options. `secure` is relaxed only in `next dev`, so the app can be
 * tested from a phone on the local network over plain http.
 */
export function authCookieOptions(slug: string, maxAge = COOKIE_MAX_AGE_SECONDS): AuthCookieOptions {
  if (!isValidSlug(slug)) throw new Error("Invalid group slug");
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: `/g/${slug}`,
    maxAge,
  };
}

/**
 * A device logged in as one member opened another member's link. That
 * link's token waits here (httpOnly, 10 minutes) until they confirm the
 * switch on /me, so it never goes back into the URL.
 */
export function pendingSwitchCookieName(slug: string): string {
  if (!isValidSlug(slug)) throw new Error("Invalid group slug");
  return `mm_sw_${slug}`;
}
export const PENDING_SWITCH_MAX_AGE_SECONDS = 10 * 60;

/** Path of a personal link that carries a token (swapped for a cookie on visit). */
export function personalLinkPath(role: Role, slug: string, token: string): string {
  if (!isValidSlug(slug)) throw new Error("Invalid group slug");
  return `/g/${slug}/${role === "organizer" ? "admin" : "me"}?t=${encodeURIComponent(token)}`;
}

/** Parses `/g/<slug>/me` or `/g/<slug>/admin` into role and slug. */
export function parsePersonalLinkPath(pathname: string): { role: Role; slug: string } | null {
  const match = /^\/g\/([^/]+)\/(me|admin)\/?$/.exec(pathname);
  if (!match || !isValidSlug(match[1])) return null;
  return { role: match[2] === "admin" ? "organizer" : "member", slug: match[1] };
}

// --- Database lookups -----------------------------------------------------

export interface CurrentMember {
  id: string;
  groupId: string;
  displayName: string;
  codename: string;
  /** False until they set a name + PIN (older members, or after a reset). */
  hasPin: boolean;
}

export interface CurrentOrganizer {
  groupId: string;
  slug: string;
}

/** Matches a member's original token or one of their device sessions. */
function memberTokenQuery(slug: string, token: string, removed: boolean) {
  const hash = hashToken(token);
  return db()
    .select({
      id: members.id,
      groupId: members.groupId,
      displayName: members.displayName,
      codename: members.codename,
      hasPin: sql<boolean>`${members.pinHash} is not null`,
      tokenHash: members.tokenHash,
      sessionHash: memberSessions.tokenHash,
    })
    .from(members)
    .innerJoin(groups, eq(groups.id, members.groupId))
    .leftJoin(memberSessions, and(eq(memberSessions.memberId, members.id), eq(memberSessions.tokenHash, hash)))
    .where(
      and(
        eq(groups.slug, slug),
        removed ? isNotNull(members.removedAt) : isNull(members.removedAt),
        or(eq(members.tokenHash, hash), eq(memberSessions.tokenHash, hash)),
      ),
    )
    .limit(1);
}

function rowMatches(token: string, row: { tokenHash: string; sessionHash: string | null }): boolean {
  return tokenMatchesHash(token, row.tokenHash) || (row.sessionHash !== null && tokenMatchesHash(token, row.sessionHash));
}

/** The active (not removed) member of the group `slug` holding `token`. */
export async function findMemberByToken(slug: string, token: string): Promise<CurrentMember | null> {
  if (!isValidSlug(slug) || !isWellFormedToken(token)) return null;
  const [row] = await memberTokenQuery(slug, token, false);
  if (!row || !rowMatches(token, row)) return null;
  return {
    id: row.id,
    groupId: row.groupId,
    displayName: row.displayName,
    codename: row.codename,
    hasPin: Boolean(row.hasPin),
  };
}

/** The group `slug`, if `token` is its organizer token. */
export async function findOrganizerByToken(slug: string, token: string): Promise<CurrentOrganizer | null> {
  if (!isValidSlug(slug) || !isWellFormedToken(token)) return null;
  const [row] = await db()
    .select({ id: groups.id, slug: groups.slug, organizerTokenHash: groups.organizerTokenHash })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);
  if (!row || !tokenMatchesHash(token, row.organizerTokenHash)) return null;
  return { groupId: row.id, slug: row.slug };
}

/** True if `token` is a valid member or organizer token for group `slug`. */
export async function isValidLinkToken(role: Role, slug: string, token: string): Promise<boolean> {
  return role === "organizer"
    ? (await findOrganizerByToken(slug, token)) !== null
    : (await findMemberByToken(slug, token)) !== null;
}

// --- Request helpers (Server Components, Server Actions, Route Handlers) --
// Reading cookies makes a route dynamic: with Cache Components on, call
// these inside a <Suspense> boundary. Setting/clearing only works in a
// Server Action or Route Handler.

/** The member viewing group `slug`, from their cookie. */
export async function getCurrentMember(slug: string): Promise<CurrentMember | null> {
  if (!isValidSlug(slug)) return null;
  const token = (await cookies()).get(authCookieName("member", slug))?.value;
  return token ? findMemberByToken(slug, token) : null;
}

/** The organizer of group `slug`, from their cookie. */
export async function getCurrentOrganizer(slug: string): Promise<CurrentOrganizer | null> {
  if (!isValidSlug(slug)) return null;
  const token = (await cookies()).get(authCookieName("organizer", slug))?.value;
  return token ? findOrganizerByToken(slug, token) : null;
}

/** True if `token` belonged to a member of group `slug` who was removed. */
export async function isRemovedMemberToken(slug: string, token: string): Promise<boolean> {
  if (!isValidSlug(slug) || !isWellFormedToken(token)) return false;
  const [row] = await memberTokenQuery(slug, token, true);
  return row !== undefined && rowMatches(token, row);
}

export type MemberSession =
  | { kind: "member"; member: CurrentMember }
  | { kind: "removed" } // this device's member was removed by the organizer
  | { kind: "stale" } // a cookie whose link no longer works (the organizer issued a new one)
  | { kind: "none" };

/** Who this device is in group `slug`: an active member, a removed one, or nobody. */
export async function getMemberSession(slug: string): Promise<MemberSession> {
  if (!isValidSlug(slug)) return { kind: "none" };
  const token = (await cookies()).get(authCookieName("member", slug))?.value;
  if (!token) return { kind: "none" };
  const member = await findMemberByToken(slug, token);
  if (member) return { kind: "member", member };
  if (await isRemovedMemberToken(slug, token)) return { kind: "removed" };
  return isWellFormedToken(token) ? { kind: "stale" } : { kind: "none" };
}

/**
 * True if this browser has a member or organizer cookie for `slug`. When
 * the group itself is gone, that means it was a demo this browser had
 * (only demo groups are ever deleted): the page says the demo is over
 * instead of a bare "not found".
 */
export async function hasGroupCookie(slug: string): Promise<boolean> {
  if (!isValidSlug(slug)) return false;
  const jar = await cookies();
  return jar.has(authCookieName("member", slug)) || jar.has(authCookieName("organizer", slug));
}

/**
 * The raw token in the viewer's own cookie, used to show them their
 * personal link again (the database only has the hash). Verify the
 * viewer first with getCurrentMember / getCurrentOrganizer.
 */
export async function getOwnToken(role: Role, slug: string): Promise<string | null> {
  if (!isValidSlug(slug)) return null;
  const token = (await cookies()).get(authCookieName(role, slug))?.value;
  return isWellFormedToken(token) ? token : null;
}

/** Stores a member or organizer token in its group cookie. */
export async function setAuthCookie(role: Role, slug: string, token: string): Promise<void> {
  if (!isWellFormedToken(token)) throw new Error("Invalid token");
  (await cookies()).set(authCookieName(role, slug), token, authCookieOptions(slug));
}

/** Removes a member or organizer cookie for a group. */
export async function clearAuthCookie(role: Role, slug: string): Promise<void> {
  (await cookies()).set(authCookieName(role, slug), "", authCookieOptions(slug, 0));
}

// --- Reissued links and switching members on one device ------------------

/**
 * A personal link was used on a device (its cookie was set). If it's a
 * reissued link that hadn't been used yet, the organizer's list now shows
 * "New link · opened".
 */
export async function markLinkOpened(memberId: string): Promise<void> {
  await db()
    .update(members)
    .set({ linkOpenedAt: new Date() })
    .where(and(eq(members.id, memberId), isNotNull(members.linkReissuedAt), isNull(members.linkOpenedAt)));
}

export interface PendingSwitch {
  current: { id: string; displayName: string };
  other: { id: string; displayName: string };
}

/**
 * The switch waiting for confirmation on /me: this device is logged in as
 * `current` and opened `other`'s personal link. Null if there's nothing to
 * confirm (no pending link, it's no longer valid, or it's the same person).
 */
export async function getPendingSwitch(slug: string): Promise<PendingSwitch | null> {
  if (!isValidSlug(slug)) return null;
  const jar = await cookies();
  const pendingToken = jar.get(pendingSwitchCookieName(slug))?.value;
  const currentToken = jar.get(authCookieName("member", slug))?.value;
  if (!pendingToken || !currentToken) return null;
  const [current, other] = await Promise.all([
    findMemberByToken(slug, currentToken),
    findMemberByToken(slug, pendingToken),
  ]);
  if (!current || !other || current.id === other.id) return null;
  return {
    current: { id: current.id, displayName: current.displayName },
    other: { id: other.id, displayName: other.displayName },
  };
}

/** The raw token waiting in the pending-switch cookie (Server Actions only). */
export async function getPendingSwitchToken(slug: string): Promise<string | null> {
  if (!isValidSlug(slug)) return null;
  const token = (await cookies()).get(pendingSwitchCookieName(slug))?.value;
  return isWellFormedToken(token) ? token : null;
}

export async function clearPendingSwitch(slug: string): Promise<void> {
  (await cookies()).set(pendingSwitchCookieName(slug), "", authCookieOptions(slug, 0));
}
