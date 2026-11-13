"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import type { Sparkle } from "./sparkle";
import { buildUnfoldTimeline } from "./unfold-timeline";

gsap.registerPlugin(useGSAP);

/**
 * Plays the unfold timeline (signature moment #3) on /me. Lazy-loaded by
 * BunutanSlip only when a folded slip is on screen, so GSAP never ships
 * with the page. Renders nothing.
 */

export type UnfoldControllerProps = {
  scope: RefObject<HTMLElement | null>;
  playing: boolean;
  speed: number;
  onDone: () => void;
  /** Prototype hook: the lab uses it for timing and frame-rate checks. */
  onTimeline?: (tl: gsap.core.Timeline) => void;
};

export default function UnfoldController({ scope, playing, speed, onDone, onTimeline }: UnfoldControllerProps) {
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const sparkleRef = useRef<Sparkle | null>(null);
  const onDoneRef = useRef(onDone);
  const speedRef = useRef(speed);
  useEffect(() => {
    onDoneRef.current = onDone;
    speedRef.current = speed;
  });

  // Fetch and set up the sparkle while the slip waits for a tap.
  useEffect(() => {
    let alive = true;
    import("./sparkle").then((m) => {
      if (alive) sparkleRef.current = m.prepareSparkle();
    });
    return () => {
      alive = false;
      sparkleRef.current?.dispose();
      sparkleRef.current = null;
    };
  }, []);

  // Build the paused timeline while the slip waits on screen, so the tap
  // itself only has to call play(): no style reads or layer setup on tap.
  useGSAP(
    () => {
      if (!scope.current) return;
      tlRef.current = buildUnfoldTimeline(scope.current, {
        sparkle: () => sparkleRef.current,
        onDone: () => onDoneRef.current(),
      });
    },
    { scope },
  );

  useEffect(() => {
    const tl = tlRef.current;
    if (!playing || !tl || tl.isActive() || tl.progress() > 0) return;
    tl.timeScale(speedRef.current).play();
    onTimeline?.(tl);
  }, [playing, onTimeline]);

  useEffect(() => {
    tlRef.current?.timeScale(speed);
  }, [speed]);

  return null;
}
