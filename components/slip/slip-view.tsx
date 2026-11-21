import { Art } from "@/components/art/symbols";
import { cn } from "@/lib/utils";
import { SlipArt } from "./slip-art";

export type SlipPhase = "folded" | "opening" | "opened";

/**
 * The bunutan slip on its evening sky panel, as markup only (no hooks):
 * "May nabunot ka na!" while folded, the ray disc, the white string, the
 * parol, the heading, the slip on its clothespin, and the "Tap to open"
 * button over the panel. One source for every slip on /me: BunutanSlip
 * renders it in the browser with its state and the unfold; OpenSlip and
 * FoldedSlip (static-slip.tsx) render it on the server, so a slip that is
 * already open ships no slip code. The unfold timeline animates the
 * `data-part` elements.
 */
export function SlipView({
  name,
  label,
  heading,
  rays,
  initiallyOpened,
  phase,
  open,
  pressed = false,
  rootRef,
  headingRef,
  openRef,
  onOpen,
  onPress,
  children,
}: {
  /** The name written on the slip. */
  name: string;
  /** The region's accessible name. */
  label: string;
  /** The line on the sky once the slip is open. */
  heading: string;
  /** The ray disc behind the open slip (not for the codename before the draw). */
  rays: boolean;
  initiallyOpened: boolean;
  phase: SlipPhase;
  /** Open without the unfold (an earlier visit, or reduced motion). */
  open: boolean;
  /** The folded slip gives a little while pressed. */
  pressed?: boolean;
  rootRef?: React.Ref<HTMLElement>;
  /** Focus moves here after the unfold, so screen readers hear the name. */
  headingRef?: React.Ref<HTMLDivElement>;
  openRef?: React.Ref<HTMLDivElement>;
  onOpen?: () => void;
  onPress?: (pressed: boolean) => void;
  /** After the panel: the unfold controller. */
  children?: React.ReactNode;
}) {
  const press = (value: boolean) => (onPress ? () => onPress(value) : undefined);
  return (
    <section ref={rootRef} aria-label={label} className="flex min-w-0 flex-col gap-[18px] lg:gap-[22px]">
      {/* Folded only. Stays (empty) after the unfold so nothing below jumps. */}
      {!initiallyOpened && (
        <h2
          data-part="heading-folded"
          aria-hidden={phase !== "folded"}
          className="font-head text-section lg:text-section-lg"
          style={{ opacity: open ? 0 : 1 }}
        >
          May nabunot ka na!
        </h2>
      )}

      <div className="sky relative isolate h-[340px] overflow-hidden rounded-sky lg:h-[440px] lg:rounded-sky-lg">
        {/* The ray disc, behind everything on the sky. Never text on it. */}
        {rays && (
          <div
            aria-hidden
            data-part="rays"
            className="ray-disc pointer-events-none absolute top-[96px] left-[calc(50%-130px)] size-[260px] lg:top-[104px] lg:left-[calc(50%-175px)] lg:size-[350px]"
            style={{ opacity: open ? 1 : 0 }}
          />
        )}

        {/* The white string the slip hangs from */}
        <svg
          aria-hidden
          viewBox="0 0 350 60"
          preserveAspectRatio="none"
          className="pointer-events-none absolute top-[84px] left-0 h-[60px] w-full lg:hidden"
        >
          <path d="M0 16Q175 70 350 20" fill="none" stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        <svg
          aria-hidden
          viewBox="0 0 652 76"
          preserveAspectRatio="none"
          className="pointer-events-none absolute top-[92px] left-0 hidden h-[76px] w-full lg:block"
        >
          <path d="M0 18Q326 92 652 24" fill="none" stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>

        <Art name="parol" className="pointer-events-none absolute top-0 right-2.5 h-[119px] w-[84px] lg:right-[18px] lg:h-[156px] lg:w-[110px]" />

        <div
          ref={headingRef}
          tabIndex={-1}
          data-part="heading"
          className="absolute top-[18px] left-[18px] max-w-[190px] font-head text-[24px] leading-[1.15] outline-none lg:top-[22px] lg:left-6 lg:max-w-none lg:text-[30px]"
          style={{ opacity: open ? 1 : 0 }}
        >
          {heading}
          {phase === "opened" && <span className="sr-only"> {name}</span>}
        </div>

        {/* The slip, hanging from its top edge */}
        <div className="pointer-events-none absolute top-[150px] left-1/2 h-[160px] w-[300px] origin-top -translate-x-1/2 scale-[0.887] lg:top-[176px] lg:scale-[1.2]">
          {open ? (
            <div key="open" ref={openRef}>
              <SlipArt name={name} state="open" />
            </div>
          ) : (
            // Pressed: the folded slip gives a little (transform only).
            <div
              key="folded"
              className="origin-top transition-transform duration-150 ease-out"
              style={{ transform: pressed ? "scale(0.95)" : undefined }}
            >
              <SlipArt name={name} state="folded" />
            </div>
          )}
        </div>

        <Art
          name="clothespin"
          className="pointer-events-none absolute top-[112px] left-[calc(50%-8px)] h-[46px] w-4 lg:top-[134px] lg:left-[calc(50%-9px)] lg:h-[52px] lg:w-[18px]"
        />

        {!initiallyOpened && phase !== "opened" && (
          // The whole panel is the button; its label is the paper tag.
          <button
            type="button"
            data-part="caption"
            onClick={onOpen}
            onPointerDown={press(true)}
            onPointerUp={press(false)}
            onPointerLeave={press(false)}
            onPointerCancel={press(false)}
            disabled={phase === "opening"}
            className={cn(
              "absolute inset-0 cursor-pointer rounded-sky outline-none select-none disabled:cursor-default lg:rounded-sky-lg [-webkit-tap-highlight-color:transparent]",
              "focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ilaw",
            )}
          >
            <span className="absolute bottom-[18px] left-[18px] rounded-field bg-papel px-4 py-2.5 font-bold text-ube lg:bottom-[22px] lg:left-6">
              Tap to open your bunutan
            </span>
          </button>
        )}
      </div>

      {children}
    </section>
  );
}
