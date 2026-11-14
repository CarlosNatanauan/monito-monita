/**
 * Text sizes on the reveal stage (1920×1080 px), estimated from length so
 * long names shrink instead of overflowing. Never below 24px (projector
 * rule in docs/DESIGN.md).
 */
import { fitFont, type RingGeometry } from "./ring";

// Average glyph widths, as a share of the font size.
const GOCHI_EM = 0.5;
const SERIF_EM = 0.42;

const inner = (g: RingGeometry) => g.slipW - 28;

/** Giver's name on a revealed slip: 52px at 12 slots, down to 30. */
export const slipNameSize = (name: string, g: RingGeometry) =>
  fitFont(name, inner(g), Math.round(52 * g.slipScale), 30, GOCHI_EM);

/** Codename on an unrevealed slip: 32px (it may wrap to two lines), never below 26. */
export const slipCodeSize = (codename: string, g: RingGeometry) =>
  fitFont(codename, inner(g) * 1.7, Math.round(32 * Math.max(g.slipScale, 0.85)), 26, GOCHI_EM);

/** The giver's name in the centre: ~184px, smaller for long names. */
export const centreNameSize = (name: string) => fitFont(`${name}!`, 1000, 184, 80, GOCHI_EM);

/** "Si {codename} ay si…": 64px, smaller for long codenames. */
export const centreLeadSize = (codename: string) => fitFont(`Si ${codename} ay si…`, 860, 64, 44, SERIF_EM);
