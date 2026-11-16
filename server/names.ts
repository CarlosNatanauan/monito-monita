/**
 * Display names: how they're cleaned up and when two count as the same.
 * Used by joining (no two active members share a name) and by coming back
 * with name + PIN (the name finds the member).
 */

export const NAME_MAX = 40;

/** Trims and collapses whitespace so "  Joy   Cruz " and "Joy Cruz" match. */
export function normalizeDisplayName(raw: string): string {
  return raw.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** True if two names count as the same person's name (case-insensitive). */
export function isSameName(a: string, b: string): boolean {
  return normalizeDisplayName(a).toLowerCase() === normalizeDisplayName(b).toLowerCase();
}

/**
 * Honorifics people add to their name when joining, then forget days later
 * ("Kuya Ben", "Tita Nena"). Only at the start, and only before another word.
 */
const HONORIFIC = /^(?:kuya|ate|tita|tito|sir|ma['’]?am|mam)\.?\s+(?=\S)/iu;

/** "Kuya Ben" → "Ben". A name that is only an honorific is kept as is. */
export function withoutHonorific(raw: string): string {
  return normalizeDisplayName(raw).replace(HONORIFIC, "");
}

/**
 * The member a typed name points to, for coming back with name + PIN:
 * the exact name (case/space-insensitive) first; otherwise the one member
 * whose name matches with a leading Kuya, Ate, Tita, Tito, Sir or Ma'am
 * left off on either side. Two or more such members → null (the caller
 * fails the same way as for an unknown name).
 */
export function findByDisplayName<T extends { displayName: string }>(candidates: readonly T[], typed: string): T | null {
  const name = normalizeDisplayName(typed);
  if (!name) return null;
  const exact = candidates.find((c) => isSameName(c.displayName, name));
  if (exact) return exact;
  const base = withoutHonorific(name).toLowerCase();
  const loose = candidates.filter((c) => withoutHonorific(c.displayName).toLowerCase() === base);
  return loose.length === 1 ? loose[0] : null;
}
