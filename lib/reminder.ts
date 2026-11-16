/**
 * "Copy reminder for GC": a ready-to-paste message for the group chat.
 * Pure; the organizer page passes the data and the share link.
 */
import { formatPartyDate, formatPeso } from "./format";
import type { ThemeStatus } from "./theme-status";

/** After the draw: announce it ("drawn"), or the weekly theme nudge ("theme"). */
export type ReminderKind = "drawn" | "theme";

export interface ReminderInput {
  groupName: string;
  status: "OPEN" | "DRAWN" | "REVEALING" | "REVEALED";
  /** After the draw only. Defaults to "theme". */
  kind?: ReminderKind;
  shareUrl: string;
  memberCount: number;
  /** "" while not picked yet (the create form's live preview): shows a dash. */
  partyDate: string;
  /** null while not typed yet (the create form's live preview): shows a dash. */
  budget: number | null;
  theme: ThemeStatus;
}

const NOT_YET = "—";

function themeLine(theme: ThemeStatus): string | null {
  switch (theme.kind) {
    case "current":
      return `✨ Ngayong linggo: ${theme.current.title}`;
    case "before":
      return `✨ Unang theme: ${theme.first.title}, simula ${formatPartyDate(theme.first.startDate)}`;
    case "after":
      return "✨ Tapos na ang theme weeks, party na lang!";
    case "party":
      return theme.isToday ? "🎉 Party na ngayon!" : null;
    case "none":
      return null;
  }
}

/**
 * After the draw the share link opens "Tapos na ang bunutan" with one big
 * "Bumalik sa slip ko" button, so it's safe in the GC and it's the way back
 * for whoever lost their personal link (persona test C6).
 */
function lostLinkLines(shareUrl: string): string[] {
  if (!shareUrl) return [];
  return ["", "Nawala ang link mo? Buksan 'to tapos i-tap ang \"Bumalik sa slip ko\":", `👉 ${shareUrl}`];
}

export function buildGcReminder(input: ReminderInput): string {
  const party = input.partyDate ? formatPartyDate(input.partyDate) : NOT_YET;
  const budget = input.budget === null ? `₱${NOT_YET}` : formatPeso(input.budget);

  if (input.status === "OPEN") {
    const joined =
      input.memberCount === 0
        ? "Wala pang sumali, ikaw na ang una!"
        : `${input.memberCount} na ang sumali.`;
    return [
      `🎁 Monito Monita: ${input.groupName}`,
      "",
      "Sali na sa exchange gift natin! 🎄",
      `👉 ${input.shareUrl}`,
      "",
      `${joined} Party: ${party} 🎉`,
      `Budget: ${budget}`,
    ].join("\n");
  }

  if (input.kind === "drawn") {
    return [
      `🎁 ${input.groupName}`,
      "",
      "Na-draw na! Buksan ang personal link mo para makita ang monito mo 🎁",
      ...lostLinkLines(input.shareUrl),
      "",
      `🎉 Party: ${party}`,
      `💸 Budget: ${budget}`,
    ].join("\n");
  }

  const theme = themeLine(input.theme);
  return [
    `🎁 ${input.groupName} reminder!`,
    "",
    ...(theme ? [theme] : []),
    `💸 Budget: ${budget}`,
    `🎉 Party: ${party}`,
    "",
    "Na-update n'yo na ba ang wishlist n'yo? Buksan ang personal link n'yo para hindi mahirapan ang monito n'yo 😉",
    ...lostLinkLines(input.shareUrl),
  ].join("\n");
}

/**
 * "Most members have opened their slip": more than half of everyone with a
 * monito. Until then, the organizer page leads with the "Na-draw na!" steps.
 */
export function mostHaveOpened({ opened, total }: { opened: number; total: number }): boolean {
  return total > 0 && opened * 2 > total;
}

/**
 * The create form's live preview: the weekly theme reminder as it will
 * read in week 1, from what has been typed so far. Blank fields show a
 * dash; the group name falls back to a sample.
 */
export function buildThemePreview(input: {
  groupName: string;
  budget: number | null;
  partyDate: string;
  themes: string[];
}): string {
  const first = input.themes.map((t) => t.trim()).find(Boolean);
  const theme: ThemeStatus = first
    ? { kind: "current", current: { title: first, startDate: "" }, next: null, partyDate: input.partyDate, daysToParty: 0 }
    : { kind: "none", partyDate: input.partyDate, daysToParty: 0 };
  return buildGcReminder({
    groupName: input.groupName.trim() || "Barkada Christmas Party",
    status: "DRAWN",
    kind: "theme",
    shareUrl: "",
    memberCount: 0,
    partyDate: input.partyDate,
    budget: input.budget,
    theme,
  });
}
