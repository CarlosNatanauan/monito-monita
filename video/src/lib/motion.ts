/**
 * The storyboard's motion vocabulary. Everything is transform and opacity,
 * movement reads as paper on string: it falls, catches and swings.
 */
import { Easing, interpolate, spring } from "remotion";
import { FPS } from "./time";

export const ease = {
  /** Entrances: rise, settle, fade in. */
  paper: Easing.bezier(0.16, 1, 0.3, 1),
  /** Falling: into the bowl, things leaving the frame. */
  drop: Easing.bezier(0.55, 0, 0.85, 0.35),
  /** Pushes, pulls, pans, tilts. */
  camera: Easing.bezier(0.45, 0, 0.2, 1),
  linear: (t: number) => t,
};

/** interpolate() between two frames, clamped both ways. */
export const tw = (
  frame: number,
  f0: number,
  f1: number,
  v0: number,
  v1: number,
  easing: (t: number) => number = ease.paper,
) => interpolate(frame, [f0, f1], [v0, v1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });

/** Piecewise keyframes: [[frame, value], ...] with one easing per span. */
export const keys = (frame: number, ks: [number, number][], easing: (t: number) => number = ease.camera) => {
  if (frame <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) {
    const [f0, v0] = ks[i];
    const [f1, v1] = ks[i + 1];
    if (frame <= f1) return tw(frame, f0, f1, v0, v1, easing);
  }
  return ks[ks.length - 1][1];
};

/**
 * Anything on a string swings from `fromDeg` to rest: about 40 frames, two
 * visible overshoots. Returns degrees.
 */
export const hang = (frame: number, start: number, fromDeg: number) => {
  if (frame < start) return fromDeg;
  const s = spring({ frame: frame - start, fps: FPS, config: { damping: 9, stiffness: 90, mass: 1 } });
  return fromDeg * (1 - s);
};

/** A parol at rest: ±3° sine, period 3.2 s. */
export const sway = (frame: number, amp = 3, phase = 0) => amp * Math.sin(((frame / FPS) * 2 * Math.PI) / 3.2 + phase);

/** Deterministic pseudo-random in [0, 1) from an integer seed. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
