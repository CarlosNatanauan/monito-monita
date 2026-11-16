import { SWAG_GROUPS, SWAG_W } from "@/components/art/symbols";
import { LightController } from "@/components/light-controller";
import { cn } from "@/lib/utils";

/**
 * The page frame (docs/DESIGN.md, "Layout"):
 * - phones: one column, 20px gutters;
 * - 600–1023px: one column, max 560px, centred (phones sideways too);
 * - laptops (lg, 1024px and up, iPad landscape included): a 1120px
 *   container (32px gutters when narrower) where each page lays out its
 *   two columns with `colsClass`.
 */
export const pageClass =
  "mx-auto flex w-full flex-1 flex-col gap-[18px] px-5 pb-12 min-[600px]:max-w-[600px] lg:max-w-[calc(1120px+4rem)] lg:gap-[22px] lg:px-8 lg:pb-14";

/** Laptop: main column (flexible) and the 420px side column, 48px apart. */
export const colsClass = "flex flex-col gap-[18px] lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-x-12 lg:gap-y-[22px]";

/** A column inside `colsClass`. */
export const colClass = "flex min-w-0 flex-col gap-[18px] lg:gap-[22px]";

/**
 * Sticky only on laptops, and only where the window is tall enough to
 * show the whole slip panel (not a phone turned sideways).
 */
export const stickyClass = "lg:[@media(min-height:640px)]:sticky lg:[@media(min-height:640px)]:top-6";

/** A centred 560px column, for short one-card states. */
export function Narrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex w-full flex-col gap-[18px] lg:mx-auto lg:max-w-[560px]", className)}>{children}</div>;
}

/** A person's name or codename inside other text: Gochi Hand at 1.18em. */
export function Name({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("nm", className)}>{children}</span>;
}

/**
 * The decorative light string across the top of member pages
 * (docs/DESIGN.md, "Light string"): one continuous wire that sags between
 * nails every 360px, drawn at true pixel size on a 3960px drawing centred
 * on the page and clipped to the window, so it has no seams and never
 * stretches. The middle of the window is the middle of a sag: a 390px
 * phone shows one swag with a nail 15px in from each edge.
 *
 * Layers, bottom to top: every bulb unlit; four lit layers, one per bulb
 * group (bulb i in group i % 4); the wire, nails and socket caps. Light
 * patterns animate only the four lit layers' opacity, chosen by
 * `data-mode` (globals.css). With `controller` (landing, /me) the string
 * is a button that cycles the modes like a real controller; otherwise
 * (forms) it only twinkles, slow and calm. Reduced motion: steady and lit.
 */
const STRING_SWAGS = 11;
const STRING_W = STRING_SWAGS * SWAG_W;
const STRING_WIRE = `M0 5${" q180 24 360 0".repeat(STRING_SWAGS)}`;
const SWAG_XS = Array.from({ length: STRING_SWAGS }, (_, k) => k * SWAG_W);
const stringClass = "relative block h-11 w-full shrink-0 overflow-hidden";

/**
 * One layer of the string: as wide as the window (a composited layer per
 * lit group, so it stays small on phones), with the 3960px drawing centred
 * in it by a nested SVG at x 50% and clipped at the window's edges.
 */
function Strip({ children, className, group }: { children: React.ReactNode; className?: string; group?: number }) {
  return (
    <svg
      width="100%"
      height="44"
      aria-hidden
      focusable="false"
      data-group={group}
      className={cn("pointer-events-none absolute inset-0 h-11 w-full overflow-hidden", className)}
    >
      <svg x="50%" overflow="visible">
        <g transform={`translate(${-STRING_W / 2} 0)`}>{children}</g>
      </svg>
    </svg>
  );
}

export function LightString({ controller = false }: { controller?: boolean }) {
  const layers = (
    <>
      <Strip>
        {SWAG_XS.map((x) => (
          <use key={x} href="#art-swag-off" x={x} />
        ))}
      </Strip>
      {Array.from({ length: SWAG_GROUPS }, (_, g) => (
        <Strip key={g} group={g} className="ls-lit">
          {SWAG_XS.map((x) => (
            <use key={x} href={`#art-swag-lit-${g}`} x={x} />
          ))}
        </Strip>
      ))}
      <Strip>
        <path d={STRING_WIRE} fill="none" stroke="#3F1F63" strokeWidth="1.3" />
        {SWAG_XS.map((x) => (
          <use key={x} href="#art-swag-top" x={x} />
        ))}
        <circle cx={STRING_W} cy="2.4" r="2.2" fill="#3F1F63" />
      </Strip>
    </>
  );
  if (controller) {
    return (
      <LightController className={cn(stringClass, "cursor-pointer focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ilaw focus-visible:shadow-[inset_0_0_0_4.5px_var(--color-ube)]")}>
        {layers}
      </LightController>
    );
  }
  return (
    <div aria-hidden data-light-string data-mode="calm" className={cn(stringClass, "pointer-events-none")}>
      {layers}
    </div>
  );
}
