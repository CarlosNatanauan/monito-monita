/**
 * 03 Create a group (storyboard frame 03): the real create flow (R1). The
 * full groove enters with the laptop; the screen zooms in on the form while
 * she types, out for the scroll and "Create group" (on a beat), and in
 * again on the share link. "Copy link" is clicked on the next bar's second
 * beat, where the GC message lifts out of the laptop.
 */
import type React from "react";
import { AbsoluteFill } from "remotion";
import r1 from "../../public/rec/r1-create.json";
import { Headline, Line } from "../components/Caption";
import { Laptop, LAPTOP } from "../components/Devices";
import { LightString } from "../components/LightString";
import { Pointer, RecClip, type Anchor, type PointerLog } from "../components/Rec";
import { ease, tw } from "../lib/motion";
import { at, SCENE } from "../lib/time";
import { C } from "../lib/theme";
import { AtCut, useLocal } from "./common";

/** The laptop, drawn 7/6 of its base size: a 1120 x 700 screen. */
export const LAPTOP_AT = { x: 620, y: 214 };
export const LAPTOP_SCALE = 7 / 6;
/** Laptop screen px per recording CSS px. */
export const R1_K = LAPTOP.screen.w / r1.viewport.width;

const s = (bar: number, beat = 0) => at(bar, beat) - SCENE.s03.from;
/** "Create group" on V5 beat 4, "Copy link" on V6 beat 2. */
const CREATE = s(5, 3);
export const R1_COPY = s(6, 1);
/** The pan to the phone, centred on the cut. */
export const PAN = [SCENE.s03.to - SCENE.s03.from - 16, SCENE.s03.to - SCENE.s03.from + 2] as const;

/** Scene-local frame -> R1 frame. Typing at about 1.5x, the ready page at 1x. */
export const R1_ANCHORS: Anchor[] = [
  [0, 30],
  [12, 60], // clicks into the name box
  [92, 297], // name, date and budget typed
  [CREATE, 376],
  [R1_COPY, 452],
  [R1_COPY + 37, 526],
  [PAN[1] + 2, 526],
];

/** In-screen zoom: `z` times, with recording CSS point `f` at the screen's centre. */
type Zoom = { f: number; z: number; at: [number, number] };
const PAGE: [number, number] = [683, 427];
// x 436 keeps the right edge of the view at CSS x 815, short of the right-hand column (x 823).
const FORM: [number, number] = [430, 300]; // name, date and budget boxes
const LINK: [number, number] = [430, 300]; // "Ready na ang group mo!", the share link and "Copy link"
const SCROLL: [number, number] = [525, 480]; // the weekly themes and "Create group" after the scroll
const ZOOMS: Zoom[] = [
  { f: 6, z: 1, at: PAGE },
  { f: 28, z: 1.8, at: FORM },
  { f: 88, z: 1.8, at: FORM },
  { f: 106, z: 1.3, at: SCROLL },
  { f: CREATE + 2, z: 1.3, at: SCROLL },
  { f: CREATE + 22, z: 1.8, at: LINK },
];

export const r1Zoom = (lf: number): { z: number; at: [number, number] } => {
  if (lf <= ZOOMS[0].f) return ZOOMS[0];
  for (let i = 0; i < ZOOMS.length - 1; i++) {
    const a = ZOOMS[i];
    const b = ZOOMS[i + 1];
    if (lf <= b.f) {
      const t = ease.camera((lf - a.f) / (b.f - a.f));
      return { z: a.z + (b.z - a.z) * t, at: [a.at[0] + (b.at[0] - a.at[0]) * t, a.at[1] + (b.at[1] - a.at[1]) * t] };
    }
  }
  return ZOOMS[ZOOMS.length - 1];
};

/** Transform for the screen's contents (laptop screen px). */
const zoomTransform = (zoom: { z: number; at: [number, number] }) => {
  const tx = LAPTOP.screen.w / 2 - zoom.at[0] * R1_K * zoom.z;
  const ty = LAPTOP.screen.h / 2 - zoom.at[1] * R1_K * zoom.z;
  return { tx, ty, z: zoom.z };
};

/** Where a recording CSS point is on screen (1920 x 1080) at scene frame lf, laptop at rest. */
export const r1ToScreen = (cssX: number, cssY: number, lf: number): [number, number] => {
  const { tx, ty, z } = zoomTransform(r1Zoom(lf));
  const sx = LAPTOP.screen.x + tx + cssX * R1_K * z;
  const sy = LAPTOP.screen.y + ty + cssY * R1_K * z;
  return [LAPTOP_AT.x + sx * LAPTOP_SCALE, LAPTOP_AT.y + sy * LAPTOP_SCALE];
};
/** On-screen px per recording CSS px at scene frame lf. */
export const r1ScreenScale = (lf: number) => R1_K * r1Zoom(lf).z * LAPTOP_SCALE;

export const S03Create: React.FC = () => {
  const lf = useLocal("s03");
  const rise = tw(lf, 0, 18, 220, 0, ease.paper);
  const exitX = tw(lf, PAN[0], PAN[1], 0, -1920, ease.camera);
  const { tx, ty, z } = zoomTransform(r1Zoom(lf));
  return (
    <AbsoluteFill style={{ transform: `translateX(${exitX}px)`, background: C.lilac, overflow: "hidden" }}>
      <LightString top={4} lit={() => lf >= 0} />
      <div
        style={{
          position: "absolute",
          left: LAPTOP_AT.x,
          top: LAPTOP_AT.y,
          transformOrigin: "0 0",
          transform: `translateY(${rise}px) scale(${LAPTOP_SCALE})`,
          opacity: tw(lf, 0, 8, 0.25, 1, ease.linear),
        }}
      >
        <Laptop x={0} y={0}>
          <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
            <AtCut id="s03">
              <RecClip src="rec/r1-create.mp4" anchors={R1_ANCHORS} />
              <Pointer log={r1.pointer as PointerLog} anchors={R1_ANCHORS} k={R1_K} kind="cursor" />
            </AtCut>
          </AbsoluteFill>
        </Laptop>
      </div>
      <Headline frame={lf} text={"Joy starts\na group."} start={6} size={72} style={{ position: "absolute", left: 120, top: 396 }} />
      <Line frame={lf} start={14} size={34} style={{ position: "absolute", left: 122, top: 574, width: 440 }}>
        Set the date, budget and weekly themes. Share one link in the GC.
      </Line>
    </AbsoluteFill>
  );
};
