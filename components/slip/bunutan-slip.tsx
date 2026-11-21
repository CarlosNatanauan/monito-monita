"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { SlipView, type SlipPhase } from "./slip-view";
import type { UnfoldControllerProps } from "./unfold-controller";

// GSAP lives in this chunk, downloaded only once a folded slip is on screen.
// A plain import() on purpose: next/dynamic preloads its chunk with the page.
const loadController = () => import("./unfold-controller").then((mod) => mod.default);

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

  const [phase, setPhase] = useState<SlipPhase>(initiallyOpened ? "opened" : "folded");
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
    <SlipView
      name={name}
      label={label}
      heading={heading}
      rays={rays}
      initiallyOpened={initiallyOpened}
      phase={phase}
      open={static_}
      pressed={pressed}
      rootRef={rootRef}
      headingRef={resultRef}
      openRef={openRef}
      onOpen={open}
      onPress={setPressed}
    >
      {wantController && UnfoldController && (
        <UnfoldController
          scope={rootRef}
          playing={phase !== "folded"}
          speed={speed}
          onDone={finish}
          onTimeline={onTimeline}
        />
      )}
    </SlipView>
  );
}
