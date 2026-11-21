/** The slip's paper and fold values, shared by SlipArt, the written name and the timelines. */
export const SLIP = {
  W: 300,
  H: 160,
  /** The folded packet is a quarter of the paper; scaled up to ~202×108 (180×96 on a phone panel). */
  FOLD_SCALE: 1.35,
  FOLD_ROT: -4,
  OPEN_ROT: -3,
  /** Soft leading edge of the ink reveal, in px. */
  FEATHER: 16,
} as const;
