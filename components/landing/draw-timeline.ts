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
  /** Plays the rise + unfold on the slip inside `stage`; `onDone` when the name is shown. */
  draw: (stage: HTMLElement, onDone: () => void) => void;
  /** Drops the shown slip back into the bowl. */
  putBack: (stage: HTMLElement) => Promise<void>;
  dispose: () => void;
};

export function createDrawer(): Drawer {
  let sparkle: Sparkle | null = null;
  let disposed = false;
  import("@/components/slip/sparkle").then((m) => {
    if (!disposed) sparkle = m.prepareSparkle();
  });
  let ctx: gsap.Context | null = null;

  return {
    draw(stage, onDone) {
      ctx?.kill();
      ctx = gsap.context(() => {
        const riser = stage.querySelector<HTMLElement>('[data-part="riser"]');
        if (!riser) return;
        const unfold = buildUnfoldTimeline(stage, { sparkle: () => sparkle, onDone });
        const tl = gsap.timeline();
        tl.fromTo(
          riser,
          { y: RISE, scale: 0.5, rotation: 8 },
          { y: 0, scale: 1, rotation: 0, duration: 0.62, ease: "power2.out" },
          0,
        ).fromTo(riser, { opacity: 0 }, { opacity: 1, duration: 0.14, ease: "none" }, 0);
        tl.add(unfold.paused(false), UNFOLD_AT);
      }, stage);
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
}
