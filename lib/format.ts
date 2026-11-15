/** Display formatting shared by server and client components. */
import { isIsoDate } from "./theme-weeks";

/** "₱1,500" */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

/** "Sat, Dec 19, 2026" for a calendar date. */
export function formatPartyDate(date: string): string {
  if (!isIsoDate(date)) return date;
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Sat, Dec 19" for a calendar date (gift tags where the year is plain). */
export function formatPartyDay(date: string): string {
  if (!isIsoDate(date)) return date;
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** "Nov 10, 3:42 PM" in the group's timezone. */
export function formatJoinedAt(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
}

/** "1 na ang sumali" / "12 na ang sumali" */
export function joinedCount(n: number): string {
  return n === 0 ? "Wala pang sumali" : `${n} na ang sumali`;
}
