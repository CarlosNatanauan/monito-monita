/**
 * The landing page's video poster (docs/design/landing-video, direction 1a):
 * the opened slip "Carlo" on the gold ray disc, the frame after the name is
 * written, with no captions and no sparkles. The app's own slip stage, framed
 * like the handoff's reference (slip and disc centred, parol top right).
 *
 *   npx remotion still LandingPoster out/landing-poster.png
 *   node ../scripts/landing/make-poster.mjs out/landing-poster.png   (from the repo root: public/landing/)
 */
import type React from "react";
import { AbsoluteFill } from "remotion";
import { FPS } from "./lib/time";
import { C } from "./lib/theme";
import { Camera } from "./scenes/common";
import { SlipStage, TAP } from "./scenes/S05Slip";
import { SLIP_CENTER } from "./scenes/stage";

/** Seconds after the tap: the slip lies flat, the ray disc is full, "Carlo" is written. */
const AT = 1.6;
const SCALE = 1;
const TARGET: [number, number] = [960, 560];
/** Where the parol shows on the poster (1920 px frame), and its disc's diameter there. */
const PAROL_SCREEN: [number, number] = [1642, 162];
const PAROL_DISC = 240;

export const LandingPoster: React.FC = () => {
  const c: [number, number] = [SLIP_CENTER[0] + (PAROL_SCREEN[0] - TARGET[0]) / SCALE, SLIP_CENTER[1] + (PAROL_SCREEN[1] - TARGET[1]) / SCALE];
  return (
    <AbsoluteFill style={{ background: C.ube, overflow: "hidden" }}>
      <Camera scale={SCALE} focus={SLIP_CENTER} target={TARGET}>
        <SlipStage lf={TAP + AT * FPS} sparkle={false} parol={{ c, w: PAROL_DISC / SCALE / 0.9 }} />
      </Camera>
    </AbsoluteFill>
  );
};
