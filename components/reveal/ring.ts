/**
 * Reveal ring layout (pure): where each slip and bulb sits on the 1920×1080
 * stage, and what state it's in at a given step. Shared by the stage's
 * render (final states) and its timelines (the in-between).
 *
 * docs/DESIGN.md, "Reveal screen": slips on an outer ellipse in loop order,
 * clockwise from the top; a string of bulbs on an inner ellipse, 4 between
 * each slip and the next (its receiver). Above 16 members, a window of 12
 * slips turns around the current pair, which sits at the bottom.
 */
import {
  isWindowed,
  loopOffset,
  WINDOW_BEFORE,
  WINDOW_FIRST,
  WINDOW_LAST,
  WINDOW_SLOTS,
  type RevealSlip,
} from "@/server/reveal-window";

export const STAGE_W = 1920;
export const STAGE_H = 1080;
const CX = 960;
const CY = 540;
/** Slip centres. Slips stay inside the middle 90% of the frame. */
const RX = 716;
const RY = 396;
/** Bulb centres. */
const BRX = 540;
const BRY = 262;
/** Oval bulbs (docs/design/svg/light-bulbs.svg), 22×30 at 1080p. */
export const BULB_W = 22;
export const BULB_H = 30;

export interface RingGeometry {
  total: number;
  windowed: boolean;
  /** Slots around the ellipse. */
  slots: number;
  /**
   * Bulbs between a slip and the next: 4 from 8 slots up (docs/DESIGN.md);
   * small groups get more, so the string still goes all the way round.
   */
  bulbsPerSegment: number;
  /** Slip size and scale (1 up to 12 slots; smaller for 13–16 so they don't overlap). */
  slipW: number;
  slipH: number;
  slipScale: number;
}

export function ringGeometry(total: number): RingGeometry {
  const windowed = isWindowed(total);
  const slots = windowed ? WINDOW_SLOTS : Math.max(total, 1);
  // Largest size without neighbours touching (scripted check, 16px margin).
  const slipScale = slots <= 12 ? 1 : ({ 13: 0.88, 14: 0.85, 15: 0.82, 16: 0.79 } as Record<number, number>)[slots] ?? 0.79;
  const bulbsPerSegment = slots >= 8 ? 4 : Math.ceil(32 / slots);
  return { total, windowed, slots, bulbsPerSegment, slipW: Math.round(272 * slipScale), slipH: Math.round(128 * slipScale), slipScale };
}

const angleAt = (pos: number, slots: number) => -Math.PI / 2 + (pos * 2 * Math.PI) / slots;

/** Slip centre at a (fractional) slot position. */
export function slipPoint(pos: number, g: RingGeometry): { x: number; y: number } {
  const a = angleAt(pos, g.slots);
  return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) };
}

// Arc length along the bulb ellipse, so bulbs between two slips are evenly
// spaced (equal angles bunch them up at the ellipse's narrow ends).
const ARC_STEPS = 1440;
const arcTable: number[] = (() => {
  const table = [0];
  let prev = { x: BRX * Math.cos(-Math.PI / 2), y: BRY * Math.sin(-Math.PI / 2) };
  for (let i = 1; i <= ARC_STEPS; i++) {
    const a = -Math.PI / 2 + (i / ARC_STEPS) * 2 * Math.PI;
    const p = { x: BRX * Math.cos(a), y: BRY * Math.sin(a) };
    table.push(table[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  return table;
})();
const ARC_TOTAL = arcTable[ARC_STEPS];

/** Arc length from the top to angle `a` (any turn). */
function arcAt(a: number): number {
  const turns = (a + Math.PI / 2) / (2 * Math.PI);
  const whole = Math.floor(turns);
  const i = (turns - whole) * ARC_STEPS;
  const lo = Math.floor(i);
  const hi = Math.min(lo + 1, ARC_STEPS);
  return whole * ARC_TOTAL + arcTable[lo] + (arcTable[hi] - arcTable[lo]) * (i - lo);
}

/** The angle at arc length `s` from the top (any turn). */
function angleAtArc(s: number): number {
  const whole = Math.floor(s / ARC_TOTAL);
  const rest = s - whole * ARC_TOTAL;
  let lo = 0;
  let hi = ARC_STEPS;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arcTable[mid] <= rest) lo = mid;
    else hi = mid;
  }
  const span = arcTable[hi] - arcTable[lo] || 1;
  const i = lo + (rest - arcTable[lo]) / span;
  return -Math.PI / 2 + (whole + i / ARC_STEPS) * 2 * Math.PI;
}

/** Bulb centre at a (fractional) slot position: evenly along the arc between two slots. */
export function bulbPoint(pos: number, g: RingGeometry): { x: number; y: number } {
  const slot = Math.floor(pos);
  const from = arcAt(angleAt(slot, g.slots));
  const to = arcAt(angleAt(slot + 1, g.slots));
  const a = angleAtArc(from + (to - from) * (pos - slot));
  return { x: CX + BRX * Math.cos(a), y: CY + BRY * Math.sin(a) };
}

/**
 * How visible a slip is at a window position. The 12 slots (0..11) are
 * fully visible; beyond them a slip fades over half a slot, so the one
 * leaving and the one entering at the window's seam never show together.
 */
export function windowOpacity(pos: number, g: RingGeometry): number {
  if (!g.windowed) return 1;
  if (pos < 0) return Math.max(0, 1 + 2 * pos);
  if (pos > WINDOW_SLOTS - 1) return Math.max(0, 1 - 2 * (pos - (WINDOW_SLOTS - 1)));
  return 1;
}

/** A segment's bulbs show only when both of its slips do (no bulbs across the window's seam). */
export function segmentOpacity(pos: number, g: RingGeometry): number {
  return windowOpacity(pos, g) * windowOpacity(pos + 1, g);
}

/** Small ±2–3° tilt per slip, fixed by its place in the loop. */
export function slipTilt(index: number): number {
  return [-2.5, 2, -3, 2.5, -2, 3][index % 6];
}

export function slipTransform(pos: number, index: number, g: RingGeometry): string {
  const { x, y } = slipPoint(pos, g);
  return `translate3d(${(x - g.slipW / 2).toFixed(1)}px, ${(y - g.slipH / 2).toFixed(1)}px, 0) rotate(${slipTilt(index)}deg)`;
}

export function bulbTransform(pos: number, g: RingGeometry): string {
  const { x, y } = bulbPoint(pos, g);
  return `translate3d(${(x - BULB_W / 2).toFixed(1)}px, ${(y - BULB_H / 2).toFixed(1)}px, 0)`;
}

export type SlipFace = "blank" | "code" | "revealed";
export type BulbState = "off" | "on" | "glow";

export interface RingSlip {
  index: number;
  pos: number;
  face: SlipFace;
  codename?: string;
  giverName?: string;
  receiverName?: string;
  halo: boolean;
  current: boolean;
}

export interface RingSegment {
  /** The giver slip this segment leaves from. */
  index: number;
  pos: number;
  state: BulbState;
}

export interface RingModel {
  g: RingGeometry;
  slips: RingSlip[];
  segments: RingSegment[];
}

/**
 * Everything on the ring at `step` (0 = before the start; total + finale
 * = after the last pair). `slips` are what the server sent; before the
 * start nothing is sent, so the ring shows blank slips.
 */
export function ringModel(total: number, step: number, slips: RevealSlip[], finale: boolean): RingModel {
  const g = ringGeometry(total);
  const current = Math.max(step, 1) - 1;
  const posOf = (index: number) => (g.windowed ? loopOffset(index, current, total) + WINDOW_BEFORE : index);

  const sent: RevealSlip[] =
    slips.length > 0
      ? slips
      : (g.windowed
          ? Array.from({ length: WINDOW_LAST - WINDOW_FIRST + 1 }, (_, k) => (((current + WINDOW_FIRST + k) % total) + total) % total)
          : Array.from({ length: total }, (_, i) => i)
        ).map((index) => ({ index, codename: "" }));

  const ringSlips: RingSlip[] = sent.map((s) => {
    const revealed = Boolean(s.giverName);
    return {
      index: s.index,
      pos: posOf(s.index),
      face: revealed ? "revealed" : s.codename ? "code" : "blank",
      codename: s.codename || undefined,
      giverName: s.giverName,
      receiverName: s.receiverName,
      current: step > 0 && s.index === current && !finale,
      halo: finale || (step > 0 && s.index === current),
    };
  });

  const segments: RingSegment[] = ringSlips.map((s) => ({
    index: s.index,
    pos: s.pos,
    state: finale ? "glow" : step <= 0 || s.index > current ? "off" : s.index === current ? "glow" : "on",
  }));

  return { g, slips: ringSlips, segments };
}

/**
 * Font size that fits `text` on one line in `width` px, estimated from
 * its length (`em` = average glyph width), clamped to [min, max].
 */
export function fitFont(text: string, width: number, max: number, min: number, em: number): number {
  const length = Math.max([...text].length, 1);
  return Math.round(Math.min(max, Math.max(min, width / (length * em))));
}
