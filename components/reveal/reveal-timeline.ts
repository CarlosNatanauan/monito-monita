/**
 * The party reveal timelines (signature moment 4), full motion. Loaded
 * only by the reveal screen, and only without reduced motion, so GSAP
 * never ships with any other page.
 *
 * The stage has already rendered the new state when this runs; every
 * tween goes from the old state to it (fromTo with clearProps), so
 * finishing early always lands on exactly what React drew.
 */
import gsap from "gsap";
import {
  clearBulbDelays,
  clearGhost,
  delayBulbs,
  finishBulbs,
  fillGhost,
  placeRing,
  q,
  qa,
  segmentBulbs,
  slipPart,
} from "./dom";
import type { RingGeometry } from "./ring";
import type { PlayOptions, Playing, StepTransition } from "./transition";

const FLIP = 0.7; // rotateY
const BULB_GAP = 0.14; // between bulbs toward the receiver (4 of them; more, faster, in small groups)
const TURN = 0.65; // large groups: the window turning one slot

export function playTransition(root: HTMLElement, t: StepTransition, g: RingGeometry, { cue, done, speed = 1 }: PlayOptions): Playing {
  const tl = gsap.timeline({
    onComplete: () => {
      if (t.unflip) clearGhost(root, t.unflip.index);
      clearBulbDelays(root);
      done();
    },
  });
  // Bulbs are CSS transitions: their delays follow the timeline's speed.
  const sec = (at: number) => at / speed;

  // Set the bulb delays before any tween is built: GSAP reads computed
  // styles while building, and that style pass starts the bulbs' CSS
  // transitions (React has already set their new state).
  const stepAt = t.shift ? TURN - 0.1 : t.kind === "start" ? 0.6 : 0;
  const lightStart = stepAt + FLIP - 0.05;
  let lightGap = BULB_GAP;
  let lightCount = 0;
  if ((t.kind === "start" || t.kind === "next") && t.light !== undefined) {
    const bulbs = segmentBulbs(root, t.light);
    lightCount = bulbs.length;
    lightGap = Math.min(BULB_GAP, (BULB_GAP * 4) / Math.max(bulbs.length, 1));
    delayBulbs(bulbs, (n) => sec(lightStart + n * lightGap));
  } else if (t.kind === "previous" && t.dim !== undefined) {
    // Back toward the giver, one after another.
    delayBulbs(segmentBulbs(root, t.dim).reverse(), (n) => sec(n * 0.08));
  }

  const centre = q(root, '[data-part="centre"]');
  const halo = (i: number) => slipPart(root, i, "halo");
  const flipOf = (i: number) => slipPart(root, i, "flip");

  /** The window turning (large groups): every slip and bulb slides `shift` slots back into place. */
  const turn = (at: number) => {
    if (!t.shift) return;
    const state = { offset: t.shift };
    placeRing(root, g, t.shift);
    tl.to(state, { offset: 0, duration: TURN, ease: "power2.inOut", onUpdate: () => placeRing(root, g, state.offset) }, at);
    tl.call(() => placeRing(root, g, 0), [], at + TURN);
  };

  if (t.kind === "start" || t.kind === "next") {
    const at = stepAt;
    if (t.kind === "start") {
      // Codenames appear on the blank slips first.
      const codes = qa(root, '[data-part="code"]');
      tl.fromTo(codes, { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.03, clearProps: "opacity" }, 0);
    }
    if (t.shift) turn(0);
    for (const i of t.haloOut) {
      const el = halo(i);
      if (el) tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.3, clearProps: "opacity" }, at);
    }
    if (t.flip !== undefined) {
      const el = flipOf(t.flip);
      if (el) {
        tl.call(() => cue({ kind: "flip" }), [], at);
        tl.fromTo(el, { rotationY: 0 }, { rotationY: 180, duration: FLIP, ease: "power2.inOut", clearProps: "transform" }, at);
      }
    }
    if (centre) {
      tl.fromTo(centre, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.55, ease: "power2.out", clearProps: "opacity,transform" }, at + 0.35);
    }
    for (const i of t.haloIn) {
      const el = halo(i);
      if (el) tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, clearProps: "opacity" }, at + FLIP - 0.2);
    }
    if (lightCount > 0) {
      // The bulbs toward the receiver light one after another (their
      // state is already "on"; each waits for its delay, set above).
      for (let n = 0; n < Math.min(lightCount, 5); n++) tl.call(() => cue({ kind: "bulb", n }), [], lightStart + n * lightGap);
      // Keep the timeline (and `done`) running until the last bulb is on.
      tl.set({}, {}, lightStart + lightCount * lightGap + 0.12);
    }
  } else if (t.kind === "previous") {
    for (const i of t.haloOut) {
      const el = halo(i);
      if (el) tl.fromTo(el, { opacity: 1 }, { opacity: 0, duration: 0.3, clearProps: "opacity" }, 0);
    }
    let at = 0.3;
    if (t.unflip) {
      const { index } = t.unflip;
      fillGhost(root, index, t.unflip, g);
      const el = flipOf(index);
      if (el) {
        tl.call(() => cue({ kind: "back" }), [], at);
        tl.fromTo(el, { rotationY: 180 }, { rotationY: 0, duration: 0.6, ease: "power2.inOut", clearProps: "transform" }, at);
      }
      at += 0.55;
    }
    if (t.shift) {
      turn(at);
      at += TURN - 0.1;
    }
    for (const i of t.haloIn) {
      const el = halo(i);
      if (el) tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, clearProps: "opacity" }, at);
    }
    if (centre) tl.fromTo(centre, { opacity: 0 }, { opacity: 1, duration: 0.45, clearProps: "opacity" }, 0.25);
  } else {
    // Finale: "Ilawan ang parol". Every bulb lights in a sweep around the
    // ring (all go dark at once, then come back on one after another),
    // every slip gets its gold outline, the frame turns gold, the paper
    // banner comes in, then the gold stars.
    tl.call(() => cue({ kind: "finale" }), [], 0);
    const sweep = 1.6;
    const bulbs = qa(root, "[data-bulb]").sort((a, b) => Number(a.dataset.pos) - Number(b.dataset.pos));
    root.dataset.sweep = "";
    void root.offsetWidth; // all dark now, without a transition
    delayBulbs(bulbs, (n) => sec((sweep * n) / Math.max(bulbs.length, 1)));
    delete root.dataset.sweep;
    tl.set({}, {}, sweep + 0.15);
    const halos = qa(root, "[data-slip]")
      .filter((s) => s.dataset.slip !== String(t.finaleFrom))
      .sort((a, b) => Number(a.dataset.pos) - Number(b.dataset.pos))
      .map((s) => q(s, '[data-part="halo"]'))
      .filter((el): el is HTMLElement => el !== null);
    tl.fromTo(halos, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: sweep / Math.max(halos.length, 1), clearProps: "opacity" }, 0.1);
    const frame = q(root, ".rv-frame-gold");
    if (frame) tl.fromTo(frame, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "sine.out", clearProps: "opacity" }, sweep * 0.5);
    if (centre) {
      tl.fromTo(centre, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.6)", clearProps: "opacity,transform" }, sweep * 0.6);
    }
    tl.call(() => cue({ kind: "burst" }), [], sweep * 0.75);
  }

  tl.timeScale(speed);
  return {
    finish: () => {
      finishBulbs(root);
      if (tl.progress() < 1) tl.progress(1);
      tl.kill();
    },
  };
}
