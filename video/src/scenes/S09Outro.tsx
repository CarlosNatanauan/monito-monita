/**
 * 09 Outro (storyboard frame 09): the sheet of 08 lifts away to the
 * evening sky as the song's own final chord rings out. The live link on a
 * slip clipped to the string, and the three things that make it easy.
 * The last frame holds (no fade to black).
 */
import type React from "react";
import { AbsoluteFill, Easing } from "remotion";
import { Clothespin, Parol, Simbahan } from "../components/Art";
import { Headline, Line } from "../components/Caption";
import { LightString } from "../components/LightString";
import { Sky } from "../components/Sky";
import { ease, hang, sway, tw } from "../lib/motion";
import { FPS } from "../lib/time";
import { C, FONT, SLIP_SHADOW } from "../lib/theme";
import { Camera, useLocal } from "./common";

export const SITE = "monitomonita-ph.vercel.app";
const PAROL_X = 1493;
const PAROL_W = 360;
const PAROL_TOP = 70;
const PIN: [number, number] = [560, 470];
export const SLIP_CATCH = 16;

export const S09Outro: React.FC = () => {
  const lf = useLocal("s09");
  const drift = tw(lf, -9, 109, 1.04, 1, Easing.bezier(0.33, 1, 0.68, 1));
  const dropY = tw(lf, SLIP_CATCH - 10, SLIP_CATCH, -120, 0, ease.drop);
  const swing = lf < SLIP_CATCH ? 0 : hang(lf, SLIP_CATCH, -10);
  return (
    <AbsoluteFill style={{ background: C.ube, overflow: "hidden" }}>
      <Camera scale={drift} focus={[960, 540]}>
        <Sky origin={[PAROL_X, PAROL_TOP + (60 * PAROL_W) / 120]} rotate={(0.4 * (lf + 1700)) / FPS} />
        <div style={{ position: "absolute", left: 0, top: 1015, width: 840, height: 65, background: C.night }} />
        <Simbahan width={1100} style={{ position: "absolute", left: 820, top: 1080 - 330 }} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <path d="M-20 410Q960 557 1940 400" fill="none" stroke="#fff" strokeWidth="3" />
        </svg>
        <div
          style={{
            position: "absolute",
            left: PAROL_X - PAROL_W / 2,
            top: 0,
            width: PAROL_W,
            height: 560,
            transformOrigin: `${PAROL_W / 2}px 0px`,
            transform: `rotate(${sway(lf + 40)}deg)`,
          }}
        >
          <div style={{ position: "absolute", left: PAROL_W / 2 - 1, top: 0, width: 2, height: PAROL_TOP + 6, background: C.ubeLine }} />
          <Parol width={PAROL_W} style={{ position: "absolute", left: 0, top: PAROL_TOP }} />
        </div>
        <LightString variant="sky" top={4} lit={() => true} />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            transformOrigin: `${PIN[0]}px ${PIN[1]}px`,
            transform: `translateY(${dropY}px) rotate(${swing}deg)`,
            opacity: tw(lf, SLIP_CATCH - 10, SLIP_CATCH - 6, 0, 1, ease.linear),
          }}
        >
          <div
            style={{
              position: "absolute",
              left: PIN[0] - 430,
              top: PIN[1] + 8,
              width: 860,
              height: 172,
              background: C.papel,
              boxShadow: SLIP_SHADOW,
              transform: "rotate(-2deg)",
              transformOrigin: "50% 0%",
              display: "flex",
              alignItems: "center",
              paddingLeft: 48,
              boxSizing: "border-box",
              fontFamily: FONT.sans,
              fontWeight: 700,
              fontSize: 54,
              color: C.ube,
            }}
          >
            {SITE}
          </div>
          <Clothespin width={38} style={{ position: "absolute", left: PIN[0] - 19, top: PIN[1] - 38 }} />
        </div>
      </Camera>
      <div style={{ position: "absolute", left: 140, top: 104, fontFamily: FONT.head, fontSize: 52, color: C.gabiText }}>Monito Monita</div>
      <Headline frame={lf} text="Try the demo" start={4} size={128} color="#fff" style={{ position: "absolute", left: 136, top: 186 }} />
      <Line frame={lf} start={SLIP_CATCH - 2} size={42} weight={700} color="#fff" style={{ position: "absolute", left: 140, top: 716 }}>
        Free. No sign-up. Works on any phone.
      </Line>
    </AbsoluteFill>
  );
};
