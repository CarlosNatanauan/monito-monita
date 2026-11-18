/**
 * The slip stage of 05, laid out exactly like the app's /me sky panel (R2b),
 * scaled up: the folded packet is 607.5 px wide here and 182 CSS px in the
 * app. 04 pushes into the phone along one camera path and 05 takes over
 * inside the panel's rectangle, which then grows to fill the frame; with the
 * same layout, the swap inside the rectangle doesn't show.
 * Measured on R2b (CSS px): packet top centre (198, 331), 182 wide; string
 * (20, 282.3) (196.7, 310) (370, 286); parol disc centre (317.7, 224), 75
 * across; pin x 187.7-202, y 295-339.3; pill x 38-262.7, y 460-503.7; panel
 * x 20-370, y 182.125-522.125, corners 16.7.
 */
import { SLIP } from "../components/slip/Slip";

export const PIN_X = 1180;
export const STAGE_TOP = 318;
/** The folded packet: a quarter of the paper at 1.35x, hanging from the pin. */
export const FOLDED_W = (SLIP.W / 2) * SLIP.FOLD_SCALE;
export const FOLDED_CENTER: [number, number] = [PIN_X, STAGE_TOP + (SLIP.H / 4) * SLIP.FOLD_SCALE];
export const SLIP_CENTER: [number, number] = [PIN_X, STAGE_TOP + SLIP.H / 2];

/** R2b's folded packet (CSS px): top centre and width. */
export const R2B_SLIP = { cx: 198, top: 331, w: 182 };
/** Stage px per app CSS px. */
export const APP_K = FOLDED_W / R2B_SLIP.w;
export const fromApp = (x: number, y: number): [number, number] => [PIN_X + (x - R2B_SLIP.cx) * APP_K, STAGE_TOP + (y - R2B_SLIP.top) * APP_K];

const panelA = fromApp(20, 182.125);
const panelB = fromApp(370, 522.125);
export const PANEL = { x: panelA[0], y: panelA[1], w: panelB[0] - panelA[0], h: panelB[1] - panelA[1], r: 16.7 * APP_K };

/** The string: a quadratic through the app's three points, continued straight beyond them. */
const S0 = fromApp(20, 282.3);
const SM = fromApp(196.7, 310);
const S2 = fromApp(370, 286);
const SC: [number, number] = [2 * SM[0] - (S0[0] + S2[0]) / 2, 2 * SM[1] - (S0[1] + S2[1]) / 2];
const far = (a: [number, number], b: [number, number]): [number, number] => [a[0] + 4 * (a[0] - b[0]), a[1] + 4 * (a[1] - b[1])];
const L0 = far(S0, SC);
const L2 = far(S2, SC);
export const STRING_D = `M${L0[0].toFixed(1)} ${L0[1].toFixed(1)}L${S0[0].toFixed(1)} ${S0[1].toFixed(1)}Q${SC[0].toFixed(1)} ${SC[1].toFixed(1)} ${S2[0].toFixed(1)} ${S2[1].toFixed(1)}L${L2[0].toFixed(1)} ${L2[1].toFixed(1)}`;
export const STRING_W = (4 / 3) * APP_K;

/** The parol: its disc is 0.9 of the drawing's width, centred 0.5 width down. */
export const PAROL_C = fromApp(317.7, 224);
export const PAROL_W = (75 * APP_K) / 0.9;

const pinA = fromApp(187.7, 295);
const pinB = fromApp(202, 339.3);
export const PIN = { x: pinA[0], y: pinA[1], w: pinB[0] - pinA[0] };

const pillA = fromApp(38, 460);
const pillB = fromApp(262.7, 503.7);
export const PILL = { x: pillA[0], y: pillA[1], w: pillB[0] - pillA[0], h: pillB[1] - pillA[1], r: 8.3 * APP_K, font: 15 * APP_K };

/** Where the push from 04 leaves the stage, and where 05 frames it at rest. */
export const REST_SCALE = 0.954;
export const REST_FC: [number, number] = [1309, 623];
export const REST_SLIP = {
  x: REST_FC[0] + (PIN_X - FOLDED_CENTER[0]) * REST_SCALE,
  y: REST_FC[1] + (STAGE_TOP - FOLDED_CENTER[1]) * REST_SCALE,
  w: FOLDED_W * REST_SCALE,
};
