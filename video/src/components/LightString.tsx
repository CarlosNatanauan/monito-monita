/**
 * The decorative light string (docs/DESIGN.md, "Light string"; the app's
 * art-swag-* symbols): one continuous wire sagging between nails, 12 bulbs
 * per swag cycling gold, red, pale gold, green. Lit = bright glass, white
 * highlight and a flat painted halo; off = a darker version of its colour.
 * State changes are fill swaps (no fades), as in the storyboard.
 */
import type React from "react";
import { C } from "../lib/theme";

const SWAG = 360;
const CAP = 4;
const GOLD = ["#F4C542", "#8C6F24", "#F4C542"];
const RED = ["#C4283A", "#64202E", "#C4283A"];
const PALE = ["#FFE9A3", "#A8976A", "#F4C542"];
const GREEN = ["#1F6B45", "#1C3B2D", "#1F6B45"];
const LOOKS: [number, number, number, string[]][] = [
  [5, 8, 8, GOLD],
  [6, 7, -6, RED],
  [5.5, 8.5, 5, PALE],
  [6, 8, -9, GREEN],
  [5, 7.5, 4, GOLD],
  [6.5, 8, -4, RED],
  [5.5, 7, 7, PALE],
  [6, 8.5, -7, GREEN],
  [5, 8, 6, GOLD],
  [6, 7.5, -5, RED],
  [5.5, 8, 9, PALE],
  [6, 7, -8, GREEN],
];
const wireY = (x: number) => {
  const t = x / SWAG;
  return 5 + 48 * t * (1 - t);
};

export type StringVariant = "page" | "sky";

/**
 * `lit(i)` says whether bulb i (0 = leftmost visible) is on. `scale` is the
 * size relative to the app (1.3 at 1080p, as in the storyboard frames).
 */
export const LightString: React.FC<{
  width?: number;
  scale?: number;
  top?: number;
  lit: (i: number) => boolean;
  variant?: StringVariant;
  style?: React.CSSProperties;
}> = ({ width = 1920, scale = 1.3, top = 0, lit, variant = "page", style }) => {
  const swagPx = SWAG * scale;
  const n = Math.ceil(width / swagPx) + 1;
  // A sag centred on the frame, like the app centres one on the window.
  const offset = width / 2 - (n * swagPx) / 2;
  const wire = variant === "sky" ? C.ubeLine : C.ube;
  const ink = variant === "sky" ? "#241040" : C.ube;
  const bulbs: React.ReactNode[] = [];
  const caps: React.ReactNode[] = [];
  let visible = 0;
  for (let s = 0; s < n; s++) {
    const x0 = s * SWAG;
    caps.push(
      <g key={`n${s}`} transform={`translate(${x0} 0)`}>
        <circle cx="0" cy="2.4" r="2.2" fill={ink} />
        <circle cx="-0.6" cy="1.8" r="0.7" fill="#fff" fillOpacity="0.55" />
      </g>,
    );
    LOOKS.forEach(([rx, ry, tilt, [on, off, halo]], i) => {
      const x = x0 + 15 + 30 * i;
      const screenX = offset + x * scale;
      const idx = screenX > -20 && screenX < width + 20 ? visible++ : -1;
      const isLit = idx >= 0 && lit(idx);
      const cy = CAP - 0.6 + ry;
      const tr = `translate(${x} ${wireY(15 + 30 * i).toFixed(2)}) rotate(${tilt})`;
      bulbs.push(
        <g key={`b${s}-${i}`} transform={tr}>
          {isLit && (
            <>
              <circle cx="0" cy={cy} r={ry + 6} fill={halo} fillOpacity="0.14" />
              <circle cx="0" cy={cy} r={ry + 3} fill={halo} fillOpacity="0.22" />
            </>
          )}
          <ellipse cx="0" cy={cy} rx={rx} ry={ry} fill={isLit ? on : off} stroke={C.ube} strokeWidth="1.1" />
          {isLit && <ellipse cx={-rx * 0.4} cy={CAP + ry * 0.6} rx="1.2" ry="2.3" fill="#fff" fillOpacity="0.85" />}
        </g>,
      );
      caps.push(<rect key={`c${s}-${i}`} transform={tr} x="-2.6" y="-0.8" width="5.2" height={CAP + 0.6} rx="1.1" fill={ink} />);
    });
  }
  const d = Array.from({ length: n }, (_, s) => `M${s * SWAG} 5Q${s * SWAG + 180} 29 ${(s + 1) * SWAG} 5`).join("");
  return (
    <svg
      width={width}
      height={48 * scale}
      viewBox={`${-offset / scale} 0 ${width / scale} 48`}
      style={{ position: "absolute", left: 0, top, overflow: "visible", ...style }}
      aria-hidden
    >
      <path d={d} fill="none" stroke={wire} strokeWidth="1.3" />
      {bulbs}
      {caps}
    </svg>
  );
};
