/**
 * Plays a recording (60 fps, 16 ms of app time per frame) with an edit
 * expressed as anchors: [compFrame, recFrame] pairs, linear in between, so
 * a moment in the recording can be put on a beat. The pointer and tap
 * rings are drawn here (no system cursor was recorded), from the log the
 * recorder wrote.
 */
import { Video } from "@remotion/media";
import type React from "react";
import { Freeze, Sequence, staticFile, useCurrentFrame } from "remotion";
import { tw } from "../lib/motion";
import { C } from "../lib/theme";

export type Anchor = [comp: number, rec: number];
export type PointerLog = ({ f: number; t: "move" | "down" | "up" | "tap"; x: number; y: number } | { f: number; t: "mark"; label: string })[];

/** Recording frame shown at a comp frame. */
export const recAt = (anchors: Anchor[], comp: number) => {
  if (comp <= anchors[0][0]) return anchors[0][1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [c0, r0] = anchors[i];
    const [c1, r1] = anchors[i + 1];
    if (comp <= c1) return r0 + ((comp - c0) / (c1 - c0)) * (r1 - r0);
  }
  return anchors[anchors.length - 1][1];
};

/** Comp frame at which a recording frame shows (first occurrence). */
export const compAt = (anchors: Anchor[], rec: number) => {
  for (let i = 0; i < anchors.length - 1; i++) {
    const [c0, r0] = anchors[i];
    const [c1, r1] = anchors[i + 1];
    if (r1 > r0 && rec >= r0 && rec <= r1) return c0 + ((rec - r0) / (r1 - r0)) * (c1 - c0);
  }
  return null;
};

export const RecClip: React.FC<{ src: string; anchors: Anchor[]; style?: React.CSSProperties }> = ({ src, anchors, style }) => {
  const full: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", ...style };
  return (
    <>
      {anchors.slice(0, -1).map(([c0, r0], i) => {
        const [c1, r1] = anchors[i + 1];
        const from = Math.round(c0);
        const dur = Math.round(c1) - from;
        if (dur <= 0) return null;
        const trim = Math.round(r0) / 2;
        if (r1 <= r0) {
          return (
            <Sequence key={i} from={from} durationInFrames={dur} layout="none">
              <Freeze frame={0}>
                <Video src={staticFile(src)} trimBefore={trim} muted style={full} objectFit="fill" />
              </Freeze>
            </Sequence>
          );
        }
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <Video src={staticFile(src)} trimBefore={trim} playbackRate={(r1 - r0) / 2 / dur} muted style={full} objectFit="fill" />
          </Sequence>
        );
      })}
    </>
  );
};

const ARROW = "M0 0L0 27.5L7.3 21.2L12.4 32.6L17.4 30.4L12.3 19.2L21.6 19.2Z";

/**
 * The ube arrow cursor (36 px, 2.5 px white edge) and click rings, or tap
 * rings only (phone). `k` converts recording CSS px to screen px.
 */
export const Pointer: React.FC<{
  log: PointerLog;
  anchors: Anchor[];
  k: number;
  kind: "cursor" | "tap";
  hideBefore?: number;
  hideAfter?: number;
}> = ({ log, anchors, k, kind, hideBefore = -Infinity, hideAfter = Infinity }) => {
  const frame = useCurrentFrame();
  const r = recAt(anchors, frame);
  const moves = log.filter((e): e is Extract<PointerLog[number], { x: number }> => e.t !== "mark");
  const rings = moves
    .filter((e) => (kind === "cursor" ? e.t === "down" : e.t === "tap"))
    .map((e) => ({ ...e, c: compAt(anchors, e.f) }))
    .filter((e) => e.c !== null) as { x: number; y: number; c: number }[];

  let x = 0;
  let y = 0;
  const path = moves.filter((e) => e.t === "move" || e.t === "down");
  for (let i = 0; i < path.length; i++) {
    if (path[i].f <= r) {
      x = path[i].x;
      y = path[i].y;
      const next = path[i + 1];
      if (next && next.f > r && next.f - path[i].f <= 2) {
        const t = (r - path[i].f) / (next.f - path[i].f);
        x += (next.x - x) * t;
        y += (next.y - y) * t;
      }
    }
  }
  const lastDown = rings.filter((e) => e.c <= frame).pop();
  const pressed = kind === "cursor" && lastDown && frame - lastDown.c < 4;
  const visible = frame >= hideBefore && frame <= hideAfter;

  return (
    <>
      {rings.map((e, i) => {
        const age = frame - e.c;
        if (age < 0 || age > 12) return null;
        const d = tw(age, 0, 12, 24, 64);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: e.x * k - d / 2,
              top: e.y * k - d / 2,
              width: d,
              height: d,
              borderRadius: "50%",
              border: `3px solid ${C.ube}`,
              opacity: tw(age, 0, 12, 0.9, 0),
              boxSizing: "border-box",
            }}
          />
        );
      })}
      {kind === "cursor" && visible && (
        <svg
          width={24}
          height={36}
          viewBox="-1.5 -1.5 24 36"
          style={{ position: "absolute", left: x * k - 1.5, top: y * k - 1.5, transform: `scale(${pressed ? 0.9 : 1})`, transformOrigin: "1.5px 1.5px", overflow: "visible" }}
        >
          <path d={ARROW} fill={C.ube} stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );
};
