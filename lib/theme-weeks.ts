/**
 * Theme week date math. Pure and shared by the create form (live preview)
 * and the server (which recomputes dates and never trusts the client).
 *
 * Dates are calendar dates ("YYYY-MM-DD") in the group's timezone. Math is
 * done in UTC on purpose so daylight saving or the server's timezone can't
 * shift a day.
 */

export const SAMPLE_THEMES = [
  "Something soft",
  "Something sweet",
  "Something red",
  "Something you can use",
] as const;

export const MAX_THEMES = 8;
export const DEFAULT_TIMEZONE = "Asia/Manila";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date like "2026-12-19" (rejects "2026-02-30"). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

/** Adds (or subtracts) whole days to a "YYYY-MM-DD" date. */
export function addDays(date: string, days: number): string {
  if (!isIsoDate(date)) throw new RangeError(`Not a date: ${date}`);
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Start dates for `count` theme weeks, one week apart, ending the week
 * before the party. Party Dec 19 with 4 themes → Nov 21, Nov 28, Dec 5, Dec 12.
 */
export function themeStartDates(partyDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(partyDate, -7 * (count - i)));
}

/** Today's date ("YYYY-MM-DD") in a timezone. */
export function todayIn(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "Nov 28" (or "Nov 28, 2027" when `withYear`). */
export function formatShortDate(date: string, withYear = false): string {
  if (!isIsoDate(date)) return "";
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Where a theme week is on a given day. */
export type ThemeWeekState = "past" | "current" | "upcoming";

/**
 * Each week's state on `today`. A week runs until the next one starts (the
 * last one for 7 days). "past" weeks are over: nobody joining now sees them.
 */
export function themeWeekStates(startDates: readonly string[], today: string): ThemeWeekState[] {
  return startDates.map((start, i) => {
    const end = startDates[i + 1] ?? addDays(start, 7);
    if (today >= end) return "past";
    return today >= start ? "current" : "upcoming";
  });
}

/** Short tags for the states, shown next to a week's date. */
export const THEME_WEEK_TAG: Record<ThemeWeekState, string | null> = {
  past: "Tapos na",
  current: "Ngayong linggo",
  upcoming: null,
};

/**
 * The warning when some weeks would already be over on the day the group
 * starts (weeks count back from the party, so adding one moves Week 1
 * earlier). Null when every week is still ahead or running.
 */
export function pastWeeksWarning(states: readonly ThemeWeekState[]): string | null {
  const past = states.filter((s) => s === "past").length;
  if (past === 0) return null;
  const count = past === 1 ? "1 theme" : `${past} themes`;
  return `${count} ang tapos na bago pa magsimula, kaya walang makakakita. Bawasan ang weeks para magsimula sa linggong ito.`;
}
