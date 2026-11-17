/**
 * Vercel Cron: Vercel calls the job's path with `Authorization: Bearer
 * <CRON_SECRET>` when the CRON_SECRET environment variable is set. Without
 * a secret every call is refused, so the route can't be triggered by
 * anyone else (or at all, until it's configured).
 */
import { createHash, timingSafeEqual } from "node:crypto";

/** Shortest secret accepted; a short one is refused like a missing one. */
export const CRON_SECRET_MIN_LENGTH = 16;

/** True if the Authorization header carries the cron secret. Pure. */
export function isCronAuthorized(authorization: string | null, secret: string | undefined): boolean {
  const expected = secret?.trim();
  if (!expected || expected.length < CRON_SECRET_MIN_LENGTH || !authorization) return false;
  // Compare digests so the lengths match and the timing says nothing.
  const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();
  return timingSafeEqual(digest(authorization), digest(`Bearer ${expected}`));
}
