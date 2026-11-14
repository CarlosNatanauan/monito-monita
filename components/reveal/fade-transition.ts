/**
 * The reveal transitions with reduced motion: no flip, no travel, no
 * turning window. Slips, bulbs and the centre cross-fade (opacity only),
 * with the Web Animations API, so GSAP is never loaded. Also the fallback
 * if a step arrives before the GSAP chunk has loaded.
 *
 * As with the GSAP timelines, the stage already shows the new state; each
 * fade starts from the old value ("backwards" fill) and ends on the CSS.
 */
import { bulbLayers, clearGhost, fillGhost, q, qa, segmentBulbs, slipPart } from "./dom";
import type { RingGeometry } from "./ring";
import type { PlayOptions, Playing, StepTransition } from "./transition";

const D = 400;

export function playFade(root: HTMLElement, t: StepTransition, g: RingGeometry, { cue, done }: PlayOptions): Playing {
  const running: Animation[] = [];
  const fade = (els: (HTMLElement | null)[], from: number, to: number, delay = 0, duration = D) => {
    for (const el of els) {
      if (!el) continue;
      running.push(
        el.animate([{ opacity: from }, { opacity: to }], { duration, delay, easing: "ease-in-out", fill: "backwards" }),
      );
    }
  };
  const front = (i: number) => slipPart(root, i, "front");
  const back = (i: number) => slipPart(root, i, "back");
  const halo = (i: number) => slipPart(root, i, "halo");
  const centre = q(root, '[data-part="centre"]');

  // Large groups: the window swaps slips with a cross-fade, no rotation.
  if (t.shift) fade([q(root, '[data-part="ring"]')], 0.2, 1, 0, 500);

  if (t.kind === "start" || t.kind === "next") {
    if (t.kind === "start") fade(qa(root, '[data-part="code"]'), 0, 1);
    if (t.flip !== undefined) {
      cue({ kind: "flip" });
      fade([front(t.flip)], 1, 0);
      fade([back(t.flip)], 0, 1);
    }
    fade(t.haloOut.map(halo), 1, 0);
    fade(t.haloIn.map(halo), 0, 1, 200);
    for (const i of t.settle) fade(bulbLayers(segmentBulbs(root, i), "glow"), 1, 0, 200);
    if (t.light !== undefined) {
      const bulbs = segmentBulbs(root, t.light);
      fade([...bulbLayers(bulbs, "on"), ...bulbLayers(bulbs, "glow")], 0, 1, 200);
      cue({ kind: "bulb", n: 0 });
    }
    fade([centre], 0, 1, 100);
  } else if (t.kind === "previous") {
    if (t.unflip) {
      cue({ kind: "back" });
      fillGhost(root, t.unflip.index, t.unflip, g);
      fade([back(t.unflip.index)], 1, 0);
      fade([front(t.unflip.index)], 0, 1);
    }
    fade(t.haloOut.map(halo), 1, 0);
    fade(t.haloIn.map(halo), 0, 1, 200);
    if (t.dim !== undefined) {
      const bulbs = segmentBulbs(root, t.dim);
      fade([...bulbLayers(bulbs, "on"), ...bulbLayers(bulbs, "glow")], 1, 0);
    }
    if (t.reglow !== undefined && t.reglow >= 0) fade(bulbLayers(segmentBulbs(root, t.reglow), "glow"), 0, 1, 200);
    fade([centre], 0, 1, 100);
  } else {
    cue({ kind: "finale" });
    const bulbs = qa(root, "[data-bulb]").filter((b) => b.dataset.seg !== String(t.finaleFrom));
    fade(bulbLayers(bulbs, "glow"), 0, 1, 0, 700);
    const halos = qa(root, "[data-slip]")
      .filter((s) => s.dataset.slip !== String(t.finaleFrom))
      .map((s) => q(s, '[data-part="halo"]'));
    fade(halos, 0, 1, 0, 700);
    fade([q(root, '[data-part="parol-glow"]')], 0, 1, 200, 900);
    fade([centre], 0, 1, 300, 600);
  }

  let finished = false;
  const end = () => {
    if (finished) return;
    finished = true;
    if (t.unflip) clearGhost(root, t.unflip.index);
    done();
  };
  Promise.all(running.map((a) => a.finished.catch(() => undefined))).then(end);

  return {
    finish: () => {
      for (const a of running) a.finish();
      end();
    },
  };
}
