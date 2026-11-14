/**
 * What changes on the ring between two screens (pure). The stage renders
 * the new state right away; a transition only animates from the old one.
 */
import type { RevealSlip } from "@/server/reveal-window";
import type { RingGeometry } from "./ring";

export type RevealStatus = "DRAWN" | "REVEALING" | "REVEALED";

export interface Shown {
  status: RevealStatus;
  /** 0 before the start, the pair on screen while revealing, total after. */
  step: number;
  slips: RevealSlip[];
}

export interface StepTransition {
  kind: "start" | "next" | "previous" | "finale";
  /** Slip turning over to its name. */
  flip?: number;
  /** Slip turning back to its codename, with the name it showed (already on this screen before). */
  unflip?: { index: number; giverName: string; receiverName: string };
  haloIn: number[];
  haloOut: number[];
  /** Segment whose 4 bulbs light one after another, toward the receiver. */
  light?: number;
  /** Segments going from glowing to on. */
  settle: number[];
  /** Segment going dark (Previous). */
  dim?: number;
  /** Segment glowing again (Previous). */
  reglow?: number;
  /** Large groups: every slip's old window slot is its new one + shift (Next +1, Previous −1). */
  shift: number;
  /** Finale: the pair that was on screen (its slip and bulbs already glow). */
  finaleFrom?: number;
}

/** Moments a transition calls out (for the optional sound). */
export type Cue = { kind: "bulb"; n: number } | { kind: "flip" } | { kind: "back" } | { kind: "finale" } | { kind: "burst" };

export interface PlayOptions {
  cue: (cue: Cue) => void;
  done: () => void;
  /** Playback speed (1 = normal; the lab slows it down to look at frames). */
  speed?: number;
}

/** A running transition; finish() jumps to its end state (another step came in). */
export interface Playing {
  finish: () => void;
}

/**
 * The transition from `from` to `to`, or null for none (first load, after
 * the end, or nothing changed). A jump of several steps (a screen that
 * missed some) animates only the last one.
 */
export function transitionBetween(from: Shown, to: Shown, g: RingGeometry): StepTransition | null {
  const base = { haloIn: [], haloOut: [], settle: [], shift: 0 };
  if (from.status === "REVEALED") return null;

  if (to.status === "REVEALED") {
    return from.status === "REVEALING" ? { ...base, kind: "finale", finaleFrom: from.step - 1 } : null;
  }
  if (to.status !== "REVEALING") return null;

  if (from.status === "DRAWN") {
    if (to.step !== 1) return null;
    return { ...base, kind: "start", flip: 0, haloIn: [0], light: 0 };
  }

  if (to.step > from.step) {
    const k = to.step - 1; // the new current pair (0-based)
    return {
      ...base,
      kind: "next",
      flip: k,
      haloIn: [k],
      haloOut: k > 0 ? [k - 1] : [],
      light: k,
      settle: k > 0 ? [k - 1] : [],
      shift: g.windowed ? 1 : 0,
    };
  }

  if (to.step < from.step) {
    const back = to.step; // 0-based index of the slip that turns back
    const old = from.slips.find((s) => s.index === back);
    return {
      ...base,
      kind: "previous",
      unflip:
        old?.giverName && old.receiverName
          ? { index: back, giverName: old.giverName, receiverName: old.receiverName }
          : undefined,
      haloOut: [back],
      haloIn: [back - 1],
      dim: back,
      reglow: back - 1,
      shift: g.windowed ? -1 : 0,
    };
  }
  return null;
}
