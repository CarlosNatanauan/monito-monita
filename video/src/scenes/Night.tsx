/**
 * The evening sky under 08 and 09: one layer for both, so "How it's built"
 * and the outro are the same place. The finale dissolves into it; 08's tags
 * and 09's slip and parol hang in front of it on the same slow camera.
 */
import type React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";
import { Simbahan } from "../components/Art";
import { LightString } from "../components/LightString";
import { Sky } from "../components/Sky";
import { tw } from "../lib/motion";
import { DURATION, FPS, SCENE } from "../lib/time";
import { C } from "../lib/theme";
import { Camera, PRE } from "./common";

/** The outro's parol: the rays fan from where it hangs (it arrives in 09). */
export const NIGHT_PAROL = { x: 1493, w: 360, top: 70 };
const RAYS: [number, number] = [NIGHT_PAROL.x, NIGHT_PAROL.top + (60 * NIGHT_PAROL.w) / 120];
/** The dissolve from the finale, ending on the cut into 08. */
export const NIGHT_IN = [SCENE.s08.from - PRE.s08, SCENE.s08.from] as const;

/** The slow camera across 08 and 09 (absolute frame): in by 4%, at rest before the end. */
export const nightScale = (abs: number) => tw(abs, NIGHT_IN[0], DURATION - 20, 1, 1.04, Easing.bezier(0.3, 0.4, 0.45, 1));

/** Children on the night camera (abs = absolute frame). */
export const NightCamera: React.FC<{ abs: number; children: React.ReactNode }> = ({ abs, children }) => (
  <Camera scale={nightScale(abs)} focus={[960, 540]}>
    {children}
  </Camera>
);

/** Mounted in a Sequence from NIGHT_IN[0] to the end. */
export const Night: React.FC = () => {
  const abs = useCurrentFrame() + NIGHT_IN[0];
  const fade = tw(abs, NIGHT_IN[0], NIGHT_IN[1], 0, 1, Easing.bezier(0.45, 0, 0.55, 1));
  return (
    <AbsoluteFill style={{ opacity: fade, background: C.ube, overflow: "hidden" }}>
      <NightCamera abs={abs}>
        <Sky origin={RAYS} rotate={(0.4 * abs) / FPS} />
        <div style={{ position: "absolute", left: 0, top: 1015, width: 840, height: 65, background: C.night }} />
        <Simbahan width={1100} style={{ position: "absolute", left: 820, top: 1080 - 330 }} />
        <LightString variant="sky" top={4} lit={() => true} />
      </NightCamera>
    </AbsoluteFill>
  );
};
