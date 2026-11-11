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
      <section
        ref={rootRef}
        aria-label="Your monito"
        className="relative flex w-full flex-col items-center gap-4 overflow-x-clip [overflow-clip-margin:16px]"
      >
        <div
          ref={resultRef}
          tabIndex={-1}
          data-part="heading"
          className="text-title font-extrabold outline-none"
          style={{ opacity: static_ ? 1 : 0 }}
        >
          Ang monito mo ay…
          {phase === "opened" && <span className="sr-only"> {name}</span>}
        </div>

        {static_ ? (
          <m.div
            key="open"
            initial={initiallyOpened ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="py-6"
          >
            <SlipArt name={name} state="open" />
          </m.div>
        ) : (
          <m.div
            key="folded"
            animate={{ scale: pressed ? 0.95 : 1 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            className="py-6"
          >
            <SlipArt name={name} state="folded" />
          </m.div>
        )}

        {/* Reserve the caption's space so nothing below jumps when it goes. */}
        <div className="flex min-h-12 items-center">
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
                // Stretched button: the whole slip is the tap target.
                "rounded-xl px-4 py-3 text-body font-semibold text-muted-foreground outline-none select-none",
                "after:absolute after:inset-0 after:rounded-2xl after:content-['']",
                "focus-visible:after:ring-3 focus-visible:after:ring-ring",
                "cursor-pointer disabled:cursor-default [-webkit-tap-highlight-color:transparent]",
              )}
            >
              Tap to open your bunutan
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
    </LazyMotion>
  );
}
