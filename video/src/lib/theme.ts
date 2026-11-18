/** The app's palette (docs/DESIGN.md) and type, loaded from the app's own font files. */
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const C = {
  lilac: "#EEE9F6",
  ube: "#3F1F63",
  ubeSky: "#4A2873",
  ubeSoft: "#5A4A6B",
  ubeLine: "#B9A6D9",
  ubeMist: "#D9D0E2",
  dahon: "#1F6B45",
  pula: "#C4283A",
  pulaLit: "#E4606E",
  ilaw: "#F4C542",
  ilawLit: "#FFE9A3",
  tagPink: "#F9D5D9",
  tagGreen: "#D7ECDD",
  papel: "#FFFFFF",
  sipit: "#D9A860",
  gabi: "#1E1238",
  gabi2: "#251746",
  gabiText: "#EBDFF8",
  gabiLine: "#9C87C4",
  night: "#2C1548",
  rayGold: "#C99A1A",
} as const;

export const FONT = {
  head: "'Chelsea Market', ui-rounded, system-ui, sans-serif",
  sans: "'Atkinson Hyperlegible', ui-sans-serif, system-ui, sans-serif",
  hand: "'Gochi Hand', cursive",
} as const;

/** The one shadow: the slip's flat offset, scaled for video. */
export const SLIP_SHADOW = "6px 8px 0 rgba(30,18,56,.45)";

loadFont({ family: "Chelsea Market", url: staticFile("fonts/chelsea-market-latin-400-normal.woff"), weight: "400" });
loadFont({ family: "Atkinson Hyperlegible", url: staticFile("fonts/atkinson-hyperlegible-latin-400-normal.woff"), weight: "400" });
loadFont({ family: "Atkinson Hyperlegible", url: staticFile("fonts/atkinson-hyperlegible-latin-700-normal.woff"), weight: "700" });
loadFont({ family: "Gochi Hand", url: staticFile("fonts/gochi-hand-latin-400-normal.woff"), weight: "400" });
