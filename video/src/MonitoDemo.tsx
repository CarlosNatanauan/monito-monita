/**
 * The 51-second demo (video/storyboard/STORYBOARD.md). Plain Sequences with
 * manual overlaps, so a transition never moves a cut off its bar line.
 */
import type React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Soundtrack } from "./audio/Soundtrack";
import { C } from "./lib/theme";
import { DURATION } from "./lib/time";
import { SceneSeq } from "./scenes/common";
import { Night, NIGHT_IN } from "./scenes/Night";
import { S01Intro } from "./scenes/S01Intro";
import { S02Problem } from "./scenes/S02Problem";
import { S03Create } from "./scenes/S03Create";
import { GcHandOff, S04Join } from "./scenes/S04Join";
import { S05Slip } from "./scenes/S05Slip";
import { S06Organizer } from "./scenes/S06Organizer";
import { S07Reveal } from "./scenes/S07Reveal";
import { S08Built } from "./scenes/S08Built";
import { S09Outro } from "./scenes/S09Outro";

export const MonitoDemo: React.FC<{ muted?: boolean }> = ({ muted = false }) => (
  <AbsoluteFill style={{ background: C.lilac }}>
    <SceneSeq id="s01" name="01 Intro">
      <S01Intro />
    </SceneSeq>
    <SceneSeq id="s02" name="02 The problem">
      <S02Problem />
    </SceneSeq>
    <SceneSeq id="s03" name="03 Create a group">
      <S03Create />
    </SceneSeq>
    <SceneSeq id="s04" name="04 Join">
      <S04Join />
    </SceneSeq>
    <GcHandOff />
    <SceneSeq id="s05" name="05 The slip unfold">
      <S05Slip />
    </SceneSeq>
    <SceneSeq id="s06" name="06 The organizer">
      <S06Organizer />
    </SceneSeq>
    <SceneSeq id="s07" name="07 Party reveal">
      <S07Reveal />
    </SceneSeq>
    {/* The evening sky under 08 and 09 (one place): the finale dissolves into it. */}
    <Sequence name="Night sky (08-09)" from={NIGHT_IN[0]} durationInFrames={DURATION - NIGHT_IN[0]}>
      <Night />
    </Sequence>
    <SceneSeq id="s09" name="09 Outro">
      <S09Outro />
    </SceneSeq>
    <SceneSeq id="s08" name="08 How it's built">
      <S08Built />
    </SceneSeq>
    {!muted && <Soundtrack />}
  </AbsoluteFill>
);
