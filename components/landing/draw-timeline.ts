import gsap from "gsap";
import { buildUnfoldTimeline } from "@/components/slip/unfold-timeline";
import type { Sparkle } from "@/components/slip/sparkle";

/**
 * "Try a bunutan" on the landing page (signature moment #1): a folded
 * sample slip rises out of the bowl, then unfolds exactly like the real
 * slip on /me (same timeline). Lazy-loaded by TryBunutan, so GSAP is never
 * part of the landing page's first load. Transforms and opacity only.
 */

/** How far below its resting place the slip starts (inside the bowl), in the
 * stage's own px (the stage is drawn at 0.6 scale, so ~129px on screen). */
export const RISE = 215;
const UNFOLD_AT = 0.42;

export type Drawer = {
  /**
   * Builds the rise + unfold for the slip inside `stage`, paused, so a
   * later tap only has to call play(): no style reads or layer setup on tap.
   * `onDone` when the name is shown.
   */
  prepare: (stage: HTMLElement, onDone: () => void) => void;
  /** Plays what prepare() built. */
  play: () => void;
  /** prepare() + play(), for a slip that was just put on the page. */
  draw: (stage: HTMLElement, onDone: () => void) => void;
  /**
   * Sets up the gold sparkle (canvas + worker, a long task on slow phones).
   * Called on the first interaction with the page, not at idle, so it
   * never lands in the page load.
   */
  warmSparkle: () => void;
  /** Drops the shown slip back into the bowl. */
  putBack: (stage: HTMLElement) => Promise<void>;
  dispose: () => void;
};

export function createDrawer(): Drawer {
  let sparkle: Sparkle | null = null;
  let disposed = false;
  let warming = false;
  // Fetch the (small) sparkle module now; set it up only when warmed.
  let sparkleModule: typeof import("@/components/slip/sparkle") | null = null;
  const sparkleLoaded = import("@/components/slip/sparkle").then((m) => (sparkleModule = m));
  let ctx: gsap.Context | null = null;
  let timeline: gsap.core.Timeline | null = null;

  const drawer: Drawer = {
    prepare(stage, onDone) {
      ctx?.kill();
      timeline = null;
      ctx = gsap.context(() => {
        const riser = stage.querySelector<HTMLElement>('[data-part="riser"]');
        if (!riser) return;
        const unfold = buildUnfoldTimeline(stage, { sparkle: () => sparkle, onDone });
        const tl = gsap.timeline({ paused: true });
        tl.fromTo(
          riser,
          { y: RISE, scale: 0.5, rotation: 8 },
          { y: 0, scale: 1, rotation: 0, duration: 0.62, ease: "power2.out" },
          0,
        ).fromTo(riser, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: "none" }, 0);
        tl.add(unfold.paused(false), UNFOLD_AT);
        timeline = tl;
      }, stage);
    },

    warmSparkle() {
      if (warming || disposed) return;
      warming = true;
      // Synchronously when the module is here: called from a pointerdown,
      // the setup then runs before the click that starts the draw.
      if (sparkleModule) sparkle = sparkleModule.prepareSparkle();
      else
        void sparkleLoaded.then((m) => {
          if (!disposed) sparkle = m.prepareSparkle();
        });
    },

    play() {
      timeline?.play();
    },

    draw(stage, onDone) {
      drawer.prepare(stage, onDone);
      drawer.play();
    },

    putBack(stage) {
      return new Promise((resolve) => {
        const riser = stage.querySelector<HTMLElement>('[data-part="riser"]');
        if (!riser) return resolve();
        gsap.to(riser, {
          y: RISE * 0.7,
          scale: 0.55,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => resolve(),
        });
      });
    },

    dispose() {
      disposed = true;
      ctx?.kill();
      sparkle?.dispose();
    },
  };
  return drawer;
}
