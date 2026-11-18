/**
 * The bar grid, from the music edit (src/data/music.json): 110 BPM, 4/4.
 * Video bar n starts at V0 + n * BAR frames. Every scene cut sits on a bar
 * line; key moments sit on beats or eighth notes.
 */
import music from "../data/music.json";

export const FPS = 30;
export const W = 1920;
export const H = 1080;
export const BAR = music.barSeconds * FPS; // 65.45 frames
export const BEAT = BAR / 4; // 16.36 frames
export const EIGHTH = BEAT / 2;
export const V0 = music.v0Seconds * FPS; // the first downbeat
export const DURATION = music.durationInFrames;

/**
 * The intro (01 and 02) is 3.5 bars: 01 is 6 beats and the music's E bar
 * before the groove is cut to 2 beats. From video bar 2 on, every bar
 * starts this much earlier, so 03 onwards stays on the music's downbeats.
 */
export const INTRO_DROP = (music.introDropBeats ?? 0) * BEAT;

/** Exact (fractional) frame of video bar `bar`, plus `beat` beats. */
export const at = (bar: number, beat = 0) => V0 + bar * BAR + beat * BEAT - (bar >= 2 ? INTRO_DROP : 0);
/** The same, on a whole frame. */
export const F = (bar: number, beat = 0) => Math.round(at(bar, beat));

/** Scene boundaries (absolute frames), all on bar lines. */
export const SCENE = {
  s01: { from: 0, to: F(2) },
  s02: { from: F(2), to: F(4) },
  s03: { from: F(4), to: F(7) },
  s04: { from: F(7), to: F(10) },
  s05: { from: F(10), to: F(13) },
  s06: { from: F(13), to: F(16) },
  s07: { from: F(16), to: F(20) },
  s08: { from: F(20), to: F(22) },
  s09: { from: F(22), to: DURATION },
} as const;

export type SceneId = keyof typeof SCENE;

/** A bar-grid time as a frame local to a scene. */
export const local = (scene: SceneId, bar: number, beat = 0) => at(bar, beat) - SCENE[scene].from;
