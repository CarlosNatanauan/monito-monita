/**
 * Devices drawn flat in the app's vocabulary (storyboard section 2): no
 * photoreal mockups, no shadows. Children fill the screen.
 */
import type React from "react";
import { C } from "../lib/theme";

export const LAPTOP = { w: 1000, h: 640, screen: { x: 20, y: 20, w: 960, h: 600 } };
export const PHONE = { w: 438, h: 915, screen: { x: 14, y: 14, w: 410, h: 887 } };
export const TV = { w: 1160, h: 670, screen: { x: 20, y: 20, w: 1120, h: 630 } };

const abs = (x: number, y: number, w: number, h: number): React.CSSProperties => ({ position: "absolute", left: x, top: y, width: w, height: h });

export const Laptop: React.FC<{ x: number; y: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, children, style }) => (
  <div style={{ ...abs(x, y, LAPTOP.w, LAPTOP.h + 34), ...style }}>
    {/* Base: a slab with an ube outline and a notch, wider than the lid. */}
    <div
      style={{
        ...abs(-70, LAPTOP.h - 2, LAPTOP.w + 140, 32),
        background: C.ubeMist,
        border: `2.5px solid ${C.ube}`,
        borderRadius: "4px 4px 22px 22px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ ...abs((LAPTOP.w + 140) / 2 - 80 - 2.5, -2.5, 160, 10), background: C.ubeLine, borderRadius: "0 0 8px 8px" }} />
    </div>
    <div style={{ ...abs(0, 0, LAPTOP.w, LAPTOP.h), background: C.ube, borderRadius: "22px 18px 24px 18px" }} />
    <div style={{ ...abs(LAPTOP.screen.x, LAPTOP.screen.y, LAPTOP.screen.w, LAPTOP.screen.h), overflow: "hidden", background: C.lilac, borderRadius: 4 }}>
      {children}
    </div>
  </div>
);

export const Phone: React.FC<{ x: number; y: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, children, style }) => (
  <div style={{ ...abs(x, y, PHONE.w, PHONE.h), ...style }}>
    <div style={{ ...abs(0, 0, PHONE.w, PHONE.h), background: C.ube, borderRadius: "58px 52px 60px 52px" }} />
    <div
      style={{
        ...abs(PHONE.screen.x, PHONE.screen.y, PHONE.screen.w, PHONE.screen.h),
        overflow: "hidden",
        background: C.lilac,
        borderRadius: "46px 40px 48px 40px",
      }}
    >
      {children}
      <div style={{ ...abs(PHONE.screen.w / 2 - 55, 11, 110, 26), background: C.ube, borderRadius: 13 }} />
    </div>
  </div>
);

export const Tv: React.FC<{ x: number; y: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, children, style }) => (
  <div style={{ ...abs(x, y, TV.w, TV.h + 22), ...style }}>
    <div style={{ ...abs(150, TV.h - 4, 70, 26), background: C.gabi }} />
    <div style={{ ...abs(TV.w - 220, TV.h - 4, 70, 26), background: C.gabi }} />
    <div style={{ ...abs(0, 0, TV.w, TV.h), background: C.gabi, border: `3px solid ${C.gabiLine}`, borderRadius: 14, boxSizing: "border-box" }} />
    <div style={{ ...abs(TV.screen.x, TV.screen.y, TV.screen.w, TV.screen.h), overflow: "hidden", background: C.gabi }}>{children}</div>
  </div>
);
