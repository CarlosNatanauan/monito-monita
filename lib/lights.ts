/**
 * Progress lights for any group size (docs/DESIGN.md, "The lights").
 *
 * Up to MAX_BULBS members: one bulb each. Bigger groups: each bulb stands
 * for a share of members (`perBulb`), so the string never grows past
 * MAX_BULBS. The text count next to the lights always stays exact; the
 * bulbs are only a picture of it. Pure, unit tested.
 */

export type BulbState = "off" | "on" | "glow";

export interface LightsPlan {
  states: BulbState[];
  /** Members per bulb: 1 up to MAX_BULBS members, more above. */
  perBulb: number;
}

export const MAX_BULBS = 60;
/** At most this many bulbs on one wire; more wrap onto balanced rows. */
export const MAX_PER_ROW = 30;

/** How many bulbs to draw for `total` members, and how many members each stands for. */
export function bulbScale(total: number): { bulbs: number; perBulb: number } {
  if (total <= 0) return { bulbs: 0, perBulb: 1 };
  if (total <= MAX_BULBS) return { bulbs: total, perBulb: 1 };
  const perBulb = Math.ceil(total / MAX_BULBS);
  return { bulbs: Math.ceil(total / perBulb), perBulb };
}

/**
 * How many of `bulbs` to light for `done` of `total`: proportional, but
 * never 0 once someone is done and never all until everyone is.
 */
export function litBulbs(done: number, total: number, bulbs: number): number {
  if (total <= 0 || bulbs <= 0 || done <= 0) return 0;
  if (done >= total) return bulbs;
  const lit = Math.floor((done * bulbs) / total);
  return Math.min(bulbs - 1, Math.max(1, lit));
}

/** Join progress: every bulb on, the newest one lit pale with rays. */
export function joinStates(count: number): LightsPlan {
  const { bulbs, perBulb } = bulbScale(count);
  return { perBulb, states: Array.from({ length: bulbs }, (_, i) => (i === bulbs - 1 ? "glow" : "on")) };
}

/** After the draw: on = opened, off = not yet, the most recent opened is the newest (pale, with rays). */
export function openedStates(opened: number, total: number): LightsPlan {
  const { bulbs, perBulb } = bulbScale(total);
  const lit = litBulbs(opened, total, bulbs);
  return {
    perBulb,
    states: Array.from({ length: bulbs }, (_, i) => (i < lit ? (i === lit - 1 ? "glow" : "on") : "off")),
  };
}

/** Splits bulbs into rows of at most MAX_PER_ROW, as even as possible (31 → 16 + 15). */
export function bulbRows<T>(items: T[], maxPerRow: number = MAX_PER_ROW): T[][] {
  if (items.length === 0) return [];
  const rows = Math.ceil(items.length / maxPerRow);
  const perRow = Math.ceil(items.length / rows);
  return Array.from({ length: rows }, (_, r) => items.slice(r * perRow, (r + 1) * perRow));
}
