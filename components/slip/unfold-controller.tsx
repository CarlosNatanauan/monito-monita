"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SLIP } from "./slip-art";
import type { Sparkle } from "./sparkle";

gsap.registerPlugin(useGSAP);

/**
 * The unfold timeline (signature moment #3). Lazy-loaded by BunutanSlip
 * only when a folded slip is on screen, so GSAP never ships with the page.
 * Renders nothing; animates the `data-part` elements of SlipArt.
 * Transforms and opacity only.
 */

export type UnfoldControllerProps = {
  scope: RefObject<HTMLElement | null>;
  playing: boolean;
  speed: number;
  onDone: () => void;
  /** Prototype hook: the lab uses it for timing and frame-rate checks. */
  onTimeline?: (tl: gsap.core.Timeline) => void;
};

const { W, H, FEATHER } = SLIP;

// Timing in seconds at 1x.
const STEP1_AT = 0.16;
const STEP1 = 0.48;
const STEP2_AT = 0.58;
const STEP2 = 0.48;
const FLAT_AT = STEP2_AT + STEP2;

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
      const root = scope.current;
      const q = gsap.utils.selector(root);
      const one = (part: string) => q(`[data-part="${part}"]`)[0] as HTMLElement;

      const placers = q('[data-part="placer"], [data-part="shadow-placer"]');
      const footprints = q('[data-part="shadow-contact"], [data-part="shadow-lift"]');
      const turners = q('[data-part="tr"], [data-part="br"]');
      const moved = [...placers, ...footprints, ...turners, one("centerer"), one("bottom")];

      // Start from the exact folded values in SlipArt. Clear the inline
      // transforms first so GSAP doesn't decompose a 180° matrix its own way.
      gsap.set(moved, { clearProps: "transform" });
      gsap.set(placers, { rotation: SLIP.FOLD_ROT, scale: SLIP.FOLD_SCALE });
      gsap.set(one("centerer"), { x: W / 4, y: H / 4 });
      gsap.set(one("bottom"), { z: 2, rotationX: 180 });
      gsap.set(turners, { z: 1, rotationY: -180 });
      gsap.set(footprints, { scaleX: 0.5, scaleY: 0.5 });
      gsap.set(moved, { willChange: "transform" }); // promote layers now, not on the first frame

      const writer = makeWriter(root);
      writer.prepare(); // hide the name now; measured again when the slip lies flat
      const writeAt = FLAT_AT + 0.02;
      const writeEnd = writeAt + writer.duration;

      const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });

      // Lift: the slip comes up to meet the finger.
      tl.to(one("caption"), { opacity: 0, y: 4, duration: 0.18, ease: "power1.out" }, 0)
        .to(one("heading-folded"), { opacity: 0, duration: 0.18, ease: "power1.out" }, 0)
        .to(q('[data-part="under-sheet"], [data-part="fold-glow"]'), { opacity: 0, duration: 0.2, ease: "power1.out" }, 0)
        .to(placers, { scale: SLIP.FOLD_SCALE * 1.06, rotation: -3, duration: 0.22, ease: "power2.out" }, 0)
        .to(one("shadow-lift"), { opacity: 1, duration: 0.25, ease: "power1.out" }, 0)
        .to(one("shadow-contact"), { opacity: 0.35, duration: 0.25, ease: "power1.out" }, 0);

      // Fold 1: the bottom half swings down toward you.
      tl.to(one("bottom"), { rotationX: 0, z: 0, duration: STEP1 }, STEP1_AT)
        .to(one("centerer"), { y: 0, duration: STEP1 }, STEP1_AT)
        .to(footprints, { scaleY: 1, duration: STEP1 }, STEP1_AT)
        .to(placers, { scale: 1.12, duration: STEP1 }, STEP1_AT)
        .fromTo(one("bl-back-shade"), { opacity: 0 }, { opacity: 1, duration: STEP1 / 2, ease: "power1.in" }, STEP1_AT)
        .fromTo(one("br-back-shade"), { opacity: 1 }, { opacity: 0, duration: STEP1 / 2, ease: "power1.out" }, STEP1_AT + STEP1 / 2)
        .fromTo(one("tr-back-cast"), { opacity: 0 }, { opacity: 1, duration: STEP1 / 2, ease: "power1.in" }, STEP1_AT)
        .to(one("tr-back-cast"), { opacity: 0, duration: STEP1 / 2, ease: "power1.out" }, STEP1_AT + STEP1 / 2)
        .fromTo(one("heading"), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.3);

      // Fold 2: the right half opens like a book.
      // The panel's lower part (behind the pill) fades, so the open slip
      // ends up hanging over the panel's bottom edge.
      tl.to(one("panel-skirt"), { opacity: 0, duration: STEP2, ease: "power1.inOut" }, STEP2_AT)
        .to(turners, { rotationY: 0, z: 0, duration: STEP2 }, STEP2_AT)
        .to(one("centerer"), { x: 0, duration: STEP2 }, STEP2_AT)
        .to(footprints, { scaleX: 1, duration: STEP2 }, STEP2_AT)
        .to(placers, { scale: 1, rotation: SLIP.OPEN_ROT, duration: STEP2 + 0.06 }, STEP2_AT)
        .fromTo(q('[data-part="tr-back-shade"], [data-part="br-back-shade"]'), { opacity: 0 }, { opacity: 1, duration: STEP2 / 2, ease: "power1.in" }, STEP2_AT)
        .fromTo(q('[data-part="tr-front-shade"], [data-part="br-front-shade"]'), { opacity: 1 }, { opacity: 0, duration: STEP2 / 2, ease: "power1.out" }, STEP2_AT + STEP2 / 2)
        .fromTo(q('[data-part="tl-cast"], [data-part="bl-cast"]'), { opacity: 1 }, { opacity: 0, duration: STEP2, ease: "power2.in" }, STEP2_AT);

      // Settle: laid flat on the table.
      tl.to(one("shadow-lift"), { opacity: 0, duration: 0.3, ease: "power1.inOut" }, FLAT_AT - 0.2)
        .to(one("shadow-contact"), { opacity: 1, duration: 0.3, ease: "power1.inOut" }, FLAT_AT - 0.2)
        .call(writer.prepare, undefined, FLAT_AT)
        .set(one("flat"), { opacity: 1 }, FLAT_AT);

      // The name, written letter by letter.
      tl.to(writer.progress, { p: 1, duration: writer.duration, ease: "none", onUpdate: writer.update }, writeAt)
        .set(one("feather"), { opacity: 0 }, writeEnd);

      // Finish: gold glow, star sparkle, a short buzz.
      tl.fromTo(one("glow"), { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1.05, duration: 0.45, ease: "power2.out" }, writeEnd - 0.2)
        .fromTo(one("rim"), { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, writeEnd - 0.2)
        .fromTo(one("diamonds"), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2)" }, writeEnd - 0.1)
        .call(() => burst(root, sparkleRef.current), undefined, writeEnd - 0.08)
        .call(() => onDoneRef.current(), undefined, writeEnd + 0.15)
        .to(one("glow"), { opacity: 0.3, scale: 1, duration: 0.5, ease: "sine.inOut" }, writeEnd + 0.25)
        .to(one("rim"), { opacity: 1, duration: 0.5, ease: "sine.inOut" }, writeEnd + 0.25);

      tl.eventCallback("onComplete", () => gsap.set(moved, { willChange: "auto" }));
      tlRef.current = tl;
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

function burst(root: HTMLElement, sparkle: Sparkle | null) {
  navigator.vibrate?.(35); // Android only; iPhone ignores it
  if (!sparkle) return;
  const stage = root.querySelector('[data-part="stage"]');
  if (!stage) return;
  const r = stage.getBoundingClientRect();
  sparkle((r.left + r.width / 2) / window.innerWidth, (r.top + r.height / 2) / window.innerHeight);
}

/**
 * "Ink reveal" with transforms only: the clip box slides right while its
 * content slides left by the same amount, so a window opens over the name
 * from left to right. The feather (inside the clip box, at its right edge)
 * softens the edge like wet ink. Each letter gets its own eased segment, so
 * the pen slows between letters and pauses at spaces.
 */
function makeWriter(root: HTMLElement) {
  const clip = root.querySelector<HTMLElement>('[data-part="name-clip"]')!;
  const inner = root.querySelector<HTMLElement>('[data-part="name-inner"]')!;
  const chars = Array.from(root.querySelectorAll<HTMLElement>("[data-char]"));
  const ease = gsap.parseEase("sine.inOut");
  const setClip = gsap.quickSetter(clip, "x", "px") as (v: number) => void;
  const setInner = gsap.quickSetter(inner, "x", "px") as (v: number) => void;

  const duration = gsap.utils.clamp(0.45, 0.85, chars.length * 0.055);
  const progress = { p: 0 };
  let width = 0;
  let edges: number[] = []; // reveal edge after each segment
  let ends: number[] = []; // cumulative time share of each segment (0–1)

  const setEdge = (e: number) => {
    setClip(e - width);
    setInner(width - e);
  };

  function prepare() {
    width = clip.offsetWidth;
    edges = [];
    const weights: number[] = [];
    chars.forEach((el, i) => {
      const last = i === chars.length - 1;
      edges.push(last ? width : Math.min(width, FEATHER + el.offsetLeft + el.offsetWidth + FEATHER * 0.6));
      // Pen lifts at spaces; wider letters take a bit longer.
      weights.push(el.dataset.char === " " ? 0.9 : 0.5 + el.offsetWidth / 30);
    });
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let acc = 0;
    ends = weights.map((w) => (acc += w / total));
    setEdge(FEATHER);
  }

  function update() {
    if (!edges.length) prepare();
    const p = progress.p;
    let i = ends.findIndex((end) => p <= end);
    if (i < 0) i = ends.length - 1;
    const start = i === 0 ? 0 : ends[i - 1];
    const t = ends[i] > start ? (p - start) / (ends[i] - start) : 1;
    const from = i === 0 ? FEATHER : edges[i - 1];
    setEdge(from + (edges[i] - from) * ease(t));
  }

  return { duration, progress, prepare, update };
}
