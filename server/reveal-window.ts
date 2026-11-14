/**
 * Which slips the reveal screen may receive at a step (pure, unit tested).
 *
 * The ring is drawn in loop order: slip i is the giver of pair i (0-based),
 * and the slip after it is their receiver. While REVEALING at `step`
 * (1-based pair on screen), pairs 0..step-1 are revealed.
 *
 * - Groups of up to 16: every slip is on the ring. Revealed slips carry
 *   the giver's name and receiver; the rest only their codename.
 * - Above 16: a moving window of 12 slips around the current pair (6
 *   before it, the current one, 5 after), plus one hidden slip at each
 *   end so the ring can turn smoothly. Nothing outside it is sent.
 *
 * Names of givers whose pair isn't revealed yet never leave the server.
 * Codenames are only ever shown to their owner elsewhere, so a codename on
 * an unrevealed slip doesn't say who it is.
 */

/** Up to this many members, every slip is on the ring. */
export const RING_MAX = 16;
/** Slips visible in the moving window above RING_MAX. */
export const WINDOW_SLOTS = 12;
/** Slips before the current one in the window (it sits at this slot). */
export const WINDOW_BEFORE = 6;
/** Window offsets that are sent: one hidden slip beyond each end. */
export const WINDOW_FIRST = -WINDOW_BEFORE - 1; // -7
export const WINDOW_LAST = WINDOW_SLOTS - WINDOW_BEFORE; // 6 (5 visible after the current one, +1 hidden)

export interface LoopPair {
  giverCodename: string;
  giverName: string;
  receiverName: string;
}

export interface RevealSlip {
  /** Position in loop order (0-based pair index). */
  index: number;
  codename: string;
  /** Only on revealed slips (index < step). */
  giverName?: string;
  receiverName?: string;
}

export const isWindowed = (total: number) => total > RING_MAX;

/**
 * Signed loop distance from `current` to `index`: the window's offsets
 * (WINDOW_FIRST..WINDOW_LAST) come out as themselves, wrapping the loop.
 */
export function loopOffset(index: number, current: number, total: number): number {
  const d = (((index - current) % total) + total) % total;
  return d >= total + WINDOW_FIRST ? d - total : d;
}

/** Loop indices the screen receives at `step` (1-based), in loop order from the window's start. */
export function slipIndicesAt(step: number, total: number): number[] {
  if (total <= 0) return [];
  if (!isWindowed(total)) return Array.from({ length: total }, (_, i) => i);
  const current = Math.min(Math.max(step, 1), total) - 1;
  const out: number[] = [];
  for (let d = WINDOW_FIRST; d <= WINDOW_LAST; d++) out.push((((current + d) % total) + total) % total);
  return out;
}

/** The slips for the screen at `step`, from pairs already in loop order. */
export function revealSlipsAt(ordered: LoopPair[], step: number): RevealSlip[] {
  return slipIndicesAt(step, ordered.length).map((index) => {
    const p = ordered[index];
    return index < step
      ? { index, codename: p.giverCodename, giverName: p.giverName, receiverName: p.receiverName }
      : { index, codename: p.giverCodename };
  });
}
