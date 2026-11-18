/**
 * The README loop (about 11 s, silent): the slip unfold, then the party
 * reveal (Joy drew Carlo, then the finale). It ends with the sky sheet
 * dropping back over the reveal, carrying the folded slip exactly as the
 * first frame shows it, so the loop has no seam.
 */
import type React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { RecClip, type Anchor } from "./components/Rec";
import { CutPaperWipe, FringeWipe } from "./components/Wipes";
import { C } from "./lib/theme";
import { Camera } from "./scenes/common";
import { SlipStage, TAP } from "./scenes/S05Slip";
import { PANEL, REST_SCALE } from "./scenes/stage";

const TAP_AT = 30; // the tap, in loop frames
const SLIP_LEN = 150;
const WIPE = 16;
const REVEAL_LEN = 182;
const DROP = 16;
export const LOOP_DURATION = SLIP_LEN + REVEAL_LEN;

/** The slip stage, centred on the slip, at loop frame f (frame 0 = folded, waiting). */
const Slip: React.FC<{ frame?: number }> = ({ frame }) => {
  const current = useCurrentFrame();
  const f = frame ?? current;
  return (
    <AbsoluteFill style={{ background: C.ube, overflow: "hidden" }}>
      <Camera scale={REST_SCALE} focus={[PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h / 2]} target={[960, 540]}>
        <SlipStage lf={f + (TAP - TAP_AT)} />
      </Camera>
    </AbsoluteFill>
  );
};

/** R4 at 1x: the slips deal round the ring and Joy's flips ("Joy! Ang monito niya: Carlo")... */
const JOY: Anchor[] = [
  [0, 64],
  [80, 224],
];
/** ...dissolving straight into the finale, just after the press ("Maligayang Pasko!" lands at R4 525). */
const DISSOLVE = [70, 80] as const;
const FINALE: Anchor[] = [
  [DISSOLVE[0], 442],
  [REVEAL_LEN + WIPE, 442 + 2 * (REVEAL_LEN + WIPE - DISSOLVE[0])],
];

const Dissolve: React.FC<{ f0: number; f1: number; children: React.ReactNode }> = ({ f0, f1, children }) => {
  const f = useCurrentFrame();
  if (f < f0) return null;
  return <AbsoluteFill style={{ opacity: Math.min(1, (f - f0) / (f1 - f0)) }}>{children}</AbsoluteFill>;
};

export const MonitoLoop: React.FC = () => (
  <AbsoluteFill style={{ background: C.ube }}>
    <Sequence name="Slip unfold" durationInFrames={SLIP_LEN}>
      <Slip />
    </Sequence>
    <Sequence name="Reveal" from={SLIP_LEN - WIPE} durationInFrames={REVEAL_LEN + WIPE}>
      <CutPaperWipe f0={0} f1={WIPE}>
        <AbsoluteFill style={{ background: C.gabi }}>
          <RecClip src="rec/r4-reveal.mp4" anchors={JOY} />
          <Dissolve f0={DISSOLVE[0]} f1={DISSOLVE[1]}>
            <RecClip src="rec/r4-reveal.mp4" anchors={FINALE} />
          </Dissolve>
        </AbsoluteFill>
      </CutPaperWipe>
    </Sequence>
    <Sequence name="Back to the slip" from={LOOP_DURATION - DROP} durationInFrames={DROP}>
      <FringeWipe f0={0} f1={DROP - 2} settle={0} color={C.ube}>
        <Slip frame={0} />
      </FringeWipe>
    </Sequence>
  </AbsoluteFill>
);
