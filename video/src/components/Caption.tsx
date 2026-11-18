/**
 * Captions (storyboard section 2): headline in Chelsea Market, lettered in
 * word by word (4 frames apart, each rising 12 px and fading in over 10
 * frames); the line under it in Atkinson rises in afterwards (paper, 18
 * frames). Captions leave with their scene, never on their own.
 */
import type React from "react";
import { useCurrentFrame } from "remotion";
import { ease, tw } from "../lib/motion";
import { C, FONT } from "../lib/theme";

/** Frames a headline takes to letter in. */
export const letteringFrames = (text: string) => (text.split(/\s+/).filter(Boolean).length - 1) * 4 + 10;

export const Headline: React.FC<{
  text: string;
  start: number;
  size?: number;
  color?: string;
  lineHeight?: number;
  style?: React.CSSProperties;
  /** The scene's local frame (defaults to the current frame). */
  frame?: number;
}> = ({ text, start, size = 84, color = C.ube, lineHeight = 1.06, style, frame: given }) => {
  const current = useCurrentFrame();
  const frame = given ?? current;
  const lines = text.split("\n");
  let w = 0;
  return (
    <div style={{ fontFamily: FONT.head, fontSize: size, lineHeight, color, ...style }}>
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {line.split(" ").map((word, i) => {
            const f0 = start + 4 * w++;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: "0.26em",
                  opacity: tw(frame, f0, f0 + 10, 0, 1, ease.paper),
                  transform: `translateY(${tw(frame, f0, f0 + 10, 12, 0, ease.paper)}px)`,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Line: React.FC<{
  children: React.ReactNode;
  start: number;
  size?: number;
  color?: string;
  weight?: 400 | 700;
  lineHeight?: number;
  style?: React.CSSProperties;
  frame?: number;
}> = ({ children, start, size = 38, color = C.ubeSoft, weight = 400, lineHeight = 1.35, style, frame: given }) => {
  const current = useCurrentFrame();
  const frame = given ?? current;
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        color,
        opacity: tw(frame, start, start + 18, 0, 1, ease.paper),
        transform: `translateY(${tw(frame, start, start + 18, 40, 0, ease.paper)}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
