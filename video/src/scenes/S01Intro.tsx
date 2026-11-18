/**
 * 01 Intro (storyboard frame 01). The music starts on its first downbeat;
 * the parol drops in and catches on beat 2, the sky's rays bloom out from
 * it, the bulbs sweep on and the church windows light on beat 3.
 */
import type React from "react";
import { AbsoluteFill, Easing } from "remotion";
import { Parol, Simbahan } from "../components/Art";
import { Headline, Line } from "../components/Caption";
import { LightString } from "../components/LightString";
import { Sky } from "../components/Sky";
import { ease, hang, sway, tw } from "../lib/motion";
import { at, FPS, SCENE } from "../lib/time";
import { C } from "../lib/theme";
import { Camera, useLocal } from "./common";

const PAROL_X = 1413;
const PAROL_W = 330;
const PAROL_TOP = 50;
const DISC_Y = PAROL_TOP + (60 * PAROL_W) / 120;
const CATCH = Math.round(at(0, 1)); // beat 2 of the first bar
const LIT = Math.round(at(0, 2)); // beat 3

export const IntroBackdrop: React.FC<{ frame: number; parolAt?: number; litAt?: number }> = ({ frame, parolAt = CATCH, litAt = LIT }) => {
  // Starts just above the frame with a gentle ease-in, so it reads as a fall, not a pop.
  const dropY = tw(frame, parolAt - 15, parolAt, -440, 0, Easing.bezier(0.4, 0, 0.8, 0.6));
  const swing = hang(frame, parolAt, -14) + sway(frame) * tw(frame, parolAt + 20, parolAt + 50, 0, 1, ease.linear);
  // The rays bloom out of the parol as it catches: plain night before.
  const bloom = tw(frame, parolAt - 2, parolAt + 22, 0, 1, ease.paper);
  // A disc of rays growing from the parol, its edge soft (400 px), gone once it covers the frame.
  const reach = 2600 * bloom;
  const mask = bloom < 1 ? `radial-gradient(circle at ${PAROL_X}px ${DISC_Y}px, #000 ${Math.max(0, reach - 400)}px, transparent ${reach}px)` : "none";
  return (
    <>
      <AbsoluteFill style={{ background: C.ube }} />
      <Sky
        origin={[PAROL_X, DISC_Y]}
        rotate={(0.4 * frame) / FPS + 14 * (1 - bloom)}
        base="transparent"
        style={{ opacity: Math.min(1, bloom * 1.6), WebkitMaskImage: mask, maskImage: mask }}
      />
      <div style={{ position: "absolute", left: 0, top: 1024, width: 760, height: 56, background: C.night }} />
      <Simbahan width={930} lit={frame >= litAt} style={{ position: "absolute", left: 720, top: 1080 - 279 }} />
      <div
        style={{
          position: "absolute",
          left: PAROL_X - PAROL_W / 2,
          top: 0,
          width: PAROL_W,
          height: PAROL_TOP + 470,
          transformOrigin: `${PAROL_W / 2}px 0px`,
          transform: `translateY(${dropY}px) rotate(${swing}deg)`,
        }}
      >
        <div style={{ position: "absolute", left: PAROL_W / 2 - 1, top: -700, width: 2, height: 700 + PAROL_TOP + 6, background: C.ubeLine }} />
        <Parol width={PAROL_W} style={{ position: "absolute", left: 0, top: PAROL_TOP }} />
      </div>
    </>
  );
};

/** The tilt up into 02 starts on the bar line (02 rises with it), so the subtitle gets its 3.1 s. */
const EXIT = [SCENE.s01.to, SCENE.s01.to + 18] as const;

export const S01Intro: React.FC = () => {
  const lf = useLocal("s01");
  const drift = tw(lf, 0, EXIT[1], 1, 1.04, ease.linear);
  const exitY = tw(lf, EXIT[0], EXIT[1], 0, -1080, ease.camera);
  return (
    <AbsoluteFill style={{ transform: `translateY(${exitY}px)`, background: C.ube, overflow: "hidden" }}>
      <Camera scale={drift} focus={[960, 540]}>
        <IntroBackdrop frame={lf} />
        <LightString variant="sky" top={4} lit={(i) => lf >= CATCH + 1 + i / 3} />
        <Headline frame={lf}
          text={"Monito\nMonita"}
          start={CATCH - 7}
          size={190}
          lineHeight={0.98}
          color="#fff"
          style={{ position: "absolute", left: 150, top: 292 }}
        />
        <Line frame={lf} start={CATCH + 2} size={50} color={C.gabiText} lineHeight={1.32} style={{ position: "absolute", left: 152, top: 706 }}>
          The Filipino exchange gift,
          <br />
          in one link
        </Line>
      </Camera>
    </AbsoluteFill>
  );
};
