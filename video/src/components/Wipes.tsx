/**
 * Physical transitions (storyboard section 2): a lilac sheet with a
 * hand-cut edge sliding in from the right, and a papel de japon sheet with
 * a cut fringe dropping from the top. Each carries the next scene on it.
 */
import type React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, rand, tw } from "../lib/motion";

/** The hand-cut left edge, in the sheet's own coordinates. */
const CUT_EDGE = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 18; i++) {
    const y = (1080 / 18) * i;
    const x = 6 + rand(i + 40) * 26;
    pts.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
  }
  return pts;
})();

/** Slides children in from the right between frames f0 and f1 (local). */
export const CutPaperWipe: React.FC<{ f0: number; f1: number; children: React.ReactNode }> = ({ f0, f1, children }) => {
  const frame = useCurrentFrame();
  const x = tw(frame, f0, f1, 1960, 0, ease.camera);
  return (
    // The cut edge only while the sheet moves: once it lands it would show as a strip.
    <AbsoluteFill style={{ transform: `translateX(${x}px)`, clipPath: frame < f1 ? `polygon(${CUT_EDGE.join(", ")}, 1960px 1080px, 1960px 0px)` : undefined }}>
      <AbsoluteFill style={{ left: 0 }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const STRIP_W = 32;
const STRIP_H = 48;

/**
 * Drops children from the top, easing in and out, landing at f1 a little low
 * and settling back over `settle` frames; the fringe flutters as it lands.
 */
export const FringeWipe: React.FC<{ f0: number; f1: number; color: string; settle?: number; children: React.ReactNode }> = ({ f0, f1, color, settle = 7, children }) => {
  const frame = useCurrentFrame();
  const over = settle > 0 ? 12 : 0;
  const y = frame <= f1 ? tw(frame, f0, f1, -1080 - STRIP_H - 10, over, ease.camera) : settle > 0 ? tw(frame, f1, f1 + settle, over, 0, ease.paper) : 0;
  const n = Math.ceil(1920 / (STRIP_W + 8)) + 1;
  return (
    <AbsoluteFill style={{ transform: `translateY(${y}px)` }}>
      <AbsoluteFill style={{ background: color }}>{children}</AbsoluteFill>
      {Array.from({ length: n }, (_, i) => {
        const flutter = frame > f1 - 10 && frame < f1 + 14 ? Math.sin(frame * 0.9 + i * 0.7) * (3 + rand(i) * 3) * tw(frame, f1, f1 + 14, 1, 0, ease.linear) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * (STRIP_W + 8) - 4,
              top: 1078,
              width: STRIP_W,
              height: STRIP_H - rand(i + 9) * 8,
              background: color,
              transformOrigin: "50% 0%",
              transform: `rotate(${flutter + (rand(i + 3) - 0.5) * 4}deg)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
