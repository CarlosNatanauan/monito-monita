/**
 * The reveal transitions with reduced motion: no flip, no travel, no
 * turning window. Slips, bulbs and the centre cross-fade (opacity only),
 * with the Web Animations API, so GSAP is never loaded. Also the fallback
 * if a step arrives before the GSAP chunk has loaded.
 *
 * As with the GSAP timelines, the stage already shows the new state; each
 * fade starts from the old value ("backwards" fill) and ends on the CSS.
 */
import { bulbLayers, clearBulbDelays, clearGhost, fillGhost, q, qa, segmentBulbs, slipPart } from "./dom";
import type { RingGeometry } from "./ring";
import type { PlayOptions, Playing, StepTransition } from "./transition";

const D = 150; // docs/DESIGN.md: states cross-fade in 150ms

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
  if (t.shift) fade([q(root, '[data-part="ring"]')], 0.2, 1, 0, D);

  if (t.kind === "start" || t.kind === "next") {
    if (t.kind === "start") fade(qa(root, '[data-part="code"]'), 0, 1);
    if (t.flip !== undefined) {
      cue({ kind: "flip" });
      fade([front(t.flip)], 1, 0);
      fade([back(t.flip)], 0, 1);
    }
    fade(t.haloOut.map(halo), 1, 0);
    fade(t.haloIn.map(halo), 0, 1);
    if (t.light !== undefined) {
      fade(bulbLayers(segmentBulbs(root, t.light)), 0, 1);
      cue({ kind: "bulb", n: 0 });
    }
    fade([centre], 0, 1);
  } else if (t.kind === "previous") {
    if (t.unflip) {
      cue({ kind: "back" });
      fillGhost(root, t.unflip.index, t.unflip, g);
      fade([back(t.unflip.index)], 1, 0);
      fade([front(t.unflip.index)], 0, 1);
    }
    fade(t.haloOut.map(halo), 1, 0);
    fade(t.haloIn.map(halo), 0, 1);
    if (t.dim !== undefined) fade(bulbLayers(segmentBulbs(root, t.dim)), 1, 0);
    fade([centre], 0, 1);
  } else {
    cue({ kind: "finale" });
    const halos = qa(root, "[data-slip]")
      .filter((s) => s.dataset.slip !== String(t.finaleFrom))
      .map((s) => q(s, '[data-part="halo"]'));
    fade(halos, 0, 1);
    fade([q(root, ".rv-frame-gold")], 0, 1);
    fade([centre], 0, 1);
  }

  let finished = false;
  const end = () => {
    if (finished) return;
    finished = true;
    if (t.unflip) clearGhost(root, t.unflip.index);
    clearBulbDelays(root);
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
