/**
 * 09 Outro (storyboard frame 09), on the same evening sky as 08 (Night.tsx):
 * as 08's string is raised away and the song's own final chord rings out,
 * a string with the live link on a slip is lowered in and the parol drops
 * in and catches, as in the intro. The three things that make it easy, the
 * code on GitHub in small type. The last frame holds (no fade to black).
 */
import type React from "react";
import { AbsoluteFill, Easing } from "remotion";
import { Clothespin, Parol } from "../components/Art";
import { Headline, Line } from "../components/Caption";
import { ease, hang, sway, tw } from "../lib/motion";
import { SCENE } from "../lib/time";
import { C, FONT, SLIP_SHADOW } from "../lib/theme";
import { useLocal } from "./common";
import { NIGHT_PAROL, NightCamera } from "./Night";

export const SITE = "monitomonita-ph.vercel.app";
export const REPO = "github.com/CarlosNatanauan/monito-monita";
const PIN: [number, number] = [560, 470];
/** The string and the link slip come down together; the slip catches here. */
export const SLIP_CATCH = 16;
/** The parol catches on its string, once 08's string has cleared the frame. */
export const PAROL_CATCH = 24;

export const S09Outro: React.FC = () => {
  const lf = useLocal("s09");
  const lower = tw(lf, SLIP_CATCH - 10, SLIP_CATCH, -160, 0, Easing.bezier(0.33, 1, 0.68, 1));
  const swing = lf < SLIP_CATCH ? 0 : hang(lf, SLIP_CATCH, -8);
  const parolY = tw(lf, PAROL_CATCH - 14, PAROL_CATCH, -460, 0, Easing.bezier(0.4, 0, 0.8, 0.6));
  const parolSwing = hang(lf, PAROL_CATCH, -12) + sway(lf + 40) * tw(lf, PAROL_CATCH + 20, PAROL_CATCH + 50, 0, 1, ease.linear);
  const { x: PX, w: PW, top: PT } = NIGHT_PAROL;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <NightCamera abs={SCENE.s09.from + lf}>
        <div
          style={{
            position: "absolute",
            left: PX - PW / 2,
            top: 0,
            width: PW,
            height: 560,
            transformOrigin: `${PW / 2}px 0px`,
            transform: `translateY(${parolY}px) rotate(${parolSwing}deg)`,
            opacity: lf < PAROL_CATCH - 14 ? 0 : 1,
          }}
        >
          <div style={{ position: "absolute", left: PW / 2 - 1, top: -700, width: 2, height: 700 + PT + 6, background: C.ubeLine }} />
          <Parol width={PW} style={{ position: "absolute", left: 0, top: PT }} />
        </div>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${lower}px)`, opacity: tw(lf, SLIP_CATCH - 10, SLIP_CATCH - 5, 0, 1, ease.linear) }}>
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <path d="M-20 410Q960 557 1940 400" fill="none" stroke="#fff" strokeWidth="3" />
          </svg>
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `${PIN[0]}px ${PIN[1]}px`, transform: `rotate(${swing}deg)` }}>
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
        </div>
      </NightCamera>
      <div style={{ position: "absolute", left: 140, top: 104, fontFamily: FONT.head, fontSize: 52, color: C.gabiText, opacity: tw(lf, 0, 12, 0, 1, ease.linear) }}>
        Monito Monita
      </div>
      <Headline frame={lf} text="Try the demo" start={4} size={128} color="#fff" style={{ position: "absolute", left: 136, top: 186 }} />
      <Line frame={lf} start={14} size={42} weight={700} color="#fff" style={{ position: "absolute", left: 140, top: 716 }}>
        Free. No sign-up. Works on any phone.
      </Line>
      <Line frame={lf} start={26} size={30} color={C.gabiText} style={{ position: "absolute", left: 140, top: 782 }}>
        {REPO}
      </Line>
    </AbsoluteFill>
  );
};
