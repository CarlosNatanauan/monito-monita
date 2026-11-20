import gsap from "gsap";
import { BOWL_SLIPS, type BowlSlipSpot } from "@/components/bowl/bowl-art";
import { buildUnfoldTimeline } from "@/components/slip/unfold-timeline";
import type { Sparkle } from "@/components/slip/sparkle";

/**
 * The small bowl on the landing's "Paano 'to?" list (signature moment #1): the bowl
 * shakes and its slips tumble and swap places (a new mix every tap), then
 * a folded sample slip rises out of the bowl and unfolds exactly like the
 * real slip on /me (same timeline). Lazy-loaded by TryBunutan, so GSAP is never
 * part of the landing page's first load. Transforms and opacity only.
 */

/** The mix: the bowl shakes and its slips tumble and swap places (700ms). */
const MIX = 0.7;
/** When the slip starts to rise: as the bowl settles. */
const RISE_AT = MIX;
const UNFOLD_AT = RISE_AT + 0.35;

/** A new order where no slip stays in the spot it is in now (2 slips: a swap). */
function derange(now: number[]): number[] {
  for (;;) {
    const next = [...now].sort(() => Math.random() - 0.5);
    if (next.every((spot, k) => spot !== now[k])) return next;
  }
}

/**
 * Where the bowl's slips are now, between mixes: for each slip (by its home
 * spot), the spot it sits in and its rotation so far (unbounded degrees, so
 * every tumble spins on from where the last one stopped).
 */
type MixState = { spot: number[]; rot: number[] };
const homeState = (spots: BowlSlipSpot[]): MixState => ({ spot: spots.map((_, k) => k), rot: spots.map((s) => s.rot) });

/**
 * Adds the mix to `tl` at 0: the bowl rocks side to side on its foot while
 * each slip hops, spins and lands in another slip's spot (tilted as that
 * spot is). Transforms only, on the slips' own elements (composited).
 * Returns the state the slips end in.
 */
function addMix(tl: gsap.core.Timeline, shakers: HTMLElement[], layers: { spots: BowlSlipSpot[]; els: HTMLElement[]; now: MixState }[]) {
  tl.to(shakers, { keyframes: { rotation: [0, -5, 4.5, -3.5, 2.5, -1, 0], easeEach: "sine.inOut" }, duration: MIX, ease: "none", transformOrigin: "50% 100%" }, 0);
  tl.set(shakers, { clearProps: "transform" }, MIX);
  return layers.map(({ spots, els, now }) => {
    const order = derange(now.spot);
    const rot = now.rot.map((from, k) => {
      const to = spots[order[k]];
      const dir = Math.random() < 0.5 ? 1 : -1;
      let end = to.rot + (Math.random() < 0.5 ? 180 : 0);
      while ((end - from) * dir < 120) end += 360 * dir;
      while ((end - from) * dir >= 480) end -= 360 * dir;
      const home = spots[k];
      const at = (spot: BowlSlipSpot) => ({ x: ((spot.cx - home.cx) / home.w) * 100, y: ((spot.cy - home.cy) / home.h) * 100 });
      const a = at(spots[now.spot[k]]);
      const b = at(to);
      const el = els[k];
      if (el) {
        tl.to(
          el,
          {
            keyframes: [
              { xPercent: (a.x + b.x) / 2, yPercent: (a.y + b.y) / 2 - 70, rotation: (from + end) / 2, duration: 0.28, ease: "power2.out" },
              { xPercent: b.x, yPercent: b.y, rotation: end, duration: 0.3, ease: "power2.in" },
            ],
          },
          0.06 + k * 0.03,
        );
      }
      return end;
    });
    return { spot: order, rot };
  });
}

/**
 * Where the slip starts (inside the bowl), relative to where it lands, in
 * the slip stage's own px. Measured when the draw starts, before anything moves.
 */
function measureRise(stage: HTMLElement): { x: number; y: number } {
  const bowl = stage.closest("[data-bunutan]")?.querySelector<HTMLElement>('[data-part="bowl"]');
  if (!bowl) return { x: 0, y: 215 };
  const s = stage.getBoundingClientRect();
  const b = bowl.getBoundingClientRect();
  const scale = s.width / stage.offsetWidth || 1;
  return {
    x: (b.left + b.width / 2 - (s.left + s.width / 2)) / scale,
    y: (b.top + b.height * 0.45 - (s.top + s.height / 2)) / scale,
  };
}

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
  /** Drops the shown slip back into the bowl (before the next draw). */
  putBack: (stage: HTMLElement) => Promise<void>;
  /**
   * Folds the shown slip back into the bowl: the draw played backwards from
   * the open slip to the start of the rise (the name un-writes, the slip
   * folds, sinks into the bowl and fades), at twice the speed. No sparkle.
   */
  fold: () => Promise<void>;
  dispose: () => void;
};

export function createDrawer(): Drawer {
  let sparkle: Sparkle | null = null;
  let disposed = false;
  let warming = false;
  // The sparkle module (canvas-confetti) is fetched only when warmed: someone
  // pointing at or focusing the bowl. Evaluating it can be a long task on a
  // slow phone, so it never comes with the bowl's code by itself.
  let sparkleModule: typeof import("@/components/slip/sparkle") | null = null;
  let sparkleLoaded: Promise<typeof import("@/components/slip/sparkle")> | null = null;
  const loadSparkle = () => (sparkleLoaded ??= import("@/components/slip/sparkle").then((m) => (sparkleModule = m)));
  let ctx: gsap.Context | null = null;
  let timeline: gsap.core.Timeline | null = null;
  let rise = { x: 0, y: 215 };
  let mixed = { top: homeState(BOWL_SLIPS.top), inside: homeState(BOWL_SLIPS.inside) };
  // While folding back, the timeline's calls (the sparkle, onDone) are crossed again: mute them.
  let folding = false;
  // Phones: a smaller burst from the slip, so it stays clear of the poster and the headline.
  const burstOf = (s: Sparkle | null): Sparkle | null => {
    if (!s || folding) return null;
    if (window.matchMedia("(min-width: 600px)").matches) return s;
    return Object.assign((x: number, y: number) => s(x, y, { compact: true }), { dispose: s.dispose });
  };

  const drawer: Drawer = {
    prepare(stage, onDone) {
      ctx?.kill();
      timeline = null;
      ctx = gsap.context(() => {
        const riser = stage.querySelector<HTMLElement>('[data-part="riser"]');
        if (!riser) return;
        rise = measureRise(stage);
        const shakers = [...(stage.closest("[data-bunutan]")?.querySelectorAll<HTMLElement>('[data-part="bowl-shake"]') ?? [])];
        const unfold = buildUnfoldTimeline(stage, {
          sparkle: () => burstOf(sparkle),
          onDone: () => {
            if (!folding) onDone();
          },
        });
        const tl = gsap.timeline({ paused: true });
        // The mix (700ms), with a short buzz on Android (iPhone ignores it);
        // then one slip rises out of the small bowl (350ms, ease-out), from a quarter of its size.
        if (shakers.length === 2) {
          const slips = (i: number) => [...shakers[i].querySelectorAll<HTMLElement>("[data-bowl-slip]")];
          const [top, inside] = addMix(tl, shakers, [
            { spots: BOWL_SLIPS.top, els: slips(0), now: mixed.top },
            { spots: BOWL_SLIPS.inside, els: slips(1), now: mixed.inside },
          ]);
          tl.call(() => {
            mixed = { top, inside };
            navigator.vibrate?.([30, 60, 30, 60, 40]);
          }, undefined, 0);
        }
        tl.fromTo(
          riser,
          { x: rise.x, y: rise.y, scale: 0.25, rotation: 8 },
          { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.35, ease: "power2.out" },
          RISE_AT,
        ).fromTo(riser, { opacity: 0 }, { opacity: 1, duration: 0.1, ease: "none" }, RISE_AT);
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
        void loadSparkle().then((m) => {
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
          x: rise.x * 0.7,
          y: rise.y * 0.7,
          scale: 0.3,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => resolve(),
        });
      });
    },

    fold() {
      return new Promise((resolve) => {
        const tl = timeline;
        if (!tl) return resolve();
        folding = true;
        tl.pause();
        gsap.to(tl, {
          time: RISE_AT,
          duration: Math.max(0.3, (tl.time() - RISE_AT) / 2),
          ease: "power1.inOut",
          onComplete: () => {
            folding = false;
            resolve();
          },
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
