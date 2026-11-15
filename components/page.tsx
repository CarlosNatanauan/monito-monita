import { Art } from "@/components/art/symbols";
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
 * The decorative light string across the top of member pages: one swag
 * on phones, swags of about 340px across the full width on laptops.
 * Decoration only; static (no twinkle).
 */
export function LightString() {
  const swag = "h-10 min-w-0 flex-1";
  return (
    <div aria-hidden className="pointer-events-none flex w-full shrink-0 overflow-hidden px-[15px] min-[600px]:px-0">
      <Art name="swag" className={swag} />
      <Art name="swag" className={cn(swag, "hidden min-[600px]:block")} />
      <Art name="swag" className={cn(swag, "hidden lg:block")} />
      <Art name="swag" className={cn(swag, "hidden min-[1360px]:block")} />
      <Art name="swag" className={cn(swag, "hidden min-[1700px]:block")} />
      <Art name="swag" className={cn(swag, "hidden min-[2040px]:block")} />
    </div>
  );
}
