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
  partyDate: string;
  budget: number;
  theme: ThemeStatus;
}

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

export function buildGcReminder(input: ReminderInput): string {
  const party = formatPartyDate(input.partyDate);

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
      `Budget: ${formatPeso(input.budget)}`,
    ].join("\n");
  }

  if (input.kind === "drawn") {
    return [
      `🎁 ${input.groupName}`,
      "",
      "Na-draw na! Buksan ang link mo para makita ang monito mo 🎁",
      "",
      `🎉 Party: ${party}`,
      `💸 Budget: ${formatPeso(input.budget)}`,
    ].join("\n");
  }

  const theme = themeLine(input.theme);
  return [
    `🎁 ${input.groupName} reminder!`,
    "",
    ...(theme ? [theme] : []),
    `💸 Budget: ${formatPeso(input.budget)}`,
    `🎉 Party: ${party}`,
    "",
    "Na-update n'yo na ba ang wishlist n'yo? Buksan ang personal link n'yo para hindi mahirapan ang monito n'yo 😉",
  ].join("\n");
}

/**
 * "Most members have opened their slip": more than half of everyone with a
 * monito. Until then, the organizer page leads with the "Na-draw na!" steps.
 */
export function mostHaveOpened({ opened, total }: { opened: number; total: number }): boolean {
  return total > 0 && opened * 2 > total;
}
