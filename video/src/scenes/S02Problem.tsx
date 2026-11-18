/**
 * 02 The problem (storyboard frame 02): bunutan on paper, chaos in the GC.
 * The light string is there, every bulb off. Everything drops off the
 * bottom before the hard cut; the music stops for half a beat.
 */
import type React from "react";
import { AbsoluteFill } from "remotion";
import { Headline } from "../components/Caption";
import { LightString } from "../components/LightString";
import { ChatBubble, PaperSlip } from "../components/Paper";
import { ease, hang, tw } from "../lib/motion";
import { C } from "../lib/theme";
import { Camera, useLocal } from "./common";

const SLIPS = [
  { x: 145, y: 505, w: 300, h: 160, rot: -4, name: "Joy" },
  { x: 497, y: 556, w: 385, h: 155, rot: 3, name: "Tita Luz" },
  { x: 197, y: 742, w: 335, h: 150, rot: 2, name: "Marco", struck: true },
  { x: 593, y: 783, w: 265, h: 150, rot: -8, name: "Bea?" },
  { x: 178, y: 926, w: 205, h: 100, rot: 3, folded: true },
  { x: 515, y: 940, w: 210, h: 115, rot: 10, folded: true },
  { x: 835, y: 885, w: 200, h: 95, rot: 12, folded: true },
];

/** One bubble is 109 px tall (sender and text); 133 px apart leaves an even 24 px gap. */
const BUBBLE_STEP = 133;
const BUBBLES = [
  { x: 1080, sender: "Marco", text: "Wait, I picked my own name", at: 33 },
  { x: 1240, sender: "Bea", text: "Redo the bunutan?", at: 47 },
  { x: 1010, sender: "Tita Luz", text: "Who picked me? Asking lang", at: 59 },
  { x: 1290, sender: "Jun", text: "Can Migs still join?", at: 69 },
  { x: 1070, sender: "Aira", text: "Budget ulit? 500 or 1000?", at: 77 },
  { x: 1220, sender: "Carlo", text: "Lost my slip, sorry", at: 84 },
  { x: 1110, sender: "Kuya Ben", text: "Kailan party ulit?", at: 90 },
].map((b, i) => ({ ...b, y: 100 + i * BUBBLE_STEP }));

const CLEANUP = 117;

export const S02Problem: React.FC = () => {
  const lf = useLocal("s02");
  const enterY = tw(lf, 0, 18, 1080, 0, ease.camera);
  const drift = tw(lf, 0, 131, 1, 1.02, ease.linear);
  // The clean-up: bottom-up (lowest first, about 3 frames between bottom and top), so nothing
  // falling overtakes what is below it; all gone by the cut.
  const fall = (y: number) => {
    const k = Math.max(0, (1050 - y) / 300);
    return tw(lf, CLEANUP + k, CLEANUP + k + 11, 0, 1250, ease.drop);
  };
  return (
    <AbsoluteFill style={{ transform: `translateY(${enterY}px)`, background: C.lilac, overflow: "hidden" }}>
      <Camera scale={drift} focus={[960, 540]}>
        <LightString top={4} lit={() => false} />
        {SLIPS.map((s, i) => {
          const start = 3 + 5 * i;
          const y = tw(lf, start, start + 12, -120, 0, ease.drop);
          const settle = hang(lf, start + 12, i % 2 ? 7 : -7);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: s.x,
                top: s.y,
                opacity: tw(lf, start, start + 6, 0, 1, ease.linear),
                transform: `translateY(${y + fall(s.y + s.h)}px) rotate(${s.rot + settle}deg)`,
                transformOrigin: "50% 0%",
              }}
            >
              <PaperSlip w={s.w} h={s.h} name={s.name} folded={s.folded} struck={s.struck} />
            </div>
          );
        })}
        {BUBBLES.map((b, i) => {
          const p = tw(lf, b.at, b.at + 6, 0, 1, ease.paper);
          return (
            <ChatBubble
              key={i}
              sender={b.sender}
              text={b.text}
              style={{
                left: b.x,
                top: b.y,
                opacity: p,
                transform: `translate(${(1 - p) * 60}px, ${fall(b.y + 109)}px) scale(${0.92 + 0.08 * p})`,
                transformOrigin: "0% 50%",
              }}
            />
          );
        })}
      </Camera>
      <Headline frame={lf} text="Bunutan on paper." start={5} style={{ position: "absolute", left: 145, top: 133 }} />
      <Headline frame={lf} text={"Chaos in the\ngroup chat."} start={16} style={{ position: "absolute", left: 145, top: 222 }} />
    </AbsoluteFill>
  );
};
