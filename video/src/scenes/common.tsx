/**
 * Shared scene plumbing. Each scene is a <Sequence> that starts `pre`
 * frames before its cut (to overlap the incoming transition); `useLocal`
 * gives the frame relative to the cut (negative during the pre-roll).
 */
import type React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { SCENE, type SceneId } from "../lib/time";

export const PRE: Record<SceneId, number> = { s01: 0, s02: 0, s03: 0, s04: 16, s05: 0, s06: 13, s07: 10, s08: 16, s09: 9 };
export const POST: Record<SceneId, number> = { s01: 18, s02: 1, s03: 3, s04: 14, s05: 3, s06: 10, s07: 0, s08: 9, s09: 0 };

export const useLocal = (id: SceneId) => useCurrentFrame() - PRE[id];

/** A scene on the timeline, with its pre-roll and post-roll. */
export const SceneSeq: React.FC<{ id: SceneId; name: string; children: React.ReactNode }> = ({ id, name, children }) => {
  const from = SCENE[id].from - PRE[id];
  const dur = SCENE[id].to + POST[id] - from;
  return (
    <Sequence name={name} from={from} durationInFrames={dur}>
      {children}
    </Sequence>
  );
};

/** Children on the scene's local clock (frame 0 = the cut). Unmounted before it. */
export const AtCut: React.FC<{ id: SceneId; children: React.ReactNode }> = ({ id, children }) => (
  <Sequence from={PRE[id]} layout="none">
    {children}
  </Sequence>
);

/**
 * A camera: `focus` (scene px) is drawn at `target` (screen px), scaled.
 * Identity when target = focus and scale = 1.
 */
export const Camera: React.FC<{
  scale: number;
  focus: [number, number];
  target?: [number, number];
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ scale, focus, target = focus, children, style }) => {
  const tx = target[0] - focus[0] * scale;
  const ty = target[1] - focus[1] * scale;
  return (
    <AbsoluteFill style={{ transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${scale})`, ...style }}>
      {children}
    </AbsoluteFill>
  );
};
