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
