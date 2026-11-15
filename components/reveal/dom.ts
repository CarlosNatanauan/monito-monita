/**
 * DOM lookups shared by the reveal timelines (GSAP and reduced motion).
 * The stage marks its parts with data attributes; see reveal-stage.tsx.
 */
import { bulbTransform, segmentOpacity, slipTransform, windowOpacity, type RingGeometry } from "./ring";
import { slipNameSize } from "./slip-text";

export const q = <T extends Element = HTMLElement>(root: ParentNode, selector: string) =>
  root.querySelector<T & HTMLElement>(selector);
export const qa = (root: ParentNode, selector: string) => [...root.querySelectorAll<HTMLElement>(selector)];

export const slipEl = (root: ParentNode, index: number) => q(root, `[data-slip="${index}"]`);
export const slipPart = (root: ParentNode, index: number, part: string) =>
  q(root, `[data-slip="${index}"] [data-part="${part}"]`);
/** A segment's bulbs, in order toward the receiver. */
export const segmentBulbs = (root: ParentNode, index: number) =>
  qa(root, `[data-seg="${index}"]`).sort((a, b) => Number(a.dataset.pos) - Number(b.dataset.pos));
export const bulbLayers = (bulbs: HTMLElement[]) =>
  bulbs.map((b) => q(b, '[data-part="on"]')).filter((el): el is HTMLElement => el !== null);

/**
 * Bulbs light by their state attribute (React has already set it) with a
 * CSS transition; this sets each one's delay, before the new state paints.
 */
export function delayBulbs(bulbs: HTMLElement[], delayAt: (n: number) => number) {
  bulbs.forEach((bulb, n) => bulb.style.setProperty("--bulb-delay", `${delayAt(n).toFixed(3)}s`));
}

/** Clears every bulb delay (a later state change lights at once). */
export function clearBulbDelays(root: ParentNode) {
  for (const bulb of qa(root, "[data-bulb]")) bulb.style.removeProperty("--bulb-delay");
}

/**
 * Another step came in: drop the waiting delays. Bulbs already on their
 * way keep going to the same end state (or turn back smoothly), so no
 * forced style pass is needed; one here would start the next step's bulbs
 * before their delays are set.
 */
export function finishBulbs(root: HTMLElement) {
  clearBulbDelays(root);
}

/**
 * Puts the name a slip showed back on its paper while it turns back over
 * (Previous). These spans are empty in React, so it never fights this.
 */
export function fillGhost(root: ParentNode, index: number, names: { giverName: string; receiverName: string }, g: RingGeometry) {
  const name = slipPart(root, index, "ghost-name");
  const to = slipPart(root, index, "ghost-to");
  if (!name || !to) return;
  name.textContent = names.giverName;
  name.style.fontSize = `${slipNameSize(names.giverName, g)}px`;
  to.textContent = `→ kay ${names.receiverName}`;
}

export function clearGhost(root: ParentNode, index: number) {
  for (const part of ["ghost-name", "ghost-to"]) {
    const el = slipPart(root, index, part);
    if (el) {
      el.textContent = "";
      el.style.removeProperty("font-size");
    }
  }
}

/**
 * Places every slip and bulb `offset` slots from where React put them
 * (large groups: the window turning). Writes only transform and opacity.
 */
export function placeRing(root: ParentNode, g: RingGeometry, offset: number) {
  for (const el of qa(root, "[data-slip]")) {
    const pos = Number(el.dataset.pos) + offset;
    el.style.transform = slipTransform(pos, Number(el.dataset.slip), g);
    el.style.opacity = String(windowOpacity(pos, g));
  }
  for (const el of qa(root, "[data-bulb]")) {
    el.style.transform = bulbTransform(Number(el.dataset.pos) + offset, g);
    el.style.opacity = String(segmentOpacity(Number(el.dataset.segPos) + offset, g));
  }
}
