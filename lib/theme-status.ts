/**
 * "What's the theme this week?" Pure, and based on calendar dates in the
 * GROUP's timezone. Callers pass `today` from todayIn(group.timezone),
 * never the server's own date (Vercel runs in UTC, 8 hours behind Manila).
 */
import { formatPartyDate, formatPeso } from "./format";
import { addDays, formatShortDate, isIsoDate } from "./theme-weeks";

export interface ThemeWeekInfo {
  title: string;
  startDate: string; // YYYY-MM-DD
}

export type ThemeStatus =
  | { kind: "none"; partyDate: string; daysToParty: number } // no themes, party ahead
  | { kind: "before"; first: ThemeWeekInfo; daysToStart: number; partyDate: string }
  | { kind: "current"; current: ThemeWeekInfo; next: ThemeWeekInfo | null; partyDate: string; daysToParty: number }
  | { kind: "after"; partyDate: string; daysToParty: number } // last theme week is over, party ahead
  | { kind: "party"; partyDate: string; isToday: boolean }; // party day, or after

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const toUtc = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
}

export function getThemeStatus(themes: ThemeWeekInfo[], partyDate: string, today: string): ThemeStatus {
  if (!isIsoDate(today) || !isIsoDate(partyDate)) throw new RangeError("Dates must be YYYY-MM-DD");
  if (today >= partyDate) return { kind: "party", partyDate, isToday: today === partyDate };

  const sorted = [...themes].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const daysToParty = daysBetween(today, partyDate);
  if (sorted.length === 0) return { kind: "none", partyDate, daysToParty };
  if (today < sorted[0].startDate) {
    return { kind: "before", first: sorted[0], daysToStart: daysBetween(today, sorted[0].startDate), partyDate };
  }

  // The latest theme that has started is this week's.
  let index = 0;
  for (let i = 0; i < sorted.length; i++) if (sorted[i].startDate <= today) index = i;
  const current = sorted[index];
  const next = sorted[index + 1] ?? null;
  // A theme week lasts 7 days (or until the next theme starts).
  if (!next && today >= addDays(current.startDate, 7)) return { kind: "after", partyDate, daysToParty };
  return { kind: "current", current, next, partyDate, daysToParty };
}

/** "ngayon", "bukas", "sa 5 araw" */
export function inDays(days: number): string {
  if (days <= 0) return "ngayon";
  if (days === 1) return "bukas";
  return `sa ${days} araw`;
}

export interface ThemeCardText {
  /** Small gold label, e.g. "Ngayong linggo" */
  label: string;
  /** The big serif line, e.g. "Something soft" */
  title: string;
  /** One line under it, e.g. "Week 1 of 3 · hanggang ₱500" */
  detail: string;
}

/**
 * Short Taglish copy for the theme card on /me. `themes` is the group's
 * full list, for "Week 2 of 3".
 */
export function themeCard(status: ThemeStatus, themes: ThemeWeekInfo[], budget: number): ThemeCardText {
  const upTo = `hanggang ${formatPeso(budget)}`;
  const party = (date: string) => formatPartyDate(date);
  switch (status.kind) {
    case "current": {
      const sorted = [...themes].sort((a, b) => a.startDate.localeCompare(b.startDate));
      const week = sorted.findIndex((t) => t.startDate === status.current.startDate) + 1;
      return {
        label: "Ngayong linggo",
        title: status.current.title,
        detail: `Week ${week} of ${sorted.length} · ${upTo}`,
      };
    }
    case "before":
      return {
        label: "Unang theme",
        title: status.first.title,
        detail: `Simula ${inDays(status.daysToStart)}, ${formatShortDate(status.first.startDate)} · ${upTo}`,
      };
    case "after":
      return { label: "Tapos na ang theme weeks", title: "Party na!", detail: `${party(status.partyDate)} · ${upTo}` };
    case "none":
      return { label: "Walang theme", title: "Kahit ano!", detail: `Party ${inDays(status.daysToParty)} · ${upTo}` };
    case "party":
      return status.isToday
        ? { label: "Ngayon na", title: "Party na!", detail: "Sana magustuhan ng monito mo ang regalo mo." }
        : { label: "Tapos na", title: "Salamat!", detail: "Salamat sa paglalaro ng Monito Monita." };
  }
}
