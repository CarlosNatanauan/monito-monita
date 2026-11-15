"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { Art } from "@/components/art/symbols";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { cn } from "@/lib/utils";
import { SlipArt } from "./slip-art";
import type { UnfoldControllerProps } from "./unfold-controller";

// GSAP lives in this chunk, downloaded only once a folded slip is on screen.
// A plain import() on purpose: next/dynamic preloads its chunk with the page.
const loadController = () => import("./unfold-controller").then((mod) => mod.default);

type Phase = "folded" | "opening" | "opened";

export type BunutanSlipProps = {
  /** The name written on the slip (the receiver, the giver after the reveal, or the codename). */
  name: string;
  /** Already opened on an earlier visit: show the open slip, no animation. */
  initiallyOpened?: boolean;
  onOpened?: () => void;
  /** The line on the sky once the slip is open. */
  heading?: string;
  /** The region's accessible name. */
  label?: string;
  /** The ray disc behind the open slip (not for the codename before the draw). */
  rays?: boolean;
  /** Prototype controls (lab only). */
  speed?: number;
  reducedMotion?: boolean;
  onTimeline?: UnfoldControllerProps["onTimeline"];
};

/**
 * Signature moment #3: your monito, on the evening sky panel
 * (docs/DESIGN.md, "The slip" and "Evening sky panel"). The slip hangs
 * from the white string by the clothespin, the parol top right. Folded:
 * "May nabunot ka na!" above the panel and a paper label "Tap to open
 * your bunutan"; the whole panel is the button. It unfolds on the string,
 * the name is written, and the disc of gold rays comes in behind it.
 * Reduced motion skips the unfold and fades in the open slip.
 *
 * Sizes follow the reference: the panel is 340px tall on phones (the
 * slip drawn at 0.887, 266×142) and 440px on laptops (1.2, 360×192).
 */
export function BunutanSlip({
  name,
  initiallyOpened = false,
  onOpened,
  heading = "Ang monito mo ay…",
  label = "Your monito",
  rays = true,
  speed = 1,
  reducedMotion,
  onTimeline,
}: BunutanSlipProps) {
  const systemReduced = usePrefersReducedMotion();
  const reduced = reducedMotion ?? systemReduced;

  const [phase, setPhase] = useState<Phase>(initiallyOpened ? "opened" : "folded");
  // Open without the unfold: earlier visit, or reduced motion.
  const [static_, setStatic] = useState(initiallyOpened);
  const [onScreen, setOnScreen] = useState(false);
  const [pressed, setPressed] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const openRef = useRef<HTMLDivElement>(null);
  const announced = useRef(initiallyOpened);

  // Load the animation code once the folded slip is (nearly) on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || phase !== "folded" || reduced || onScreen) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setOnScreen(true);
      },
      { rootMargin: "100px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [phase, reduced, onScreen]);

  const finish = useCallback(() => {
    setPhase("opened");
    onOpened?.();
  }, [onOpened]);

  // Move focus to the result so screen readers hear the name.
  useEffect(() => {
    if (phase === "opened" && !announced.current) {
      announced.current = true;
      resultRef.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  // Opened without the unfold (reduced motion): the open slip fades in
  // (Web Animations, so the global reduced-motion CSS doesn't cut it).
  useLayoutEffect(() => {
    if (static_ && !initiallyOpened) {
      openRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: "ease-out" });
    }
  }, [static_, initiallyOpened]);

  function open() {
    if (phase !== "folded") return;
    setPressed(false);
    if (reduced) {
      navigator.vibrate?.(35);
      setStatic(true);
      finish();
      return;
    }
    setPhase("opening");
  }

  const wantController = !static_ && !reduced && (onScreen || phase !== "folded");
  const [UnfoldController, setController] = useState<ComponentType<UnfoldControllerProps> | null>(null);
  useEffect(() => {
    if (!wantController || UnfoldController) return;
    let alive = true;
    loadController().then((C) => {
      if (alive) setController(() => C);
    });
    return () => {
      alive = false;
    };
  }, [wantController, UnfoldController]);

  return (
      <section ref={rootRef} aria-label={label} className="flex min-w-0 flex-col gap-[18px] lg:gap-[22px]">
        {/* Folded only. Stays (empty) after the unfold so nothing below jumps. */}
        {!initiallyOpened && (
          <h2
            data-part="heading-folded"
            aria-hidden={phase !== "folded"}
            className="font-head text-section lg:text-section-lg"
            style={{ opacity: static_ ? 0 : 1 }}
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
              style={{ opacity: static_ ? 1 : 0 }}
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
            ref={resultRef}
            tabIndex={-1}
            data-part="heading"
            className="absolute top-[18px] left-[18px] max-w-[190px] font-head text-[24px] leading-[1.15] outline-none lg:top-[22px] lg:left-6 lg:max-w-none lg:text-[30px]"
            style={{ opacity: static_ ? 1 : 0 }}
          >
            {heading}
            {phase === "opened" && <span className="sr-only"> {name}</span>}
          </div>

          {/* The slip, hanging from its top edge */}
          <div className="pointer-events-none absolute top-[150px] left-1/2 h-[160px] w-[300px] origin-top -translate-x-1/2 scale-[0.887] lg:top-[176px] lg:scale-[1.2]">
            {static_ ? (
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
              onClick={open}
              onPointerDown={() => setPressed(true)}
              onPointerUp={() => setPressed(false)}
              onPointerLeave={() => setPressed(false)}
              onPointerCancel={() => setPressed(false)}
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

        {wantController && UnfoldController && (
          <UnfoldController
            scope={rootRef}
            playing={phase !== "folded"}
            speed={speed}
            onDone={finish}
            onTimeline={onTimeline}
          />
        )}
      </section>
  );
}
