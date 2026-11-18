/**
 * 07 Party reveal and finale (storyboard frames 07a, 07b): the camera pans
 * across the dark room (the lit string from 06 overhead) to a TV playing
 * the real reveal (R4, 4K, projector mode: no controls). Everything plays
 * at the app's own speed. "Handa na?", the slips deal round the ring, and
 * Joy's slip flips as the full band returns, the TV's picture zoomed in
 * on the centre text. Then one move: the camera pushes into the TV while
 * its picture zooms back out, so the centre text holds its size and the
 * ring opens up around it, dissolving from Joy into the finale, which starts
 * and the "Maligayang Pasko!" banner lands on V19.
 */
import type React from "react";
import { AbsoluteFill } from "remotion";
import { Headline, Line } from "../components/Caption";
import { Tv, TV } from "../components/Devices";
import { ProgressString } from "../components/ProgressString";
import { RecClip, type Anchor } from "../components/Rec";
import { ease, keys, tw } from "../lib/motion";
import { at, SCENE } from "../lib/time";
import { C } from "../lib/theme";
import { AtCut, Camera, PRE, useLocal } from "./common";

const s = (bar: number, beat = 0) => at(bar, beat) - SCENE.s07.from;
export const TV_AT = { x: 660, y: 256 };
/** "Joy!" lands on V17, where the full band comes back. */
const JOY = s(17);
/** The in-TV zoom on the centre text, in before the flip. */
const ZOOM_IN = [JOY - 26, JOY - 2] as const;
/** "Maligayang Pasko!" lands on V19 (R4 525), the finale pressed 85 recording frames (42.5 frames) before. */
export const BANNER = s(19);
export const PRESS = BANNER - (525 - 440) / 2;
/** The push into the TV (the picture zooming back out inside it), from just after "Joy!" to just before the banner. */
export const PUSH = [JOY + 20, BANNER - 10] as const;
/** From Joy's turn straight into the finale (the frames after the press), a dissolve. */
export const DISSOLVE = [PRESS + 1, PRESS + 11] as const;

/** Scene-local frame -> R4 frame, step 1 (Joy): "Handa na?", the deal, Joy's flip at R4 140, held to R4 329 (still Joy). */
export const R4_JOY: Anchor[] = [
  [-PRE.s07, 0],
  [JOY, 140],
  [DISSOLVE[1] + 1, 329],
];
/** The finale from just after the press, at 1x throughout. */
const B0 = 440 + 2 * (DISSOLVE[0] - PRESS);
export const R4_LAST: Anchor[] = [
  [DISSOLVE[0], B0],
  [BANNER, 525],
  [SCENE.s07.to - SCENE.s07.from + 12, 525 + 2 * (SCENE.s07.to - SCENE.s07.from + 12 - BANNER)],
];

/** Scene-local frame where R4 reaches 69, the last frame of the start screen. */
const HANDA = -PRE.s07 + ((69 - 0) / (140 - 0)) * (JOY + PRE.s07);

const SCREEN_CENTER: [number, number] = [TV_AT.x + TV.screen.x + TV.screen.w / 2, TV_AT.y + TV.screen.y + TV.screen.h / 2];
const FILL = 1920 / TV.screen.w;
/** R4 CSS px (1920 x 1080 stage) per TV screen px. */
const R4_K = TV.screen.w / 1920;
const TEXT: [number, number] = [960, 395]; // "Joy" card, "Si Bibingka Bandit ay si…", "Joy!", "Ang monito niya: Carlo"
const ZOOM = 1.6;

export const S07Reveal: React.FC = () => {
  const lf = useLocal("s07");
  // The room pan from 06: the TV and the caption come in from the right.
  const panX = tw(lf, -PRE.s07, PRE.s07, 1920, 0, ease.camera);
  // Until 06 has panned out, 07 draws no room of its own (06's is underneath).
  const own = lf >= PRE.s07;
  const p = keys(lf, [
    [PUSH[0], 0],
    [PUSH[1], 1],
  ]);
  // After the push, a slow drift on into the picture up to the wipe.
  const after = tw(lf, PUSH[1], SCENE.s07.to - SCENE.s07.from, 0, 0.03, ease.linear);
  const scale = (1 + (FILL - 1) * p) * (1 + after);
  const target: [number, number] = [SCREEN_CENTER[0] + (960 - SCREEN_CENTER[0]) * p, SCREEN_CENTER[1] + (540 - SCREEN_CENTER[1]) * p];
  // The picture's own zoom: 1.7x on the centre text, then out as the camera pushes in,
  // so the text's size on screen goes straight from 1.7x to the TV-filling 1.71x.
  const zin = keys(lf, [
    [ZOOM_IN[0], 0],
    [ZOOM_IN[1], 1],
  ]);
  const z = p > 0 ? (ZOOM + (FILL - ZOOM) * p) / (1 + (FILL - 1) * p) : 1 + (ZOOM - 1) * zin;
  const zp = p > 0 ? 1 - p : zin;
  const fx = 960 + (TEXT[0] - 960) * zp;
  const fy = 540 + (TEXT[1] - 540) * zp;
  const tx = TV.screen.w / 2 - fx * R4_K * z;
  const ty = TV.screen.h / 2 - fy * R4_K * z;
  return (
    <AbsoluteFill style={{ background: own ? C.ube : undefined, overflow: "hidden" }}>
      <Camera scale={scale} focus={SCREEN_CENTER} target={target}>
        {own && <ProgressString states={Array(12).fill("on")} wire={C.gabiLine} outline={C.gabi} />}
        {own && <div style={{ position: "absolute", left: -400, top: 948, width: 2720, height: 400, background: C.night }} />}
        <AbsoluteFill style={{ transform: `translateX(${panX}px)` }}>
          <Tv x={TV_AT.x} y={TV_AT.y}>
            <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
              <RecClip src="rec/r4-reveal.mp4" anchors={R4_JOY.map(([c, r]) => [c + PRE.s07, r] as Anchor)} />
              {/* The app clears "Handa na?" in one frame when the reveal starts: fade it instead. */}
              {lf >= HANDA - 1 && lf < HANDA + 7 && (
                <AbsoluteFill style={{ opacity: tw(lf, HANDA, HANDA + 6, 1, 0, ease.linear) }}>
                  <RecClip src="rec/r4-reveal.mp4" anchors={[[HANDA + PRE.s07 - 1, 68], [HANDA + PRE.s07 + 7, 68]]} />
                </AbsoluteFill>
              )}
              {lf >= DISSOLVE[0] - 1 && (
                <AbsoluteFill style={{ opacity: tw(lf, DISSOLVE[0], DISSOLVE[1], 0, 1, ease.linear) }}>
                  <AtCut id="s07">
                    <RecClip src="rec/r4-reveal.mp4" anchors={R4_LAST} />
                  </AtCut>
                </AbsoluteFill>
              )}
            </AbsoluteFill>
          </Tv>
          <Headline frame={lf} text={"Reveal it\ntogether at\nthe party."} start={4} size={76} color="#fff" style={{ position: "absolute", left: 130, top: 404 }} />
          <Line frame={lf} start={24} size={36} color={C.gabiText} style={{ position: "absolute", left: 132, top: 670, width: 500 }}>
            Codenames first, then the names.
          </Line>
        </AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
};
