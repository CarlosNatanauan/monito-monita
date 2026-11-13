/**
 * The glass bowl on the bilao (docs/DESIGN.md, "The bowl"), as two SVG
 * layers in the same 260×180 box: the back (bilao, far rim, slips inside)
 * and the front (the glass itself, near rim, one highlight streak). A slip
 * placed between the layers sits inside the bowl, seen through the glass.
 * Pure markup, no JS: it paints with the page.
 */

export const BOWL = { W: 260, H: 180 } as const;

const SLIP_WHITE = "#ffffff";
const SLIP_LILAC = "#ede6f5";

// Small slips (56×26), mixed angles; the first two poke over the rim.
const SLIPS: { x: number; y: number; r: number; fill: string }[] = [
  { x: 74, y: 30, r: -12, fill: SLIP_WHITE },
  { x: 128, y: 28, r: 8, fill: SLIP_LILAC },
  { x: 52, y: 72, r: 10, fill: SLIP_WHITE },
  { x: 142, y: 66, r: -9, fill: SLIP_LILAC },
  { x: 84, y: 98, r: -4, fill: SLIP_LILAC },
  { x: 128, y: 104, r: 14, fill: SLIP_WHITE },
  { x: 98, y: 126, r: 4, fill: SLIP_WHITE },
];

/** The outline of the glass body, from rim to base. */
const BODY = "M28 44 C28 112 68 156 130 156 C192 156 232 112 232 44 Z";

type LayerProps = { className?: string; style?: React.CSSProperties };

export function BowlBack({ className, style }: LayerProps) {
  return (
    <svg
      viewBox={`0 0 ${BOWL.W} ${BOWL.H}`}
      className={className}
      style={style}
      aria-hidden
      focusable="false"
    >
      {/* The bilao (woven tray) */}
      <ellipse cx="130" cy="158" rx="126" ry="17" fill="#8c6a35" />
      <ellipse cx="130" cy="156" rx="124" ry="15" fill="#c9a56b" />
      <ellipse cx="130" cy="156" rx="100" ry="10" fill="none" stroke="#8c6a35" strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Inside of the glass and the far half of the rim */}
      <path d={BODY} fill="#ffffff" fillOpacity="0.1" />
      <path d="M28 44 A102 11 0 0 1 232 44" fill="none" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.5" />
      {SLIPS.map((s, i) => (
        <rect
          key={i}
          x={s.x}
          y={s.y}
          width="56"
          height="26"
          rx="4"
          fill={s.fill}
          transform={`rotate(${s.r} ${s.x + 28} ${s.y + 13})`}
        />
      ))}
    </svg>
  );
}

export function BowlFront({ className, style }: LayerProps) {
  return (
    <svg
      viewBox={`0 0 ${BOWL.W} ${BOWL.H}`}
      className={className}
      style={style}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="bowl-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {/* Glass body with its outline, the near half of the rim, a highlight streak */}
      <path d={BODY} fill="url(#bowl-glass)" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.5" />
      <path d="M28 44 A102 11 0 0 0 232 44" fill="none" stroke="#ffffff" strokeWidth="1.5" />
      <path d="M44 62 C44 92 52 112 64 126" fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
