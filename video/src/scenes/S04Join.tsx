/**
 * 04 Join (storyboard frame 04): Joy taps the link in the GC and joins with
 * a name and a PIN (R2), the four PIN digits on eighth notes. The app's own
 * join drop plays on the phone (the slip folds and drops into the bowl on
 * the evening sky), the camera leaning in. After the draw her /me shows
 * the folded slip (R2b); the camera pushes into its sky panel.
 */
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import r1 from "../../public/rec/r1-create.json";
import r2 from "../../public/rec/r2-join.json";
import { Headline, Line } from "../components/Caption";
import { Phone, PHONE } from "../components/Devices";
import { LightString } from "../components/LightString";
import { Pointer, RecClip, type Anchor, type PointerLog } from "../components/Rec";
import { ease, tw } from "../lib/motion";
import { at, SCENE } from "../lib/time";
import { C, FONT } from "../lib/theme";
import { AtCut, Camera, useLocal } from "./common";
import { R2B_SLIP, REST_SLIP } from "./stage";
import { R1_COPY, r1ToScreen } from "./S03Create";

export const SHARE_LINK = r1.shareText as string;
export const PHONE_AT = { x: 1290, y: 82 };
export const R2_K = PHONE.screen.w / r2.viewport.width;

const s = (bar: number, beat = 0) => at(bar, beat) - SCENE.s04.from;
export const TAP_LINK = s(7, 2);
const BROWSER_IN = TAP_LINK + 1;

/** Scene-local frame -> R2 frame: PIN boxes on eighth notes from V8, Join on V8 beat 3. */
export const R2_ANCHORS: Anchor[] = [
  [BROWSER_IN, 0],
  [BROWSER_IN + 10, 24],
  [s(8), 69],
  [s(8, 0.5), 85],
  [s(8, 1), 95],
  [s(8, 1.5), 105],
  [s(8, 2), 119],
  [s(9, 1), 213], // the slip lands in the bowl on V9 beat 2
  [s(9, 1) + 2.5, 218],
  [s(9, 1) + 14, 218], // held under the crossfade to /me
];
const R2_END = s(9, 1) + 2.5;
/** The crossfade from the join page to /me (after the draw), as the push begins. */
const SWAP = [R2_END + 5, R2_END + 11] as const;
const R2B_ANCHORS: Anchor[] = [
  [R2_END, 60],
  [R2_END + 64, 188],
];

type Cam = { f: number; s: number; focus: [number, number]; target: [number, number] };
const FORM: [number, number] = [1509, 551]; // the name box, the PIN and Join
const DROP: [number, number] = [1509, 372];
// Targets keep the phone's top edge about 70 px down, clear of the page's light string.
const FORM_T: [number, number] = [1440, 600];
const DROP_T: [number, number] = [1509, 505];
const CAMS: Cam[] = [
  { f: 36, s: 1, focus: FORM, target: FORM },
  { f: 60, s: 1.7, focus: FORM, target: FORM_T },
  { f: 100, s: 1.7, focus: FORM, target: FORM_T },
  { f: 124, s: 1.5, focus: DROP, target: DROP_T },
];

/**
 * The push into the slip, one camera path across the cut to 05, straight on
 * from the bowl's framing: the folded slip's top centre (where it hangs) and
 * its on-screen width move from where R2b shows them to where 05's stage
 * rests, in one direction only. 04 draws R2b along it and 05 draws its stage
 * (laid out like the app's panel) along it, inside the panel's rectangle.
 */
const toScreen = (cssX: number, cssY: number): [number, number] => [PHONE_AT.x + PHONE.screen.x + cssX * R2_K, PHONE_AT.y + PHONE.screen.y + cssY * R2_K];
export const SLIP_TOP_1X = toScreen(R2B_SLIP.cx, R2B_SLIP.top);
export const SLIP_W_1X = R2B_SLIP.w * R2_K;
export const PUSH_START = SWAP[0] + 2;
const PUSH_LEN = 212 - PUSH_START; // comes to rest 16 frames into 05
export const pushPath = (absFrame: number) => {
  const u = ease.camera(Math.min(1, Math.max(0, (absFrame - (SCENE.s04.from + PUSH_START)) / PUSH_LEN)));
  const w0 = SLIP_W_1X * 1.5;
  const p0: [number, number] = [DROP_T[0] + (SLIP_TOP_1X[0] - DROP[0]) * 1.5, DROP_T[1] + (SLIP_TOP_1X[1] - DROP[1]) * 1.5];
  // Width grows geometrically, so the push reads as a steady approach.
  const w = w0 * Math.pow(REST_SLIP.w / w0, u);
  return { w, p: [p0[0] + (REST_SLIP.x - p0[0]) * u, p0[1] + (REST_SLIP.y - p0[1]) * u] as [number, number] };
};
/** Scene-05-local frame where the push comes to rest. */
export const PUSH_DONE_IN_05 = SCENE.s04.from + PUSH_START + PUSH_LEN - SCENE.s05.from;

export const phoneCam = (lf: number): { s: number; focus: [number, number]; target: [number, number] } => {
  if (lf >= PUSH_START) {
    const { w, p } = pushPath(SCENE.s04.from + lf);
    return { s: w / SLIP_W_1X, focus: SLIP_TOP_1X, target: p };
  }
  if (lf <= CAMS[0].f) return CAMS[0];
  for (let i = 0; i < CAMS.length - 1; i++) {
    const a = CAMS[i];
    const b = CAMS[i + 1];
    if (lf <= b.f) {
      const t = ease.camera((lf - a.f) / (b.f - a.f));
      const mix = (u: number, v: number) => u + (v - u) * t;
      return {
        s: mix(a.s, b.s),
        focus: [mix(a.focus[0], b.focus[0]), mix(a.focus[1], b.focus[1])],
        target: [mix(a.target[0], b.target[0]), mix(a.target[1], b.target[1])],
      };
    }
  }
  return CAMS[CAMS.length - 1];
};

/**
 * Joy's GC message: the same markup in the phone's chat (scale 1) and as the
 * bubble lifting out of the laptop (scaled up), so the landing is a
 * one-frame swap. The link breaks after the domain, keeping the slug whole.
 */
export const MSG_W = 320;
export const MSG_H = 118;
export const JoyMessage: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const cut = SHARE_LINK.indexOf("/g/") + 1;
  return (
    <div
      style={{
        position: "absolute",
        width: MSG_W,
        height: MSG_H,
        boxSizing: "border-box",
        background: C.papel,
        border: `1.5px solid ${C.ube}`,
        borderRadius: "18px 4px 18px 18px",
        padding: "13px 18px",
        fontFamily: FONT.sans,
        fontSize: 21,
        lineHeight: 1.35,
        color: C.ube,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      Hi barkada! Sali na dito:
      <br />
      <span style={{ fontWeight: 700, textDecoration: "underline" }}>
        {SHARE_LINK.slice(0, cut)}
        <br />
        {SHARE_LINK.slice(cut)}
      </span>
    </div>
  );
};
/** The chat message's top-right corner on screen (phone at rest). */
const MSG_CORNER: [number, number] = [PHONE_AT.x + PHONE.screen.x + PHONE.screen.w - 18, PHONE_AT.y + PHONE.screen.y + 500];
export const MSG_IN = 19;

/** A generic group chat on Joy's phone (not any real messenger's look). */
const ChatScreen: React.FC<{ lf: number }> = ({ lf }) => {
  return (
    <AbsoluteFill style={{ background: "#F6F3FA" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 118, background: "#fff", borderBottom: `1.5px solid ${C.ubeLine}` }}>
        <div style={{ position: "absolute", left: 26, top: 66, fontFamily: FONT.sans, fontWeight: 700, fontSize: 25, color: C.ube }}>Barkada GC</div>
        <div style={{ position: "absolute", left: 26, top: 96, fontFamily: FONT.sans, fontSize: 15, color: C.ubeSoft }}>12 members</div>
      </div>
      {[
        { who: "Tita Luz", text: "Kailan party ulit?", y: 150 },
        { who: "Jun", text: "Game ako! Sino mag-aayos?", y: 262 },
        { who: "Bea", text: "Joy, ikaw na please", y: 374 },
      ].map((m) => (
        <div key={m.y} style={{ position: "absolute", left: 18, top: m.y }}>
          <div style={{ fontFamily: FONT.hand, fontSize: 22, color: C.ube, marginLeft: 4, lineHeight: 1.1 }}>{m.who}</div>
          <div
            style={{
              marginTop: 6,
              background: "#fff",
              border: `1.5px solid ${C.ube}`,
              borderRadius: "4px 18px 18px 18px",
              padding: "12px 16px",
              fontFamily: FONT.sans,
              fontSize: 21,
              color: C.ube,
              whiteSpace: "nowrap",
            }}
          >
            {m.text}
          </div>
        </div>
      ))}
      {lf >= MSG_IN && <JoyMessage style={{ right: 18, top: 500 }} />}
    </AbsoluteFill>
  );
};

export const S04Join: React.FC = () => {
  const lf = useLocal("s04");
  const enterX = tw(lf, -16, 2, 1920, 0, ease.camera);
  const cam = phoneCam(lf);
  const browserY = tw(lf, BROWSER_IN, BROWSER_IN + 9, PHONE.screen.h, 0, ease.paper);
  const linkTap = lf - TAP_LINK;
  return (
    <AbsoluteFill style={{ transform: `translateX(${enterX}px)`, background: C.lilac, overflow: "hidden" }}>
      <LightString top={4} lit={() => true} />
      {/* Under the phone: the push into the screen covers it. */}
      <Headline frame={lf} text={"Join with a name\nand a PIN."} start={8} style={{ position: "absolute", left: 140, top: 196 }} />
      <Line frame={lf} start={44} style={{ position: "absolute", left: 140, top: 412 }}>
        No account, no app to install.
      </Line>
      <Camera scale={cam.s} focus={cam.focus} target={cam.target}>
        <Phone x={PHONE_AT.x} y={PHONE_AT.y}>
          {lf < SWAP[1] + 2 && <ChatScreen lf={lf} />}
          {linkTap >= 0 && linkTap <= 12 && (
            <div
              style={{
                position: "absolute",
                left: 250 - tw(linkTap, 0, 12, 24, 64) / 2,
                top: 591 - tw(linkTap, 0, 12, 24, 64) / 2,
                width: tw(linkTap, 0, 12, 24, 64),
                height: tw(linkTap, 0, 12, 24, 64),
                borderRadius: "50%",
                border: `3px solid ${C.ube}`,
                opacity: tw(linkTap, 0, 12, 0.9, 0),
                boxSizing: "border-box",
              }}
            />
          )}
          <AtCut id="s04">
            <AbsoluteFill style={{ transform: `translateY(${browserY}px)` }}>
              {lf < SWAP[1] + 1 && <RecClip src="rec/r2-join.mp4" anchors={R2_ANCHORS} />}
              {lf >= SWAP[0] - 1 && (
                <AbsoluteFill style={{ opacity: tw(lf, SWAP[0], SWAP[1], 0, 1, ease.linear) }}>
                  <RecClip src="rec/r2b-me.mp4" anchors={R2B_ANCHORS} />
                </AbsoluteFill>
              )}
              <Pointer log={r2.pointer as PointerLog} anchors={R2_ANCHORS} k={R2_K} kind="tap" />
            </AbsoluteFill>
          </AtCut>
        </Phone>
      </Camera>
    </AbsoluteFill>
  );
};

/**
 * The GC message lifting out of the laptop on "Copy link" (scene 03), held
 * in screen space through the pan, landing in the phone's chat (scene 04).
 */
export const GcHandOff: React.FC = () => {
  const f = useCurrentFrame();
  const copy = SCENE.s03.from + R1_COPY;
  const landed = SCENE.s04.from + MSG_IN;
  if (f < copy || f >= landed) return null;
  // Where the link box is on screen at the click (the in-screen zoom included).
  const box = r1.linkBox;
  const linkCentre = r1ToScreen(box.x + box.width / 2, box.y + box.height / 2, R1_COPY);
  const BIG = 1.62; // 34 px text, as in the storyboard
  const SMALL = 0.6;
  const corner = (c: [number, number], k: number): [number, number] => [c[0] + (MSG_W / 2) * k, c[1] - (MSG_H / 2) * k];
  const from = corner(linkCentre, SMALL);
  const rest = corner([1400, 860], BIG);
  const lift = tw(f, copy, copy + 20, 0, 1, ease.paper);
  const land = tw(f, SCENE.s04.from + 3, landed, 0, 1, ease.camera);
  const x = from[0] + (rest[0] - from[0]) * lift + (MSG_CORNER[0] - rest[0]) * land;
  const drift = tw(f, copy + 20, SCENE.s04.from + 3, 0, -12, ease.linear) * (1 - land);
  const y = from[1] + (rest[1] - from[1]) * lift + (MSG_CORNER[1] - rest[1]) * land + drift;
  const k = (SMALL + (BIG - SMALL) * lift) * (1 + (1 / BIG - 1) * land);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <JoyMessage style={{ left: x - MSG_W, top: y, transformOrigin: "100% 0%", transform: `scale(${k})`, opacity: tw(f, copy, copy + 3, 0, 1, ease.linear) }} />
    </AbsoluteFill>
  );
};
