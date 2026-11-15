import { SWAG_HALO_GROUPS, SWAG_W } from "@/components/art/symbols";
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
 * nails every 360px, drawn at true pixel size on a 3960px strip centred on
 * the page and clipped to the window, so it has no seams and never
 * stretches. The middle of the window is the middle of a sag: a 390px
 * phone shows one swag with a nail 15px in from each edge.
 *
 * The bulbs' flat halos sit on three layers of their own (a third of the
 * bulbs each, behind the wire); the twinkle animates only those three
 * layers' opacity (`.ls-halo` in globals.css), and stops under reduced motion.
 */
const STRING_SWAGS = 11;
const STRING_W = STRING_SWAGS * SWAG_W;
const STRING_WIRE = `M0 5${" q180 24 360 0".repeat(STRING_SWAGS)}`;
const stripClass = "absolute top-0 left-1/2 h-11 -translate-x-1/2";

export function LightString() {
  const swags = Array.from({ length: STRING_SWAGS + 1 }, (_, k) => k * SWAG_W);
  return (
    <div aria-hidden data-light-string className="pointer-events-none relative h-11 w-full shrink-0 overflow-hidden">
      {Array.from({ length: SWAG_HALO_GROUPS }, (_, g) => (
        <svg
          key={g}
          viewBox={`0 0 ${STRING_W} 44`}
          width={STRING_W}
          height="44"
          className={cn(stripClass, "ls-halo")}
          data-halo-group={g}
          focusable="false"
        >
          {swags.slice(0, -1).map((x) => (
            <use key={x} href={`#art-swag-halo-${g}`} x={x} />
          ))}
        </svg>
      ))}
      <svg viewBox={`0 0 ${STRING_W} 44`} width={STRING_W} height="44" className={stripClass} focusable="false">
        <path d={STRING_WIRE} fill="none" stroke="#3F1F63" strokeWidth="1.3" />
        {swags.map((x, k) =>
          k < STRING_SWAGS ? (
            <use key={x} href="#art-swag-bulbs" x={x} />
          ) : (
            <circle key={x} cx={x} cy="2.4" r="2.2" fill="#3F1F63" />
          ),
        )}
      </svg>
    </div>
  );
}
