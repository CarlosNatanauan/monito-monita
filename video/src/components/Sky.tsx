/**
 * The evening sky: ube with rays in a second ube tone fanning from the
 * parol, and the disc of gold rays behind the opened slip. Same geometry
 * as the app's repeating-conic-gradients (9 deg stripes, 10 deg gold
 * rays), drawn as SVG wedges so the long edges stay anti-aliased while
 * they turn.
 */
import type React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../lib/theme";

const wedge = (cx: number, cy: number, a0: number, a1: number, r: number) => {
  // Angles in degrees, clockwise from north (CSS conic convention).
  const p = (a: number) => {
    const rad = (a * Math.PI) / 180;
    return `${(cx + r * Math.sin(rad)).toFixed(2)} ${(cy - r * Math.cos(rad)).toFixed(2)}`;
  };
  return `M${cx} ${cy}L${p(a0)}L${p(a1)}Z`;
};

/** Full-bleed sky. `origin` is the parol's position in px; `rotate` turns the rays (deg). */
export const Sky: React.FC<{
  origin: [number, number];
  rotate?: number;
  base?: string;
  ray?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({ origin, rotate = 0, base = C.ube, ray = C.ubeSky, width = 1920, height = 1080, style }) => {
  const [cx, cy] = origin;
  const r = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy)) + 40;
  const d = Array.from({ length: 20 }, (_, i) => wedge(cx, cy, 9 + 18 * i + rotate, 18 + 18 * i + rotate, r)).join("");
  return (
    <AbsoluteFill style={{ background: base, ...style }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
        <path d={d} fill={ray} />
      </svg>
    </AbsoluteFill>
  );
};

/** The disc of gold rays (never text on it). `size` is its diameter. */
export const RayDisc: React.FC<{ size: number; rotate?: number; style?: React.CSSProperties }> = ({ size, rotate = 0, style }) => {
  const c = size / 2;
  const d = Array.from({ length: 18 }, (_, i) => wedge(c, c, 20 * i + rotate, 20 * i + 10 + rotate, c * 1.5)).join("");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style} aria-hidden>
      <defs>
        <clipPath id={`disc-${size}`}>
          <circle cx={c} cy={c} r={c} />
        </clipPath>
      </defs>
      <path d={d} fill={C.ilaw} clipPath={`url(#disc-${size})`} />
    </svg>
  );
};
