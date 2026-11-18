/**
 * 08 How it's built (storyboard frame 08): four gift tags are lowered on
 * their twine onto the light string, one per eighth note, and settle with
 * a small swing; one fact per tag. Every claim is checked against the repo
 * (tests/draw.test.ts brute force, e2e leak tests, Lighthouse 93 to 95 on
 * the landing, the persona test). The sheet then lifts away to the night.
 */
import type React from "react";
import { AbsoluteFill, Easing } from "remotion";
import { Headline } from "../components/Caption";
import { GiftTag } from "../components/Paper";
import { FringeWipe } from "../components/Wipes";
import { ease, hang, tw } from "../lib/motion";
import { at, EIGHTH, SCENE } from "../lib/time";
import { C } from "../lib/theme";
import { useLocal } from "./common";

const LEN = SCENE.s08.to - SCENE.s08.from;
const wireY = (x: number) => {
  const t = x / 1920;
  return (1 - t) * (1 - t) * 310 + 2 * t * (1 - t) * 452 + t * t * 300;
};

export const TAGS = [
  { x: 280, rot: -3, tint: C.ilawLit, title: "Fair draw", line: "Verified against brute force" },
  { x: 720, rot: 2, tint: C.tagPink, title: "No leaks", line: "Pairs stay secret: automated leak tests" },
  { x: 1160, rot: -2, tint: C.tagGreen, title: "Lighthouse 93+", line: "Fast on budget phones" },
  { x: 1600, rot: 3, tint: C.papel, title: "Usability tested", line: "With AI personas" },
];
/** Local frames the tags come to rest on the wire: eighth notes from V20 beat 2. */
export const TAG_CATCH = TAGS.map((_, i) => at(20, 1) - SCENE.s08.from + i * EIGHTH);
const LOWER = 15; // frames each tag takes to come down
const LOWER_FROM = -90; // px above its rest
const TWINE = 104;
const TAG_H = 350;
/** The sheet lifts away to the night of 09, centred on the cut. */
export const LIFT = [LEN - 9, LEN + 9] as const;
const easeOutCubic = Easing.bezier(0.33, 1, 0.68, 1);

const GOLD = ["#F4C542", "#C4283A", "#FFE9A3", "#1F6B45"];

const Wire: React.FC = () => {
  const bulbs: React.ReactNode[] = [];
  let n = 0;
  for (let x = 30; x < 1900; x += 62) {
    if (TAGS.some((t) => Math.abs(t.x - x) < 34)) continue;
    const y = wireY(x);
    const c = GOLD[n % 4];
    const tilt = [8, -6, 5, -9][n % 4];
    bulbs.push(
      <g key={x} transform={`translate(${x} ${y.toFixed(1)}) rotate(${tilt})`}>
        <rect x="-3.4" y="-1" width="6.8" height="6.5" rx="1.4" fill={C.ube} />
        <ellipse cx="0" cy="17" rx="8.5" ry="12" fill={c} stroke={C.ube} strokeWidth="1.6" />
        <ellipse cx="-3" cy="12" rx="1.6" ry="3.2" fill="#fff" fillOpacity="0.8" />
      </g>,
    );
    n++;
  }
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d="M-40 312Q960 452 1960 298" fill="none" stroke={C.ube} strokeWidth="2.4" />
      {bulbs}
    </svg>
  );
};

export const S08Built: React.FC = () => {
  const lf = useLocal("s08");
  const liftY = tw(lf, LIFT[0], LIFT[1], 0, -1080 - 70, ease.camera);
  const drift = tw(lf, -14, LIFT[1], 10, -10, ease.linear);
  return (
    <AbsoluteFill style={{ transform: `translateY(${liftY}px)` }}>
      <FringeWipe f0={0} f1={14} color={C.lilac}>
        <AbsoluteFill style={{ background: C.lilac, overflow: "hidden" }}>
          <AbsoluteFill style={{ transform: `translateX(${drift}px)` }}>
            <Wire />
            {TAGS.map((t, i) => {
              const c = TAG_CATCH[i];
              // Lowered on its twine: the knot stays on the wire, the twine pays out.
              const y = tw(lf, c - LOWER, c, LOWER_FROM, 0, easeOutCubic);
              const swing = hang(lf, c, i % 2 ? 3 : -3);
              const wire = wireY(t.x);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: t.x - 200,
                    top: wire - 34,
                    width: 400,
                    height: 34 + TWINE + TAG_H,
                    transformOrigin: "200px 34px",
                    transform: `rotate(${swing}deg)`,
                    opacity: tw(lf, c - LOWER, c - LOWER + 7, 0, 1, ease.linear),
                  }}
                >
                  <svg width={16} height={12} style={{ position: "absolute", left: 192, top: 28, overflow: "visible" }}>
                    <path d="M2 6C2 0 14 0 14 6" fill="none" stroke={C.ube} strokeWidth="2" />
                  </svg>
                  <div style={{ position: "absolute", left: 199, top: 34, width: 2, height: TWINE + y, background: C.ube }} />
                  <GiftTag
                    tint={t.tint}
                    title={t.title}
                    line={t.line}
                    h={TAG_H}
                    style={{ left: 0, top: TWINE + y, transformOrigin: "200px 34px", transform: `rotate(${t.rot}deg)` }}
                  />
                </div>
              );
            })}
          </AbsoluteFill>
          <Headline frame={lf} text="How it's built" start={2} style={{ position: "absolute", left: 140, top: 146 }} />
        </AbsoluteFill>
      </FringeWipe>
    </AbsoluteFill>
  );
};
