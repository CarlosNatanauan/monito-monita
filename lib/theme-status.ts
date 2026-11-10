/**
 * "What's the theme this week?" Pure, and based on calendar dates in the
 * GROUP's timezone. Callers pass `today` from todayIn(group.timezone),
 * never the server's own date (Vercel runs in UTC, 8 hours behind Manila).
 */
import { formatPartyDate, formatPeso } from "./format";
import { addDays, isIsoDate } from "./theme-weeks";

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

export interface ThemeText {
  /** Big line, e.g. "Ngayong linggo: Something soft" */
  headline: string;
  /** English helper, e.g. "This week: Something soft" */
  english: string;
  /** What's next and when. */
  detail: string;
}

/** Short Taglish copy for a theme status (used on /me and the GC reminder). */
export function describeThemeStatus(status: ThemeStatus, budget: number): ThemeText {
  const party = (date: string) => formatPartyDate(date);
  switch (status.kind) {
    case "current":
      return {
        headline: `Ngayong linggo: ${status.current.title}`,
        english: `This week: ${status.current.title} · Budget ${formatPeso(budget)}`,
        detail: status.next
          ? `Next: ${status.next.title}, simula ${party(status.next.startDate)}`
          : `Next: party na sa ${party(status.partyDate)} 🎉`,
      };
    case "before":
      return {
        headline: `Unang theme: ${status.first.title}`,
        english: `First theme: ${status.first.title} · Budget ${formatPeso(budget)}`,
        detail: `Magsisimula ${inDays(status.daysToStart)}, ${party(status.first.startDate)}`,
      };
    case "after":
      return {
        headline: "Tapos na ang theme weeks!",
        english: `Themes are done · Budget ${formatPeso(budget)}`,
        detail: `Party na ${inDays(status.daysToParty)}: ${party(status.partyDate)} 🎉`,
      };
    case "none":
      return {
        headline: `Party: ${party(status.partyDate)}`,
        english: `Budget ${formatPeso(budget)}`,
        detail: `Party na ${inDays(status.daysToParty)} 🎉`,
      };
    case "party":
      return status.isToday
        ? { headline: "Party na ngayon! 🎉", english: "It's party day!", detail: "Enjoy, at sana magustuhan ng monito mo ang regalo mo!" }
        : { headline: "Tapos na ang party.", english: "The party is over.", detail: "Salamat sa paglalaro ng Monito Monita!" };
  }
}
