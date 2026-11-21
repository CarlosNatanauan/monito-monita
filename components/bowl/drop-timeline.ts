import gsap from "gsap";
import { SLIP } from "@/components/slip/slip-constants";

/**
 * Signature moment #2, joining: your slip (open, your name on it) folds
 * twice and drops into the bowl. About 1.5s. The reverse of the unfold's
 * folds, without the writing. Lazy-loaded by JoinDrop; transforms and
 * opacity only.
 */

const { W } = SLIP;

/** How far the slip drops, in the slip stage's own px (drawn at 0.6 scale). */
export const DROP = 222;

export function buildDropTimeline(root: HTMLElement, onDone: () => void): gsap.core.Timeline {
  const q = gsap.utils.selector(root);
  const one = (part: string) => q(`[data-part="${part}"]`)[0] as HTMLElement;

  const placers = q('[data-part="placer"], [data-part="shadow-placer"]');
  const footprints = q('[data-part="shadow-contact"], [data-part="shadow-lift"]');
  const turners = q('[data-part="tr"], [data-part="br"]');
  const riser = one("riser");
  const bowl = q('[data-part="bowl"]');
  const moved = [...placers, ...footprints, ...turners, one("centerer"), one("bottom"), riser];

  // Start from SlipArt's open values.
  gsap.set(moved, { clearProps: "transform" });
  gsap.set([...placers, ...footprints], { transformOrigin: "50% 0%" });
  gsap.set(placers, { rotation: SLIP.OPEN_ROT, scale: 1 });
  gsap.set(moved, { willChange: "transform" });

  const tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: onDone });

  // The name goes; plain paper is left to fold.
  tl.to(one("flat"), { opacity: 0, duration: 0.12, ease: "none" }, 0.28);

  // Fold 1: the right half closes over the left like a book.
  tl.to(turners, { rotationY: -180, z: 1, duration: 0.34 }, 0.3)
    .to(one("centerer"), { x: W / 4, duration: 0.34 }, 0.3)
    .to(footprints, { scaleX: 0.5, duration: 0.34 }, 0.3)
    .fromTo(
      q('[data-part="tr-front-shade"], [data-part="br-front-shade"]'),
      { opacity: 0 },
      { opacity: 1, duration: 0.17, ease: "power1.in" },
      0.3,
    );

  // Fold 2: the bottom half folds up over the top.
  tl.to(one("bottom"), { rotationX: 180, z: 2, duration: 0.32 }, 0.6)
    .to(footprints, { scaleY: 0.5, duration: 0.32 }, 0.6)
    .to(placers, { rotation: SLIP.FOLD_ROT, scale: SLIP.FOLD_SCALE, duration: 0.32 }, 0.6)
    .to(one("br-back-shade"), { opacity: 1, duration: 0.2 }, 0.72);

  // Drop: into the bowl, behind the front glass.
  tl.to(riser, { y: DROP, scale: 0.45, rotation: 12, duration: 0.38, ease: "power2.in" }, 0.94);

  // The bowl takes it: a small settle.
  tl.to(bowl, { scaleY: 0.97, scaleX: 1.01, duration: 0.08, ease: "power1.out", transformOrigin: "50% 100%" }, 1.3)
    .to(bowl, { scaleY: 1, scaleX: 1, duration: 0.18, ease: "power2.out" }, 1.38);

  return tl;
}
