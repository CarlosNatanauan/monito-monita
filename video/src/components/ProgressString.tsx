/**
 * The organizer's progress lights, full width (the app's LightRow, bigger):
 * one bulb per member. Off = white, on = ilaw, newest = ilaw-lit with four
 * short drawn rays. Always shown with the count in words.
 */
import type React from "react";
import { C } from "../lib/theme";

export type BulbState = "off" | "on" | "glow" | "pale";

const RX = [5, 6, 5.5, 6, 5, 6.5, 5.5, 6, 5, 6, 5.5, 6];
const RY = [8, 7, 8.5, 8, 7.5, 8, 7, 8.5, 8, 7.5, 8, 7];
const TILT = [8, -6, 5, -9, 4, -4, 7, -7, 6, -5, 9, -8];
const K = 4.4;

/** The wire: M40 40 Q960 200 1880 40 (lowest point y 120 at the centre). */
export const progressWireY = (x: number) => {
  const t = (x - 40) / 1840;
  return 40 + 320 * t * (1 - t);
};
export const progressBulbX = (i: number) => 120 + i * 153.6;

export const ProgressString: React.FC<{
  states: BulbState[];
  wire?: string;
  outline?: string;
  offFill?: string;
  style?: React.CSSProperties;
}> = ({ states, wire = C.ube, outline = C.ube, offFill = C.papel, style }) => (
  <svg width={1920} height={260} viewBox="0 0 1920 260" style={{ position: "absolute", left: 0, top: 0, ...style }} aria-hidden>
    <path d="M40 40Q960 200 1880 40" fill="none" stroke={wire} strokeWidth="3" />
    {states.map((state, i) => {
      const cx = progressBulbX(i);
      const cy = progressWireY(cx) + 9 * K * 0.85;
      const rx = RX[i % 12] * K;
      const ry = RY[i % 12] * K;
      return (
        <g key={i}>
          <line x1={cx} y1={progressWireY(cx)} x2={cx} y2={cy - ry + 4} stroke={wire} strokeWidth="3" />
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            transform={`rotate(${TILT[i % 12]} ${cx} ${cy})`}
            fill={state === "off" ? offFill : state === "on" ? C.ilaw : C.ilawLit}
            stroke={outline}
            strokeWidth="3"
          />
          {state === "glow" && (
            <path
              d={`M${cx - 44} ${cy + 6}h-18M${cx + 44} ${cy + 6}h18M${cx - 31} ${cy + 46}l-13 13M${cx + 31} ${cy + 46}l13 13`}
              fill="none"
              stroke={C.rayGold}
              strokeWidth="6"
              strokeLinecap="round"
            />
          )}
        </g>
      );
    })}
  </svg>
);
