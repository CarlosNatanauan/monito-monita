/**
 * 05 The slip unfold (storyboard frame 05), the hero moment. 04's push into
 * Joy's phone carries on here: the stage is laid out like the app's sky
 * panel (src/scenes/stage.ts), takes over inside the panel's rectangle and
 * grows to fill the frame. The tap lands on V10 beat 4, about a second
 * after the push comes to rest; the app's own unfold lays the slip flat two
 * beats later and writes "Carlo" in ink (the app's ink reveal, not pen
 * strokes); the ray disc scales in, a few gold stars. "Carlo" holds 3 s.
 */
import type React from "react";
import { AbsoluteFill } from "remotion";
import { Clothespin, Parol } from "../components/Art";
import { Headline, Line } from "../components/Caption";
import { RayDisc, Sky } from "../components/Sky";
import { FLAT_AT, SLIP, Sparkle, UnfoldingSlip, writeEnd } from "../components/slip/Slip";
import { ease, keys, sway, tw } from "../lib/motion";
import { at, FPS, SCENE } from "../lib/time";
import { C, FONT } from "../lib/theme";
import { Camera, useLocal } from "./common";
import { PUSH_DONE_IN_05, pushPath } from "./S04Join";
import {
  FOLDED_CENTER,
  FOLDED_W,
  PANEL,
  PAROL_C,
  PAROL_W,
  PILL,
  PIN,
  PIN_X,
  REST_FC,
  REST_SCALE,
  SLIP_CENTER,
  STAGE_TOP,
  STRING_D,
  STRING_W,
} from "./stage";

export const TAP = at(10, 3) - SCENE.s05.from; // V10 beat 4
const NAME = "Carlo";
/** The string at the pin: the slip swings from here. */
const PIVOT: [number, number] = [PIN_X, 248];
/** Frames the panel's rectangle takes to grow to the full frame. */
const IRIS = 12;

/** Time (s) after the tap, the app's own clock (1x). */
const unfoldT = (lf: number) => (lf - TAP) / FPS;

/** A sky big enough to stay full-frame under any of the cameras here. */
const BigSky: React.FC<{ origin: [number, number]; rotate: number }> = ({ origin, rotate }) => (
  <div style={{ position: "absolute", left: -2400, top: -2000, width: 7200, height: 5600 }}>
    <Sky origin={[origin[0] + 2400, origin[1] + 2000]} rotate={rotate} width={7200} height={5600} />
  </div>
);

export const SlipStage: React.FC<{ lf: number }> = ({ lf }) => {
  const t = unfoldT(lf);
  const raysP = tw(t, FLAT_AT - 0.1, FLAT_AT + 0.4, 0, 1, (x) => 1 - (1 - x) * (1 - x));
  const raysRot = t > FLAT_AT ? 6 * (t - FLAT_AT) : 0;
  // A gentle sway on the string while it waits (none at the cut, so the
  // match with the phone holds); still once it opens.
  const waiting = sway(lf, 1.2, 0.6) * tw(lf, 24, 48, 0, 1, ease.linear);
  const swing = t < 0 ? waiting : waiting * tw(t, 0, 0.5, 1, 0, ease.camera);
  const tapAge = lf - TAP;
  const sparkleAt = writeEnd(NAME) - 0.08;
  const parolLeft = PAROL_C[0] - PAROL_W / 2;
  const parolTop = PAROL_C[1] - PAROL_W / 2;
  return (
    <>
      <BigSky origin={PAROL_C} rotate={(0.4 * lf) / FPS} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={STRING_D} fill="none" stroke="#fff" strokeWidth={STRING_W} />
      </svg>
      <div style={{ position: "absolute", left: PAROL_C[0] - 1.5, top: parolTop - 2400, width: 3, height: 2400 + 12, background: C.ubeLine }} />
      <Parol
        width={PAROL_W}
        style={{ position: "absolute", left: parolLeft, top: parolTop, transform: `rotate(${sway(lf, 2)}deg)`, transformOrigin: `${PAROL_W / 2}px 0px` }}
      />
      <RayDisc
        size={1000}
        rotate={raysRot}
        style={{
          position: "absolute",
          left: SLIP_CENTER[0] - 500,
          top: SLIP_CENTER[1] - 500,
          opacity: raysP,
          transform: `scale(${0.6 + 0.4 * raysP})`,
        }}
      />
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: `${PIVOT[0]}px ${PIVOT[1]}px`, transform: `rotate(${swing}deg)` }}>
        <UnfoldingSlip name={NAME} t={t} style={{ position: "absolute", left: PIN_X - SLIP.W / 2, top: STAGE_TOP }} />
        <Clothespin width={PIN.w} style={{ position: "absolute", left: PIN.x, top: PIN.y }} />
      </div>
      {/* The app's button, where the app has it; it drops away on the tap. */}
      <div
        style={{
          position: "absolute",
          left: PILL.x,
          top: PILL.y,
          width: PILL.w,
          height: PILL.h,
          boxSizing: "border-box",
          background: "#fff",
          borderRadius: PILL.r,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT.sans,
          fontWeight: 700,
          fontSize: PILL.font,
          color: C.ube,
          whiteSpace: "nowrap",
          opacity: tw(tapAge, 0, 10, 1, 0, ease.drop),
          transform: `translateY(${tw(tapAge, 0, 10, 0, 160, ease.drop)}px)`,
        }}
      >
        Tap to open your bunutan
      </div>
      <Sparkle t={t - sparkleAt} style={{ left: SLIP_CENTER[0], top: SLIP_CENTER[1] }} />
      {tapAge >= 0 && tapAge <= 12 && (
        <div
          style={{
            position: "absolute",
            left: FOLDED_CENTER[0] - tw(tapAge, 0, 12, 24, 64) / 2,
            top: FOLDED_CENTER[1] - tw(tapAge, 0, 12, 24, 64) / 2,
            width: tw(tapAge, 0, 12, 24, 64),
            height: tw(tapAge, 0, 12, 24, 64),
            borderRadius: "50%",
            border: `3px solid ${C.ube}`,
            opacity: tw(tapAge, 0, 12, 0.9, 0),
            boxSizing: "border-box",
          }}
        />
      )}
    </>
  );
};

/** The stage's camera in 05: the push from 04 until it rests, then a slow breath around the tap. */
const stageCamera = (lf: number) => {
  if (lf < PUSH_DONE_IN_05) {
    const push = pushPath(SCENE.s05.from + lf);
    return { scale: push.w / FOLDED_W, focus: [PIN_X, STAGE_TOP] as [number, number], target: push.p };
  }
  const kick = lf >= TAP ? 0.02 * Math.sin(Math.min(1, (lf - TAP) / 18) * Math.PI) : 0;
  const z =
    keys(lf, [
      [TAP + 30, 1],
      [SCENE.s05.to - SCENE.s05.from, 0.943],
    ]) + kick;
  return { scale: REST_SCALE * z, focus: FOLDED_CENTER, target: REST_FC };
};

export const S05Slip: React.FC = () => {
  const lf = useLocal("s05");
  const cam = stageCamera(lf);
  // The app panel's rectangle on screen, growing to the full frame.
  const e = ease.camera(Math.min(1, Math.max(0, lf / IRIS)));
  const sx = (x: number) => cam.target[0] + (x - cam.focus[0]) * cam.scale;
  const sy = (y: number) => cam.target[1] + (y - cam.focus[1]) * cam.scale;
  const left = Math.max(0, sx(PANEL.x)) * (1 - e);
  const top = Math.max(0, sy(PANEL.y)) * (1 - e);
  const right = Math.max(0, 1920 - sx(PANEL.x + PANEL.w)) * (1 - e);
  const bottom = Math.max(0, 1080 - sy(PANEL.y + PANEL.h)) * (1 - e);
  const clip = e < 1 ? `inset(${top}px ${right}px ${bottom}px ${left}px round ${PANEL.r * cam.scale * (1 - e)}px)` : undefined;
  const capScale = 1 + (cam.scale / REST_SCALE - 1) * 0.25;
  return (
    <AbsoluteFill style={{ background: C.ube, overflow: "hidden", clipPath: clip }}>
      <Camera scale={cam.scale} focus={cam.focus} target={cam.target}>
        <SlipStage lf={lf} />
      </Camera>
      <Camera scale={lf < PUSH_DONE_IN_05 ? 1 : capScale} focus={[960, 540]}>
        {/* The draw happened between 04 and 05 (the organizer's one tap): say so as the slip arrives. */}
        <Line frame={lf} start={2} size={36} weight={700} color={C.ilaw} style={{ position: "absolute", left: 132, top: 290 }}>
          Names drawn in one tap.
        </Line>
        <Headline frame={lf} text={"Ang monito\nmo ay…"} start={8} color="#fff" style={{ position: "absolute", left: 130, top: 366 }} />
        <Line frame={lf} start={22} color={C.gabiText} style={{ position: "absolute", left: 132, top: 566 }}>
          Your monito is…
        </Line>
        <Line frame={lf} start={TAP + 14} size={50} weight={700} color="#fff" lineHeight={1.25} style={{ position: "absolute", left: 132, top: 676 }}>
          Only you can see
          <br />
          who you got.
        </Line>
      </Camera>
    </AbsoluteFill>
  );
};
