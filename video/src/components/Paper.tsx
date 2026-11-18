/**
 * Paper materials (docs/DESIGN.md: different jobs, different materials):
 * bunutan slips, chat bubbles, the GC message bubble, gift tags, the white
 * string with its sipit.
 */
import type React from "react";
import { C, FONT, SLIP_SHADOW } from "../lib/theme";

/** A torn or folded paper slip with a name in Gochi Hand (scene 02). */
export const PaperSlip: React.FC<{
  w: number;
  h: number;
  name?: string;
  size?: number;
  folded?: boolean;
  struck?: boolean;
  style?: React.CSSProperties;
}> = ({ w, h, name, size = 64, folded, struck, style }) => (
  <div
    style={{
      position: "absolute",
      width: w,
      height: h,
      background: folded ? `linear-gradient(162deg, transparent 49.4%, ${C.ubeLine} 49.4% 50.2%, #F6F1FB 50.2%), #fff` : C.papel,
      border: `1.5px solid ${C.ube}`,
      boxShadow: SLIP_SHADOW,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...style,
    }}
  >
    {name && (
      <span style={{ fontFamily: FONT.hand, fontSize: size, color: C.ube, position: "relative", lineHeight: 1 }}>
        {name}
        {struck && (
          <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{ position: "absolute", left: "-8%", top: "28%", width: "116%", height: "40%", overflow: "visible" }}>
            <path d="M0 14 C 20 6, 45 16, 62 8 S 90 4, 100 10" fill="none" stroke={C.ube} strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </span>
    )}
  </div>
);

/** A generic chat bubble: sender in Gochi Hand, message in Atkinson (scene 02). Not any real messenger's style. */
export const ChatBubble: React.FC<{ sender: string; text: string; style?: React.CSSProperties }> = ({ sender, text, style }) => (
  <div style={{ position: "absolute", ...style }}>
    <div style={{ fontFamily: FONT.hand, fontSize: 28, color: C.ube, lineHeight: 1, margin: "0 0 7px 2px" }}>{sender}</div>
    <div
      style={{
        background: C.papel,
        border: `2px solid ${C.ube}`,
        borderRadius: "4px 22px 22px 22px",
        padding: "15px 26px",
        fontFamily: FONT.sans,
        fontSize: 33,
        color: C.ube,
        whiteSpace: "nowrap",
        lineHeight: 1.2,
      }}
    >
      {text}
    </div>
  </div>
);

/** The GC message, as pasted: the real share link (scene 03 to 04). */
export const GcBubble: React.FC<{ link: string; style?: React.CSSProperties; size?: number }> = ({ link, style, size = 34 }) => (
  <div
    style={{
      position: "absolute",
      background: C.papel,
      border: `2px solid ${C.ube}`,
      borderRadius: "6px 30px 30px 30px",
      padding: `${size * 0.85}px ${size}px`,
      fontFamily: FONT.sans,
      fontSize: size,
      color: C.ube,
      lineHeight: 1.38,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    <div>Hi barkada! Sali na dito:</div>
    <div style={{ fontWeight: 700 }}>{link}</div>
  </div>
);

/**
 * A gift tag: pointed top with a punched hole (scene 08). One fact per tag.
 * The hole is at (w/2, 34); the tag hangs from it.
 */
export const GiftTag: React.FC<{ w?: number; h?: number; tint: string; title: string; line: string; style?: React.CSSProperties }> = ({
  w = 400,
  h = 400,
  tint,
  title,
  line,
  style,
}) => (
  <div style={{ position: "absolute", width: w, height: h, ...style }}>
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={`M0 ${78} L${w / 2} 0 L${w} ${78} L${w} ${h} L0 ${h} Z`} fill={tint} />
      <circle cx={w / 2} cy={34} r={10} fill={C.lilac} />
    </svg>
    <div style={{ position: "absolute", left: 38, right: 30, top: 112 }}>
      <div style={{ fontFamily: FONT.head, fontSize: 46, lineHeight: 1.05, color: C.ube, whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ fontFamily: FONT.sans, fontSize: 34, lineHeight: 1.35, color: C.ube, marginTop: 20 }}>{line}</div>
    </div>
  </div>
);
