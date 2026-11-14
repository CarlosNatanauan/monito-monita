import { describe, expect, it } from "vitest";
import { ringGeometry, ringModel, segmentOpacity, slipPoint, windowOpacity } from "../components/reveal/ring";
import { centreLeadSize, centreNameSize, slipCodeSize, slipNameSize } from "../components/reveal/slip-text";
import { transitionBetween, type Shown } from "../components/reveal/transition";
import { revealSlipsAt, type LoopPair } from "../server/reveal-window";

const loop = (n: number): LoopPair[] =>
  Array.from({ length: n }, (_, i) => ({ giverCodename: `Code ${i}`, giverName: `Name ${i}`, receiverName: `Name ${(i + 1) % n}` }));
const shown = (n: number, step: number, status: Shown["status"] = "REVEALING"): Shown => ({
  status,
  step,
  slips: status === "DRAWN" ? [] : revealSlipsAt(loop(n), step),
});

describe("reveal ring", () => {
  it("up to 16: every slip in loop order, clockwise from the top", () => {
    const m = ringModel(12, 7, revealSlipsAt(loop(12), 7), false);
    expect(m.slips.map((s) => s.pos)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(m.slips.filter((s) => s.face === "revealed").map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(m.slips.filter((s) => s.halo).map((s) => s.index)).toEqual([6]);
    expect(m.segments.map((s) => s.state)).toEqual([...Array(6).fill("on"), "glow", ...Array(5).fill("off")]);
    expect(slipPoint(0, m.g).y).toBeLessThan(slipPoint(3, m.g).y); // first slip at the top
  });

  it("above 16: the current giver sits at the bottom of a 12-slot window", () => {
    const m = ringModel(30, 15, revealSlipsAt(loop(30), 15), false);
    expect(m.g.slots).toBe(12);
    const current = m.slips.find((s) => s.current)!;
    expect(current.index).toBe(14);
    expect(current.pos).toBe(6);
    expect(m.slips.map((s) => s.pos)).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    // The hidden ends and the seam between them show nothing.
    expect(windowOpacity(-1, m.g)).toBe(0);
    expect(windowOpacity(12, m.g)).toBe(0);
    expect(segmentOpacity(11, m.g)).toBe(0);
    expect(segmentOpacity(10, m.g)).toBe(1);
  });

  it("before the start: blank slips, every bulb off", () => {
    const m = ringModel(12, 0, [], false);
    expect(m.slips.every((s) => s.face === "blank" && !s.halo)).toBe(true);
    expect(m.segments.every((s) => s.state === "off")).toBe(true);
  });

  it("finale: every slip has its halo, every bulb glows", () => {
    const m = ringModel(12, 12, revealSlipsAt(loop(12), 12), true);
    expect(m.slips.every((s) => s.halo && s.face === "revealed")).toBe(true);
    expect(m.segments.every((s) => s.state === "glow")).toBe(true);
  });

  it("slips shrink for 13–16 so neighbours don't overlap; 4 bulbs a segment from 8 up", () => {
    expect(ringGeometry(12).slipW).toBe(272);
    expect(ringGeometry(16).slipW).toBeLessThan(272);
    expect(ringGeometry(40).slipW).toBe(272);
    expect(ringGeometry(12).bulbsPerSegment).toBe(4);
    expect(ringGeometry(3).bulbsPerSegment).toBeGreaterThan(4);
  });

  it("text never goes below 24px, even for long names", () => {
    const long = "Maria Clara Dela Cruz Santos Reyes Jr."; // 38 of the 40 allowed
    for (const n of [3, 12, 16, 40]) {
      const g = ringGeometry(n);
      expect(slipNameSize(long, g)).toBeGreaterThanOrEqual(24);
      expect(slipCodeSize(long, g)).toBeGreaterThanOrEqual(24);
    }
    expect(centreNameSize(long)).toBeGreaterThanOrEqual(24);
    expect(centreLeadSize(long)).toBeGreaterThanOrEqual(24);
    expect(centreNameSize("Jun")).toBe(184);
  });
});

describe("reveal transitions", () => {
  const g12 = ringGeometry(12);
  const g30 = ringGeometry(30);

  it("first load and after the end: none", () => {
    expect(transitionBetween(shown(12, 12, "REVEALED"), shown(12, 12, "REVEALED"), g12)).toBeNull();
    expect(transitionBetween(shown(12, 4), shown(12, 4), g12)).toBeNull();
  });

  it("start: the first slip flips and its bulbs light", () => {
    expect(transitionBetween(shown(12, 0, "DRAWN"), shown(12, 1), g12)).toMatchObject({
      kind: "start",
      flip: 0,
      light: 0,
      haloIn: [0],
    });
  });

  it("next: flip the new giver, light toward the receiver, settle the last bulbs; large groups turn", () => {
    expect(transitionBetween(shown(12, 6), shown(12, 7), g12)).toMatchObject({
      kind: "next",
      flip: 6,
      light: 6,
      settle: [5],
      haloIn: [6],
      haloOut: [5],
      shift: 0,
    });
    expect(transitionBetween(shown(30, 6), shown(30, 7), g30)).toMatchObject({ kind: "next", shift: 1 });
    // A screen that missed steps animates only the last one.
    expect(transitionBetween(shown(12, 2), shown(12, 5), g12)).toMatchObject({ kind: "next", flip: 4, settle: [3] });
  });

  it("previous: the slip turns back with the name it showed, bulbs go dark", () => {
    expect(transitionBetween(shown(12, 7), shown(12, 6), g12)).toMatchObject({
      kind: "previous",
      unflip: { index: 6, giverName: "Name 6", receiverName: "Name 7" },
      dim: 6,
      reglow: 5,
      haloOut: [6],
      haloIn: [5],
      shift: 0,
    });
    expect(transitionBetween(shown(30, 7), shown(30, 6), g30)).toMatchObject({ kind: "previous", shift: -1 });
  });

  it("finale after the last pair", () => {
    expect(transitionBetween(shown(12, 12), shown(12, 12, "REVEALED"), g12)).toMatchObject({ kind: "finale", finaleFrom: 11 });
  });
});
