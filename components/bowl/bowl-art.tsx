import { Art } from "@/components/art/symbols";
import { cn } from "@/lib/utils";

/**
 * The glass bowl of slips (docs/design/svg/bowl.svg), in two layers in the
 * same 200×150 box, so a slip placed between them rises from inside it:
 * the back (the two slips over the rim, the glass) and the front (slips
 * seen inside, the rim, the highlight, the foot). `tone`: ube lines on
 * light pages, lilac (#CDB8EC) on the evening sky.
 */

export const BOWL = { W: 200, H: 150 } as const;

type Tone = "light" | "sky";
const TONE: Record<Tone, string> = { light: "text-ube", sky: "text-[#CDB8EC]" };

type LayerProps = { className?: string; style?: React.CSSProperties; tone?: Tone };

export function BowlBack({ className, style, tone = "sky" }: LayerProps) {
  return <Art name="bowl-back" className={cn(TONE[tone], className)} style={style} />;
}

export function BowlFront({ className, style, tone = "sky" }: LayerProps) {
  return <Art name="bowl-front" className={cn(TONE[tone], className)} style={style} />;
}

/** The bowl's glass alone (the landing draws its slips separately, to mix them). */
export function BowlGlass({ className, style, tone = "sky" }: LayerProps) {
  return <Art name="bowl-glass" className={cn(TONE[tone], className)} style={style} />;
}

/** The bowl's rim, highlight and foot alone, in front of the slips inside. */
export function BowlRim({ className, style, tone = "sky" }: LayerProps) {
  return <Art name="bowl-rim" className={cn(TONE[tone], className)} style={style} />;
}

/**
 * The slips in the bowl, in its 200×150 box (the same places as in
 * bowl-back and bowl-front): two over the rim, behind the glass's front,
 * and four inside. cx/cy is the centre, rot the tilt in degrees. `wave`:
 * the folded line of writing, in the slip's own 0..w × 0..h box.
 */
export type BowlSlipSpot = { cx: number; cy: number; w: number; h: number; rot: number; wave?: string };
export const BOWL_SLIPS: { top: BowlSlipSpot[]; inside: BowlSlipSpot[] } = {
  top: [
    { cx: 96, cy: 26, w: 52, h: 24, rot: -14 },
    { cx: 138, cy: 22, w: 52, h: 24, rot: 12 },
  ],
  inside: [
    { cx: 66, cy: 74, w: 52, h: 24, rot: 9, wave: "M10 10q6-5 12 0t12 0" },
    { cx: 130, cy: 68, w: 52, h: 24, rot: -12, wave: "M8 12q6-5 12 0t12 0" },
    { cx: 88, cy: 102, w: 52, h: 24, rot: -5, wave: "M10 12q6-5 12 0t12 0" },
    { cx: 129, cy: 109, w: 46, h: 22, rot: 16 },
  ],
};

/**
 * One slip in the bowl: its own small element (positioned in % of the
 * bowl's box), so a mix moves it with a composited transform.
 */
export function BowlSlip({ spot, tone = "sky" }: { spot: BowlSlipSpot; tone?: Tone }) {
  return (
    <div
      data-bowl-slip
      className={cn("absolute", TONE[tone])}
      style={{
        left: `${((spot.cx - spot.w / 2) / BOWL.W) * 100}%`,
        top: `${((spot.cy - spot.h / 2) / BOWL.H) * 100}%`,
        width: `${(spot.w / BOWL.W) * 100}%`,
        height: `${(spot.h / BOWL.H) * 100}%`,
        transform: `rotate(${spot.rot}deg)`,
      }}
    >
      <svg viewBox={`0 0 ${spot.w} ${spot.h}`} className="block size-full overflow-visible" aria-hidden focusable="false">
        <rect x="0" y="0" width={spot.w} height={spot.h} fill="#fff" stroke="currentColor" strokeWidth="2" />
        {spot.wave && <path d={spot.wave} fill="none" stroke="currentColor" strokeWidth="1.5" />}
      </svg>
    </div>
  );
}

/** The woven tray, always under the bowl (240×50). */
export function Bilao({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <Art name="bilao" className={className} style={style} />;
}

/** The bowl on its bilao, on the sky, as one SVG string (share images: next/og can't use <use>). */
export function bowlSvgMarkup(): string {
  const c = "#CDB8EC";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200">
<g transform="translate(0 150)"><ellipse cx="120" cy="25" rx="116" ry="22" fill="#C99B4B" stroke="#7A5A2A" stroke-width="1.5"/><ellipse cx="120" cy="23" rx="100" ry="15" fill="#E3BE77"/><path d="M30 23q10-8 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0M40 30q10-7 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0" fill="none" stroke="#A67C34" stroke-width="1.2"/></g>
<g transform="translate(20 12)"><rect x="70" y="14" width="52" height="24" transform="rotate(-14 96 26)" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="112" y="10" width="52" height="24" transform="rotate(12 138 22)" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M14 42C16 104 52 138 100 138 148 138 184 104 186 42" fill="#fff" fill-opacity=".55" stroke="${c}" stroke-width="2.5"/><rect x="40" y="62" width="52" height="24" transform="rotate(9 66 74)" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="104" y="56" width="52" height="24" transform="rotate(-12 130 68)" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="62" y="90" width="52" height="24" transform="rotate(-5 88 102)" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="106" y="98" width="46" height="22" transform="rotate(16 129 109)" fill="#fff" stroke="${c}" stroke-width="2"/><path d="M50 72q6-5 12 0t12 0M112 68q6-5 12 0t12 0M72 102q6-5 12 0t12 0" fill="none" stroke="${c}" stroke-width="1.5"/><ellipse cx="100" cy="42" rx="86" ry="11" fill="none" stroke="${c}" stroke-width="2.5"/><path d="M30 60C32 84 40 102 52 114" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M70 138C80 147 120 147 130 138" fill="none" stroke="${c}" stroke-width="2.5"/></g>
</svg>`;
}
