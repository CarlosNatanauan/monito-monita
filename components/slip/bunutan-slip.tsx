"use client";

import { LazyMotion, m, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import { SlipArt } from "./slip-art";
import type { UnfoldControllerProps } from "./unfold-controller";

// GSAP lives in this chunk, downloaded only once a folded slip is on screen.
// A plain import() on purpose: next/dynamic preloads its chunk with the page.
const loadController = () => import("./unfold-controller").then((mod) => mod.default);
const loadMotionFeatures = () => import("@/lib/motion-features").then((mod) => mod.default);

type Phase = "folded" | "opening" | "opened";

/** How far the open slip hangs below the green panel (docs/DESIGN.md). */
const HANG = 44;

export type BunutanSlipProps = {
  /** The receiver's name, written on the slip. */
  name: string;
  /** Already opened on an earlier visit: show the open slip, no animation. */
  initiallyOpened?: boolean;
  onOpened?: () => void;
  /** Prototype controls (lab only). */
  speed?: number;
  reducedMotion?: boolean;
  onTimeline?: UnfoldControllerProps["onTimeline"];
};

/**
 * Signature moment #3: your monito, unfolding the slip (docs/DESIGN.md).
 * The folded slip is a real button. Reduced motion skips the unfold and
 * fades in the open slip.
 */
export function BunutanSlip({
  name,
  initiallyOpened = false,
  onOpened,
  speed = 1,
  reducedMotion,
  onTimeline,
}: BunutanSlipProps) {
  const systemReduced = useReducedMotion();
  const reduced = reducedMotion ?? systemReduced ?? false;

  const [phase, setPhase] = useState<Phase>(initiallyOpened ? "opened" : "folded");
  // Open without the unfold: earlier visit, or reduced motion.
  const [static_, setStatic] = useState(initiallyOpened);
  const [onScreen, setOnScreen] = useState(false);
  const [pressed, setPressed] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
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
    <LazyMotion features={loadMotionFeatures} strict>
      {/*
        The green panel is two layers in a 3-row grid (heading, slip, pill):
        the top layer spans the first two rows and stops 44px above the
        open slip's bottom edge, so the open slip hangs over it; the skirt
        spans all three rows behind it and fades out as the slip opens.
        Same texture origin, so while both show they read as one panel.
      */}
      <section
        ref={rootRef}
        aria-label="Your monito"
        className="relative isolate grid w-full grid-cols-1 overflow-x-clip [overflow-clip-margin:20px]"
      >
        <div
          aria-hidden
          data-part="panel-skirt"
          className="leaf-panel -z-10 col-start-1 row-start-1 row-end-4 rounded-3xl"
          style={{ opacity: static_ ? 0 : 1 }}
        />
        <div
          aria-hidden
          data-part="panel"
          className="leaf-panel -z-10 col-start-1 row-start-1 row-end-3 rounded-3xl"
          style={{ marginBottom: HANG }}
        />

        <div className="col-start-1 row-start-1 grid px-5 pt-7 text-center text-white">
          <p
            data-part="heading-folded"
            aria-hidden={phase !== "folded"}
            className="col-start-1 row-start-1 font-display text-heading"
            style={{ opacity: static_ ? 0 : 1 }}
          >
            May nabunot ka na!
          </p>
          <div
            ref={resultRef}
            tabIndex={-1}
            data-part="heading"
            className="col-start-1 row-start-1 font-display text-heading outline-none"
            style={{ opacity: static_ ? 1 : 0 }}
          >
            Ang monito mo ay…
            {phase === "opened" && <span className="sr-only"> {name}</span>}
          </div>
        </div>

        <div className="col-start-1 row-start-2 mt-6 flex justify-center max-[359px]:scale-90">
          {static_ ? (
            <m.div
              key="open"
              initial={initiallyOpened ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <SlipArt name={name} state="open" />
            </m.div>
          ) : (
            <m.div
              key="folded"
              animate={{ scale: pressed ? 0.95 : 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
            >
              <SlipArt name={name} state="folded" />
            </m.div>
          )}
        </div>

        {initiallyOpened ? (
          // Room for the slip's tilt and halo before whatever comes next.
          <div className="col-start-1 row-start-3 h-4" />
        ) : (
          // Reserve the pill's space so nothing below jumps when it goes.
          <div className="col-start-1 row-start-3 flex min-h-12 items-center justify-center pt-5 pb-7 box-content">
            {phase !== "opened" && (
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
                  "flex h-12 items-center rounded-full border-[1.5px] border-white px-10 text-body font-bold text-white outline-none select-none",
                  // Stretched button: the whole panel is the tap target.
                  "after:absolute after:inset-0 after:rounded-3xl after:content-['']",
                  "focus-visible:after:shadow-[0_0_0_2px_var(--color-ube),0_0_0_6px_rgb(244_197_66/0.8)]",
                  "cursor-pointer disabled:cursor-default [-webkit-tap-highlight-color:transparent]",
                )}
              >
                Tap to open your bunutan
              </button>
            )}
          </div>
        )}

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
    </LazyMotion>
  );
}
