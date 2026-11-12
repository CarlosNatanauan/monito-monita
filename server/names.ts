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
