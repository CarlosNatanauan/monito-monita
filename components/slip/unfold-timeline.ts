import gsap from "gsap";
import { SLIP } from "./slip-constants";
import type { Sparkle } from "./sparkle";

/**
 * The slip unfold timeline (signature moment #3), shared by /me and the
 * landing page's sample slip. Animates the `data-part` elements of SlipArt
 * inside `root`; the sky-panel parts of /me (caption, headings, the ray
 * disc) are animated only when present. Returns a paused timeline, built ahead
 * of the tap so the tap itself only calls play(). Transforms and opacity only.
 */

const { W, FEATHER } = SLIP;

// Timing in seconds at 1x.
const STEP1_AT = 0.16;
const STEP1 = 0.48;
const STEP2_AT = 0.58;
const STEP2 = 0.48;
const FLAT_AT = STEP2_AT + STEP2;

export type UnfoldOptions = {
  /** The sparkle, once loaded (read at the moment of the burst). */
  sparkle: () => Sparkle | null;
  /** Called just after the name is written. */
  onDone: () => void;
};

export function buildUnfoldTimeline(root: HTMLElement, { sparkle, onDone }: UnfoldOptions): gsap.core.Timeline {
  const q = gsap.utils.selector(root);
  const one = (part: string) => q(`[data-part="${part}"]`)[0] as HTMLElement;
  // Parts that only /me has.
  const opt = (part: string) => q(`[data-part="${part}"]`)[0] as HTMLElement | undefined;
  const caption = opt("caption");
  const headingFolded = opt("heading-folded");
  const heading = opt("heading");
  const rays = opt("rays");

  const placers = q('[data-part="placer"], [data-part="shadow-placer"]');
  const footprints = q('[data-part="shadow-contact"], [data-part="shadow-lift"]');
  const turners = q('[data-part="tr"], [data-part="br"]');
  const moved = [...placers, ...footprints, ...turners, one("centerer"), one("bottom")];

  // Start from the exact folded values in SlipArt. Clear the inline
  // transforms first so GSAP doesn't decompose a 180° matrix its own way.
  gsap.set(moved, { clearProps: "transform" });
  // The slip hangs from its top edge (the clothespin).
  gsap.set([...placers, ...footprints], { transformOrigin: "50% 0%" });
  gsap.set(placers, { rotation: SLIP.FOLD_ROT, scale: SLIP.FOLD_SCALE });
  gsap.set(one("centerer"), { x: W / 4, y: 0 });
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
  if (caption) tl.to(caption, { opacity: 0, y: 4, duration: 0.18, ease: "power1.out" }, 0);
  if (headingFolded) tl.to(headingFolded, { opacity: 0, duration: 0.18, ease: "power1.out" }, 0);
  tl.to(one("under-sheet"), { opacity: 0, duration: 0.2, ease: "power1.out" }, 0)
    .to(placers, { scale: SLIP.FOLD_SCALE * 1.06, rotation: -3, duration: 0.22, ease: "power2.out" }, 0)
    .to(one("shadow-lift"), { opacity: 1, duration: 0.25, ease: "power1.out" }, 0)
    .to(one("shadow-contact"), { opacity: 0.35, duration: 0.25, ease: "power1.out" }, 0);

  // Fold 1: the bottom half swings down toward you, hanging from the string.
  tl.to(one("bottom"), { rotationX: 0, z: 0, duration: STEP1 }, STEP1_AT)
    .to(footprints, { scaleY: 1, duration: STEP1 }, STEP1_AT)
    .to(placers, { scale: 1.12, duration: STEP1 }, STEP1_AT)
    .fromTo(one("bl-back-shade"), { opacity: 0 }, { opacity: 1, duration: STEP1 / 2, ease: "power1.in" }, STEP1_AT)
    .fromTo(
      one("br-back-shade"),
      { opacity: 1 },
      { opacity: 0, duration: STEP1 / 2, ease: "power1.out" },
      STEP1_AT + STEP1 / 2,
    )
    .fromTo(one("tr-back-cast"), { opacity: 0 }, { opacity: 1, duration: STEP1 / 2, ease: "power1.in" }, STEP1_AT)
    .to(one("tr-back-cast"), { opacity: 0, duration: STEP1 / 2, ease: "power1.out" }, STEP1_AT + STEP1 / 2);
  if (heading) tl.fromTo(heading, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.3);

  // Fold 2: the right half opens like a book.
  tl.to(turners, { rotationY: 0, z: 0, duration: STEP2 }, STEP2_AT)
    .to(one("centerer"), { x: 0, duration: STEP2 }, STEP2_AT)
    .to(footprints, { scaleX: 1, duration: STEP2 }, STEP2_AT)
    .to(placers, { scale: 1, rotation: SLIP.OPEN_ROT, duration: STEP2 + 0.06 }, STEP2_AT)
    .fromTo(
      q('[data-part="tr-back-shade"], [data-part="br-back-shade"]'),
      { opacity: 0 },
      { opacity: 1, duration: STEP2 / 2, ease: "power1.in" },
      STEP2_AT,
    )
    .fromTo(
      q('[data-part="tr-front-shade"], [data-part="br-front-shade"]'),
      { opacity: 1 },
      { opacity: 0, duration: STEP2 / 2, ease: "power1.out" },
      STEP2_AT + STEP2 / 2,
    )
    .fromTo(
      q('[data-part="tl-cast"], [data-part="bl-cast"]'),
      { opacity: 1 },
      { opacity: 0, duration: STEP2, ease: "power2.in" },
      STEP2_AT,
    );

  // Settle: laid flat on the table.
  tl.to(one("shadow-lift"), { opacity: 0, duration: 0.3, ease: "power1.inOut" }, FLAT_AT - 0.2)
    .to(one("shadow-contact"), { opacity: 1, duration: 0.3, ease: "power1.inOut" }, FLAT_AT - 0.2)
    .call(writer.prepare, undefined, FLAT_AT)
    .set(one("flat"), { opacity: 1 }, FLAT_AT);

  // The name, written letter by letter.
  tl.to(writer.progress, { p: 1, duration: writer.duration, ease: "none", onUpdate: writer.update }, writeAt).set(
    one("feather"),
    { opacity: 0 },
    writeEnd,
  );

  // The ray disc behind the slip scales in from 0.6 and fades in (500ms)
  // as the slip lies open: flat gold rays, no glow.
  if (rays) tl.fromTo(rays, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }, FLAT_AT - 0.1);

  // Finish: a few gold paper stars and a short buzz.
  tl.call(() => burst(root, sparkle()), undefined, writeEnd - 0.08).call(() => onDone(), undefined, writeEnd + 0.15);

  tl.eventCallback("onComplete", () => gsap.set(moved, { willChange: "auto" }));

  return tl;
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
