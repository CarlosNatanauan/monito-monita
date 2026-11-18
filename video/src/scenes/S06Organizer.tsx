/**
 * 06 The organizer (storyboard frame 06): the page's light string becomes
 * the progress string, one bulb per member, lighting on eighth notes (the
 * 7th on the bar line). The organizer page (R3, one real state per count)
 * ticks in sync, the screen zoomed in on the members' "✓ Opened" column.
 * Then the lights go down for the party (one switch click) and the camera
 * pans across the dark room to the TV.
 */
import type React from "react";
import { AbsoluteFill, Img, interpolateColors, staticFile } from "remotion";
import { Headline, Line } from "../components/Caption";
import { Laptop, LAPTOP } from "../components/Devices";
import { ProgressString, type BulbState } from "../components/ProgressString";
import { CutPaperWipe } from "../components/Wipes";
import { ease, keys, tw } from "../lib/motion";
import { at, EIGHTH, SCENE } from "../lib/time";
import { C, FONT } from "../lib/theme";
import { useLocal } from "./common";

const LEN = SCENE.s06.to - SCENE.s06.from;
/** Local frame at which bulb i (0-11) lights: eighth notes, bulb 7 on V14 beat 3. */
export const BULB_AT = Array.from({ length: 12 }, (_, i) => Math.round(at(14, 2) - SCENE.s06.from + (i - 6) * EIGHTH));
const ALL_DONE = BULB_AT[11];
/** The switch: three frames from day to night, on V15 beat 3. */
export const LIGHTS_DOWN = [Math.round(at(15, 2) - SCENE.s06.from), Math.round(at(15, 2) - SCENE.s06.from) + 3] as const;
/** The pan across the dark room to the TV, centred on the cut (07 pans in with it). */
export const ROOM_PAN = [LEN - 10, LEN + 10] as const;

export const bulbStates = (lf: number): BulbState[] => {
  if (lf >= ALL_DONE && lf < ALL_DONE + 2) return Array(12).fill("pale");
  return BULB_AT.map((t, i) => {
    if (lf < t) return "off";
    const next = BULB_AT[i + 1];
    return i < 11 && lf < next ? "glow" : i === 11 && lf < ALL_DONE ? "glow" : "on";
  });
};

export const nightMix = (lf: number) => tw(lf, LIGHTS_DOWN[0], LIGHTS_DOWN[1], 0, 1, ease.linear);

/** R3 is 1366 x 854 CSS px; the members panel is at x 823-1242, y 107-628. */
const R3_K = LAPTOP.screen.w / 1366;
const PANEL: [number, number] = [976, 387]; // as far right as the page allows at 1.75x
const PAGE: [number, number] = [683, 427];

export const S06Organizer: React.FC = () => {
  const lf = useLocal("s06");
  const lit = BULB_AT.filter((t) => lf >= t).length;
  const night = nightMix(lf);
  const page = interpolateColors(night, [0, 1], [C.lilac, C.ube]);
  // The text flips colour in one frame, so it never passes through low contrast.
  const ink = night < 0.5 ? C.ube : "#ffffff";
  const soft = night < 0.5 ? C.ubeSoft : C.gabiText;
  const panX = tw(lf, ROOM_PAN[0], ROOM_PAN[1], 0, -1920, ease.camera);
  // In-screen zoom: in on the members list while the bulbs light, held through the lights-down and the pan.
  const zk: [number, number][] = [
    [0, 0],
    [22, 1],
    [ALL_DONE, 1],
    [ROOM_PAN[1], 0.45],
  ];
  const zp = keys(lf, zk);
  const z = 1 + 0.75 * zp;
  const f: [number, number] = [PAGE[0] + (PANEL[0] - PAGE[0]) * zp, PAGE[1] + (PANEL[1] - PAGE[1]) * zp];
  const tx = LAPTOP.screen.w / 2 - f[0] * R3_K * z;
  const ty = LAPTOP.screen.h / 2 - f[1] * R3_K * z;
  return (
    <CutPaperWipe f0={0} f1={16}>
      <AbsoluteFill style={{ background: page, overflow: "hidden" }}>
        <ProgressString
          states={bulbStates(lf)}
          wire={interpolateColors(night, [0, 1], [C.ube, C.gabiLine])}
          outline={interpolateColors(night, [0, 1], [C.ube, C.gabi])}
        />
        <div style={{ position: "absolute", left: 0, top: 948, width: 1920, height: 132, background: C.night, opacity: night }} />
        <AbsoluteFill style={{ transformOrigin: "1250px 600px", transform: `translateX(${panX}px) scale(${1 + (0.03 * Math.max(0, lf)) / LEN})` }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              width: 1920,
              top: 216,
              textAlign: "center",
              fontFamily: FONT.sans,
              fontWeight: 700,
              fontSize: 40,
              color: ink,
            }}
          >
            {lit} of 12 have opened their slip
          </div>
          <Laptop x={750} y={330}>
            <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
              <Img src={staticFile(`rec/r3/opened-${String(lit).padStart(2, "0")}.png`)} style={{ width: "100%", height: "100%" }} />
            </AbsoluteFill>
          </Laptop>
          <Headline frame={lf} text={"Watch the\nlights fill up."} start={6} color={ink} style={{ position: "absolute", left: 140, top: 426 }} />
          <Line frame={lf} start={30} color={soft} style={{ position: "absolute", left: 140, top: 634, width: 590 }}>
            See who opened their slip. Never who got whom.
          </Line>
        </AbsoluteFill>
      </AbsoluteFill>
    </CutPaperWipe>
  );
};
