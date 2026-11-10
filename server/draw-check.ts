/**
 * Draw feasibility and plain-language messages. Pure (no I/O).
 */
import { drawLoop, type DrawFailure, type Exclusion, type MemberId } from "./draw";

/** The app needs at least 3 people for a fun loop (2 would just swap). */
export const MIN_MEMBERS_TO_DRAW = 3;

export interface DrawMember {
  id: MemberId;
  displayName: string;
}

export type Feasibility =
  | { status: "ok" }
  | { status: "too_few"; message: string }
  | { status: "impossible"; message: string; stuckMemberIds: MemberId[] };

export const TOO_FEW_MESSAGE = `Kailangan ng at least ${MIN_MEMBERS_TO_DRAW} members para mag-draw.`;

/** "Joy", "Joy at Ben", "Joy, Ben at Marco" */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} at ${names[names.length - 1]}`;
}

/** Turns a draw failure into short Taglish an organizer can act on. */
export function describeDrawFailure(failure: DrawFailure, nameOf: (id: MemberId) => string): string {
  switch (failure.reason) {
    case "TOO_FEW_MEMBERS":
      return TOO_FEW_MESSAGE;
    case "INVALID_INPUT":
      return "May problema sa listahan ng members. I-refresh ang page at subukan ulit.";
    case "IMPOSSIBLE":
      if (failure.stuckMembers.length === 1) {
        return `Masyadong maraming bawal kay ${nameOf(failure.stuckMembers[0])}. Tanggalin ang isa sa mga pair niya.`;
      }
      if (failure.stuckMembers.length > 1) {
        return `Masyadong maraming bawal kina ${listNames(failure.stuckMembers.map(nameOf))}. Tanggalin ang ilan sa mga pair nila.`;
      }
      if (failure.blockingExclusions.length > 0) {
        return "Nahahati ang group dahil sa mga bawal, kaya hindi mabuo ang bunutan. Tanggalin ang ilang pair.";
      }
      return "Masyadong maraming bawal para mabuo ang bunutan. Tanggalin ang ilang pair.";
    case "SEARCH_LIMIT":
      return "Masyadong maraming bawal para mabuo ang bunutan. Tanggalin ang ilang pair.";
  }
}

/**
 * Can these members be drawn with these exclusions? Uses the real draw
 * algorithm, so the answer always matches what "Draw names" will do.
 */
export function checkDrawFeasibility(members: DrawMember[], exclusions: Exclusion[]): Feasibility {
  if (members.length < MIN_MEMBERS_TO_DRAW) return { status: "too_few", message: TOO_FEW_MESSAGE };
  const result = drawLoop(
    members.map((m) => m.id),
    exclusions,
  );
  if (result.ok) return { status: "ok" };
  const names = new Map(members.map((m) => [m.id, m.displayName]));
  return {
    status: "impossible",
    message: describeDrawFailure(result, (id) => names.get(id) ?? "isang member"),
    stuckMemberIds: result.stuckMembers,
  };
}
