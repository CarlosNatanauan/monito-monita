/**
 * The app's illustrations (components/art/symbols.tsx in the app, from
 * docs/design/svg/), inlined as React components. Colours unchanged; one
 * parol per frame at most.
 */
import type React from "react";
import { C } from "../lib/theme";

type SvgProps = { style?: React.CSSProperties; width?: number; height?: number };

const STAR_POINTS = "M60 12 71.17 44.63 105.65 45.17 78.07 65.87 88.21 98.83 60 79 31.79 98.83 41.93 65.87 14.35 45.17 48.83 44.63Z";

/** Paper parol with tails. viewBox 120x170; hangs from (60, 0). */
export const Parol: React.FC<SvgProps> = ({ style, width = 120 }) => (
  <svg viewBox="0 0 120 170" width={width} height={(width * 170) / 120} style={style} aria-hidden>
    <path d="M60 0V8" fill="none" stroke={C.ube} strokeWidth="1.5" />
    <path d="M31.8 100 24 123H40ZM88.2 100 80 123H96Z" fill={C.dahon} />
    <path d="M24 119h16v5H24zM80 119h16v5H80z" fill={C.pula} />
    <path
      d="M25.5 124v24M29 124v28M32.5 124v24M36 124v28M39 124v23M81.5 124v24M85 124v28M88.5 124v24M92 124v28M95 124v23"
      fill="none"
      stroke={C.ilaw}
      strokeWidth="2"
    />
    <circle cx="60" cy="60" r="54" fill={C.pula} />
    <circle cx="60" cy="60" r="38" fill={C.pulaLit} />
    <path d="M60 60 48.83 44.63 60 12ZM60 60 71.17 44.63 105.65 45.17ZM60 60 78.07 65.87 88.21 98.83ZM60 60 60 79 31.79 98.83ZM60 60 41.93 65.87 14.35 45.17Z" fill={C.ilawLit} />
    <path d="M60 60 60 12 71.17 44.63ZM60 60 105.65 45.17 78.07 65.87ZM60 60 88.21 98.83 60 79ZM60 60 31.79 98.83 41.93 65.87ZM60 60 14.35 45.17 48.83 44.63Z" fill={C.ilaw} />
    <circle cx="60" cy="60" r="7" fill="#FFF8DC" />
    <path d={STAR_POINTS} fill="none" stroke={C.ube} strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="60" cy="60" r="54" fill="none" stroke={C.ube} strokeWidth="1.5" />
  </svg>
);

/** Church silhouette with lit windows (bottom of the sky only). viewBox 300x90. */
export const Simbahan: React.FC<SvgProps & { lit?: boolean }> = ({ style, width = 300, lit = true }) => (
  <svg viewBox="0 0 300 90" width={width} height={(width * 90) / 300} style={style} aria-hidden>
    <path d="M0 90V72H38V32L55 12 72 32V62H82V52L135 22 188 52V64H232V74H300V90ZM55 12V1M50 5H60" fill={C.night} stroke={C.night} strokeWidth="2" />
    <path d="M50 40h10v14H50zM127 68h16v22h-16zM98 62h8v12h-8zM164 62h8v12h-8zM204 72h7v9h-7z" fill={lit ? C.ilaw : "#3A2160"} />
    <circle cx="135" cy="47" r="7" fill={lit ? C.ilaw : "#3A2160"} />
  </svg>
);

/** Sipit. viewBox 16x46. */
export const Clothespin: React.FC<SvgProps> = ({ style, width = 16 }) => (
  <svg viewBox="0 0 16 46" width={width} height={(width * 46) / 16} style={style} aria-hidden>
    <rect x="1" y="1" width="6" height="44" rx="2" fill="#D9A860" stroke={C.ube} strokeWidth="1.2" />
    <rect x="9" y="1" width="6" height="44" rx="2" fill="#C9944A" stroke={C.ube} strokeWidth="1.2" />
    <path d="M.5 17h15M.5 20.5h15" fill="none" stroke={C.ubeSoft} strokeWidth="1.3" />
  </svg>
);

/** Gold star (the "Names drawn" mark). viewBox 100x100. */
export const Star: React.FC<SvgProps> = ({ style, width = 100 }) => (
  <svg viewBox="0 0 100 100" width={width} height={width} style={style} aria-hidden>
    <path d="M50 8 61 38 93 39 68 59 77 90 50 72 23 90 32 59 7 39 39 38Z" fill={C.ilaw} stroke={C.ube} strokeWidth="4" strokeLinejoin="round" />
  </svg>
);
