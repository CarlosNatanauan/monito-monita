/**
 * Every illustration (docs/design/svg/), inlined once per document as
 * <symbol>s; <Art name="…" /> draws one with <use>. No extra requests on
 * first paint, and each shape's markup is sent once however often it shows.
 *
 * Ube lines on the bowl are `currentColor`, so the same symbol draws the
 * light-page bowl (ube) and the one on the sky (lilac, #CDB8EC).
 * Pure markup: a server component, no JS.
 */

const STAR_POINTS = "M60 12 71.17 44.63 105.65 45.17 78.07 65.87 88.21 98.83 60 79 31.79 98.83 41.93 65.87 14.35 45.17 48.83 44.63Z";

export type ArtName =
  | "parol"
  | "parol-outline"
  | "star"
  | "bowl-back"
  | "bowl-front"
  | "bilao"
  | "simbahan"
  | "clothespin"
  | "swag";

export const ART_VIEWBOX: Record<ArtName, string> = {
  parol: "0 0 120 170",
  "parol-outline": "0 0 120 120",
  star: "0 0 100 100",
  "bowl-back": "0 0 200 150",
  "bowl-front": "0 0 200 150",
  bilao: "0 0 240 50",
  simbahan: "0 0 300 90",
  clothespin: "0 0 16 46",
  swag: "0 0 360 40",
};

// The decorative string: bulbs of slightly different sizes and tilts,
// cycling gold, red, pale gold, green.
const SWAG_BULBS: [number, number, number, number, number, string][] = [
  [20, 17.5, 5, 8, 8, "#F4C542"],
  [49, 19.6, 6, 7, -6, "#C4283A"],
  [78, 23.6, 5.5, 8.5, 5, "#FFE9A3"],
  [107, 25, 6, 8, -9, "#1F6B45"],
  [136, 25.8, 5, 7.5, 4, "#F4C542"],
  [165, 26.9, 6.5, 8, -4, "#C4283A"],
  [194, 25.9, 5.5, 7, 7, "#FFE9A3"],
  [223, 26.8, 6, 8.5, -7, "#1F6B45"],
  [252, 25.1, 5, 8, 6, "#F4C542"],
  [281, 22.7, 6, 7.5, -5, "#C4283A"],
  [310, 20.7, 5.5, 8, 9, "#FFE9A3"],
  [339, 16.6, 6, 7, -8, "#1F6B45"],
];

export function ArtSymbols() {
  return (
    <svg aria-hidden focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <symbol id="art-parol" viewBox={ART_VIEWBOX.parol}>
        <path d="M60 0V8" fill="none" stroke="#3F1F63" strokeWidth="1.5" />
        <path d="M31.8 100 24 123H40ZM88.2 100 80 123H96Z" fill="#1F6B45" />
        <path d="M24 119h16v5H24zM80 119h16v5H80z" fill="#C4283A" />
        <path
          d="M25.5 124v24M29 124v28M32.5 124v24M36 124v28M39 124v23M81.5 124v24M85 124v28M88.5 124v24M92 124v28M95 124v23"
          fill="none"
          stroke="#F4C542"
          strokeWidth="2"
        />
        <circle cx="60" cy="60" r="54" fill="#C4283A" />
        <circle cx="60" cy="60" r="38" fill="#E4606E" />
        <path d="M60 60 48.83 44.63 60 12ZM60 60 71.17 44.63 105.65 45.17ZM60 60 78.07 65.87 88.21 98.83ZM60 60 60 79 31.79 98.83ZM60 60 41.93 65.87 14.35 45.17Z" fill="#FFE9A3" />
        <path d="M60 60 60 12 71.17 44.63ZM60 60 105.65 45.17 78.07 65.87ZM60 60 88.21 98.83 60 79ZM60 60 31.79 98.83 41.93 65.87ZM60 60 14.35 45.17 48.83 44.63Z" fill="#F4C542" />
        <circle cx="60" cy="60" r="7" fill="#FFF8DC" />
        <path d={STAR_POINTS} fill="none" stroke="#3F1F63" strokeWidth="1.3" strokeLinejoin="round" />
        <circle cx="60" cy="60" r="54" fill="none" stroke="#3F1F63" strokeWidth="1.5" />
      </symbol>

      {/* Bamboo frame only. Stroke is currentColor: dim on the reveal, gold at the finale. */}
      <symbol id="art-parol-outline" viewBox={ART_VIEWBOX["parol-outline"]}>
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path
          d={`${STAR_POINTS}M60 60V12M60 60 105.65 45.17M60 60 88.21 98.83M60 60 31.79 98.83M60 60 14.35 45.17`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </symbol>

      <symbol id="art-star" viewBox={ART_VIEWBOX.star}>
        <path d="M50 8 61 38 93 39 68 59 77 90 50 72 23 90 32 59 7 39 39 38Z" fill="#F4C542" stroke="#3F1F63" strokeWidth="4" strokeLinejoin="round" />
      </symbol>

      {/* The bowl in two layers, so a slip can rise from inside it: the back
          (the two slips over the rim, the glass) and the front (slips seen
          inside, the rim, the highlight, the foot). */}
      <symbol id="art-bowl-back" viewBox={ART_VIEWBOX["bowl-back"]}>
        <rect x="70" y="14" width="52" height="24" transform="rotate(-14 96 26)" fill="#fff" stroke="currentColor" strokeWidth="2" />
        <rect x="112" y="10" width="52" height="24" transform="rotate(12 138 22)" fill="#fff" stroke="currentColor" strokeWidth="2" />
        <path d="M14 42C16 104 52 138 100 138 148 138 184 104 186 42" fill="#fff" fillOpacity=".55" stroke="currentColor" strokeWidth="2.5" />
      </symbol>
      <symbol id="art-bowl-front" viewBox={ART_VIEWBOX["bowl-front"]}>
        <rect x="40" y="62" width="52" height="24" transform="rotate(9 66 74)" fill="#fff" stroke="currentColor" strokeWidth="2" />
        <rect x="104" y="56" width="52" height="24" transform="rotate(-12 130 68)" fill="#fff" stroke="currentColor" strokeWidth="2" />
        <rect x="62" y="90" width="52" height="24" transform="rotate(-5 88 102)" fill="#fff" stroke="currentColor" strokeWidth="2" />
        <rect x="106" y="98" width="46" height="22" transform="rotate(16 129 109)" fill="#fff" stroke="currentColor" strokeWidth="2" />
        <path d="M50 72q6-5 12 0t12 0M112 68q6-5 12 0t12 0M72 102q6-5 12 0t12 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="100" cy="42" rx="86" ry="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M30 60C32 84 40 102 52 114" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d="M70 138C80 147 120 147 130 138" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </symbol>

      <symbol id="art-bilao" viewBox={ART_VIEWBOX.bilao}>
        <ellipse cx="120" cy="25" rx="116" ry="22" fill="#C99B4B" stroke="#7A5A2A" strokeWidth="1.5" />
        <ellipse cx="120" cy="23" rx="100" ry="15" fill="#E3BE77" />
        <path d="M30 23q10-8 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0M40 30q10-7 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" fill="none" stroke="#A67C34" strokeWidth="1.2" />
      </symbol>

      <symbol id="art-simbahan" viewBox={ART_VIEWBOX.simbahan}>
        <path d="M0 90V72H38V32L55 12 72 32V62H82V52L135 22 188 52V64H232V74H300V90ZM55 12V1M50 5H60" fill="#2C1548" stroke="#2C1548" strokeWidth="2" />
        <path d="M50 40h10v14H50zM127 68h16v22h-16zM98 62h8v12h-8zM164 62h8v12h-8zM204 72h7v9h-7z" fill="#F4C542" />
        <circle cx="135" cy="47" r="7" fill="#F4C542" />
      </symbol>

      <symbol id="art-clothespin" viewBox={ART_VIEWBOX.clothespin}>
        <rect x="1" y="1" width="6" height="44" rx="2" fill="#D9A860" stroke="#3F1F63" strokeWidth="1.2" />
        <rect x="9" y="1" width="6" height="44" rx="2" fill="#C9944A" stroke="#3F1F63" strokeWidth="1.2" />
        <path d="M.5 17h15M.5 20.5h15" fill="none" stroke="#5A4A6B" strokeWidth="1.3" />
      </symbol>

      <symbol id="art-swag" viewBox={ART_VIEWBOX.swag}>
        <path d="M0 6Q180 30 360 6" fill="none" stroke="#3F1F63" strokeWidth="1.3" />
        {SWAG_BULBS.map(([cx, cy, rx, ry, r, fill]) => (
          <ellipse key={cx} cx={cx} cy={cy} rx={rx} ry={ry} transform={`rotate(${r} ${cx} ${cy})`} fill={fill} stroke="#3F1F63" strokeWidth="1.2" />
        ))}
      </symbol>
    </svg>
  );
}

/** One illustration. Decorative: hidden from screen readers. Size it with className or style. */
export function Art({ name, className, style }: { name: ArtName; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox={ART_VIEWBOX[name]} className={className} style={style} aria-hidden focusable="false">
      <use href={`#art-${name}`} />
    </svg>
  );
}
